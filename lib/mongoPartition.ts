import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { MongoClient, type Collection, type Db, type Document } from 'mongodb';
import type { Order, StockLogEntry } from '../src/types.js';

export interface FirebaseVerifiedUser {
  uid: string;
  email: string;
}

interface MongoPartitionCacheGlobal {
  clientPromise?: Promise<MongoClient> | null;
  clientUri?: string;
  indexesReady?: boolean;
  tokenCache?: Map<string, { uid: string; email: string; expiresAt: number }>;
  deletedOrderTombstones?: Map<string, number>;
  deletedStockLogTombstones?: Map<string, number>;
}

const g = globalThis as typeof globalThis & {
  __drposMongo?: MongoPartitionCacheGlobal;
};

if (!g.__drposMongo) {
  g.__drposMongo = {
    tokenCache: new Map(),
    deletedOrderTombstones: new Map(),
    deletedStockLogTombstones: new Map(),
  };
}
if (!g.__drposMongo.tokenCache) {
  g.__drposMongo.tokenCache = new Map();
}
if (!g.__drposMongo.deletedOrderTombstones) {
  g.__drposMongo.deletedOrderTombstones = new Map();
}
if (!g.__drposMongo.deletedStockLogTombstones) {
  g.__drposMongo.deletedStockLogTombstones = new Map();
}

const TOKEN_CACHE_TTL_MS = 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
const DELETE_TOMBSTONE_TTL_MS = 24 * 60 * 60 * 1000;
const RECONCILE_GRACE_WINDOW_MS = 15 * 1000;

interface FirebaseClientCfg {
  apiKey: string;
  projectId: string;
}

const FALLBACK_CFG: FirebaseClientCfg = {
  projectId: 'device-streaming-82b54df4',
  apiKey: 'AIzaSyDON4t9Evxw0gkJFATHs9-tAaziRwAvqWo',
};

let cachedFbCfg: FirebaseClientCfg | null = null;

function getFirebaseClientCfg(): FirebaseClientCfg {
  if (cachedFbCfg) return cachedFbCfg;

  const envKey = String(process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || '').trim();
  const envProj = String(
    process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || ''
  ).trim();
  if (envKey && envProj) {
    cachedFbCfg = { apiKey: envKey, projectId: envProj };
    return cachedFbCfg;
  }

  const runtimeDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
  const candidatePaths = [
    path.resolve(process.cwd(), 'firebase-applet-config.json'),
    path.resolve(runtimeDir, '..', 'firebase-applet-config.json'),
  ];
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const parsed = JSON.parse(fs.readFileSync(p, 'utf8')) as Partial<FirebaseClientCfg>;
        if (parsed.apiKey && parsed.projectId) {
          cachedFbCfg = { apiKey: parsed.apiKey, projectId: parsed.projectId };
          return cachedFbCfg;
        }
      }
    } catch {
      // Try next fallback path
    }
  }

  cachedFbCfg = FALLBACK_CFG;
  return cachedFbCfg;
}

export function getMongoUri(): string {
  return String(
    process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL_MONGODB || ''
  ).trim();
}

export function getMongoDbName(): string {
  return String(process.env.MONGODB_DB_NAME || 'drpos_enterprise').trim() || 'drpos_enterprise';
}

export function isMongoConfigured(): boolean {
  const uri = getMongoUri();
  return uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://');
}

function pruneMapIfNeeded<V>(map: Map<string, V>) {
  if (map.size <= MAX_CACHE_ENTRIES) return;
  const toDelete = map.size - Math.floor(MAX_CACHE_ENTRIES * 0.75);
  let count = 0;
  for (const k of map.keys()) {
    map.delete(k);
    count++;
    if (count >= toDelete) break;
  }
}

export async function verifyFirebaseIdToken(
  headers: Record<string, string | string[] | undefined>
): Promise<FirebaseVerifiedUser | null> {
  const rawAuth = headers.authorization ?? headers.Authorization;
  const authStr = Array.isArray(rawAuth) ? String(rawAuth[0] || '') : String(rawAuth || '');
  const idToken = authStr.startsWith('Bearer ') ? authStr.slice(7).trim() : '';
  if (!idToken || idToken.length < 20) return null;

  const cache = g.__drposMongo!.tokenCache!;
  const tokenKey = crypto.createHash('sha256').update(idToken).digest('hex');
  const cached = cache.get(tokenKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { uid: cached.uid, email: cached.email };
  }

  const cfg = getFirebaseClientCfg();
  const lookupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(cfg.apiKey)}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 9000) : null;
    try {
      const res = await fetch(lookupUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        ...(controller ? { signal: controller.signal } : {}),
      });
      if (timer) clearTimeout(timer);

      if (res.ok) {
        const data = (await res.json()) as {
          users?: Array<{ localId?: string; email?: string }>;
        };
        const user = data.users?.[0];
        if (!user?.localId) return null;

        const verified: FirebaseVerifiedUser = {
          uid: String(user.localId),
          email: String(user.email || '').trim().toLowerCase(),
        };
        cache.set(tokenKey, {
          uid: verified.uid,
          email: verified.email,
          expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
        });
        pruneMapIfNeeded(cache);
        return verified;
      }

      // Do not retry on explicit 4xx invalid/expired token responses
      if (res.status >= 400 && res.status < 500) {
        return null;
      }
    } catch {
      if (timer) clearTimeout(timer);
    }

    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return null;
}

async function getMongoDb(): Promise<Db | null> {
  if (!isMongoConfigured()) return null;
  const uri = getMongoUri();
  const state = g.__drposMongo!;

  if (!state.clientPromise || state.clientUri !== uri) {
    state.indexesReady = false;
    state.clientUri = uri;
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 9000,
      connectTimeoutMS: 9000,
      socketTimeoutMS: 15000,
    });
    state.clientPromise = client.connect().catch((err) => {
      state.clientPromise = null;
      throw err;
    });
  }

  const connectedClient = await state.clientPromise;
  const db = connectedClient.db(getMongoDbName());

  if (!state.indexesReady) {
    state.indexesReady = true;
    ensureIndexes(db).catch(() => {
      state.indexesReady = false;
    });
  }

  return db;
}

async function ensureIndexes(db: Db): Promise<void> {
  const ordersCol = db.collection('drpos_orders');
  const stockLogsCol = db.collection('drpos_stock_logs');
  const tombstonesCol = db.collection('drpos_tombstones');

  await Promise.all([
    ordersCol.createIndex({ ownerUid: 1, id: 1 }, { unique: true, background: true }),
    ordersCol.createIndex({ ownerUid: 1, createdAt: -1 }, { background: true }),
    ordersCol.createIndex({ ownerUid: 1, syncedAt: -1 }, { background: true }),
    ordersCol.createIndex({ ownerUid: 1, operatorEmail: 1, createdAt: -1 }, { background: true }),
    ordersCol.createIndex(
      { ownerUid: 1, operatorEmail: 1, paymentStatus: 1, createdAt: -1 },
      { background: true }
    ),
    ordersCol.createIndex(
      { ownerUid: 1, staffNameLower: 1, createdAt: -1 },
      { background: true }
    ),
    ordersCol.createIndex({ ownerUid: 1, customerPhone: 1 }, { background: true }),
    ordersCol.createIndex({ ownerUid: 1, orderNumber: 1 }, { background: true }),
    stockLogsCol.createIndex({ ownerUid: 1, id: 1 }, { unique: true, background: true }),
    stockLogsCol.createIndex({ ownerUid: 1, createdAt: -1 }, { background: true }),
    stockLogsCol.createIndex({ ownerUid: 1, syncedAt: -1 }, { background: true }),
    stockLogsCol.createIndex(
      { ownerUid: 1, operatorEmail: 1, createdAt: -1 },
      { background: true }
    ),
    stockLogsCol.createIndex({ ownerUid: 1, productId: 1, createdAt: -1 }, { background: true }),
    tombstonesCol.createIndex({ ownerUid: 1, kind: 1, docId: 1 }, { unique: true, background: true }),
    tombstonesCol.createIndex({ ownerUid: 1, kind: 1, deletedAt: -1 }, { background: true }),
    tombstonesCol.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true }),
  ]);
}

function recordTombstones(map: Map<string, number>, uid: string, ids: string[]) {
  if (!ids.length) return;
  const expiresAt = Date.now() + DELETE_TOMBSTONE_TTL_MS;
  for (const id of ids) {
    map.set(`${uid}:${id}`, expiresAt);
  }
  pruneMapIfNeeded(map);
}

function isTombstoned(map: Map<string, number>, uid: string, id: string): boolean {
  const key = `${uid}:${id}`;
  const expiresAt = map.get(key);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    map.delete(key);
    return false;
  }
  return true;
}

function listActiveTombstonesForUid(map: Map<string, number>, uid: string): string[] {
  const prefix = `${uid}:`;
  const now = Date.now();
  const ids: string[] = [];
  for (const [key, expiresAt] of map.entries()) {
    if (!key.startsWith(prefix)) continue;
    if (expiresAt <= now) {
      map.delete(key);
      continue;
    }
    ids.push(key.slice(prefix.length));
  }
  return ids;
}

type TombstoneKind = 'order' | 'stock_log' | 'workspace';

async function recordPersistentTombstones(
  db: Db,
  uid: string,
  kind: TombstoneKind,
  ids: string[],
  nowIso: string
): Promise<void> {
  if (!ids.length) return;
  const tombstonesCol = db.collection('drpos_tombstones');
  const expiresAt = new Date(Date.now() + DELETE_TOMBSTONE_TTL_MS);
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const ops = chunk.map((docId) => ({
      updateOne: {
        filter: { ownerUid: uid, kind, docId },
        update: {
          $set: {
            ownerUid: uid,
            kind,
            docId,
            deletedAt: nowIso,
            expiresAt,
          },
        },
        upsert: true,
      },
    }));
    await tombstonesCol.bulkWrite(ops, { ordered: false }).catch(() => {});
  }
}

async function listPersistentTombstones(
  db: Db,
  uid: string,
  kind: TombstoneKind,
  sinceIso = ''
): Promise<string[]> {
  const filter: Record<string, unknown> = {
    ownerUid: uid,
    kind,
  };
  if (sinceIso) {
    filter.deletedAt = { $gt: sinceIso };
  }
  const docs = await db
    .collection('drpos_tombstones')
    .find(filter, { projection: { docId: 1 } })
    .sort({ deletedAt: -1 })
    .limit(600)
    .toArray()
    .catch(() => []);
  return docs.map((d) => String(d.docId || '').trim()).filter(Boolean);
}

async function getPersistentTombstonedSubset(
  db: Db,
  uid: string,
  kind: TombstoneKind,
  candidateIds: string[]
): Promise<Set<string>> {
  if (!candidateIds.length) return new Set();
  const docs = await db
    .collection('drpos_tombstones')
    .find(
      {
        ownerUid: uid,
        kind,
        docId: { $in: candidateIds },
      },
      { projection: { docId: 1 } }
    )
    .toArray()
    .catch(() => []);
  return new Set(docs.map((d) => String(d.docId || '').trim()).filter(Boolean));
}

function escapeRegex(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeOrderForMongo(
  ownerUid: string,
  raw: Partial<Order>,
  syncedAtIso: string
): Document | null {
  const id = String(raw?.id || '').trim();
  if (!id) return null;
  const createdBy = String(raw.createdByEmail || '').trim().toLowerCase();
  const opEmail = String(raw.operatorEmail || createdBy).trim().toLowerCase();
  const staffName = String(raw.staffName || '').trim();

  return {
    ownerUid,
    id,
    orderNumber: String(raw.orderNumber || '').trim(),
    date: String(raw.date || '').trim(),
    time: String(raw.time || '').trim(),
    createdAt: String(raw.createdAt || syncedAtIso),
    customerName: String(raw.customerName || '').trim(),
    customerPhone: String(raw.customerPhone || '').trim(),
    customerAddress: String(raw.customerAddress || '').trim(),
    storeName: String(raw.storeName || '').trim(),
    groupName: String(raw.groupName || '').trim(),
    staffName,
    staffNameLower: staffName.toLowerCase(),
    warehouse: String(raw.warehouse || '').trim(),
    paymentStatus: raw.paymentStatus === 'unpaid' ? 'unpaid' : 'paid',
    dueDate: String(raw.dueDate || '').trim(),
    note: String(raw.note || '').trim(),
    items: Array.isArray(raw.items) ? raw.items : [],
    subtotalAmount: raw.subtotalAmount !== undefined ? Number(raw.subtotalAmount || 0) : undefined,
    discountType: raw.discountType === 'percent' ? 'percent' : 'amount',
    discountValue: Number(raw.discountValue || 0),
    discountAmount: Number(raw.discountAmount || 0),
    totalAmount: Number(raw.totalAmount || 0),
    totalCost: Number(raw.totalCost || 0),
    createdByEmail: createdBy,
    operatorEmail: opEmail,
    syncedAt: syncedAtIso,
  };
}

function sanitizeStockLogForMongo(
  ownerUid: string,
  raw: Partial<StockLogEntry>,
  syncedAtIso: string,
  fallbackEmail = ''
): Document | null {
  const id = String(raw?.id || '').trim();
  if (!id) return null;
  const opEmail = String(raw.operatorEmail || fallbackEmail).trim().toLowerCase();
  return {
    ownerUid,
    id,
    productId: String(raw.productId || '').trim(),
    productName: String(raw.productName || '').trim(),
    addedQuantity: Number(raw.addedQuantity || 0),
    previousStock: Number(raw.previousStock || 0),
    newStock: Number(raw.newStock || 0),
    warehouse: String(raw.warehouse || '').trim(),
    date: String(raw.date || '').trim(),
    createdAt: String(raw.createdAt || syncedAtIso),
    operatorEmail: opEmail,
    syncedAt: syncedAtIso,
  };
}

function stripMongoDoc<T>(doc: Document): T {
  const { _id, ownerUid, syncedAt, staffNameLower, ...rest } = doc as Record<string, unknown>;
  void _id;
  void ownerUid;
  void syncedAt;
  void staffNameLower;
  return rest as T;
}

export interface ApiResult {
  status: number;
  body: Record<string, unknown>;
}

export async function runMongoStatus(): Promise<ApiResult> {
  if (!isMongoConfigured()) {
    return {
      status: 200,
      body: {
        configured: false,
        connected: false,
        mode: 'firebase-only',
      },
    };
  }

  const started = Date.now();
  try {
    const db = await getMongoDb();
    if (!db) {
      return {
        status: 200,
        body: { configured: false, connected: false, mode: 'firebase-only' },
      };
    }
    await db.command({ ping: 1 });
    return {
      status: 200,
      body: {
        configured: true,
        connected: true,
        mode: 'hybrid-firebase-mongodb',
        latencyMs: Date.now() - started,
      },
    };
  } catch (err) {
    return {
      status: 200,
      body: {
        configured: true,
        connected: false,
        mode: 'firebase-fallback',
        error: err instanceof Error ? err.message : 'MongoDB ping failed',
      },
    };
  }
}

export async function runMongoSync(
  headers: Record<string, string | string[] | undefined>,
  payload: Record<string, unknown>
): Promise<ApiResult> {
  if (!isMongoConfigured()) {
    return { status: 200, body: { configured: false, ok: false, skipped: true } };
  }

  const user = await verifyFirebaseIdToken(headers);
  if (!user) {
    return { status: 401, body: { error: 'Unauthorized Firebase session' } };
  }

  let db: Db | null = null;
  try {
    db = await getMongoDb();
  } catch (err) {
    return {
      status: 503,
      body: {
        configured: true,
        connected: false,
        ok: false,
        error: err instanceof Error ? err.message : 'MongoDB connection failed',
      },
    };
  }
  if (!db) {
    return { status: 200, body: { configured: false, ok: false, skipped: true } };
  }

  const ordersCol: Collection<Document> = db.collection('drpos_orders');
  const stockLogsCol: Collection<Document> = db.collection('drpos_stock_logs');
  const tombstonesCol: Collection<Document> = db.collection('drpos_tombstones');
  const orderTombstones = g.__drposMongo!.deletedOrderTombstones!;
  const stockLogTombstones = g.__drposMongo!.deletedStockLogTombstones!;

  const nowIso = new Date().toISOString();
  const deleteWorkspaceAll = payload.deleteWorkspaceAll === true;
  const accountEmails = Array.from(
    new Set(
      (Array.isArray(payload.accountEmails) ? (payload.accountEmails as unknown[]) : [])
        .map((v) => String(v || '').trim().toLowerCase())
        .filter((e) => e.includes('@'))
    )
  );
  if (user.email && !accountEmails.includes(user.email)) {
    accountEmails.push(user.email);
  }

  const upsertOrders = Array.isArray(payload.upsertOrders)
    ? (payload.upsertOrders as Partial<Order>[])
    : [];
  const deleteOrderIds = Array.from(
    new Set(
      (Array.isArray(payload.deleteOrderIds) ? (payload.deleteOrderIds as unknown[]) : [])
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim().slice(0, 160))
        .filter(Boolean)
    )
  ).slice(0, 2000);
  const upsertStockLogs = Array.isArray(payload.upsertStockLogs)
    ? (payload.upsertStockLogs as Partial<StockLogEntry>[])
    : [];
  const deleteStockLogIds = Array.from(
    new Set(
      (Array.isArray(payload.deleteStockLogIds) ? (payload.deleteStockLogIds as unknown[]) : [])
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim().slice(0, 160))
        .filter(Boolean)
    )
  ).slice(0, 2000);
  const rawCutoffIso = typeof payload.deleteStockLogsBeforeIso === 'string'
    ? payload.deleteStockLogsBeforeIso.trim()
    : '';
  const parsedCutoffMs = rawCutoffIso ? Date.parse(rawCutoffIso) : NaN;
  const deleteStockLogsBeforeIso =
    rawCutoffIso && Number.isFinite(parsedCutoffMs) && parsedCutoffMs <= Date.now() + 60_000
      ? new Date(parsedCutoffMs).toISOString()
      : '';

  const rawDeleteOrderScope =
    payload.deleteOrderScope &&
    typeof payload.deleteOrderScope === 'object' &&
    !Array.isArray(payload.deleteOrderScope)
      ? (payload.deleteOrderScope as Record<string, unknown>)
      : null;
  const scopeOperatorEmail =
    rawDeleteOrderScope && typeof rawDeleteOrderScope.operatorEmail === 'string'
      ? rawDeleteOrderScope.operatorEmail.trim().toLowerCase().slice(0, 200)
      : '';
  const scopeStaffName =
    rawDeleteOrderScope && typeof rawDeleteOrderScope.staffName === 'string'
      ? rawDeleteOrderScope.staffName.trim().toLowerCase().slice(0, 160)
      : '';
  const scopeIsMaster =
    Boolean(rawDeleteOrderScope && rawDeleteOrderScope.isMasterAdmin === true) &&
    Boolean(user.email) &&
    scopeOperatorEmail === user.email;
  const hasValidDeleteOrderScope = Boolean(scopeOperatorEmail || scopeStaffName);

  const hasReconcileOrders = Array.isArray(payload.reconcileActiveOrderIds);
  const reconcileActiveOrderIds = hasReconcileOrders
    ? Array.from(
        new Set(
          (payload.reconcileActiveOrderIds as unknown[])
            .filter((v): v is string => typeof v === 'string')
            .map((v) => v.trim().slice(0, 160))
            .filter(Boolean)
        )
      ).slice(0, 1000)
    : [];

  const hasReconcileStockLogs = Array.isArray(payload.reconcileActiveStockLogIds);
  const reconcileActiveStockLogIds = hasReconcileStockLogs
    ? Array.from(
        new Set(
          (payload.reconcileActiveStockLogIds as unknown[])
            .filter((v): v is string => typeof v === 'string')
            .map((v) => v.trim().slice(0, 160))
            .filter(Boolean)
        )
      ).slice(0, 1000)
    : [];

  let syncedOrders = 0;
  let deletedOrders = 0;
  let syncedStockLogs = 0;
  let deletedStockLogs = 0;
  let workspacePurged = false;

  if (deleteWorkspaceAll) {
    const emailFilter =
      accountEmails.length > 0
        ? {
            ownerUid: user.uid,
            $or: [
              { createdByEmail: { $in: accountEmails } },
              { operatorEmail: { $in: accountEmails } },
            ],
          }
        : null;

    const [ordRes, stkRes] = await Promise.all([
      ordersCol.deleteMany({ ownerUid: user.uid }),
      stockLogsCol.deleteMany({ ownerUid: user.uid }),
    ]);
    deletedOrders += ordRes.deletedCount || 0;
    deletedStockLogs += stkRes.deletedCount || 0;

    if (emailFilter) {
      const [ordExtra, stkExtra] = await Promise.all([
        ordersCol.deleteMany(emailFilter),
        stockLogsCol.deleteMany({ ownerUid: user.uid, operatorEmail: { $in: accountEmails } }),
      ]);
      deletedOrders += ordExtra.deletedCount || 0;
      deletedStockLogs += stkExtra.deletedCount || 0;
    }

    await tombstonesCol.deleteMany({ ownerUid: user.uid, kind: { $in: ['order', 'stock_log'] } });
    await recordPersistentTombstones(db, user.uid, 'workspace', [user.uid], nowIso);
    workspacePurged = true;
  }

  // Always apply deletions BEFORE upserts and record persistent + in-memory tombstones
  // so concurrent backfill or multi-Lambda Vercel invocations cannot resurrect deleted reports
  if (deleteOrderIds.length > 0) {
    recordTombstones(orderTombstones, user.uid, deleteOrderIds);
    await recordPersistentTombstones(db, user.uid, 'order', deleteOrderIds, nowIso);
    for (let i = 0; i < deleteOrderIds.length; i += 1000) {
      const chunk = deleteOrderIds.slice(i, i + 1000);
      const res = await ordersCol.deleteMany({
        ownerUid: user.uid,
        id: { $in: chunk },
      });
      deletedOrders += res.deletedCount || 0;
    }
  }

  // Scoped bulk delete ("Delete All Reports" without active filters) removes any unloaded
  // or orphaned MongoDB orders belonging strictly to this ownerUid + operator/sale scope.
  if (hasValidDeleteOrderScope && !deleteWorkspaceAll) {
    const scopeFilter: Record<string, unknown> = { ownerUid: user.uid };
    if (scopeOperatorEmail) {
      if (scopeIsMaster) {
        scopeFilter.$or = [
          { operatorEmail: scopeOperatorEmail },
          {
            operatorEmail: { $in: ['', null] },
            createdByEmail: { $in: [scopeOperatorEmail, '', null] },
          },
          {
            operatorEmail: { $exists: false },
            createdByEmail: { $in: [scopeOperatorEmail, '', null] },
          },
        ];
      } else {
        scopeFilter.operatorEmail = scopeOperatorEmail;
      }
    }
    if (scopeStaffName) {
      scopeFilter.staffNameLower = scopeStaffName;
    }

    const scopedDocs = await ordersCol
      .find(scopeFilter, { projection: { id: 1 } })
      .limit(5000)
      .toArray()
      .catch(() => []);
    const scopedIds = scopedDocs.map((d) => String(d.id || '').trim()).filter(Boolean);
    if (scopedIds.length > 0) {
      recordTombstones(orderTombstones, user.uid, scopedIds);
      await recordPersistentTombstones(db, user.uid, 'order', scopedIds, nowIso);
    }
    const scopeRes = await ordersCol.deleteMany(scopeFilter);
    deletedOrders += scopeRes.deletedCount || 0;
  }

  // Authoritative Firestore -> MongoDB orphan reconciliation:
  // When client sends the complete list of active Firestore order IDs (including empty []),
  // remove any stale/deleted reports still left in MongoDB older than the 15s grace window.
  if (hasReconcileOrders && !deleteWorkspaceAll) {
    const graceCutoffIso = new Date(Date.now() - RECONCILE_GRACE_WINDOW_MS).toISOString();
    const orphanFilter: Record<string, unknown> = {
      ownerUid: user.uid,
      syncedAt: { $lt: graceCutoffIso },
    };
    if (reconcileActiveOrderIds.length > 0) {
      orphanFilter.id = { $nin: reconcileActiveOrderIds };
    }
    const orphanDocs = await ordersCol
      .find(orphanFilter, { projection: { id: 1 } })
      .limit(2000)
      .toArray()
      .catch(() => []);
    const orphanIds = orphanDocs.map((d) => String(d.id || '').trim()).filter(Boolean);
    if (orphanIds.length > 0) {
      recordTombstones(orderTombstones, user.uid, orphanIds);
      await recordPersistentTombstones(db, user.uid, 'order', orphanIds, nowIso);
      const orphanRes = await ordersCol.deleteMany(orphanFilter);
      deletedOrders += orphanRes.deletedCount || 0;
    }
  }

  if (deleteStockLogIds.length > 0) {
    recordTombstones(stockLogTombstones, user.uid, deleteStockLogIds);
    await recordPersistentTombstones(db, user.uid, 'stock_log', deleteStockLogIds, nowIso);
    for (let i = 0; i < deleteStockLogIds.length; i += 1000) {
      const chunk = deleteStockLogIds.slice(i, i + 1000);
      const res = await stockLogsCol.deleteMany({
        ownerUid: user.uid,
        id: { $in: chunk },
      });
      deletedStockLogs += res.deletedCount || 0;
    }
  }

  if (hasReconcileStockLogs && !deleteWorkspaceAll) {
    const graceCutoffIso = new Date(Date.now() - RECONCILE_GRACE_WINDOW_MS).toISOString();
    const orphanLogFilter: Record<string, unknown> = {
      ownerUid: user.uid,
      syncedAt: { $lt: graceCutoffIso },
    };
    if (reconcileActiveStockLogIds.length > 0) {
      orphanLogFilter.id = { $nin: reconcileActiveStockLogIds };
    }
    const orphanLogDocs = await stockLogsCol
      .find(orphanLogFilter, { projection: { id: 1 } })
      .limit(2000)
      .toArray()
      .catch(() => []);
    const orphanLogIds = orphanLogDocs.map((d) => String(d.id || '').trim()).filter(Boolean);
    if (orphanLogIds.length > 0) {
      recordTombstones(stockLogTombstones, user.uid, orphanLogIds);
      await recordPersistentTombstones(db, user.uid, 'stock_log', orphanLogIds, nowIso);
      const orphanLogRes = await stockLogsCol.deleteMany(orphanLogFilter);
      deletedStockLogs += orphanLogRes.deletedCount || 0;
    }
  }

  if (deleteStockLogsBeforeIso && !deleteWorkspaceAll) {
    const expiredDocs = await stockLogsCol
      .find(
        {
          ownerUid: user.uid,
          createdAt: { $lt: deleteStockLogsBeforeIso },
        },
        { projection: { id: 1 } }
      )
      .limit(2000)
      .toArray()
      .catch(() => []);
    const expiredIds = expiredDocs.map((d) => String(d.id || '').trim()).filter(Boolean);
    if (expiredIds.length > 0) {
      recordTombstones(stockLogTombstones, user.uid, expiredIds);
      await recordPersistentTombstones(db, user.uid, 'stock_log', expiredIds, nowIso);
    }
    const cutoffRes = await stockLogsCol.deleteMany({
      ownerUid: user.uid,
      createdAt: { $lt: deleteStockLogsBeforeIso },
    });
    deletedStockLogs += cutoffRes.deletedCount || 0;
  }

  if (upsertOrders.length > 0 && !deleteWorkspaceAll) {
    const sanitized = upsertOrders
      .slice(0, 500)
      .map((o) => sanitizeOrderForMongo(user.uid, o, nowIso))
      .filter((d): d is Document => Boolean(d))
      .filter((d) => !isTombstoned(orderTombstones, user.uid, String(d.id)));

    if (sanitized.length > 0) {
      const candidateIds = sanitized.map((d) => String(d.id));
      const persistentTombstoned = await getPersistentTombstonedSubset(
        db,
        user.uid,
        'order',
        candidateIds
      );
      const ops = sanitized
        .filter((d) => !persistentTombstoned.has(String(d.id)))
        .map((doc) => ({
          updateOne: {
            filter: { ownerUid: user.uid, id: doc.id },
            update: { $set: doc },
            upsert: true,
          },
        }));
      if (ops.length > 0) {
        await ordersCol.bulkWrite(ops, { ordered: false });
        syncedOrders = ops.length;
      }
    }
  }

  if (upsertStockLogs.length > 0 && !deleteWorkspaceAll) {
    const sanitized = upsertStockLogs
      .slice(0, 500)
      .map((l) => sanitizeStockLogForMongo(user.uid, l, nowIso, user.email))
      .filter((d): d is Document => Boolean(d))
      .filter((d) => !isTombstoned(stockLogTombstones, user.uid, String(d.id)))
      .filter(
        (d) =>
          !deleteStockLogsBeforeIso ||
          !d.createdAt ||
          String(d.createdAt) >= deleteStockLogsBeforeIso
      );

    if (sanitized.length > 0) {
      const candidateIds = sanitized.map((d) => String(d.id));
      const persistentTombstoned = await getPersistentTombstonedSubset(
        db,
        user.uid,
        'stock_log',
        candidateIds
      );
      const ops = sanitized
        .filter((d) => !persistentTombstoned.has(String(d.id)))
        .map((doc) => ({
          updateOne: {
            filter: { ownerUid: user.uid, id: doc.id },
            update: { $set: doc },
            upsert: true,
          },
        }));
      if (ops.length > 0) {
        await stockLogsCol.bulkWrite(ops, { ordered: false });
        syncedStockLogs = ops.length;
      }
    }
  }

  return {
    status: 200,
    body: {
      configured: true,
      ok: true,
      serverNow: nowIso,
      syncedOrders,
      deletedOrders,
      syncedStockLogs,
      deletedStockLogs,
      workspacePurged,
    },
  };
}

export async function runMongoChanges(
  headers: Record<string, string | string[] | undefined>,
  payload: Record<string, unknown>
): Promise<ApiResult> {
  if (!isMongoConfigured()) {
    return { status: 200, body: { configured: false, ok: false } };
  }

  const user = await verifyFirebaseIdToken(headers);
  if (!user) {
    return { status: 401, body: { error: 'Unauthorized Firebase session' } };
  }

  const db = await getMongoDb();
  if (!db) {
    return { status: 200, body: { configured: false, ok: false } };
  }

  const serverNow = new Date().toISOString();
  const since = String(payload.since || '').trim();

  const [deletedOrderIds, deletedStockLogIds, wsTombstones] = await Promise.all([
    listPersistentTombstones(db, user.uid, 'order', since),
    listPersistentTombstones(db, user.uid, 'stock_log', since),
    since ? listPersistentTombstones(db, user.uid, 'workspace', since) : Promise.resolve([]),
  ]);

  if (!since) {
    return {
      status: 200,
      body: {
        configured: true,
        ok: true,
        serverNow,
        deletedOrderIds,
        deletedStockLogIds,
        recentOrders: [],
        recentStockLogs: [],
        workspaceDeleted: false,
      },
    };
  }

  const [orderDocs, stockLogDocs] = await Promise.all([
    db
      .collection('drpos_orders')
      .find({ ownerUid: user.uid, syncedAt: { $gt: since } })
      .sort({ createdAt: -1 })
      .limit(60)
      .toArray()
      .catch(() => []),
    db
      .collection('drpos_stock_logs')
      .find({ ownerUid: user.uid, syncedAt: { $gt: since } })
      .sort({ createdAt: -1 })
      .limit(40)
      .toArray()
      .catch(() => []),
  ]);

  const delOrderSet = new Set(deletedOrderIds);
  const delStockSet = new Set(deletedStockLogIds);

  const recentOrders = orderDocs
    .map((d) => stripMongoDoc<Order>(d))
    .filter((o) => o?.id && !delOrderSet.has(o.id));
  const recentStockLogs = stockLogDocs
    .map((d) => stripMongoDoc<StockLogEntry>(d))
    .filter((l) => l?.id && !delStockSet.has(l.id));

  return {
    status: 200,
    body: {
      configured: true,
      ok: true,
      serverNow,
      deletedOrderIds,
      deletedStockLogIds,
      recentOrders,
      recentStockLogs,
      workspaceDeleted: wsTombstones.includes(user.uid),
    },
  };
}

export async function runMongoQueryOrders(
  headers: Record<string, string | string[] | undefined>,
  payload: Record<string, unknown>
): Promise<ApiResult> {
  if (!isMongoConfigured()) {
    return { status: 200, body: { configured: false, ok: false, orders: [], hasMore: false } };
  }

  const user = await verifyFirebaseIdToken(headers);
  if (!user) {
    return { status: 401, body: { error: 'Unauthorized Firebase session' } };
  }

  const db = await getMongoDb();
  if (!db) {
    return { status: 200, body: { configured: false, ok: false, orders: [], hasMore: false } };
  }

  const operatorEmail = String(payload.operatorEmail || '').trim().toLowerCase();
  const staffName = String(payload.staffName || '').trim().toLowerCase();
  const paymentStatus =
    payload.paymentStatus === 'paid' || payload.paymentStatus === 'unpaid'
      ? payload.paymentStatus
      : '';
  const searchText = String(payload.search || '').trim();
  const cursorCreatedAt = String(payload.cursorCreatedAt || '').trim();
  const excludeIds = Array.isArray(payload.excludeIds)
    ? (payload.excludeIds as unknown[]).map((x) => String(x || '')).filter(Boolean).slice(0, 300)
    : [];
  const limitNum = Math.min(200, Math.max(10, Math.floor(Number(payload.limit) || 60)));

  const localTombstones = listActiveTombstonesForUid(
    g.__drposMongo!.deletedOrderTombstones!,
    user.uid
  );
  const persistentTombstones = await listPersistentTombstones(db, user.uid, 'order');
  const combinedExcludeIds = Array.from(
    new Set([...excludeIds, ...localTombstones, ...persistentTombstones])
  );

  const filter: Record<string, unknown> = { ownerUid: user.uid };
  if (operatorEmail) {
    filter.operatorEmail = operatorEmail;
  }
  if (staffName) {
    filter.staffNameLower = staffName;
  }
  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }
  if (cursorCreatedAt) {
    filter.createdAt = { $lt: cursorCreatedAt };
  }
  if (combinedExcludeIds.length > 0) {
    filter.id = { $nin: combinedExcludeIds };
  }
  if (searchText) {
    const rx = new RegExp(escapeRegex(searchText.slice(0, 80)), 'i');
    filter.$or = [{ orderNumber: rx }, { customerName: rx }, { customerPhone: rx }];
  }

  const started = Date.now();
  const docs = await db
    .collection('drpos_orders')
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limitNum + 1)
    .toArray();

  const hasMore = docs.length > limitNum;
  const pageDocs = hasMore ? docs.slice(0, limitNum) : docs;
  const orders = pageDocs.map((d) => stripMongoDoc<Order>(d));
  const nextCursor = orders.length > 0 ? orders[orders.length - 1].createdAt : '';

  return {
    status: 200,
    body: {
      configured: true,
      ok: true,
      orders,
      hasMore,
      nextCursor,
      queryMs: Date.now() - started,
    },
  };
}

export async function runMongoQueryStockLogs(
  headers: Record<string, string | string[] | undefined>,
  payload: Record<string, unknown>
): Promise<ApiResult> {
  if (!isMongoConfigured()) {
    return { status: 200, body: { configured: false, ok: false, stockLogs: [], hasMore: false } };
  }

  const user = await verifyFirebaseIdToken(headers);
  if (!user) {
    return { status: 401, body: { error: 'Unauthorized Firebase session' } };
  }

  const db = await getMongoDb();
  if (!db) {
    return { status: 200, body: { configured: false, ok: false, stockLogs: [], hasMore: false } };
  }

  const operatorEmail = String(payload.operatorEmail || '').trim().toLowerCase();
  const cursorCreatedAt = String(payload.cursorCreatedAt || '').trim();
  const excludeIds = Array.isArray(payload.excludeIds)
    ? (payload.excludeIds as unknown[]).map((x) => String(x || '')).filter(Boolean).slice(0, 300)
    : [];
  const limitNum = Math.min(200, Math.max(10, Math.floor(Number(payload.limit) || 40)));

  const localTombstones = listActiveTombstonesForUid(
    g.__drposMongo!.deletedStockLogTombstones!,
    user.uid
  );
  const persistentTombstones = await listPersistentTombstones(db, user.uid, 'stock_log');
  const combinedExcludeIds = Array.from(
    new Set([...excludeIds, ...localTombstones, ...persistentTombstones])
  );

  const filter: Record<string, unknown> = { ownerUid: user.uid };
  if (operatorEmail) {
    filter.operatorEmail = operatorEmail;
  }
  if (cursorCreatedAt) {
    filter.createdAt = { $lt: cursorCreatedAt };
  }
  if (combinedExcludeIds.length > 0) {
    filter.id = { $nin: combinedExcludeIds };
  }

  const started = Date.now();
  const docs = await db
    .collection('drpos_stock_logs')
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limitNum + 1)
    .toArray();

  const hasMore = docs.length > limitNum;
  const pageDocs = hasMore ? docs.slice(0, limitNum) : docs;
  const stockLogs = pageDocs.map((d) => stripMongoDoc<StockLogEntry>(d));
  const nextCursor = stockLogs.length > 0 ? stockLogs[stockLogs.length - 1].createdAt : '';

  return {
    status: 200,
    body: {
      configured: true,
      ok: true,
      stockLogs,
      hasMore,
      nextCursor,
      queryMs: Date.now() - started,
    },
  };
}

export async function runMongoAnalytics(
  headers: Record<string, string | string[] | undefined>,
  payload: Record<string, unknown>
): Promise<ApiResult> {
  if (!isMongoConfigured()) {
    return { status: 200, body: { configured: false, ok: false } };
  }

  const user = await verifyFirebaseIdToken(headers);
  if (!user) {
    return { status: 401, body: { error: 'Unauthorized Firebase session' } };
  }

  const db = await getMongoDb();
  if (!db) {
    return { status: 200, body: { configured: false, ok: false } };
  }

  const operatorEmail = String(payload.operatorEmail || '').trim().toLowerCase();
  const staffName = String(payload.staffName || '').trim().toLowerCase();

  const localTombstones = listActiveTombstonesForUid(
    g.__drposMongo!.deletedOrderTombstones!,
    user.uid
  );
  const persistentTombstones = await listPersistentTombstones(db, user.uid, 'order');
  const combinedExcludeIds = Array.from(new Set([...localTombstones, ...persistentTombstones]));

  const match: Record<string, unknown> = { ownerUid: user.uid };
  if (operatorEmail) match.operatorEmail = operatorEmail;
  if (staffName) match.staffNameLower = staffName;
  if (combinedExcludeIds.length > 0) {
    match.id = { $nin: combinedExcludeIds };
  }

  const started = Date.now();
  const agg = await db
    .collection('drpos_orders')
    .aggregate([
      { $match: match },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
                totalCost: { $sum: { $ifNull: ['$totalCost', 0] } },
                paidCount: {
                  $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] },
                },
                unpaidCount: {
                  $sum: { $cond: [{ $eq: ['$paymentStatus', 'unpaid'] }, 1, 0] },
                },
                unpaidAmount: {
                  $sum: {
                    $cond: [
                      { $eq: ['$paymentStatus', 'unpaid'] },
                      { $ifNull: ['$totalAmount', 0] },
                      0,
                    ],
                  },
                },
              },
            },
          ],
          topProducts: [
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.productName',
                quantity: { $sum: '$items.quantity' },
                revenue: {
                  $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] },
                },
              },
            },
            { $sort: { quantity: -1 } },
            { $limit: 8 },
          ],
        },
      },
    ])
    .toArray();

  const rawTotals = agg[0]?.totals?.[0] || {
    totalOrders: 0,
    totalRevenue: 0,
    totalCost: 0,
    paidCount: 0,
    unpaidCount: 0,
    unpaidAmount: 0,
  };
  const topProducts = (agg[0]?.topProducts || []).map(
    (p: { _id: string; quantity: number; revenue: number }) => ({
      name: String(p._id || ''),
      quantity: Number(p.quantity || 0),
      revenue: Number(p.revenue || 0),
    })
  );

  return {
    status: 200,
    body: {
      configured: true,
      ok: true,
      summary: {
        totalOrders: Number(rawTotals.totalOrders || 0),
        totalRevenue: Number(rawTotals.totalRevenue || 0),
        totalCost: Number(rawTotals.totalCost || 0),
        netProfit: Number(rawTotals.totalRevenue || 0) - Number(rawTotals.totalCost || 0),
        paidCount: Number(rawTotals.paidCount || 0),
        unpaidCount: Number(rawTotals.unpaidCount || 0),
        unpaidAmount: Number(rawTotals.unpaidAmount || 0),
      },
      topProducts,
      queryMs: Date.now() - started,
    },
  };
}
