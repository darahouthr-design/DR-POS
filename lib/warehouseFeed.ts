import fs from 'fs';
import path from 'path';
import type {
  Order,
  OrderItem,
  Product,
  WarehouseManagerProfile,
  WorkspaceSettings,
} from '../src/types.js';
import {
  DEFAULT_TELEGRAM_URL,
  getFirebaseConfig,
  normalizeEmail,
  readVaultState,
  type ApiResult,
  type WarehouseRegistryRecord,
} from './developerRegistry.js';
import { getMasterPasswordForServerSync } from './masterCredentials.js';
import { getMongoDb, verifyFirebaseIdToken } from './mongoPartition.js';

const MIRROR_COLLECTION = 'drpos_warehouse_mirrors';
const LOCAL_MIRROR_FILE = path.resolve(process.cwd(), 'data', 'warehouse_mirrors.json');
const TMP_MIRROR_FILE = path.join('/tmp', 'drpos_warehouse_mirrors.json');
const LIVE_REFRESH_INTERVAL_MS = 12 * 1000;
const MASTER_TOKEN_SAFETY_MS = 10 * 60 * 1000;

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
}

const g = globalThis as typeof globalThis & {
  __drposWarehouseCache?: GlobalWarehouseCache;
};

if (!g.__drposWarehouseCache) {
  g.__drposWarehouseCache = {
    mirrors: new Map(),
    masterTokens: new Map(),
    liveFetchAt: new Map(),
  };
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
        const prev = merged[k];
        if (!prev || String(doc.updatedAt || '') >= String(prev.updatedAt || '')) {
          merged[k] = doc;
        }
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
}

async function readMirrorDoc(masterUid: string): Promise<WarehouseMirrorDoc | null> {
  const cache = g.__drposWarehouseCache!.mirrors;
  let best: WarehouseMirrorDoc | null = cache.get(masterUid) || null;

  const localMap = readLocalMirrorsMap();
  const localDoc = localMap[masterUid];
  if (localDoc && (!best || String(localDoc.updatedAt || '') > String(best.updatedAt || ''))) {
    best = localDoc;
    cache.set(masterUid, localDoc);
  }

  try {
    const db = await getMongoDb();
    if (db) {
      const mongoDoc = await db
        .collection<WarehouseMirrorDoc>(MIRROR_COLLECTION)
        .findOne({ ownerUid: masterUid }, { projection: { _id: 0 } });
      if (
        mongoDoc &&
        mongoDoc.masterUid &&
        (!best || String(mongoDoc.updatedAt || '') >= String(best.updatedAt || ''))
      ) {
        best = mongoDoc;
        cache.set(masterUid, mongoDoc);
      }
    }
  } catch {
    // Non-fatal
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

async function fetchFirestoreWorkspaceLive(
  masterUid: string,
  masterEmail: string
): Promise<WarehouseMirrorDoc | null> {
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

    const fetchCollectionPages = async (sub: string, maxPages: number, pageSize: number) => {
      const items: Record<string, unknown>[] = [];
      let pageToken = '';
      for (let page = 0; page < maxPages; page++) {
        const qp = new URLSearchParams({
          key: cfg.apiKey,
          pageSize: String(pageSize),
          ...(sub === 'orders' ? { orderBy: 'createdAt desc' } : {}),
          ...(pageToken ? { pageToken } : {}),
        });
        const r = await fetch(`${baseUrl}/${sub}?${qp.toString()}`, {
          method: 'GET',
          headers: authHeaders,
        });
        if (!r.ok) break;
        const pageJson = (await r.json()) as {
          documents?: Array<{ fields?: Record<string, FsRestValue> }>;
          nextPageToken?: string;
        };
        for (const d of pageJson.documents || []) {
          items.push(decodeFsRestFields(d.fields));
        }
        if (!pageJson.nextPageToken) break;
        pageToken = pageJson.nextPageToken;
      }
      return items;
    };

    const [rawProds, rawOrds] = await Promise.all([
      fetchCollectionPages('products', 4, 250),
      fetchCollectionPages('orders', 2, 200),
    ]);

    const products = rawProds.map(sanitizeProductRaw).filter((p) => Boolean(p.id));
    const orders = rawOrds.map(sanitizeOrderRaw).filter((o) => Boolean(o.id));
    const nowIso = new Date().toISOString();
    const version = computeMirrorVersion(masterUid, settings, products, orders);

    return {
      ownerUid: masterUid,
      masterUid,
      masterEmail: normalizeEmail(rootDecoded.ownerEmail || masterEmail),
      settings,
      products,
      orders,
      updatedAt: nowIso,
      source: 'firestore-rest',
      version,
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

  let mirror = await readMirrorDoc(masterUid);
  const lastLiveAt = g.__drposWarehouseCache!.liveFetchAt.get(masterUid) || 0;
  const needsLiveFetch =
    forceRefresh || !mirror || Date.now() - lastLiveAt > LIVE_REFRESH_INTERVAL_MS;

  if (needsLiveFetch) {
    g.__drposWarehouseCache!.liveFetchAt.set(masterUid, Date.now());
    const liveMirror = await fetchFirestoreWorkspaceLive(masterUid, masterEmail);
    if (liveMirror) {
      // Keep newer mirror if a just-committed master sync has strictly newer order count or timestamp
      if (
        !mirror ||
        liveMirror.source === 'firestore-rest' &&
          (liveMirror.products.length > 0 ||
            liveMirror.orders.length >= mirror.orders.length ||
            forceRefresh)
      ) {
        mirror = liveMirror;
        await persistMirrorDoc(liveMirror);
      }
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
