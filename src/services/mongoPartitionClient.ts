import { auth } from '../firebase';
import type { Order, StockLogEntry } from '../types';

type MongoAvailability = 'unknown' | 'active' | 'transient-unavailable' | 'not-configured';

let mongoState: MongoAvailability = 'unknown';
let inFlightCheck: Promise<boolean> | null = null;
let lastCheckedAt = 0;

const RECHECK_INTERVAL_MS = 5 * 60 * 1000;
const NOT_CONFIGURED_TTL_MS = 5 * 60 * 1000;
const TRANSIENT_COOLDOWN_MS = 4 * 1000;
const DELETE_TOMBSTONE_TTL_MS = 30 * 60 * 1000;

const PENDING_ORDERS_DEL_KEY = 'drpos_mongo_pending_del_orders';
const PENDING_ORDERS_SCOPE_DEL_KEY = 'drpos_mongo_pending_del_orders_scope';
const PENDING_STOCK_LOGS_DEL_KEY = 'drpos_mongo_pending_del_stock_logs';
const PENDING_ORDERS_UPSERT_KEY = 'drpos_mongo_pending_upsert_orders';
const PENDING_STOCK_LOGS_UPSERT_KEY = 'drpos_mongo_pending_upsert_stock_logs';
const PENDING_WS_DEL_KEY = 'drpos_mongo_pending_del_ws';
const PENDING_WS_DEL_EMAILS_KEY = 'drpos_mongo_pending_del_ws_emails';

export interface MongoOrderDeleteScope {
  operatorEmail?: string;
  staffName?: string;
  isMasterAdmin?: boolean;
}

const backfilledThisSession = new Set<string>();
const recentDeletedOrderExpiry = new Map<string, number>();
const recentDeletedStockLogExpiry = new Map<string, number>();
const inFlightOrderDeleteIds = new Set<string>();
const inFlightStockLogDeleteIds = new Set<string>();
const lastReconciledOrdersSigByUid = new Map<string, string>();
const lastReconciledStockLogsSigByUid = new Map<string, string>();

let flushDeletesInFlight: Promise<void> | null = null;
let flushUpsertsInFlight: Promise<void> | null = null;
let retryTimerId: number | null = null;
let retryAttemptCount = 0;
let listenersBound = false;

export interface LocalSyncBroadcastMessage {
  type: 'mongo:synced' | 'mongo:deleted' | 'workspace:deleted';
  kind?: 'order' | 'stock_log' | 'workspace';
  ids?: string[];
  uid?: string;
  ts: number;
}

const syncBroadcastListeners = new Set<(msg: LocalSyncBroadcastMessage) => void>();
let bcChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!bcChannel) {
    try {
      bcChannel = new BroadcastChannel('drpos_sync');
      bcChannel.onmessage = (ev) => {
        const msg = ev?.data as LocalSyncBroadcastMessage | undefined;
        if (!msg || typeof msg !== 'object') return;
        for (const cb of syncBroadcastListeners) {
          try {
            cb(msg);
          } catch {
            // Ignore subscriber errors
          }
        }
      };
    } catch {
      bcChannel = null;
    }
  }
  return bcChannel;
}

export function broadcastLocalSyncEvent(msg: Omit<LocalSyncBroadcastMessage, 'ts'>): void {
  const full: LocalSyncBroadcastMessage = { ...msg, ts: Date.now() };
  const ch = getBroadcastChannel();
  if (ch) {
    try {
      ch.postMessage(full);
    } catch {
      // Ignore postMessage failure
    }
  }
}

export function subscribeToLocalSyncBroadcast(
  cb: (msg: LocalSyncBroadcastMessage) => void
): () => void {
  getBroadcastChannel();
  syncBroadcastListeners.add(cb);
  return () => {
    syncBroadcastListeners.delete(cb);
  };
}

function readStorageArray(key: string): string[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? Array.from(new Set(parsed.map((v) => String(v || '').trim()).filter(Boolean)))
      : [];
  } catch {
    return [];
  }
}

function writeStorageArray(key: string, items: string[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(items.slice(-2000)));
    }
  } catch {
    // Ignore storage quota errors
  }
}

function readStorageRecord<T>(key: string): Record<string, T> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, T>)
      : {};
  } catch {
    return {};
  }
}

function writeStorageRecord<T>(key: string, record: Record<string, T>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const entries = Object.entries(record);
    if (entries.length === 0) {
      window.localStorage.removeItem(key);
    } else {
      const capped = entries.slice(-400);
      window.localStorage.setItem(key, JSON.stringify(Object.fromEntries(capped)));
    }
  } catch {
    // Ignore storage quota errors
  }
}

function addPendingUpserts<T extends { id: string }>(key: string, items: T[]): void {
  if (!items.length) return;
  const current = readStorageRecord<T>(key);
  for (const item of items) {
    if (item?.id) current[item.id] = item;
  }
  writeStorageRecord(key, current);
}

function removePendingUpserts<T>(key: string, ids: string[]): void {
  if (!ids.length) return;
  const current = readStorageRecord<T>(key);
  let modified = false;
  for (const id of ids) {
    if (id in current) {
      delete current[id];
      modified = true;
    }
  }
  if (modified) {
    writeStorageRecord(key, current);
  }
}

function addPendingIdsToStorage(key: string, ids: string[]): void {
  if (!ids.length) return;
  const merged = Array.from(new Set([...readStorageArray(key), ...ids]));
  writeStorageArray(key, merged);
}

function removePendingIdsFromStorage(key: string, ids: string[]): void {
  if (!ids.length) return;
  const removeSet = new Set(ids);
  const next = readStorageArray(key).filter((id) => !removeSet.has(id));
  writeStorageArray(key, next);
}

function markLocalTombstones(map: Map<string, number>, ids: string[]): void {
  const expiresAt = Date.now() + DELETE_TOMBSTONE_TTL_MS;
  for (const id of ids) {
    map.set(id, expiresAt);
  }
  if (map.size > 1500) {
    const now = Date.now();
    for (const [k, exp] of map.entries()) {
      if (exp <= now) map.delete(k);
    }
  }
}

function isLocallyDeleted(map: Map<string, number>, pendingKey: string, id: string): boolean {
  const exp = map.get(id);
  if (exp) {
    if (exp > Date.now()) return true;
    map.delete(id);
  }
  return readStorageArray(pendingKey).includes(id);
}

function sanitizeOrderDeleteScope(
  scope?: MongoOrderDeleteScope | null
): MongoOrderDeleteScope | null {
  if (!scope || typeof scope !== 'object') return null;
  const operatorEmail = String(scope.operatorEmail || '').trim().toLowerCase().slice(0, 200);
  const staffName = String(scope.staffName || '').trim().slice(0, 160);
  const isMasterAdmin = Boolean(scope.isMasterAdmin);
  if (!operatorEmail && !staffName) return null;
  return {
    ...(operatorEmail ? { operatorEmail } : {}),
    ...(staffName ? { staffName } : {}),
    ...(isMasterAdmin ? { isMasterAdmin: true } : {}),
  };
}

function readPendingOrderDeleteScopes(): MongoOrderDeleteScope[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(PENDING_ORDERS_SCOPE_DEL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => sanitizeOrderDeleteScope(item as MongoOrderDeleteScope))
      .filter((item): item is MongoOrderDeleteScope => Boolean(item));
  } catch {
    return [];
  }
}

function writePendingOrderDeleteScopes(scopes: MongoOrderDeleteScope[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (scopes.length === 0) {
      window.localStorage.removeItem(PENDING_ORDERS_SCOPE_DEL_KEY);
    } else {
      window.localStorage.setItem(PENDING_ORDERS_SCOPE_DEL_KEY, JSON.stringify(scopes.slice(-20)));
    }
  } catch {
    // Ignore storage quota errors
  }
}

function scopeKey(scope: MongoOrderDeleteScope): string {
  return `${scope.operatorEmail || ''}|${(scope.staffName || '').toLowerCase()}|${scope.isMasterAdmin ? '1' : '0'}`;
}

function addPendingOrderDeleteScope(scope: MongoOrderDeleteScope): void {
  const existing = readPendingOrderDeleteScopes();
  const key = scopeKey(scope);
  if (!existing.some((s) => scopeKey(s) === key)) {
    writePendingOrderDeleteScopes([...existing, scope]);
  }
}

function removePendingOrderDeleteScope(scope: MongoOrderDeleteScope): void {
  const key = scopeKey(scope);
  const next = readPendingOrderDeleteScopes().filter((s) => scopeKey(s) !== key);
  writePendingOrderDeleteScopes(next);
}

function removePendingUpsertsByScope(scope: MongoOrderDeleteScope): void {
  const current = readStorageRecord<Order>(PENDING_ORDERS_UPSERT_KEY);
  const opTarget = (scope.operatorEmail || '').trim().toLowerCase();
  const staffTarget = (scope.staffName || '').trim().toLowerCase();
  let modified = false;
  for (const [id, order] of Object.entries(current)) {
    const orderOp = String(order?.operatorEmail || order?.createdByEmail || '').trim().toLowerCase();
    const orderStaff = String(order?.staffName || '').trim().toLowerCase();
    const opMatches =
      !opTarget ||
      orderOp === opTarget ||
      (Boolean(scope.isMasterAdmin) && !orderOp);
    const staffMatches = !staffTarget || orderStaff === staffTarget;
    if (opMatches && staffMatches) {
      delete current[id];
      modified = true;
    }
  }
  if (modified) {
    writeStorageRecord(PENDING_ORDERS_UPSERT_KEY, current);
  }
}

export function markOrdersDeletedLocally(orderIds: string[]): string[] {
  const cleanIds = Array.from(
    new Set(orderIds.map((id) => String(id || '').trim()).filter(Boolean))
  );
  if (!cleanIds.length) return [];
  removePendingUpserts<Order>(PENDING_ORDERS_UPSERT_KEY, cleanIds);
  markLocalTombstones(recentDeletedOrderExpiry, cleanIds);
  addPendingIdsToStorage(PENDING_ORDERS_DEL_KEY, cleanIds);
  broadcastLocalSyncEvent({ type: 'mongo:deleted', kind: 'order', ids: cleanIds });
  return cleanIds;
}

export function markStockLogsDeletedLocally(stockLogIds: string[]): string[] {
  const cleanIds = Array.from(
    new Set(stockLogIds.map((id) => String(id || '').trim()).filter(Boolean))
  );
  if (!cleanIds.length) return [];
  removePendingUpserts<StockLogEntry>(PENDING_STOCK_LOGS_UPSERT_KEY, cleanIds);
  markLocalTombstones(recentDeletedStockLogExpiry, cleanIds);
  addPendingIdsToStorage(PENDING_STOCK_LOGS_DEL_KEY, cleanIds);
  broadcastLocalSyncEvent({ type: 'mongo:deleted', kind: 'stock_log', ids: cleanIds });
  return cleanIds;
}

function hasAnyPendingOps(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  if (window.localStorage.getItem(PENDING_WS_DEL_KEY) === '1') return true;
  if (readStorageArray(PENDING_ORDERS_DEL_KEY).length > 0) return true;
  if (readPendingOrderDeleteScopes().length > 0) return true;
  if (readStorageArray(PENDING_STOCK_LOGS_DEL_KEY).length > 0) return true;
  if (Object.keys(readStorageRecord(PENDING_ORDERS_UPSERT_KEY)).length > 0) return true;
  if (Object.keys(readStorageRecord(PENDING_STOCK_LOGS_UPSERT_KEY)).length > 0) return true;
  return false;
}

function schedulePendingRetry(): void {
  if (typeof window === 'undefined') return;
  if (!hasAnyPendingOps()) {
    retryAttemptCount = 0;
    return;
  }
  if (retryTimerId !== null) return;
  const delays = [2500, 6000, 15000];
  const delay = delays[Math.min(retryAttemptCount, delays.length - 1)];
  retryAttemptCount = Math.min(retryAttemptCount + 1, delays.length);
  retryTimerId = window.setTimeout(() => {
    retryTimerId = null;
    void flushAllPendingMongoOps();
  }, delay);
}

export async function flushAllPendingMongoOps(): Promise<void> {
  await flushPendingMongoDeletes();
  await flushPendingMongoUpserts();
  if (!hasAnyPendingOps()) {
    retryAttemptCount = 0;
  } else {
    schedulePendingRetry();
  }
}

function bindOnlineFlushListener(): void {
  if (listenersBound || typeof window === 'undefined') return;
  listenersBound = true;
  const triggerFlush = () => {
    void flushAllPendingMongoOps();
  };
  window.addEventListener('online', triggerFlush);
  window.addEventListener('focus', triggerFlush);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        triggerFlush();
      }
    });
  }
}

export async function ensureMongoAvailable(forceRefresh = false): Promise<boolean> {
  const now = Date.now();
  if (mongoState === 'active' && !forceRefresh && now - lastCheckedAt < RECHECK_INTERVAL_MS) {
    return true;
  }
  if (
    mongoState === 'not-configured' &&
    !forceRefresh &&
    now - lastCheckedAt < NOT_CONFIGURED_TTL_MS
  ) {
    return false;
  }
  if (
    mongoState === 'transient-unavailable' &&
    !forceRefresh &&
    now - lastCheckedAt < TRANSIENT_COOLDOWN_MS
  ) {
    return false;
  }
  if (inFlightCheck) return inFlightCheck;

  inFlightCheck = (async () => {
    try {
      const res = await fetch('/api/mongodb?action=status', {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) {
        mongoState = 'transient-unavailable';
        lastCheckedAt = Date.now();
        return false;
      }
      const data = (await res.json().catch(() => ({}))) as {
        configured?: boolean;
        connected?: boolean;
      };
      if (data.configured === false) {
        mongoState = 'not-configured';
        lastCheckedAt = Date.now();
        return false;
      }
      const isReady = Boolean(data.configured && data.connected);
      mongoState = isReady ? 'active' : 'transient-unavailable';
      lastCheckedAt = Date.now();
      return isReady;
    } catch {
      mongoState = 'transient-unavailable';
      lastCheckedAt = Date.now();
      return false;
    } finally {
      inFlightCheck = null;
    }
  })();

  return inFlightCheck;
}

let lastMongoErrorDetail = '';

export function getLastMongoErrorDetail(): string {
  return lastMongoErrorDetail;
}

async function getFirebaseAuthHeaders(forceRefresh = false): Promise<Record<string, string> | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const token = await user.getIdToken(forceRefresh);
    if (!token) return null;
    return {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      Authorization: `Bearer ${token}`,
    };
  } catch {
    return null;
  }
}

async function postMongoAction<T extends { configured?: boolean }>(
  action: 'sync' | 'changes' | 'orders' | 'stock-logs' | 'analytics',
  payload: Record<string, unknown>,
  options: {
    maxAttempts?: number;
    forceRefreshIfDisabled?: boolean;
    forceRefreshToken?: boolean;
    timeoutMs?: number;
    keepalive?: boolean;
  } = {}
): Promise<T | null> {
  const {
    maxAttempts = 2,
    forceRefreshIfDisabled = false,
    forceRefreshToken = false,
    timeoutMs = 12000,
    keepalive = false,
  } = options;

  const now = Date.now();
  if (
    mongoState === 'not-configured' &&
    !forceRefreshIfDisabled &&
    now - lastCheckedAt < NOT_CONFIGURED_TTL_MS
  ) {
    return null;
  }

  let headers = await getFirebaseAuthHeaders(forceRefreshToken);
  if (!headers) {
    lastMongoErrorDetail = 'Firebase auth session unavailable';
    return null;
  }

  const bodyStr = JSON.stringify(payload);
  const canKeepalive = keepalive && bodyStr.length < 55000;
  let tokenRefreshedOn401 = forceRefreshToken;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const res = await fetch(`/api/mongodb?action=${action}`, {
        method: 'POST',
        cache: 'no-store',
        headers,
        body: bodyStr,
        ...(canKeepalive ? { keepalive: true } : {}),
        ...(controller ? { signal: controller.signal } : {}),
      });
      if (timer !== null) window.clearTimeout(timer);

      if (res.ok) {
        lastMongoErrorDetail = '';
        const data = (await res.json()) as T;
        if (data && data.configured === false) {
          mongoState = 'not-configured';
          lastCheckedAt = Date.now();
        } else {
          mongoState = 'active';
          lastCheckedAt = Date.now();
        }
        return data;
      }

      const errPayload = (await res.json().catch(() => null)) as { error?: string } | null;
      lastMongoErrorDetail = errPayload?.error
        ? `HTTP ${res.status}: ${errPayload.error}`
        : `HTTP ${res.status}`;

      if (res.status === 401 && !tokenRefreshedOn401) {
        tokenRefreshedOn401 = true;
        const freshHeaders = await getFirebaseAuthHeaders(true);
        if (freshHeaders) {
          headers = freshHeaders;
          continue;
        }
      }

      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
        return null;
      }
      mongoState = 'transient-unavailable';
      lastCheckedAt = Date.now();
    } catch (err) {
      if (timer !== null) window.clearTimeout(timer);
      lastMongoErrorDetail = err instanceof Error ? err.message : 'Network or timeout error';
      mongoState = 'transient-unavailable';
      lastCheckedAt = Date.now();
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 350 * attempt));
    }
  }

  return null;
}

export async function flushPendingMongoDeletes(): Promise<void> {
  bindOnlineFlushListener();
  if (flushDeletesInFlight) return flushDeletesInFlight;

  const pendingWs =
    typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem(PENDING_WS_DEL_KEY) === '1'
      : false;
  const pendingOrders = readStorageArray(PENDING_ORDERS_DEL_KEY).filter(
    (id) => !inFlightOrderDeleteIds.has(id)
  );
  const pendingOrderScopes = readPendingOrderDeleteScopes();
  const pendingLogs = readStorageArray(PENDING_STOCK_LOGS_DEL_KEY).filter(
    (id) => !inFlightStockLogDeleteIds.has(id)
  );

  if (
    !pendingWs &&
    pendingOrders.length === 0 &&
    pendingOrderScopes.length === 0 &&
    pendingLogs.length === 0
  ) {
    return;
  }

  flushDeletesInFlight = (async () => {
    try {
      if (pendingWs) {
        const storedEmails = readStorageArray(PENDING_WS_DEL_EMAILS_KEY);
        const res = await postMongoAction<{ configured?: boolean; ok?: boolean }>(
          'sync',
          { deleteWorkspaceAll: true, accountEmails: storedEmails },
          { maxAttempts: 3, forceRefreshIfDisabled: true, timeoutMs: 25000 }
        );
        if (res && (res.ok || res.configured === false) && typeof window !== 'undefined') {
          window.localStorage.removeItem(PENDING_WS_DEL_KEY);
          window.localStorage.removeItem(PENDING_WS_DEL_EMAILS_KEY);
        }
      }

      if (pendingOrders.length > 0) {
        for (let i = 0; i < pendingOrders.length; i += 500) {
          const chunk = pendingOrders.slice(i, i + 500);
          for (const id of chunk) inFlightOrderDeleteIds.add(id);
          try {
            const res = await postMongoAction<{ configured?: boolean; ok?: boolean }>(
              'sync',
              { deleteOrderIds: chunk },
              { maxAttempts: 3, forceRefreshIfDisabled: true, timeoutMs: 20000 }
            );
            if (res && (res.ok || res.configured === false)) {
              removePendingIdsFromStorage(PENDING_ORDERS_DEL_KEY, chunk);
            } else {
              schedulePendingRetry();
              break;
            }
          } finally {
            for (const id of chunk) inFlightOrderDeleteIds.delete(id);
          }
        }
      }

      if (pendingOrderScopes.length > 0) {
        for (const scope of pendingOrderScopes) {
          const res = await postMongoAction<{ configured?: boolean; ok?: boolean }>(
            'sync',
            { deleteOrderScope: scope },
            { maxAttempts: 3, forceRefreshIfDisabled: true, timeoutMs: 20000 }
          );
          if (res && (res.ok || res.configured === false)) {
            removePendingOrderDeleteScope(scope);
          } else {
            schedulePendingRetry();
            break;
          }
        }
      }

      if (pendingLogs.length > 0) {
        for (let i = 0; i < pendingLogs.length; i += 500) {
          const chunk = pendingLogs.slice(i, i + 500);
          for (const id of chunk) inFlightStockLogDeleteIds.add(id);
          try {
            const res = await postMongoAction<{ configured?: boolean; ok?: boolean }>(
              'sync',
              { deleteStockLogIds: chunk },
              { maxAttempts: 3, forceRefreshIfDisabled: true, timeoutMs: 20000 }
            );
            if (res && (res.ok || res.configured === false)) {
              removePendingIdsFromStorage(PENDING_STOCK_LOGS_DEL_KEY, chunk);
            } else {
              schedulePendingRetry();
              break;
            }
          } finally {
            for (const id of chunk) inFlightStockLogDeleteIds.delete(id);
          }
        }
      }
    } finally {
      flushDeletesInFlight = null;
    }
  })();

  return flushDeletesInFlight;
}

async function flushPendingMongoUpserts(): Promise<void> {
  bindOnlineFlushListener();
  if (flushUpsertsInFlight) return flushUpsertsInFlight;

  const orderMap = readStorageRecord<Order>(PENDING_ORDERS_UPSERT_KEY);
  const stockLogMap = readStorageRecord<StockLogEntry>(PENDING_STOCK_LOGS_UPSERT_KEY);
  const pendingOrders = Object.values(orderMap).filter(
    (o) => o?.id && !isLocallyDeleted(recentDeletedOrderExpiry, PENDING_ORDERS_DEL_KEY, o.id)
  );
  const pendingLogs = Object.values(stockLogMap).filter(
    (l) => l?.id && !isLocallyDeleted(recentDeletedStockLogExpiry, PENDING_STOCK_LOGS_DEL_KEY, l.id)
  );

  if (pendingOrders.length === 0 && pendingLogs.length === 0) {
    return;
  }

  flushUpsertsInFlight = (async () => {
    try {
      for (let i = 0; i < pendingOrders.length; i += 200) {
        const chunk = pendingOrders.slice(i, i + 200);
        const res = await postMongoAction<{ configured?: boolean; ok?: boolean }>(
          'sync',
          { upsertOrders: chunk },
          { maxAttempts: 2, timeoutMs: 18000 }
        );
        if (res && (res.ok || res.configured === false)) {
          removePendingUpserts(
            PENDING_ORDERS_UPSERT_KEY,
            chunk.map((o) => o.id)
          );
          if (res.ok) {
            broadcastLocalSyncEvent({ type: 'mongo:synced', kind: 'order' });
          }
        } else {
          schedulePendingRetry();
          break;
        }
      }

      for (let i = 0; i < pendingLogs.length; i += 200) {
        const chunk = pendingLogs.slice(i, i + 200);
        const res = await postMongoAction<{ configured?: boolean; ok?: boolean }>(
          'sync',
          { upsertStockLogs: chunk },
          { maxAttempts: 2, timeoutMs: 18000 }
        );
        if (res && (res.ok || res.configured === false)) {
          removePendingUpserts(
            PENDING_STOCK_LOGS_UPSERT_KEY,
            chunk.map((l) => l.id)
          );
          if (res.ok) {
            broadcastLocalSyncEvent({ type: 'mongo:synced', kind: 'stock_log' });
          }
        } else {
          schedulePendingRetry();
          break;
        }
      }
    } finally {
      flushUpsertsInFlight = null;
    }
  })();

  return flushUpsertsInFlight;
}

export async function syncOrdersToMongoSync(orders: Order[]): Promise<boolean> {
  bindOnlineFlushListener();
  const safeOrders = orders.filter(
    (o) => o?.id && !isLocallyDeleted(recentDeletedOrderExpiry, PENDING_ORDERS_DEL_KEY, o.id)
  );
  if (!safeOrders.length) return true;

  addPendingUpserts(PENDING_ORDERS_UPSERT_KEY, safeOrders);
  await flushPendingMongoDeletes();

  let allSynced = true;
  for (let i = 0; i < safeOrders.length; i += 200) {
    const chunk = safeOrders.slice(i, i + 200);
    const res = await postMongoAction<{ configured?: boolean; ok?: boolean }>(
      'sync',
      { upsertOrders: chunk },
      { maxAttempts: 2, forceRefreshIfDisabled: true, timeoutMs: 18000 }
    );
    if (res && (res.ok || res.configured === false)) {
      removePendingUpserts(
        PENDING_ORDERS_UPSERT_KEY,
        chunk.map((o) => o.id)
      );
      if (res.ok) {
        broadcastLocalSyncEvent({
          type: 'mongo:synced',
          kind: 'order',
          ids: chunk.map((o) => o.id),
        });
      }
    } else {
      allSynced = false;
      schedulePendingRetry();
    }
  }
  return allSynced;
}

export function syncOrdersToMongoBackground(orders: Order[]): void {
  void syncOrdersToMongoSync(orders);
}

export async function deleteOrdersFromMongoSync(
  orderIds: string[],
  scope?: MongoOrderDeleteScope | null
): Promise<boolean> {
  bindOnlineFlushListener();
  const cleanIds = markOrdersDeletedLocally(orderIds);
  const cleanScope = sanitizeOrderDeleteScope(scope);
  if (cleanScope) {
    removePendingUpsertsByScope(cleanScope);
    addPendingOrderDeleteScope(cleanScope);
  }
  if (!cleanIds.length && !cleanScope) return true;

  const idsToSend = cleanIds.filter((id) => !inFlightOrderDeleteIds.has(id));
  if (!idsToSend.length && !cleanScope) {
    return true;
  }

  let allDelivered = true;

  if (idsToSend.length > 0) {
    for (let i = 0; i < idsToSend.length; i += 500) {
      const chunk = idsToSend.slice(i, i + 500);
      const includeScope = i === 0 && Boolean(cleanScope);
      for (const id of chunk) inFlightOrderDeleteIds.add(id);
      try {
        const res = await postMongoAction<{ configured?: boolean; ok?: boolean }>(
          'sync',
          {
            deleteOrderIds: chunk,
            ...(includeScope && cleanScope ? { deleteOrderScope: cleanScope } : {}),
          },
          { maxAttempts: 3, forceRefreshIfDisabled: true, timeoutMs: 20000 }
        );
        if (res && (res.ok || res.configured === false)) {
          removePendingIdsFromStorage(PENDING_ORDERS_DEL_KEY, chunk);
          if (includeScope && cleanScope) {
            removePendingOrderDeleteScope(cleanScope);
          }
          if (res.ok) {
            broadcastLocalSyncEvent({ type: 'mongo:deleted', kind: 'order', ids: chunk });
          }
        } else {
          allDelivered = false;
          schedulePendingRetry();
        }
      } finally {
        for (const id of chunk) inFlightOrderDeleteIds.delete(id);
      }
    }
  } else if (cleanScope) {
    const res = await postMongoAction<{ configured?: boolean; ok?: boolean }>(
      'sync',
      { deleteOrderScope: cleanScope },
      { maxAttempts: 3, forceRefreshIfDisabled: true, timeoutMs: 20000 }
    );
    if (res && (res.ok || res.configured === false)) {
      removePendingOrderDeleteScope(cleanScope);
      if (res.ok) {
        broadcastLocalSyncEvent({ type: 'mongo:deleted', kind: 'order' });
      }
    } else {
      allDelivered = false;
      schedulePendingRetry();
    }
  }

  return allDelivered;
}

export function deleteOrdersFromMongoBackground(orderIds: string[]): void {
  void deleteOrdersFromMongoSync(orderIds);
}

export async function syncStockLogsToMongoSync(stockLogs: StockLogEntry[]): Promise<boolean> {
  bindOnlineFlushListener();
  const safeLogs = stockLogs.filter(
    (l) => l?.id && !isLocallyDeleted(recentDeletedStockLogExpiry, PENDING_STOCK_LOGS_DEL_KEY, l.id)
  );
  if (!safeLogs.length) return true;

  addPendingUpserts(PENDING_STOCK_LOGS_UPSERT_KEY, safeLogs);
  await flushPendingMongoDeletes();

  let allSynced = true;
  for (let i = 0; i < safeLogs.length; i += 200) {
    const chunk = safeLogs.slice(i, i + 200);
    const res = await postMongoAction<{ configured?: boolean; ok?: boolean }>(
      'sync',
      { upsertStockLogs: chunk },
      { maxAttempts: 2, forceRefreshIfDisabled: true, timeoutMs: 18000 }
    );
    if (res && (res.ok || res.configured === false)) {
      removePendingUpserts(
        PENDING_STOCK_LOGS_UPSERT_KEY,
        chunk.map((l) => l.id)
      );
      if (res.ok) {
        broadcastLocalSyncEvent({
          type: 'mongo:synced',
          kind: 'stock_log',
          ids: chunk.map((l) => l.id),
        });
      }
    } else {
      allSynced = false;
      schedulePendingRetry();
    }
  }
  return allSynced;
}

export function syncStockLogsToMongoBackground(stockLogs: StockLogEntry[]): void {
  void syncStockLogsToMongoSync(stockLogs);
}

export async function deleteStockLogsFromMongoSync(stockLogIds: string[]): Promise<boolean> {
  bindOnlineFlushListener();
  const cleanIds = markStockLogsDeletedLocally(stockLogIds);
  if (!cleanIds.length) return true;

  const idsToSend = cleanIds.filter((id) => !inFlightStockLogDeleteIds.has(id));
  if (!idsToSend.length) return true;

  let allDelivered = true;
  for (let i = 0; i < idsToSend.length; i += 500) {
    const chunk = idsToSend.slice(i, i + 500);
    for (const id of chunk) inFlightStockLogDeleteIds.add(id);
    try {
      const res = await postMongoAction<{ configured?: boolean; ok?: boolean }>(
        'sync',
        { deleteStockLogIds: chunk },
        { maxAttempts: 3, forceRefreshIfDisabled: true, timeoutMs: 20000 }
      );
      if (res && (res.ok || res.configured === false)) {
        removePendingIdsFromStorage(PENDING_STOCK_LOGS_DEL_KEY, chunk);
        if (res.ok) {
          broadcastLocalSyncEvent({ type: 'mongo:deleted', kind: 'stock_log', ids: chunk });
        }
      } else {
        allDelivered = false;
        schedulePendingRetry();
      }
    } finally {
      for (const id of chunk) inFlightStockLogDeleteIds.delete(id);
    }
  }
  return allDelivered;
}

export function deleteStockLogsFromMongoBackground(stockLogIds: string[]): void {
  void deleteStockLogsFromMongoSync(stockLogIds);
}

export async function purgeExpiredStockLogsFromMongoSync(
  cutoffIso: string
): Promise<{ ok: boolean; deletedCount: number }> {
  bindOnlineFlushListener();
  const cutoffMs = Date.parse(cutoffIso);
  if (!Number.isFinite(cutoffMs)) {
    return { ok: false, deletedCount: 0 };
  }

  // Drop expired entries from any pending offline stock log upsert queue
  const pendingUpserts = readStorageRecord<StockLogEntry>(PENDING_STOCK_LOGS_UPSERT_KEY);
  const expiredPendingIds: string[] = [];
  for (const [id, entry] of Object.entries(pendingUpserts)) {
    const ms = Date.parse(String(entry?.createdAt || ''));
    if (Number.isFinite(ms) && ms > 0 && ms < cutoffMs) {
      expiredPendingIds.push(id);
    }
  }
  if (expiredPendingIds.length > 0) {
    removePendingUpserts<StockLogEntry>(PENDING_STOCK_LOGS_UPSERT_KEY, expiredPendingIds);
  }

  const res = await postMongoAction<{
    configured?: boolean;
    ok?: boolean;
    deletedStockLogs?: number;
  }>(
    'sync',
    { deleteStockLogsBeforeIso: new Date(cutoffMs).toISOString() },
    { maxAttempts: 2, forceRefreshIfDisabled: true, timeoutMs: 20000 }
  );

  if (res && (res.ok || res.configured === false)) {
    return {
      ok: true,
      deletedCount: Number(res.deletedStockLogs || 0),
    };
  }
  return { ok: false, deletedCount: 0 };
}

export async function deleteWorkspaceFromMongoSync(accountEmails: string[] = []): Promise<boolean> {
  bindOnlineFlushListener();
  const cleanEmails = Array.from(
    new Set(accountEmails.map((e) => String(e || '').trim().toLowerCase()).filter((e) => e.includes('@')))
  );
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(PENDING_WS_DEL_KEY, '1');
      writeStorageArray(PENDING_WS_DEL_EMAILS_KEY, cleanEmails);
      window.localStorage.removeItem(PENDING_ORDERS_UPSERT_KEY);
      window.localStorage.removeItem(PENDING_STOCK_LOGS_UPSERT_KEY);
    } catch {
      // Ignore
    }
  }
  const res = await postMongoAction<{ configured?: boolean; ok?: boolean }>(
    'sync',
    { deleteWorkspaceAll: true, accountEmails: cleanEmails },
    {
      maxAttempts: 3,
      forceRefreshIfDisabled: true,
      forceRefreshToken: true,
      timeoutMs: 25000,
    }
  );
  if (res && (res.ok || res.configured === false)) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(PENDING_WS_DEL_KEY);
        window.localStorage.removeItem(PENDING_WS_DEL_EMAILS_KEY);
        window.localStorage.removeItem(PENDING_ORDERS_DEL_KEY);
        window.localStorage.removeItem(PENDING_ORDERS_SCOPE_DEL_KEY);
        window.localStorage.removeItem(PENDING_STOCK_LOGS_DEL_KEY);
        window.localStorage.removeItem(PENDING_ORDERS_UPSERT_KEY);
        window.localStorage.removeItem(PENDING_STOCK_LOGS_UPSERT_KEY);
      } catch {
        // Ignore
      }
    }
    broadcastLocalSyncEvent({ type: 'workspace:deleted', kind: 'workspace' });
    return true;
  }
  schedulePendingRetry();
  return false;
}

export async function fetchMongoChanges(since: string): Promise<{
  configured: boolean;
  ok: boolean;
  serverNow: string;
  deletedOrderIds: string[];
  deletedStockLogIds: string[];
  recentOrders: Order[];
  recentStockLogs: StockLogEntry[];
  workspaceDeleted: boolean;
} | null> {
  const res = await postMongoAction<{
    configured?: boolean;
    ok?: boolean;
    serverNow?: string;
    deletedOrderIds?: string[];
    deletedStockLogIds?: string[];
    recentOrders?: Order[];
    recentStockLogs?: StockLogEntry[];
    workspaceDeleted?: boolean;
  }>(
    'changes',
    { since },
    { maxAttempts: 1, timeoutMs: 6500 }
  );
  if (!res) return null;
  if (!res.configured || !res.ok) {
    return {
      configured: Boolean(res.configured),
      ok: Boolean(res.ok),
      serverNow: String(res.serverNow || ''),
      deletedOrderIds: [],
      deletedStockLogIds: [],
      recentOrders: [],
      recentStockLogs: [],
      workspaceDeleted: false,
    };
  }
  return {
    configured: true,
    ok: true,
    serverNow: String(res.serverNow || ''),
    deletedOrderIds: Array.isArray(res.deletedOrderIds) ? res.deletedOrderIds : [],
    deletedStockLogIds: Array.isArray(res.deletedStockLogIds) ? res.deletedStockLogIds : [],
    recentOrders: Array.isArray(res.recentOrders) ? res.recentOrders : [],
    recentStockLogs: Array.isArray(res.recentStockLogs) ? res.recentStockLogs : [],
    workspaceDeleted: Boolean(res.workspaceDeleted),
  };
}

export function reconcileWorkspaceOrdersWithMongo(
  uid: string,
  activeOrderIds: string[]
): void {
  if (!uid) return;
  bindOnlineFlushListener();
  const cleanActiveIds = Array.from(
    new Set(activeOrderIds.map((id) => String(id || '').trim()).filter(Boolean))
  ).sort();
  const sig = cleanActiveIds.join(',');
  if (lastReconciledOrdersSigByUid.get(uid) === sig) return;
  lastReconciledOrdersSigByUid.set(uid, sig);

  void (async () => {
    const available = await ensureMongoAvailable();
    if (!available) {
      if (lastReconciledOrdersSigByUid.get(uid) === sig) {
        lastReconciledOrdersSigByUid.delete(uid);
      }
      return;
    }
    await flushPendingMongoDeletes();
    const res = await postMongoAction<{
      configured?: boolean;
      ok?: boolean;
      deletedOrders?: number;
    }>(
      'sync',
      { reconcileActiveOrderIds: cleanActiveIds },
      { maxAttempts: 2, forceRefreshIfDisabled: true, timeoutMs: 20000 }
    );
    if (!res || (!res.ok && res.configured !== false)) {
      if (lastReconciledOrdersSigByUid.get(uid) === sig) {
        lastReconciledOrdersSigByUid.delete(uid);
      }
      return;
    }
    if (res.ok && Number(res.deletedOrders || 0) > 0) {
      broadcastLocalSyncEvent({ type: 'mongo:deleted', kind: 'order' });
    }
  })();
}

export function reconcileWorkspaceStockLogsWithMongo(
  uid: string,
  activeStockLogIds: string[]
): void {
  if (!uid) return;
  bindOnlineFlushListener();
  const cleanActiveIds = Array.from(
    new Set(activeStockLogIds.map((id) => String(id || '').trim()).filter(Boolean))
  ).sort();
  const sig = cleanActiveIds.join(',');
  if (lastReconciledStockLogsSigByUid.get(uid) === sig) return;
  lastReconciledStockLogsSigByUid.set(uid, sig);

  void (async () => {
    const available = await ensureMongoAvailable();
    if (!available) {
      if (lastReconciledStockLogsSigByUid.get(uid) === sig) {
        lastReconciledStockLogsSigByUid.delete(uid);
      }
      return;
    }
    await flushPendingMongoDeletes();
    const res = await postMongoAction<{
      configured?: boolean;
      ok?: boolean;
      deletedStockLogs?: number;
    }>(
      'sync',
      { reconcileActiveStockLogIds: cleanActiveIds },
      { maxAttempts: 2, forceRefreshIfDisabled: true, timeoutMs: 20000 }
    );
    if (!res || (!res.ok && res.configured !== false)) {
      if (lastReconciledStockLogsSigByUid.get(uid) === sig) {
        lastReconciledStockLogsSigByUid.delete(uid);
      }
      return;
    }
    if (res.ok && Number(res.deletedStockLogs || 0) > 0) {
      broadcastLocalSyncEvent({ type: 'mongo:deleted', kind: 'stock_log' });
    }
  })();
}

export function backfillWorkspaceToMongoOnce(
  uid: string,
  orders: Order[],
  stockLogs: StockLogEntry[]
): void {
  if (!uid || backfilledThisSession.has(uid)) return;
  backfilledThisSession.add(uid);

  void (async () => {
    const available = await ensureMongoAvailable();
    if (!available) {
      backfilledThisSession.delete(uid);
      return;
    }

    await flushAllPendingMongoOps();

    if (!orders.length && !stockLogs.length) return;

    const filteredOrders = orders.filter(
      (o) => o?.id && !isLocallyDeleted(recentDeletedOrderExpiry, PENDING_ORDERS_DEL_KEY, o.id)
    );
    const filteredLogs = stockLogs.filter(
      (l) => l?.id && !isLocallyDeleted(recentDeletedStockLogExpiry, PENDING_STOCK_LOGS_DEL_KEY, l.id)
    );

    const maxLen = Math.max(filteredOrders.length, filteredLogs.length);
    for (let i = 0; i < maxLen; i += 150) {
      const orderChunk = filteredOrders.slice(i, i + 150);
      const stockChunk = filteredLogs.slice(i, i + 150);
      if (!orderChunk.length && !stockChunk.length) break;
      await postMongoAction(
        'sync',
        {
          ...(orderChunk.length ? { upsertOrders: orderChunk } : {}),
          ...(stockChunk.length ? { upsertStockLogs: stockChunk } : {}),
        },
        { maxAttempts: 2, timeoutMs: 18000 }
      );
    }
  })();
}

export async function queryMoreOrdersFromMongo(params: {
  cursorCreatedAt: string;
  excludeIds: string[];
  limit?: number;
  operatorEmail?: string;
  staffName?: string;
  paymentStatus?: 'paid' | 'unpaid' | '';
  search?: string;
}): Promise<{
  usedMongo: boolean;
  orders: Order[];
  hasMore: boolean;
  nextCursor: string;
}> {
  await flushPendingMongoDeletes();
  const data = await postMongoAction<{
    configured?: boolean;
    ok?: boolean;
    orders?: Order[];
    hasMore?: boolean;
    nextCursor?: string;
  }>('orders', {
    cursorCreatedAt: params.cursorCreatedAt,
    excludeIds: params.excludeIds.slice(0, 300),
    limit: params.limit || 60,
    operatorEmail: params.operatorEmail || '',
    staffName: params.staffName || '',
    paymentStatus: params.paymentStatus || '',
    search: params.search || '',
  });

  if (!data || !data.configured || !data.ok) {
    return { usedMongo: false, orders: [], hasMore: false, nextCursor: '' };
  }

  return {
    usedMongo: true,
    orders: (Array.isArray(data.orders) ? data.orders : []).filter(
      (o) => o?.id && !isLocallyDeleted(recentDeletedOrderExpiry, PENDING_ORDERS_DEL_KEY, o.id)
    ),
    hasMore: Boolean(data.hasMore),
    nextCursor: String(data.nextCursor || ''),
  };
}

export async function queryMoreStockLogsFromMongo(params: {
  cursorCreatedAt: string;
  excludeIds: string[];
  limit?: number;
  operatorEmail?: string;
}): Promise<{
  usedMongo: boolean;
  stockLogs: StockLogEntry[];
  hasMore: boolean;
  nextCursor: string;
}> {
  await flushPendingMongoDeletes();
  const data = await postMongoAction<{
    configured?: boolean;
    ok?: boolean;
    stockLogs?: StockLogEntry[];
    hasMore?: boolean;
    nextCursor?: string;
  }>('stock-logs', {
    cursorCreatedAt: params.cursorCreatedAt,
    excludeIds: params.excludeIds.slice(0, 300),
    limit: params.limit || 40,
    operatorEmail: params.operatorEmail || '',
  });

  if (!data || !data.configured || !data.ok) {
    return { usedMongo: false, stockLogs: [], hasMore: false, nextCursor: '' };
  }

  return {
    usedMongo: true,
    stockLogs: (Array.isArray(data.stockLogs) ? data.stockLogs : []).filter(
      (l) => l?.id && !isLocallyDeleted(recentDeletedStockLogExpiry, PENDING_STOCK_LOGS_DEL_KEY, l.id)
    ),
    hasMore: Boolean(data.hasMore),
    nextCursor: String(data.nextCursor || ''),
  };
}

export async function fetchMongoAnalyticsSummary(params: {
  operatorEmail?: string;
  staffName?: string;
}): Promise<{
  usedMongo: boolean;
  summary?: {
    totalOrders: number;
    totalRevenue: number;
    totalCost: number;
    netProfit: number;
    paidCount: number;
    unpaidCount: number;
    unpaidAmount: number;
  };
  topProducts?: Array<{ name: string; quantity: number; revenue: number }>;
}> {
  await flushPendingMongoDeletes();
  const data = await postMongoAction<{
    configured?: boolean;
    ok?: boolean;
    summary?: {
      totalOrders: number;
      totalRevenue: number;
      totalCost: number;
      netProfit: number;
      paidCount: number;
      unpaidCount: number;
      unpaidAmount: number;
    };
    topProducts?: Array<{ name: string; quantity: number; revenue: number }>;
  }>('analytics', {
    operatorEmail: params.operatorEmail || '',
    staffName: params.staffName || '',
  });

  if (!data || !data.configured || !data.ok || !data.summary) {
    return { usedMongo: false };
  }

  return {
    usedMongo: true,
    summary: data.summary,
    topProducts: Array.isArray(data.topProducts) ? data.topProducts : [],
  };
}
