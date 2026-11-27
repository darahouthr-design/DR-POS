import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import type {
  Order,
  OrderItem,
  Product,
  WarehouseManagerProfile,
  WorkspaceSettings,
} from '../src/types.js';
import {
  DEFAULT_TELEGRAM_URL,
  WAREHOUSE_SNAPSHOT_PREFIX,
  getFirebaseConfig,
  mutateVaultState,
  normalizeEmail,
  readVaultState,
  type ApiResult,
  type DeveloperVaultState,
  type OtpChallengeRecord,
  type WarehouseRegistryRecord,
} from './developerRegistry.js';
import { getCrossDeploymentVaultKey } from './masterOtp.js';
import { getMasterPasswordForServerSync } from './masterCredentials.js';
import { getMongoDb, verifyFirebaseIdToken } from './mongoPartition.js';

const MIRROR_COLLECTION = 'drpos_warehouse_mirrors';
const LOCAL_MIRROR_FILE = path.resolve(process.cwd(), 'data', 'warehouse_mirrors.json');
const TMP_MIRROR_FILE = path.join('/tmp', 'drpos_warehouse_mirrors.json');
const LIVE_REFRESH_INTERVAL_MS = 12 * 1000;
const LIVE_EMPTY_RETRY_MS = 2500;
const MASTER_TOKEN_SAFETY_MS = 10 * 60 * 1000;
const VAULT_WH_SALT = 'warehouse_catalog_snapshot_v1';
const VAULT_WH_ENC_PREFIX = 'whv1:';
const MAX_VAULT_SNAPSHOT_CHARS = 68_000;

export interface WarehouseMirrorDoc {
  ownerUid: string;
  masterUid: string;
  masterEmail: string;
  settings: Partial<WorkspaceSettings>;
  products: Product[];
  orders: Order[];
  updatedAt: string;
  source: 'master-sync' | 'firestore-rest';
  version: string;
}

interface GlobalWarehouseCache {
  mirrors: Map<string, WarehouseMirrorDoc>;
  masterTokens: Map<string, { idToken: string; expiresAt: number }>;
  liveFetchAt: Map<string, number>;
  vaultSyncedVersions: Map<string, string>;
}

const g = globalThis as typeof globalThis & {
  __drposWarehouseCache?: GlobalWarehouseCache;
};

if (!g.__drposWarehouseCache) {
  g.__drposWarehouseCache = {
    mirrors: new Map(),
    masterTokens: new Map(),
    liveFetchAt: new Map(),
    vaultSyncedVersions: new Map(),
  };
} else if (!g.__drposWarehouseCache.vaultSyncedVersions) {
  g.__drposWarehouseCache.vaultSyncedVersions = new Map();
}

interface FsRestValue {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  nullValue?: null;
  arrayValue?: { values?: FsRestValue[] };
  mapValue?: { fields?: Record<string, FsRestValue> };
}

function decodeFsRestValue(val?: FsRestValue): unknown {
  if (!val || typeof val !== 'object') return undefined;
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.integerValue !== undefined) return Number(val.integerValue);
  if (val.doubleValue !== undefined) return Number(val.doubleValue);
  if (val.nullValue !== undefined) return null;
  if (val.arrayValue) {
    return Array.isArray(val.arrayValue.values)
      ? val.arrayValue.values.map((v) => decodeFsRestValue(v))
      : [];
  }
  if (val.mapValue) {
    return decodeFsRestFields(val.mapValue.fields);
  }
  return undefined;
}

function decodeFsRestFields(
  fields?: Record<string, FsRestValue>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!fields || typeof fields !== 'object') return out;
  for (const [k, v] of Object.entries(fields)) {
    out[k] = decodeFsRestValue(v);
  }
  return out;
}

function sanitizeProductRaw(raw: Record<string, unknown>): Product {
  return {
    id: String(raw.id || ''),
    name: String(raw.name || ''),
    imageUrl: String(raw.imageUrl || ''),
    costPrice: Number(raw.costPrice || 0),
    sellingPrice: Number(raw.sellingPrice || 0),
    promotion: Number(raw.promotion || 0),
    stock: Number(raw.stock || 0),
    barcode: String(raw.barcode || ''),
    category: String(raw.category || ''),
    warehouse: String(raw.warehouse || ''),
    sortOrder: Number(raw.sortOrder || 0),
    updatedAt: String(raw.updatedAt || ''),
    operatorEmail: raw.operatorEmail ? normalizeEmail(raw.operatorEmail) : undefined,
  };
}

function sanitizeOrderRaw(raw: Record<string, unknown>): Order {
  const items = Array.isArray(raw.items) ? (raw.items as Record<string, unknown>[]) : [];
  return {
    id: String(raw.id || ''),
    orderNumber: String(raw.orderNumber || ''),
    date: String(raw.date || ''),
    time: String(raw.time || ''),
    createdAt: String(raw.createdAt || ''),
    customerName: String(raw.customerName || ''),
    customerPhone: String(raw.customerPhone || ''),
    customerAddress: String(raw.customerAddress || ''),
    storeName: String(raw.storeName || ''),
    groupName: String(raw.groupName || ''),
    staffName: String(raw.staffName || ''),
    warehouse: String(raw.warehouse || ''),
    paymentStatus: raw.paymentStatus === 'unpaid' ? 'unpaid' : 'paid',
    dueDate: String(raw.dueDate || ''),
    note: String(raw.note || ''),
    items: items.map((it) => ({
      productId: String(it.productId || ''),
      productName: String(it.productName || ''),
      quantity: Math.max(0, Number(it.quantity) || 0),
      unitPrice: Number(it.unitPrice || 0),
      ...(it.catalogUnitPrice !== undefined
        ? { catalogUnitPrice: Number(it.catalogUnitPrice || 0) }
        : {}),
      costPrice: Number(it.costPrice || 0),
      warehouse: String(it.warehouse || ''),
    })),
    subtotalAmount: Number(raw.subtotalAmount || 0),
    discountType: raw.discountType === 'percent' ? 'percent' : 'amount',
    discountValue: Number(raw.discountValue || 0),
    discountAmount: Number(raw.discountAmount || 0),
    totalAmount: Number(raw.totalAmount || 0),
    totalCost: Number(raw.totalCost || 0),
    createdByEmail: normalizeEmail(raw.createdByEmail || ''),
    operatorEmail: normalizeEmail(raw.operatorEmail || ''),
  };
}

function unpackWarehouseProfilesFromSettings(
  rawSettings: Record<string, unknown>
): WarehouseManagerProfile[] {
  const map = new Map<string, WarehouseManagerProfile>();
  if (Array.isArray(rawSettings.warehouseProfiles)) {
    for (const item of rawSettings.warehouseProfiles) {
      if (!item || typeof item !== 'object') continue;
      const wp = item as Partial<WarehouseManagerProfile>;
      const email = normalizeEmail(wp.email || '');
      const uid = String(wp.uid || '').trim();
      if (!email || !uid) continue;
      map.set(uid, {
        id: String(wp.id || `wh-${uid}`),
        uid,
        name: String(wp.name || '').trim(),
        email,
        assignedAdminEmail: normalizeEmail(wp.assignedAdminEmail || ''),
        active: wp.active !== false,
        createdAt: String(wp.createdAt || ''),
        updatedAt: String(wp.updatedAt || ''),
      });
    }
  }
  if (Array.isArray(rawSettings.accessRules)) {
    for (const item of rawSettings.accessRules) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      if (obj.__whProfile !== true) continue;
      const email = normalizeEmail(obj.email || '');
      const uid = String(obj.uid || '').trim();
      if (!email || !uid) continue;
      map.set(uid, {
        id: String(obj.id || `wh-${uid}`),
        uid,
        name: String(obj.name || '').trim(),
        email,
        assignedAdminEmail: normalizeEmail(obj.assignedAdminEmail || ''),
        active: obj.active !== false,
        createdAt: String(obj.createdAt || ''),
        updatedAt: String(obj.updatedAt || ''),
      });
    }
  }
  return Array.from(map.values());
}

function buildSanitizedSettingsInput(raw: Record<string, unknown>): Partial<WorkspaceSettings> {
  return {
    personalName: String(raw.personalName || ''),
    businessName: String(raw.businessName || 'DR-POS'),
    darkMode: Boolean(raw.darkMode),
    language: raw.language === 'en' || raw.language === 'kr' ? raw.language : 'kh',
    currency: raw.currency === 'kh' || raw.currency === 'kr' ? raw.currency : 'en',
    soundEnabled: raw.soundEnabled !== false,
    warehouses: Array.isArray(raw.warehouses) ? raw.warehouses.map((x) => String(x || '')) : [],
    stores: Array.isArray(raw.stores) ? raw.stores.map((x) => String(x || '')) : [],
    groups: Array.isArray(raw.groups) ? raw.groups.map((x) => String(x || '')) : [],
    categories: Array.isArray(raw.categories) ? raw.categories.map((x) => String(x || '')) : [],
    warehouseProfiles: unpackWarehouseProfilesFromSettings(raw),
  };
}

function computeMirrorVersion(
  masterUid: string,
  settings: Partial<WorkspaceSettings>,
  products: Product[],
  orders: Order[]
): string {
  const latestProd = products.reduce(
    (m, p) => ((p.updatedAt || '') > m ? p.updatedAt || '' : m),
    ''
  );
  const latestOrd = orders.reduce(
    (m, o) => ((o.createdAt || '') > m ? o.createdAt || '' : m),
    ''
  );
  const stockSum = products.reduce((s, p) => s + (Number(p.stock) || 0), 0);
  const whSig = (settings.warehouseProfiles || [])
    .map((w) => `${w.uid}:${w.assignedAdminEmail}:${w.active}:${w.updatedAt || ''}`)
    .join(',');
  return `${masterUid}:${products.length}:${stockSum}:${latestProd}:${orders.length}:${latestOrd}:${whSig}`;
}

function getWarehouseSnapshotKey(masterUid: string): string {
  const hash = crypto.createHash('sha256').update(masterUid).digest('hex').slice(0, 16);
  return `${WAREHOUSE_SNAPSHOT_PREFIX}${hash}`;
}

function encryptWarehouseSnapshot(rawObj: unknown): string {
  const json = JSON.stringify(rawObj);
  const deflated = zlib.deflateRawSync(Buffer.from(json, 'utf8'), { level: 6 });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getCrossDeploymentVaultKey(), iv);
  const enc = Buffer.concat([cipher.update(deflated), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VAULT_WH_ENC_PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

function decryptWarehouseSnapshot(encoded: string): WarehouseMirrorDoc | null {
  if (!encoded || !encoded.startsWith(VAULT_WH_ENC_PREFIX)) return null;
  const parts = encoded.slice(VAULT_WH_ENC_PREFIX.length).split('.');
  if (parts.length !== 3) return null;
  try {
    const iv = Buffer.from(parts[0], 'base64url');
    const tag = Buffer.from(parts[1], 'base64url');
    const ciphertext = Buffer.from(parts[2], 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getCrossDeploymentVaultKey(), iv);
    decipher.setAuthTag(tag);
    const inflated = zlib.inflateRawSync(Buffer.concat([decipher.update(ciphertext), decipher.final()]));
    const parsed = JSON.parse(inflated.toString('utf8')) as Partial<WarehouseMirrorDoc>;
    if (!parsed || !parsed.masterUid) return null;
    return {
      ownerUid: String(parsed.ownerUid || parsed.masterUid),
      masterUid: String(parsed.masterUid),
      masterEmail: normalizeEmail(parsed.masterEmail || ''),
      settings: buildSanitizedSettingsInput((parsed.settings || {}) as Record<string, unknown>),
      products: Array.isArray(parsed.products)
        ? parsed.products.map((p) => zeroOutProductPrices(sanitizeProductRaw(p as unknown as Record<string, unknown>)))
        : [],
      orders: Array.isArray(parsed.orders)
        ? parsed.orders.map((o) => zeroOutOrderPrices(sanitizeOrderRaw(o as unknown as Record<string, unknown>)))
        : [],
      updatedAt: String(parsed.updatedAt || ''),
      source: parsed.source === 'firestore-rest' ? 'firestore-rest' : 'master-sync',
      version: String(parsed.version || ''),
    };
  } catch {
    return null;
  }
}

function stripProductForVaultSnapshot(p: Product): Product {
  const zero = zeroOutProductPrices(p);
  // Never store large base64 data URIs inside the shared Firestore vault doc
  const safeImg =
    zero.imageUrl && zero.imageUrl.startsWith('data:') && zero.imageUrl.length > 512
      ? ''
      : (zero.imageUrl || '').slice(0, 600);
  return {
    ...zero,
    imageUrl: safeImg,
  };
}

function stripOrderForVaultSnapshot(o: Order): Order {
  const zero = zeroOutOrderPrices(o);
  return {
    ...zero,
    // Keep PII phone/address out of the Cloud Vault snapshot; Mongo/Firestore REST carry them directly
    customerPhone: '',
    customerAddress: '',
    note: String(zero.note || '').slice(0, 120),
  };
}

function buildVaultSnapshotChallenge(doc: WarehouseMirrorDoc): OtpChallengeRecord | null {
  const snapKey = getWarehouseSnapshotKey(doc.masterUid);
  const safeProductsAll = (doc.products || []).map(stripProductForVaultSnapshot);
  const safeOrdersAll = (doc.orders || []).map(stripOrderForVaultSnapshot);

  const attemptLimits: Array<[number, number]> = [
    [safeProductsAll.length, 100],
    [safeProductsAll.length, 40],
    [safeProductsAll.length, 15],
    [safeProductsAll.length, 0],
    [Math.min(safeProductsAll.length, 600), 0],
    [Math.min(safeProductsAll.length, 250), 0],
  ];

  for (const [prodCap, ordCap] of attemptLimits) {
    const candidatePayload = {
      ownerUid: doc.masterUid,
      masterUid: doc.masterUid,
      masterEmail: doc.masterEmail,
      settings: doc.settings,
      products: safeProductsAll.slice(0, prodCap),
      orders: safeOrdersAll.slice(0, ordCap),
      updatedAt: doc.updatedAt,
      source: doc.source,
      version: doc.version,
    };
    const encoded = encryptWarehouseSnapshot(candidatePayload);
    if (encoded.length <= MAX_VAULT_SNAPSHOT_CHARS) {
      return {
        emailHash: snapKey,
        maskedEmail: doc.masterEmail || 'warehouse',
        jti: doc.version || doc.updatedAt || 'v1',
        salt: VAULT_WH_SALT,
        otpDigest: encoded,
        createdAt: doc.updatedAt || new Date().toISOString(),
        expiresAt: '2099-12-31T23:59:59.000Z',
        usedAt: '',
        attempts: 0,
        source: 'email',
      };
    }
  }
  return null;
}

function pickBetterMirror(
  currentBest: WarehouseMirrorDoc | null,
  candidate: WarehouseMirrorDoc | null
): WarehouseMirrorDoc | null {
  if (!candidate || !candidate.masterUid) return currentBest;
  if (!currentBest) return candidate;
  const candEmptyBug =
    candidate.products.length === 0 &&
    currentBest.products.length > 0 &&
    candidate.source === 'firestore-rest';
  if (candEmptyBug) return currentBest;
  const bestEmptyBug =
    currentBest.products.length === 0 &&
    candidate.products.length > 0 &&
    currentBest.source === 'firestore-rest';
  if (bestEmptyBug) return candidate;
  if (String(candidate.updatedAt || '') >= String(currentBest.updatedAt || '')) {
    return candidate;
  }
  return currentBest;
}

function readLocalMirrorsMap(): Record<string, WarehouseMirrorDoc> {
  const merged: Record<string, WarehouseMirrorDoc> = {};
  for (const filePath of [LOCAL_MIRROR_FILE, TMP_MIRROR_FILE]) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<
        string,
        WarehouseMirrorDoc
      >;
      if (!raw || typeof raw !== 'object') continue;
      for (const [k, doc] of Object.entries(raw)) {
        if (!doc || typeof doc !== 'object' || !doc.masterUid) continue;
        merged[k] = pickBetterMirror(merged[k] || null, doc) || doc;
      }
    } catch {
      // Ignore corrupt mirror cache file
    }
  }
  return merged;
}

function writeLocalMirrorDoc(doc: WarehouseMirrorDoc): void {
  const existing = readLocalMirrorsMap();
  existing[doc.masterUid] = doc;
  const serialized = JSON.stringify(existing);
  for (const filePath of [LOCAL_MIRROR_FILE, TMP_MIRROR_FILE]) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, serialized, { encoding: 'utf8', mode: 0o600 });
    } catch {
      // Ignore read-only paths on serverless
    }
  }
}

async function persistMirrorDoc(doc: WarehouseMirrorDoc): Promise<void> {
  g.__drposWarehouseCache!.mirrors.set(doc.masterUid, doc);
  writeLocalMirrorDoc(doc);
  await Promise.allSettled([
    (async () => {
      try {
        const db = await getMongoDb();
        if (db) {
          await db
            .collection<WarehouseMirrorDoc>(MIRROR_COLLECTION)
            .updateOne({ ownerUid: doc.masterUid }, { $set: doc }, { upsert: true });
        }
      } catch {
        // Non-fatal: RAM + file fallback remain active
      }
    })(),
    (async () => {
      try {
        const syncedVer = g.__drposWarehouseCache!.vaultSyncedVersions.get(doc.masterUid);
        if (syncedVer && syncedVer === doc.version) return;
        const challenge = buildVaultSnapshotChallenge(doc);
        if (!challenge) return;
        const snapKey = getWarehouseSnapshotKey(doc.masterUid);
        const res = await mutateVaultState<boolean>((working) => {
          const prev = working.otpChallenges?.[snapKey];
          if (prev && prev.jti === challenge.jti && prev.salt === VAULT_WH_SALT) {
            return { changed: false, result: true };
          }
          working.otpChallenges = {
            ...(working.otpChallenges || {}),
            [snapKey]: challenge,
          };
          return { changed: true, result: true };
        });
        if (res.persistedToCloud) {
          g.__drposWarehouseCache!.vaultSyncedVersions.set(doc.masterUid, doc.version);
        }
      } catch {
        // Non-fatal
      }
    })(),
  ]);
}

async function readMirrorDoc(
  masterUid: string,
  preloadedVault?: DeveloperVaultState
): Promise<WarehouseMirrorDoc | null> {
  const cache = g.__drposWarehouseCache!.mirrors;
  let best: WarehouseMirrorDoc | null = cache.get(masterUid) || null;

  const localMap = readLocalMirrorsMap();
  const localDoc = localMap[masterUid] || null;
  best = pickBetterMirror(best, localDoc);

  try {
    const db = await getMongoDb();
    if (db) {
      const mongoDoc = await db
        .collection<WarehouseMirrorDoc>(MIRROR_COLLECTION)
        .findOne({ ownerUid: masterUid }, { projection: { _id: 0 } });
      best = pickBetterMirror(best, mongoDoc);
    }
  } catch {
    // Non-fatal
  }

  try {
    const snapKey = getWarehouseSnapshotKey(masterUid);
    const snapRec = preloadedVault?.otpChallenges?.[snapKey];
    if (snapRec && snapRec.salt === VAULT_WH_SALT && typeof snapRec.otpDigest === 'string') {
      const vaultDoc = decryptWarehouseSnapshot(snapRec.otpDigest);
      best = pickBetterMirror(best, vaultDoc);
    }
  } catch {
    // Non-fatal
  }

  if (best) {
    cache.set(masterUid, best);
  }
  return best;
}

async function getMasterIdTokenForRest(masterEmail: string): Promise<string | null> {
  const cleanEmail = normalizeEmail(masterEmail);
  if (!cleanEmail) return null;
  const cache = g.__drposWarehouseCache!.masterTokens;
  const existing = cache.get(cleanEmail);
  if (existing && existing.expiresAt > Date.now() + MASTER_TOKEN_SAFETY_MS) {
    return existing.idToken;
  }

  const masterPassword = await getMasterPasswordForServerSync(cleanEmail);
  if (!masterPassword) return null;

  const cfg = getFirebaseConfig();
  const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(
    cfg.apiKey
  )}`;
  try {
    const res = await fetch(signInUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password: masterPassword,
        returnSecureToken: true,
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { idToken?: string; expiresIn?: string };
    if (!json.idToken) return null;
    const ttlMs = Math.max(60, Number(json.expiresIn) || 3600) * 1000;
    cache.set(cleanEmail, {
      idToken: json.idToken,
      expiresAt: Date.now() + ttlMs,
    });
    return json.idToken;
  } catch {
    return null;
  }
}

interface LiveFetchResult {
  mirror: WarehouseMirrorDoc;
  productsOk: boolean;
  ordersOk: boolean;
}

async function fetchFirestoreWorkspaceLive(
  masterUid: string,
  masterEmail: string,
  existingMirror?: WarehouseMirrorDoc | null
): Promise<LiveFetchResult | null> {
  const idToken = await getMasterIdTokenForRest(masterEmail);
  if (!idToken) return null;

  const cfg = getFirebaseConfig();
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    cfg.projectId
  )}/databases/${encodeURIComponent(cfg.firestoreDatabaseId)}/documents/workspaces/${encodeURIComponent(
    masterUid
  )}`;
  const authHeaders = {
    Authorization: `Bearer ${idToken}`,
    'Cache-Control': 'no-cache, no-store',
  };

  try {
    const rootRes = await fetch(`${baseUrl}?key=${encodeURIComponent(cfg.apiKey)}`, {
      method: 'GET',
      headers: authHeaders,
    });
    if (!rootRes.ok) return null;
    const rootJson = (await rootRes.json()) as { fields?: Record<string, FsRestValue> };
    const rootDecoded = decodeFsRestFields(rootJson.fields);
    const rawSettings =
      rootDecoded.settings && typeof rootDecoded.settings === 'object'
        ? (rootDecoded.settings as Record<string, unknown>)
        : {};
    const settings = buildSanitizedSettingsInput(rawSettings);

    const runFilteredSubcollectionQuery = async (
      sub: string,
      opts: { limit: number; withOrderByCreatedAtDesc?: boolean }
    ): Promise<{ ok: boolean; items: Record<string, unknown>[] }> => {
      const runOnce = async (useOrderBy: boolean) => {
        const structuredQuery: Record<string, unknown> = {
          from: [{ collectionId: sub }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'ownerUid' },
              op: 'EQUAL',
              value: { stringValue: masterUid },
            },
          },
          limit: opts.limit,
        };
        if (useOrderBy) {
          structuredQuery.orderBy = [
            { field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' },
          ];
        }
        return fetch(`${baseUrl}:runQuery?key=${encodeURIComponent(cfg.apiKey)}`, {
          method: 'POST',
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ structuredQuery }),
        });
      };

      let r = await runOnce(Boolean(opts.withOrderByCreatedAtDesc));
      if (!r.ok && opts.withOrderByCreatedAtDesc && r.status === 400) {
        // Fallback without composite index requirement if createdAt index is absent
        r = await runOnce(false);
      }
      if (!r.ok) {
        return { ok: false, items: [] };
      }
      const rows = (await r.json()) as Array<{
        document?: { fields?: Record<string, FsRestValue> };
      }>;
      const items: Record<string, unknown>[] = [];
      for (const row of Array.isArray(rows) ? rows : []) {
        if (row?.document?.fields) {
          items.push(decodeFsRestFields(row.document.fields));
        }
      }
      return { ok: true, items };
    };

    const [prodQueryRes, ordQueryRes] = await Promise.all([
      runFilteredSubcollectionQuery('products', { limit: 1500 }),
      runFilteredSubcollectionQuery('orders', {
        limit: 400,
        withOrderByCreatedAtDesc: true,
      }),
    ]);

    if (!prodQueryRes.ok && !ordQueryRes.ok) {
      return null;
    }

    const products = prodQueryRes.ok
      ? prodQueryRes.items
          .map(sanitizeProductRaw)
          .filter((p) => Boolean(p.id))
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      : existingMirror?.products || [];

    const orders = ordQueryRes.ok
      ? ordQueryRes.items
          .map(sanitizeOrderRaw)
          .filter((o) => Boolean(o.id))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      : existingMirror?.orders || [];

    const nowIso = new Date().toISOString();
    const version = computeMirrorVersion(masterUid, settings, products, orders);

    return {
      productsOk: prodQueryRes.ok,
      ordersOk: ordQueryRes.ok,
      mirror: {
        ownerUid: masterUid,
        masterUid,
        masterEmail: normalizeEmail(rootDecoded.ownerEmail || masterEmail),
        settings,
        products,
        orders,
        updatedAt: nowIso,
        source: 'firestore-rest',
        version,
      },
    };
  } catch {
    return null;
  }
}

async function mergeMongoRecentOrders(
  masterUid: string,
  baseOrders: Order[]
): Promise<Order[]> {
  try {
    const db = await getMongoDb();
    if (!db) return baseOrders;
    const col = db.collection<Record<string, unknown>>('drpos_orders');
    const docs = await col
      .find({ ownerUid: masterUid }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();
    if (!docs.length) return baseOrders;
    const map = new Map<string, Order>();
    for (const raw of docs) {
      const o = sanitizeOrderRaw(raw);
      if (o.id) map.set(o.id, o);
    }
    for (const o of baseOrders) {
      if (o.id && !map.has(o.id)) {
        map.set(o.id, o);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return baseOrders;
  }
}

function zeroOutProductPrices(p: Product): Product {
  return {
    id: p.id,
    name: p.name,
    imageUrl: p.imageUrl,
    costPrice: 0,
    sellingPrice: 0,
    promotion: 0,
    stock: Number(p.stock) || 0,
    barcode: p.barcode,
    category: p.category,
    warehouse: p.warehouse,
    sortOrder: Number(p.sortOrder) || 0,
    updatedAt: p.updatedAt,
    ...(p.operatorEmail ? { operatorEmail: normalizeEmail(p.operatorEmail) } : {}),
  };
}

function zeroOutOrderPrices(o: Order): Order {
  const zeroItems: OrderItem[] = (Array.isArray(o.items) ? o.items : []).map((it) => ({
    productId: String(it.productId || ''),
    productName: String(it.productName || ''),
    quantity: Math.max(0, Number(it.quantity) || 0),
    unitPrice: 0,
    catalogUnitPrice: 0,
    costPrice: 0,
    warehouse: String(it.warehouse || ''),
  }));
  return {
    ...o,
    items: zeroItems,
    subtotalAmount: 0,
    discountType: 'amount',
    discountValue: 0,
    discountAmount: 0,
    totalAmount: 0,
    totalCost: 0,
  };
}

export async function runWarehouseSync(
  headers: Record<string, string | string[] | undefined>,
  payload: Record<string, unknown>
): Promise<ApiResult> {
  const user = await verifyFirebaseIdToken(headers);
  if (!user) {
    return { status: 401, body: { error: 'សូមចូលគណនី Firebase ជាមុនសិន។' } };
  }

  const requestedUid = String(payload?.masterUid || user.uid).trim();
  if (requestedUid !== user.uid) {
    return { status: 403, body: { error: 'Forbidden' } };
  }

  const vault = await readVaultState();
  if (vault.warehouseEmails?.[user.email]) {
    return { status: 403, body: { error: 'Warehouse manager cannot overwrite master mirror' } };
  }

  const rawSettings =
    payload?.settings && typeof payload.settings === 'object'
      ? (payload.settings as Record<string, unknown>)
      : {};
  const rawProducts = Array.isArray(payload?.products)
    ? (payload.products as Record<string, unknown>[])
    : [];
  const rawOrders = Array.isArray(payload?.orders)
    ? (payload.orders as Record<string, unknown>[])
    : [];

  const settings = buildSanitizedSettingsInput(rawSettings);
  const products = rawProducts.map(sanitizeProductRaw).filter((p) => Boolean(p.id));
  const orders = rawOrders.map(sanitizeOrderRaw).filter((o) => Boolean(o.id));
  const masterEmail = normalizeEmail(payload?.masterEmail || user.email);
  const version = computeMirrorVersion(user.uid, settings, products, orders);

  const mirrorDoc: WarehouseMirrorDoc = {
    ownerUid: user.uid,
    masterUid: user.uid,
    masterEmail,
    settings,
    products,
    orders,
    updatedAt: new Date().toISOString(),
    source: 'master-sync',
    version,
  };

  await persistMirrorDoc(mirrorDoc);
  return {
    status: 200,
    body: { ok: true, version },
  };
}

export async function runWarehouseFeed(
  headers: Record<string, string | string[] | undefined>,
  queryParams?: { sinceVersion?: string; force?: string }
): Promise<ApiResult> {
  const user = await verifyFirebaseIdToken(headers);
  if (!user) {
    return { status: 401, body: { error: 'សូមចូលគណនីជាមុនសិន។' } };
  }

  const vault = await readVaultState();
  const whList = Object.values(vault.warehouseEmails || {});
  let matchedEntry: WarehouseRegistryRecord | undefined = whList.find(
    (entry) => entry.uid === user.uid
  );
  if (!matchedEntry && user.email) {
    matchedEntry = vault.warehouseEmails?.[user.email];
  }

  if (!matchedEntry || matchedEntry.uid !== user.uid || !matchedEntry.masterUid) {
    return {
      status: 403,
      body: {
        error: 'គណនីអ្នកគ្រប់គ្រងឃ្លាំងនេះមិនមានសិទ្ធិប្រើប្រាស់ ឬត្រូវបានលុបចេញពីប្រព័ន្ធ។',
      },
    };
  }

  if (matchedEntry.active === false) {
    return {
      status: 403,
      body: {
        error: 'គណនីអ្នកគ្រប់គ្រងឃ្លាំងនេះត្រូវបានបិទសិទ្ធិប្រើប្រាស់! សូមទាក់ទង Master Admin។',
      },
    };
  }

  const masterUid = matchedEntry.masterUid;
  const masterEmail = normalizeEmail(matchedEntry.masterEmail);
  const forceRefresh = queryParams?.force === '1' || queryParams?.force === 'true';

  let mirror = await readMirrorDoc(masterUid, vault);
  const lastLiveAt = g.__drposWarehouseCache!.liveFetchAt.get(masterUid) || 0;
  const refreshCooldown =
    !mirror || mirror.products.length === 0 ? LIVE_EMPTY_RETRY_MS : LIVE_REFRESH_INTERVAL_MS;
  const needsLiveFetch = forceRefresh || !mirror || Date.now() - lastLiveAt > refreshCooldown;

  if (needsLiveFetch) {
    g.__drposWarehouseCache!.liveFetchAt.set(masterUid, Date.now());
    const liveRes = await fetchFirestoreWorkspaceLive(masterUid, masterEmail, mirror);
    if (liveRes && liveRes.productsOk) {
      const liveMirror = liveRes.mirror;
      if (
        !mirror ||
        liveMirror.products.length > 0 ||
        (liveRes.ordersOk && liveMirror.orders.length >= mirror.orders.length && mirror.products.length === 0)
      ) {
        mirror = liveMirror;
        await persistMirrorDoc(liveMirror);
      }
    }
  }

  if (mirror && (mirror.products.length > 0 || mirror.orders.length > 0)) {
    const snapKey = getWarehouseSnapshotKey(masterUid);
    const existingVaultSnap = vault.otpChallenges?.[snapKey];
    if (!existingVaultSnap || existingVaultSnap.jti !== mirror.version) {
      await persistMirrorDoc(mirror);
    }
  }

  const workspaceProfile = mirror?.settings?.warehouseProfiles?.find(
    (wp) => wp.uid === matchedEntry.uid
  );

  if (workspaceProfile && workspaceProfile.active === false) {
    return {
      status: 403,
      body: {
        error: 'គណនីអ្នកគ្រប់គ្រងឃ្លាំងនេះត្រូវបានបិទសិទ្ធិប្រើប្រាស់! សូមទាក់ទង Master Admin។',
      },
    };
  }

  const assignedAdminEmail =
    normalizeEmail(
      workspaceProfile?.assignedAdminEmail || matchedEntry.assignedAdminEmail || masterEmail
    ) || masterEmail;
  const warehouseName = String(workspaceProfile?.name || matchedEntry.name || 'Warehouse').trim();

  const masterLicenseRec = vault.masterAdmins?.[masterEmail];
  const effectiveTelegram = vault.telegramUrl || DEFAULT_TELEGRAM_URL;
  const license = masterLicenseRec
    ? {
        trialStartedAt: masterLicenseRec.trialStartedAt,
        expireAt: masterLicenseRec.expireAt,
        planType: masterLicenseRec.planType,
        telegramUrl: effectiveTelegram,
        developerUpdatedAt: masterLicenseRec.developerUpdatedAt || '',
      }
    : undefined;

  if (!mirror) {
    const emptyVersion = `pending:${masterUid}:${assignedAdminEmail}:${matchedEntry.active}`;
    if (queryParams?.sinceVersion && queryParams.sinceVersion === emptyVersion) {
      return { status: 200, body: { ok: true, unchanged: true, version: emptyVersion } };
    }
    return {
      status: 200,
      body: {
        ok: true,
        unchanged: false,
        pendingInitialSync: true,
        version: emptyVersion,
        masterUid,
        masterEmail,
        assignedAdminEmail,
        warehouseProfile: {
          id: `wh-${matchedEntry.uid}`,
          uid: matchedEntry.uid,
          name: warehouseName,
          email: matchedEntry.email,
          assignedAdminEmail,
          active: true,
          createdAt: matchedEntry.createdAt,
        },
        settings: {
          personalName: warehouseName,
          personalPhone: '',
          businessName: 'DR-POS',
          darkMode: false,
          language: 'kh',
          currency: 'en',
          soundEnabled: true,
          warehouses: [],
          stores: [],
          groups: [],
          categories: [],
          accessRules: [],
          saleProfiles: [],
          adminProfiles: [],
          warehouseProfiles: [
            {
              id: `wh-${matchedEntry.uid}`,
              uid: matchedEntry.uid,
              name: warehouseName,
              email: matchedEntry.email,
              assignedAdminEmail,
              active: true,
              createdAt: matchedEntry.createdAt,
            },
          ],
        },
        license,
        products: [],
        orders: [],
      },
    };
  }

  const allOrdersMerged = await mergeMongoRecentOrders(masterUid, mirror.orders || []);

  // Strict server-side isolation to ONLY products & orders of assignedAdminEmail
  const scopedProducts = (mirror.products || [])
    .filter((p) => {
      const op = normalizeEmail(p.operatorEmail || '') || masterEmail;
      return op === assignedAdminEmail;
    })
    .map(zeroOutProductPrices);

  const scopedOrders = allOrdersMerged
    .filter((o) => {
      const op = normalizeEmail(o.operatorEmail || o.createdByEmail || '') || masterEmail;
      return op === assignedAdminEmail;
    })
    .map(zeroOutOrderPrices);

  const feedVersion = `${mirror.version}|${assignedAdminEmail}|${warehouseName}|${masterLicenseRec?.expireAt || ''}|${scopedOrders.length}|${scopedProducts.length}`;

  if (queryParams?.sinceVersion && queryParams.sinceVersion === feedVersion && !forceRefresh) {
    return {
      status: 200,
      body: {
        ok: true,
        unchanged: true,
        version: feedVersion,
      },
    };
  }

  const safeOwnProfile: WarehouseManagerProfile = {
    id: workspaceProfile?.id || `wh-${matchedEntry.uid}`,
    uid: matchedEntry.uid,
    name: warehouseName,
    email: matchedEntry.email,
    assignedAdminEmail,
    active: true,
    createdAt: workspaceProfile?.createdAt || matchedEntry.createdAt,
    updatedAt: workspaceProfile?.updatedAt,
  };

  return {
    status: 200,
    body: {
      ok: true,
      unchanged: false,
      pendingInitialSync: false,
      version: feedVersion,
      masterUid,
      masterEmail,
      assignedAdminEmail,
      warehouseProfile: safeOwnProfile,
      settings: {
        personalName: String(mirror.settings.personalName || warehouseName),
        personalPhone: '',
        businessName: String(mirror.settings.businessName || 'DR-POS'),
        darkMode: Boolean(mirror.settings.darkMode),
        language: mirror.settings.language || 'kh',
        currency: mirror.settings.currency || 'en',
        soundEnabled: mirror.settings.soundEnabled !== false,
        warehouses: Array.isArray(mirror.settings.warehouses) ? mirror.settings.warehouses : [],
        stores: Array.isArray(mirror.settings.stores) ? mirror.settings.stores : [],
        groups: Array.isArray(mirror.settings.groups) ? mirror.settings.groups : [],
        categories: Array.isArray(mirror.settings.categories) ? mirror.settings.categories : [],
        accessRules: [],
        saleProfiles: [],
        adminProfiles: [],
        warehouseProfiles: [safeOwnProfile],
      },
      license,
      products: scopedProducts,
      orders: scopedOrders,
    },
  };
}
