import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { normalizePhone, normalizeSaleKey, roundUsdPrecision } from '../utils/helpers';
import {
  backfillWorkspaceToMongoOnce,
  deleteOrdersFromMongoBackground,
  deleteOrdersFromMongoSync,
  deleteStockLogsFromMongoBackground,
  deleteStockLogsFromMongoSync,
  deleteWorkspaceFromMongoSync,
  getLastMongoErrorDetail,
  fetchMongoChanges,
  flushAllPendingMongoOps,
  markOrdersDeletedLocally,
  purgeExpiredStockLogsFromMongoSync,
  queryMoreOrdersFromMongo,
  queryMoreStockLogsFromMongo,
  reconcileWorkspaceOrdersWithMongo,
  reconcileWorkspaceStockLogsWithMongo,
  subscribeToLocalSyncBroadcast,
  syncOrdersToMongoBackground,
  syncStockLogsToMongoBackground,
  type MongoOrderDeleteScope,
} from './mongoPartitionClient';
import {
  DEFAULT_TELEGRAM_URL,
  registerMasterAdminLicense,
  subscribeToDeveloperVault,
  unregisterWorkspaceAccountRegistry,
  type DeveloperVaultSnapshotData,
} from './developerLicense';
import type {
  Order,
  OrderItem,
  PriceRecordItem,
  PriceTier,
  ProblemCustomer,
  Product,
  SaleActivityActionType,
  SaleActivityLog,
  SalePresence,
  SaleProfile,
  SaleUserPreferences,
  StaffMember,
  StockLogEntry,
  WarehouseManagerProfile,
  WorkspaceData,
  WorkspaceLicense,
  WorkspacePaginationState,
  WorkspaceSettings,
} from '../types';

export function computeWarehouseUidsForOperator(
  warehouseProfiles: WarehouseManagerProfile[] | undefined,
  operatorEmail: string,
  masterEmail: string
): string[] {
  if (!Array.isArray(warehouseProfiles) || warehouseProfiles.length === 0) return [];
  const masterClean = masterEmail.trim().toLowerCase();
  const targetOp = (operatorEmail || masterClean).trim().toLowerCase();
  const set = new Set<string>();
  for (const wp of warehouseProfiles) {
    if (!wp || !wp.uid || wp.active === false) continue;
    const assigned = (wp.assignedAdminEmail || masterClean).trim().toLowerCase();
    if (assigned === targetOp) {
      set.add(wp.uid.trim());
    }
  }
  return Array.from(set).slice(0, 50);
}

export interface WarehouseDirectoryRecord {
  warehouseUid: string;
  masterUid: string;
  masterEmail: string;
  name: string;
  email: string;
  assignedAdminEmail: string;
  active: boolean;
}

export async function resolveWarehouseDirectoryForUid(
  warehouseUid: string
): Promise<WarehouseDirectoryRecord | null> {
  const cleanUid = String(warehouseUid || '').trim();
  if (!cleanUid) return null;
  try {
    const ref = doc(db, 'warehouseDirectory', cleanUid);
    const snap = await getDocFromServer(ref).catch(() => getDoc(ref));
    if (!snap.exists()) return null;
    const d = snap.data() as Record<string, unknown>;
    const masterUid = String(d.ownerUid || d.masterUid || '').trim();
    const masterEmail = String(d.masterEmail || '').trim().toLowerCase();
    if (!masterUid || !masterEmail) return null;
    return {
      warehouseUid: cleanUid,
      masterUid,
      masterEmail,
      name: String(d.name || '').trim(),
      email: String(d.warehouseEmail || d.email || '').trim().toLowerCase(),
      assignedAdminEmail: String(d.assignedAdminEmail || masterEmail).trim().toLowerCase(),
      active: d.active !== false,
    };
  } catch {
    return null;
  }
}

export async function saveWarehouseMemberDocsFs(
  masterUid: string,
  masterEmail: string,
  profile: WarehouseManagerProfile
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== masterUid) {
    throw new Error('មានតែ Master Admin ប៉ុណ្ណោះដែលអាចគ្រប់គ្រងអ្នកគ្រប់គ្រងឃ្លាំងបាន។');
  }
  const cleanMasterEmail = masterEmail.trim().toLowerCase().slice(0, 200);
  const cleanWhEmail = profile.email.trim().toLowerCase().slice(0, 200);
  const cleanAssigned = ((profile.assignedAdminEmail || cleanMasterEmail).trim().toLowerCase()).slice(
    0,
    200
  );
  const cleanName = profile.name.trim().slice(0, 200);
  const cleanUid = profile.uid.trim();
  if (!cleanUid || !cleanWhEmail || !cleanName || !cleanMasterEmail) {
    throw new Error('ទិន្នន័យអ្នកគ្រប់គ្រងឃ្លាំងមិនគ្រប់គ្រាន់ទេ។');
  }

  const memRef = doc(db, 'workspaces', masterUid, 'warehouseMembers', cleanUid);
  const dirRef = doc(db, 'warehouseDirectory', cleanUid);

  const [existingMemSnap, existingDirSnap] = await Promise.all([
    getDocFromServer(memRef).catch(() => getDoc(memRef)).catch(() => null),
    getDocFromServer(dirRef).catch(() => getDoc(dirRef)).catch(() => null),
  ]);

  const fallbackCreatedAt = String(profile.createdAt || new Date().toISOString()).slice(0, 64);
  const memCreatedAt =
    existingMemSnap && existingMemSnap.exists()
      ? String(existingMemSnap.data()?.createdAt || fallbackCreatedAt).slice(0, 64)
      : fallbackCreatedAt;
  const dirCreatedAt =
    existingDirSnap && existingDirSnap.exists()
      ? String(existingDirSnap.data()?.createdAt || fallbackCreatedAt).slice(0, 64)
      : fallbackCreatedAt;

  const batch = writeBatch(db);
  batch.set(memRef, {
    uid: cleanUid,
    ownerUid: masterUid,
    email: cleanWhEmail,
    name: cleanName,
    assignedAdminEmail: cleanAssigned,
    active: profile.active !== false,
    createdAt: memCreatedAt,
    serverUpdatedAt: serverTimestamp(),
  });
  batch.set(dirRef, {
    uid: cleanUid,
    ownerUid: masterUid,
    masterEmail: cleanMasterEmail,
    warehouseEmail: cleanWhEmail,
    name: cleanName,
    assignedAdminEmail: cleanAssigned,
    active: profile.active !== false,
    createdAt: dirCreatedAt,
    serverUpdatedAt: serverTimestamp(),
  });
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `workspaces/${masterUid}/warehouseMembers/${cleanUid}`);
  }
}

export async function deleteWarehouseMemberDocsFs(
  masterUid: string,
  warehouseUid: string
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== masterUid) {
    throw new Error('មានតែ Master Admin ប៉ុណ្ណោះដែលអាចលុបអ្នកគ្រប់គ្រងឃ្លាំងបាន។');
  }
  const cleanUid = warehouseUid.trim();
  if (!cleanUid) return;
  const batch = writeBatch(db);
  batch.delete(doc(db, 'workspaces', masterUid, 'warehouseMembers', cleanUid));
  batch.delete(doc(db, 'warehouseDirectory', cleanUid));
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `workspaces/${masterUid}/warehouseMembers/${cleanUid}`);
  }
}

function sameStringArray(a: unknown, b: string[]): boolean {
  if (!Array.isArray(a)) return b.length === 0;
  if (a.length !== b.length) return false;
  const sortedA = [...a].map((x) => String(x)).sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

export async function syncWarehouseUidsInFirestore(
  masterUid: string,
  warehouseProfiles: WarehouseManagerProfile[],
  masterEmail: string
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== masterUid) return;
  const cleanMasterEmail = masterEmail.trim().toLowerCase();
  const [prodSnap, ordSnap] = await Promise.all([
    getDocs(query(collection(db, 'workspaces', masterUid, 'products'), where('ownerUid', '==', masterUid))),
    getDocs(query(collection(db, 'workspaces', masterUid, 'orders'), where('ownerUid', '==', masterUid))),
  ]);

  const updates: Array<{ ref: QueryDocumentSnapshot<DocumentData>['ref']; warehouseUids: string[] }> = [];
  for (const d of prodSnap.docs) {
    const data = d.data();
    const op = String(data.operatorEmail || cleanMasterEmail).trim().toLowerCase();
    const expected = computeWarehouseUidsForOperator(warehouseProfiles, op, cleanMasterEmail);
    if (!sameStringArray(data.warehouseUids, expected)) {
      updates.push({ ref: d.ref, warehouseUids: expected });
    }
  }
  for (const d of ordSnap.docs) {
    const data = d.data();
    const op = String(data.operatorEmail || data.createdByEmail || cleanMasterEmail).trim().toLowerCase();
    const expected = computeWarehouseUidsForOperator(warehouseProfiles, op, cleanMasterEmail);
    if (!sameStringArray(data.warehouseUids, expected)) {
      updates.push({ ref: d.ref, warehouseUids: expected });
    }
  }

  const BATCH_LIMIT = 400;
  for (let i = 0; i < updates.length; i += BATCH_LIMIT) {
    const chunk = updates.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const item of chunk) {
      batch.update(item.ref, {
        warehouseUids: item.warehouseUids,
        serverUpdatedAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
    } catch {
      // Fallback per-document so a single legacy record with non-standard fields does not block all others
      await Promise.allSettled(
        chunk.map((item) =>
          updateDoc(item.ref, {
            warehouseUids: item.warehouseUids,
            serverUpdatedAt: serverTimestamp(),
          })
        )
      );
    }
  }
}

export async function fetchLatestWorkspaceSaleProfilesFromServer(
  uid: string
): Promise<SaleProfile[] | null> {
  try {
    const snap = await getDocFromServer(doc(db, 'workspaces', uid));
    if (!snap.exists()) return [];
    const rawSettings = snap.data()?.settings || {};
    return Array.isArray(rawSettings.saleProfiles) ? (rawSettings.saleProfiles as SaleProfile[]) : [];
  } catch {
    return null;
  }
}

export const ORDERS_PAGE_SIZE = 40;
export const STOCK_LOGS_PAGE_SIZE = 30;
export const LOG_RETENTION_DAYS = 30;
export const LOG_RETENTION_MS = LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function getLogRetentionCutoffMs(days = LOG_RETENTION_DAYS): number {
  const safeDays = Math.max(1, Math.floor(Number(days) || LOG_RETENTION_DAYS));
  return Date.now() - safeDays * 24 * 60 * 60 * 1000;
}

export function getLogRetentionCutoffIso(days = LOG_RETENTION_DAYS): string {
  return new Date(getLogRetentionCutoffMs(days)).toISOString();
}

export function isTimestampExpired(
  createdAt?: string,
  serverMs?: number,
  cutoffMs = getLogRetentionCutoffMs()
): boolean {
  if (typeof serverMs === 'number' && Number.isFinite(serverMs) && serverMs > 0) {
    return serverMs < cutoffMs;
  }
  const parsed = Date.parse(String(createdAt || ''));
  return Number.isFinite(parsed) && parsed > 0 && parsed < cutoffMs;
}

export interface WorkspaceSubscription {
  unsubscribe: () => void;
  loadMoreOrders: () => Promise<boolean>;
  loadMoreStockLogs: () => Promise<boolean>;
  searchOrdersFromMongo: (params: {
    search: string;
    operatorEmail?: string;
    staffName?: string;
    paymentStatus?: 'paid' | 'unpaid' | '';
    limit?: number;
  }) => Promise<Order[]>;
  evictOrders: (ids: string[]) => void;
  evictStockLogs: (ids: string[]) => void;
}

function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTimeLocal(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function makeDocId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

const SAMPLE_CLEANED_KEY_PREFIX = 'drpos_sample_cleaned_v1_';

const LEGACY_SAMPLE_DOCS: Array<{
  sub: 'products' | 'staff' | 'orders' | 'priceRecords' | 'stockLogs' | 'problemCustomers';
  ids: string[];
}> = [
  { sub: 'products', ids: ['prd-1', 'prd-2', 'prd-3', 'prd-4'] },
  { sub: 'staff', ids: ['stf-1', 'stf-2', 'stf-3'] },
  {
    sub: 'orders',
    ids: [
      'ord-1004',
      'ord-1003',
      'ord-1002',
      'ord-1001',
      'ord-1000',
      'ord-0999',
      'ord-0998',
      'ord-0997',
    ],
  },
  { sub: 'priceRecords', ids: ['prc-1', 'prc-2'] },
  { sub: 'stockLogs', ids: ['stk-1', 'stk-2'] },
  { sub: 'problemCustomers', ids: ['prob-1', 'prob-2'] },
];

const SAMPLE_WAREHOUSES = new Set([
  'ឃ្លាំងភ្នំពេញ (Main)',
  'ឃ្លាំងសៀមរាប (Branch)',
  'ឃ្លាំងបាត់ដំបង',
]);
const SAMPLE_STORES = new Set([
  'DR-POS សាខាទួលគោក',
  'DR-POS សាខាបឹងកេងកង',
  'DR-POS សាខាសៀមរាប',
]);
const SAMPLE_GROUPS = new Set([
  'ក្រុមលក់ទី១ (VIP Online)',
  'ក្រុមលក់បោះដុំ (Wholesale)',
  'ក្រុមលក់រាយ (Retail Counter)',
]);
const SAMPLE_CATEGORIES = new Set([
  'ឧបករណ៍អេឡិចត្រូនិក',
  'ឧបករណ៍សំឡេង',
  'សម្ភារៈប្រើប្រាស់',
  'កុំព្យូទ័រ និងគ្រឿងបន្លាស់',
]);

function defaultSettings(email: string, displayName: string): WorkspaceSettings {
  return {
    personalName: displayName || email.split('@')[0] || 'DR-POS User',
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
    warehouseProfiles: [],
  };
}

async function cleanupLegacySampleDataIfNeeded(
  uid: string,
  wsData: DocumentData | undefined,
  targetDb: Firestore
): Promise<void> {
  if (targetDb === db && auth.currentUser?.uid !== uid) return;
  const storageKey = `${SAMPLE_CLEANED_KEY_PREFIX}${uid}`;
  try {
    if (localStorage.getItem(storageKey) === '1') return;
  } catch {
    // Ignore storage access restrictions
  }

  const refs = LEGACY_SAMPLE_DOCS.flatMap((group) =>
    group.ids.map((id) => doc(targetDb, 'workspaces', uid, group.sub, id))
  );

  const snaps = await Promise.all(refs.map((ref) => getDoc(ref).catch(() => null)));
  const batch = writeBatch(targetDb);
  let hasWrites = false;

  for (const s of snaps) {
    if (s && s.exists()) {
      batch.delete(s.ref);
      hasWrites = true;
    }
  }

  if (wsData && typeof wsData.settings === 'object' && wsData.settings) {
    const raw = wsData.settings as Partial<WorkspaceSettings>;
    const curWarehouses = Array.isArray(raw.warehouses) ? raw.warehouses : [];
    const curStores = Array.isArray(raw.stores) ? raw.stores : [];
    const curGroups = Array.isArray(raw.groups) ? raw.groups : [];
    const curCategories = Array.isArray(raw.categories) ? raw.categories : [];

    const nextWarehouses = curWarehouses.filter((w) => !SAMPLE_WAREHOUSES.has(w));
    const nextStores = curStores.filter((s) => !SAMPLE_STORES.has(s));
    const nextGroups = curGroups.filter((g) => !SAMPLE_GROUPS.has(g));
    const nextCategories = curCategories.filter((c) => !SAMPLE_CATEGORIES.has(c));
    const hasSamplePhone = raw.personalPhone === '012 990 881';

    if (
      nextWarehouses.length !== curWarehouses.length ||
      nextStores.length !== curStores.length ||
      nextGroups.length !== curGroups.length ||
      nextCategories.length !== curCategories.length ||
      hasSamplePhone
    ) {
      const cleanedSettings: WorkspaceSettings = {
        ...defaultSettings(String(wsData.ownerEmail || ''), String(raw.personalName || '')),
        ...raw,
        personalPhone: hasSamplePhone ? '' : String(raw.personalPhone || ''),
        warehouses: nextWarehouses,
        stores: nextStores,
        groups: nextGroups,
        categories: nextCategories,
        accessRules: Array.isArray(raw.accessRules) ? raw.accessRules : [],
        saleProfiles: Array.isArray(raw.saleProfiles) ? raw.saleProfiles : [],
        adminProfiles: Array.isArray(raw.adminProfiles) ? raw.adminProfiles : [],
        warehouseProfiles: Array.isArray(raw.warehouseProfiles) ? raw.warehouseProfiles : [],
      };
      batch.update(doc(targetDb, 'workspaces', uid), {
        settings: cleanedSettings,
        serverUpdatedAt: serverTimestamp(),
      });
      hasWrites = true;
    }
  }

  if (hasWrites) {
    await batch.commit();
  }

  try {
    localStorage.setItem(storageKey, '1');
  } catch {
    // Ignore storage access restrictions
  }
}

export async function seedWorkspaceIfNeeded(
  uid: string,
  rawEmail: string,
  displayName: string,
  targetDb: Firestore = db
): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  const wsPath = `workspaces/${uid}`;
  const wsRef = doc(targetDb, 'workspaces', uid);

  let existingSnapData: DocumentData | undefined;
  let exists = false;
  try {
    const snap = await getDoc(wsRef);
    exists = snap.exists();
    existingSnapData = snap.exists() ? snap.data() : undefined;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, wsPath);
  }

  if (exists) {
    try {
      await cleanupLegacySampleDataIfNeeded(uid, existingSnapData, targetDb);
    } catch {
      // Non-fatal cleanup error; do not block workspace load
    }
    return;
  }

  const now = new Date();

  const initialLicense = await registerMasterAdminLicense({
    uid,
    email,
    displayName,
  });

  const batch = writeBatch(targetDb);

  const initialSettings = defaultSettings(email, displayName);
  initialSettings.adminProfiles = [
    {
      id: `adm-${uid.slice(0, 8)}`,
      name: displayName || email.split('@')[0] || 'Master Admin',
      email,
      isMaster: true,
      createdAt: now.toISOString(),
    },
  ];

  batch.set(wsRef, {
    ownerUid: uid,
    ownerEmail: email,
    settings: initialSettings,
    license: initialLicense,
    serverCreatedAt: serverTimestamp(),
    serverUpdatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, wsPath);
  }
}

function stripProduct(d: DocumentData): Product {
  return {
    id: String(d.id || ''),
    name: String(d.name || ''),
    imageUrl: String(d.imageUrl || ''),
    costPrice: Number(d.costPrice || 0),
    sellingPrice: Number(d.sellingPrice || 0),
    promotion: Number(d.promotion || 0),
    stock: Number(d.stock || 0),
    barcode: String(d.barcode || ''),
    category: String(d.category || ''),
    warehouse: String(d.warehouse || ''),
    sortOrder: Number(d.sortOrder || 0),
    updatedAt: String(d.updatedAt || ''),
    operatorEmail: d.operatorEmail ? String(d.operatorEmail) : undefined,
  };
}

function stripOrder(d: DocumentData): Order {
  return {
    id: String(d.id || ''),
    orderNumber: String(d.orderNumber || ''),
    date: String(d.date || ''),
    time: String(d.time || ''),
    createdAt: String(d.createdAt || ''),
    customerName: String(d.customerName || ''),
    customerPhone: String(d.customerPhone || ''),
    customerAddress: String(d.customerAddress || ''),
    storeName: String(d.storeName || ''),
    groupName: String(d.groupName || ''),
    staffName: String(d.staffName || ''),
    warehouse: String(d.warehouse || ''),
    paymentStatus: d.paymentStatus === 'unpaid' ? 'unpaid' : 'paid',
    dueDate: String(d.dueDate || ''),
    note: String(d.note || ''),
    items: Array.isArray(d.items) ? (d.items as OrderItem[]) : [],
    subtotalAmount:
      d.subtotalAmount !== undefined ? Number(d.subtotalAmount || 0) : undefined,
    discountType: d.discountType === 'percent' ? 'percent' : 'amount',
    discountValue: d.discountValue !== undefined ? Number(d.discountValue || 0) : 0,
    discountAmount: d.discountAmount !== undefined ? Number(d.discountAmount || 0) : 0,
    totalAmount: Number(d.totalAmount || 0),
    totalCost: Number(d.totalCost || 0),
    createdByEmail: String(d.createdByEmail || ''),
    operatorEmail: String(d.operatorEmail || ''),
  };
}

function stripStaff(d: DocumentData): StaffMember {
  return {
    id: String(d.id || ''),
    name: String(d.name || ''),
    photoUrl: String(d.photoUrl || ''),
    position: String(d.position || ''),
    phone: String(d.phone || ''),
    address: String(d.address || ''),
    createdAt: String(d.createdAt || ''),
    operatorEmail: d.operatorEmail ? String(d.operatorEmail) : undefined,
  };
}

function stripPriceRecord(d: DocumentData): PriceRecordItem {
  return {
    id: String(d.id || ''),
    productName: String(d.productName || ''),
    imageUrl: String(d.imageUrl || ''),
    prices: Array.isArray(d.prices) ? (d.prices as PriceTier[]) : [],
    updatedAt: String(d.updatedAt || ''),
    operatorEmail: d.operatorEmail ? String(d.operatorEmail) : undefined,
  };
}

function stripStockLog(d: DocumentData): StockLogEntry {
  return {
    id: String(d.id || ''),
    productId: String(d.productId || ''),
    productName: String(d.productName || ''),
    addedQuantity: Number(d.addedQuantity || 0),
    previousStock: Number(d.previousStock || 0),
    newStock: Number(d.newStock || 0),
    warehouse: String(d.warehouse || ''),
    date: String(d.date || ''),
    createdAt: String(d.createdAt || ''),
    operatorEmail: d.operatorEmail ? String(d.operatorEmail) : undefined,
  };
}

function stripProblemCustomer(d: DocumentData): ProblemCustomer {
  return {
    id: String(d.id || ''),
    name: String(d.name || ''),
    phone: String(d.phone || ''),
    normalizedPhone: String(d.normalizedPhone || ''),
    note: String(d.note || ''),
    sourceOrderId: String(d.sourceOrderId || ''),
    createdAt: String(d.createdAt || ''),
  };
}

function mergePaginatedById<T extends { id: string }>(
  liveHead: T[],
  olderPages: T[],
  deletedIds: Set<string>,
  compare: (a: T, b: T) => number
): T[] {
  if (olderPages.length === 0 && deletedIds.size === 0) {
    return [...liveHead].sort(compare);
  }
  const map = new Map<string, T>();
  for (const item of olderPages) {
    if (!deletedIds.has(item.id)) {
      map.set(item.id, item);
    }
  }
  for (const item of liveHead) {
    if (!deletedIds.has(item.id)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values()).sort(compare);
}

function isFailedPreconditionError(err: unknown): boolean {
  const code = (err as { code?: string })?.code || '';
  const msg = err instanceof Error ? err.message : String(err || '');
  return (
    code === 'failed-precondition' ||
    msg.toLowerCase().includes('failed-precondition') ||
    msg.toLowerCase().includes('requires an index')
  );
}

export interface WorkspaceCollectionReadiness {
  products: boolean;
  orders: boolean;
  staff: boolean;
  priceRecords: boolean;
  stockLogs: boolean;
  problemCustomers: boolean;
}

export function subscribeToWorkspace(
  uid: string,
  email: string,
  displayName: string,
  callbacks: {
    onUpdate: (data: {
      workspace: WorkspaceData;
      problemCustomers: ProblemCustomer[];
      newOrders: Order[];
      pagination: WorkspacePaginationState;
      rootFromCache?: boolean;
      collectionsLoaded?: WorkspaceCollectionReadiness;
    }) => void;
    onDeleted: () => void;
    onError: (err: Error) => void;
  },
  options?: {
    isWarehouseViewer?: boolean;
    warehouseUid?: string;
    assignedAdminEmail?: string;
  }
): WorkspaceSubscription {
  const isWarehouseViewer = Boolean(options?.isWarehouseViewer && options?.warehouseUid);
  const warehouseViewerUid = String(options?.warehouseUid || '').trim();
  let rootReady = false;
  let rootFromCache = true;
  let disposed = false;
  let initialProductsLoaded = false;
  let initialOrdersLoaded = false;
  let initialStaffLoaded = isWarehouseViewer;
  let initialPricesLoaded = isWarehouseViewer;
  let initialStockLogsLoaded = isWarehouseViewer;
  let initialProblemsLoaded = isWarehouseViewer;
  const knownOrderIds = new Set<string>();
  const deletedOrderIds = new Set<string>();
  const deletedStockLogIds = new Set<string>();

  let currentEmail = email.toLowerCase();
  const normalizedLoginEmail = email.trim().toLowerCase();
  let currentSettings: WorkspaceSettings = defaultSettings(currentEmail, displayName);
  let docLicense: WorkspaceLicense | undefined = undefined;
  let vaultData: DeveloperVaultSnapshotData | null = null;
  let lastSyncedVaultLicenseSig = '';
  let products: Product[] = [];
  let liveOrders: Order[] = [];
  let olderOrders: Order[] = [];
  let staff: StaffMember[] = [];
  let priceRecords: PriceRecordItem[] = [];
  let liveStockLogs: StockLogEntry[] = [];
  let olderStockLogs: StockLogEntry[] = [];
  let problemCustomers: ProblemCustomer[] = [];

  let liveOrdersTailDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  let olderOrdersTailDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  let hasPaginatedOrders = false;
  let hasMoreOrders = false;
  let loadingOrdersPage = false;
  let ordersOrderedQuerySupported = true;

  let liveStockLogsTailDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  let olderStockLogsTailDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  let hasPaginatedStockLogs = false;
  let hasMoreStockLogs = false;
  let loadingStockLogsPage = false;
  let stockLogsOrderedQuerySupported = true;
  let mongoOrdersCursor = '';
  let mongoStockLogsCursor = '';
  let didTriggerMongoBackfill = false;
  let lastMongoDeltaCursor = '';
  let mongoDeltaInFlight = false;
  let autoSeedTriggered = false;
  let legacyCleanupTriggered = false;

  let hasEmittedInitial = false;
  let emitQueued = false;
  let emitTimerId: number | null = null;
  let pendingNewOrders: Order[] = [];

  // Memoized sorted caches so an update in one subcollection never re-sorts the other 5
  let productsDirty = true;
  let ordersDirty = true;
  let staffDirty = true;
  let pricesDirty = true;
  let stockLogsDirty = true;
  let problemsDirty = true;
  let cachedProducts: Product[] = [];
  let cachedOrders: Order[] = [];
  let cachedStaff: StaffMember[] = [];
  let cachedPrices: PriceRecordItem[] = [];
  let cachedStockLogs: StockLogEntry[] = [];
  let cachedProblems: ProblemCustomer[] = [];

  let backfillTimerId: number | null = null;
  let initialDeltaTimerId: number | null = null;

  const triggerMongoBackfillIfReady = () => {
    if (isWarehouseViewer || didTriggerMongoBackfill || disposed) return;
    if (liveOrders.length === 0 && liveStockLogs.length === 0) return;
    didTriggerMongoBackfill = true;
    // Defer initial MongoDB backfill so mobile startup bandwidth goes 100% to Firestore UI boot
    if (typeof window !== 'undefined') {
      backfillTimerId = window.setTimeout(() => {
        backfillTimerId = null;
        if (!disposed) {
          backfillWorkspaceToMongoOnce(uid, liveOrders, liveStockLogs);
        }
      }, 2800);
    } else {
      backfillWorkspaceToMongoOnce(uid, liveOrders, liveStockLogs);
    }
  };

  const resolveEffectiveLicense = (): WorkspaceLicense | undefined => {
    const vaultRec =
      vaultData?.masterAdmins[currentEmail] || vaultData?.masterAdmins[normalizedLoginEmail];
    if (!vaultRec) {
      if (vaultData?.exists && docLicense) {
        return {
          ...docLicense,
          telegramUrl: vaultData.telegramUrl || docLicense.telegramUrl || DEFAULT_TELEGRAM_URL,
        };
      }
      return docLicense;
    }
    return {
      trialStartedAt: vaultRec.trialStartedAt || docLicense?.trialStartedAt || '',
      expireAt: vaultRec.expireAt || docLicense?.expireAt || '',
      planType: vaultRec.planType === 'paid' ? 'paid' : 'trial',
      telegramUrl: vaultData?.telegramUrl || docLicense?.telegramUrl || DEFAULT_TELEGRAM_URL,
      developerUpdatedAt: vaultRec.developerUpdatedAt || '',
    };
  };

  const syncEffectiveLicenseToWorkspaceDoc = () => {
    if (isWarehouseViewer || !rootReady || disposed || !vaultData?.exists) return;
    if (!auth.currentUser || auth.currentUser.uid !== uid) return;
    const effective = resolveEffectiveLicense();
    if (!effective) return;
    const differs =
      !docLicense ||
      docLicense.expireAt !== effective.expireAt ||
      docLicense.planType !== effective.planType ||
      docLicense.telegramUrl !== effective.telegramUrl ||
      docLicense.developerUpdatedAt !== effective.developerUpdatedAt;
    if (!differs) return;
    const sig = `${effective.expireAt}|${effective.planType}|${effective.telegramUrl}|${effective.developerUpdatedAt}`;
    if (sig === lastSyncedVaultLicenseSig) return;
    lastSyncedVaultLicenseSig = sig;
    queueMicrotask(() => {
      if (disposed || !auth.currentUser || auth.currentUser.uid !== uid) return;
      updateWorkspaceLicenseFs(uid, effective).catch(() => {
        lastSyncedVaultLicenseSig = '';
      });
    });
  };

  const flushEmit = () => {
    emitQueued = false;
    emitTimerId = null;
    if (!rootReady || disposed) return;
    hasEmittedInitial = true;

    if (productsDirty) {
      cachedProducts = [...products].sort((a, b) => a.sortOrder - b.sortOrder);
      productsDirty = false;
    }
    if (ordersDirty) {
      cachedOrders = mergePaginatedById(liveOrders, olderOrders, deletedOrderIds, (a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      );
      ordersDirty = false;
    }
    if (staffDirty) {
      cachedStaff = [...staff].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      staffDirty = false;
    }
    if (pricesDirty) {
      cachedPrices = [...priceRecords].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      pricesDirty = false;
    }
    if (stockLogsDirty) {
      cachedStockLogs = mergePaginatedById(
        liveStockLogs,
        olderStockLogs,
        deletedStockLogIds,
        (a, b) => b.createdAt.localeCompare(a.createdAt)
      ).filter((l) => !isTimestampExpired(l.createdAt));
      stockLogsDirty = false;
    }
    if (problemsDirty) {
      cachedProblems = [...problemCustomers].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      );
      problemsDirty = false;
    }

    const newOrdersBatch = pendingNewOrders;
    pendingNewOrders = [];
    callbacks.onUpdate({
      workspace: {
        email: currentEmail,
        products: cachedProducts,
        orders: cachedOrders,
        staff: cachedStaff,
        priceRecords: cachedPrices,
        stockLogs: cachedStockLogs,
        settings: currentSettings,
        license: resolveEffectiveLicense(),
      },
      problemCustomers: cachedProblems,
      newOrders: newOrdersBatch,
      pagination: {
        hasMoreOrders,
        hasMoreStockLogs,
      },
      rootFromCache,
      collectionsLoaded: {
        products: initialProductsLoaded,
        orders: initialOrdersLoaded,
        staff: initialStaffLoaded,
        priceRecords: initialPricesLoaded,
        stockLogs: initialStockLogsLoaded,
        problemCustomers: initialProblemsLoaded,
      },
    });
  };

  const emit = (newOrders: Order[] = []) => {
    if (newOrders.length > 0) {
      pendingNewOrders.push(...newOrders);
    }
    if (!rootReady || emitQueued || disposed) return;
    emitQueued = true;
    // Fire first root render immediately; coalesce rapid multi-subcollection bursts into 1 smooth render
    if (!hasEmittedInitial || typeof window === 'undefined') {
      queueMicrotask(flushEmit);
    } else {
      emitTimerId = window.setTimeout(flushEmit, 45);
    }
  };

  const wsPath = `workspaces/${uid}`;
  const unsubRoot = onSnapshot(
    doc(db, 'workspaces', uid),
    { includeMetadataChanges: true },
    (snap) => {
      if (!snap.exists()) {
        if (rootReady) {
          callbacks.onDeleted();
        } else if (!isWarehouseViewer && !snap.metadata.fromCache && !autoSeedTriggered) {
          autoSeedTriggered = true;
          void seedWorkspaceIfNeeded(uid, email, displayName).catch((err) => {
            if (!disposed) {
              callbacks.onError(err instanceof Error ? err : new Error(String(err)));
            }
          });
        }
        return;
      }
      rootFromCache = Boolean(snap.metadata.fromCache);
      const d = snap.data();
      currentEmail = String(d.ownerEmail || email).toLowerCase();
      const rawSettings = d.settings || {};
      currentSettings = {
        ...defaultSettings(currentEmail, displayName),
        ...rawSettings,
        saleProfiles: Array.isArray(rawSettings.saleProfiles) ? rawSettings.saleProfiles : [],
        adminProfiles: Array.isArray(rawSettings.adminProfiles) ? rawSettings.adminProfiles : [],
        warehouseProfiles: Array.isArray(rawSettings.warehouseProfiles)
          ? rawSettings.warehouseProfiles
          : [],
      };
      if (d.license && typeof d.license === 'object') {
        docLicense = {
          trialStartedAt: String(d.license.trialStartedAt || ''),
          expireAt: String(d.license.expireAt || ''),
          planType: d.license.planType === 'paid' ? 'paid' : 'trial',
          telegramUrl: String(d.license.telegramUrl || DEFAULT_TELEGRAM_URL),
          developerUpdatedAt: String(d.license.developerUpdatedAt || ''),
        };
      } else {
        docLicense = undefined;
      }
      rootReady = true;
      if (!isWarehouseViewer && !legacyCleanupTriggered && !rootFromCache) {
        legacyCleanupTriggered = true;
        void cleanupLegacySampleDataIfNeeded(uid, d, db).catch(() => {});
      }
      syncEffectiveLicenseToWorkspaceDoc();
      emit();
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, wsPath);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  const unsubDeveloperVault = subscribeToDeveloperVault(
    (nextVault) => {
      if (disposed) return;
      vaultData = nextVault;
      syncEffectiveLicenseToWorkspaceDoc();
      emit();
    },
    () => {
      // Non-fatal fallback; periodic server sync remains active
    }
  );

  const subError = (subPath: string) => (err: unknown) => {
    try {
      handleFirestoreError(err, OperationType.LIST, subPath);
    } catch (wrapped) {
      callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
    }
  };

  const productsCol = collection(db, 'workspaces', uid, 'products');
  const productsQuery = isWarehouseViewer
    ? query(
        productsCol,
        where('ownerUid', '==', uid),
        where('warehouseUids', 'array-contains', warehouseViewerUid)
      )
    : query(productsCol, where('ownerUid', '==', uid));

  const unsubProducts = onSnapshot(
    productsQuery,
    (snap) => {
      products = snap.docs.map((d) => stripProduct(d.data()));
      initialProductsLoaded = true;
      productsDirty = true;
      emit();
    },
    subError(`${wsPath}/products`)
  );

  let unsubOrders: Unsubscribe = () => {};
  const attachOrdersListener = (withOrderBy: boolean) => {
    unsubOrders();
    ordersOrderedQuerySupported = withOrderBy;
    const ordersCol = collection(db, 'workspaces', uid, 'orders');
    const ordersQuery = isWarehouseViewer
      ? withOrderBy
        ? query(
            ordersCol,
            where('ownerUid', '==', uid),
            where('warehouseUids', 'array-contains', warehouseViewerUid),
            orderBy('createdAt', 'desc'),
            limit(ORDERS_PAGE_SIZE)
          )
        : query(
            ordersCol,
            where('ownerUid', '==', uid),
            where('warehouseUids', 'array-contains', warehouseViewerUid),
            limit(ORDERS_PAGE_SIZE)
          )
      : withOrderBy
      ? query(
          ordersCol,
          where('ownerUid', '==', uid),
          orderBy('createdAt', 'desc'),
          limit(ORDERS_PAGE_SIZE)
        )
      : query(ordersCol, where('ownerUid', '==', uid), limit(ORDERS_PAGE_SIZE));

    unsubOrders = onSnapshot(
      ordersQuery,
      (snap) => {
        const nextOrders = snap.docs.map((d) => stripOrder(d.data()));
        const nextOrderIdSet = new Set(nextOrders.map((o) => o.id));
        const tailCreatedAt =
          nextOrders.length > 0 ? nextOrders[nextOrders.length - 1].createdAt : '';
        const removedIds: string[] = [];
        const windowShiftedCandidates: Order[] = [];
        const changedOrders: Order[] = [];

        for (const ch of snap.docChanges()) {
          if (ch.type === 'removed') {
            const removedOrder = stripOrder(ch.doc.data());
            const shiftedPastWindow =
              snap.docs.length >= ORDERS_PAGE_SIZE &&
              ordersOrderedQuerySupported &&
              Boolean(tailCreatedAt) &&
              Boolean(removedOrder.createdAt) &&
              removedOrder.createdAt <= tailCreatedAt;

            if (shiftedPastWindow) {
              windowShiftedCandidates.push(removedOrder);
            } else {
              deletedOrderIds.add(ch.doc.id);
              removedIds.push(ch.doc.id);
            }
          } else {
            deletedOrderIds.delete(ch.doc.id);
            if (initialOrdersLoaded) {
              changedOrders.push(stripOrder(ch.doc.data()));
            }
          }
        }

        if (windowShiftedCandidates.length > 0) {
          const existingOlder = new Set(olderOrders.map((o) => o.id));
          const toPreserve = windowShiftedCandidates.filter(
            (o) => o.id && !deletedOrderIds.has(o.id) && !nextOrderIdSet.has(o.id) && !existingOlder.has(o.id)
          );
          if (toPreserve.length > 0) {
            olderOrders = [...toPreserve, ...olderOrders];
          }
          // Verify asynchronously whether shifted-out docs actually still exist on Firestore server
          for (const candidate of windowShiftedCandidates) {
            if (!candidate.id) continue;
            void getDocFromServer(doc(db, 'workspaces', uid, 'orders', candidate.id))
              .then((serverSnap) => {
                if (disposed) return;
                if (!serverSnap.exists()) {
                  evictOrders([candidate.id]);
                  if (!isWarehouseViewer) {
                    deleteOrdersFromMongoBackground([candidate.id]);
                  }
                }
              })
              .catch(() => {
                // Keep preserved candidate if offline / server check transient failure
              });
          }
        }

        if (olderOrders.length > 0 && (removedIds.length > 0 || nextOrderIdSet.size > 0)) {
          const removedSet = new Set(removedIds);
          olderOrders = olderOrders.filter(
            (o) => !removedSet.has(o.id) && !nextOrderIdSet.has(o.id) && !deletedOrderIds.has(o.id)
          );
        }

        const newlyArrived: Order[] = [];
        if (!initialOrdersLoaded) {
          for (const o of nextOrders) knownOrderIds.add(o.id);
          initialOrdersLoaded = true;
        } else {
          for (const o of nextOrders) {
            if (!knownOrderIds.has(o.id)) {
              knownOrderIds.add(o.id);
              newlyArrived.push(o);
            }
          }
        }
        liveOrders = nextOrders;
        ordersDirty = true;
        liveOrdersTailDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
        if (!hasPaginatedOrders) {
          hasMoreOrders = snap.docs.length >= ORDERS_PAGE_SIZE;
        }
        if (!isWarehouseViewer) {
          triggerMongoBackfillIfReady();
          if (changedOrders.length > 0) {
            syncOrdersToMongoBackground(changedOrders);
          }
          if (removedIds.length > 0) {
            deleteOrdersFromMongoBackground(removedIds);
          }
          if (!snap.metadata.fromCache && snap.docs.length < ORDERS_PAGE_SIZE) {
            reconcileWorkspaceOrdersWithMongo(
              uid,
              nextOrders.map((o) => o.id)
            );
          }
        }
        emit(newlyArrived);
      },
      (err) => {
        if (withOrderBy && isFailedPreconditionError(err) && !disposed) {
          attachOrdersListener(false);
          return;
        }
        subError(`${wsPath}/orders`)(err);
      }
    );
  };
  attachOrdersListener(true);

  const unsubStaff: Unsubscribe = isWarehouseViewer
    ? () => {}
    : onSnapshot(
        query(collection(db, 'workspaces', uid, 'staff'), where('ownerUid', '==', uid)),
        (snap) => {
          staff = snap.docs.map((d) => stripStaff(d.data()));
          initialStaffLoaded = true;
          staffDirty = true;
          emit();
        },
        subError(`${wsPath}/staff`)
      );

  const unsubPrices: Unsubscribe = isWarehouseViewer
    ? () => {}
    : onSnapshot(
        query(collection(db, 'workspaces', uid, 'priceRecords'), where('ownerUid', '==', uid)),
        (snap) => {
          priceRecords = snap.docs.map((d) => stripPriceRecord(d.data()));
          initialPricesLoaded = true;
          pricesDirty = true;
          emit();
        },
        subError(`${wsPath}/priceRecords`)
      );

  let unsubStockLogs: Unsubscribe = () => {};
  const attachStockLogsListener = (withOrderBy: boolean) => {
    if (isWarehouseViewer) return;
    unsubStockLogs();
    stockLogsOrderedQuerySupported = withOrderBy;
    const stockLogsCol = collection(db, 'workspaces', uid, 'stockLogs');
    const stockLogsQuery = withOrderBy
      ? query(
          stockLogsCol,
          where('ownerUid', '==', uid),
          orderBy('createdAt', 'desc'),
          limit(STOCK_LOGS_PAGE_SIZE)
        )
      : query(stockLogsCol, where('ownerUid', '==', uid), limit(STOCK_LOGS_PAGE_SIZE));

    unsubStockLogs = onSnapshot(
      stockLogsQuery,
      (snap) => {
        const nextLogs = snap.docs.map((d) => stripStockLog(d.data()));
        const nextLogIdSet = new Set(nextLogs.map((l) => l.id));
        const tailCreatedAt = nextLogs.length > 0 ? nextLogs[nextLogs.length - 1].createdAt : '';
        const removedLogIds: string[] = [];
        const windowShiftedLogs: StockLogEntry[] = [];
        const changedLogs: StockLogEntry[] = [];

        for (const ch of snap.docChanges()) {
          if (ch.type === 'removed') {
            const removedLog = stripStockLog(ch.doc.data());
            const shiftedPastWindow =
              snap.docs.length >= STOCK_LOGS_PAGE_SIZE &&
              stockLogsOrderedQuerySupported &&
              Boolean(tailCreatedAt) &&
              Boolean(removedLog.createdAt) &&
              removedLog.createdAt <= tailCreatedAt;

            if (shiftedPastWindow) {
              windowShiftedLogs.push(removedLog);
            } else {
              deletedStockLogIds.add(ch.doc.id);
              removedLogIds.push(ch.doc.id);
            }
          } else {
            deletedStockLogIds.delete(ch.doc.id);
            if (initialStockLogsLoaded) {
              changedLogs.push(stripStockLog(ch.doc.data()));
            }
          }
        }

        if (windowShiftedLogs.length > 0) {
          const existingOlder = new Set(olderStockLogs.map((l) => l.id));
          const toPreserve = windowShiftedLogs.filter(
            (l) => l.id && !deletedStockLogIds.has(l.id) && !nextLogIdSet.has(l.id) && !existingOlder.has(l.id)
          );
          if (toPreserve.length > 0) {
            olderStockLogs = [...toPreserve, ...olderStockLogs];
          }
          for (const candidate of windowShiftedLogs) {
            if (!candidate.id) continue;
            void getDocFromServer(doc(db, 'workspaces', uid, 'stockLogs', candidate.id))
              .then((serverSnap) => {
                if (disposed) return;
                if (!serverSnap.exists()) {
                  deletedStockLogIds.add(candidate.id);
                  olderStockLogs = olderStockLogs.filter((l) => l.id !== candidate.id);
                  liveStockLogs = liveStockLogs.filter((l) => l.id !== candidate.id);
                  stockLogsDirty = true;
                  deleteStockLogsFromMongoBackground([candidate.id]);
                  emit();
                }
              })
              .catch(() => {});
          }
        }

        if (olderStockLogs.length > 0 && (removedLogIds.length > 0 || nextLogIdSet.size > 0)) {
          const removedSet = new Set(removedLogIds);
          olderStockLogs = olderStockLogs.filter(
            (l) => !removedSet.has(l.id) && !nextLogIdSet.has(l.id) && !deletedStockLogIds.has(l.id)
          );
        }

        initialStockLogsLoaded = true;
        liveStockLogs = nextLogs;
        stockLogsDirty = true;
        liveStockLogsTailDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
        if (!hasPaginatedStockLogs) {
          hasMoreStockLogs = snap.docs.length >= STOCK_LOGS_PAGE_SIZE;
        }
        triggerMongoBackfillIfReady();
        if (changedLogs.length > 0) {
          syncStockLogsToMongoBackground(changedLogs);
        }
        if (removedLogIds.length > 0) {
          deleteStockLogsFromMongoBackground(removedLogIds);
        }
        if (!snap.metadata.fromCache && snap.docs.length < STOCK_LOGS_PAGE_SIZE) {
          reconcileWorkspaceStockLogsWithMongo(
            uid,
            nextLogs.map((l) => l.id)
          );
        }
        emit();
      },
      (err) => {
        if (withOrderBy && isFailedPreconditionError(err) && !disposed) {
          attachStockLogsListener(false);
          return;
        }
        subError(`${wsPath}/stockLogs`)(err);
      }
    );
  };
  attachStockLogsListener(true);

  const unsubProblems: Unsubscribe = isWarehouseViewer
    ? () => {}
    : onSnapshot(
        query(collection(db, 'workspaces', uid, 'problemCustomers'), where('ownerUid', '==', uid)),
        (snap) => {
          problemCustomers = snap.docs.map((d) => stripProblemCustomer(d.data()));
          initialProblemsLoaded = true;
          problemsDirty = true;
          emit();
        },
        subError(`${wsPath}/problemCustomers`)
      );

  const loadMoreOrders = async (): Promise<boolean> => {
    if (disposed || loadingOrdersPage || !hasMoreOrders) return false;

    loadingOrdersPage = true;
    try {
      const oldestLoadedCreatedAt =
        mongoOrdersCursor ||
        (olderOrders.length > 0 ? olderOrders[olderOrders.length - 1].createdAt : '') ||
        (liveOrders.length > 0 ? liveOrders[liveOrders.length - 1].createdAt : '');

      if (oldestLoadedCreatedAt) {
        const excludeIds = [
          ...liveOrders.map((o) => o.id),
          ...olderOrders.slice(-200).map((o) => o.id),
        ];
        const mongoRes = await queryMoreOrdersFromMongo({
          cursorCreatedAt: oldestLoadedCreatedAt,
          excludeIds,
          limit: ORDERS_PAGE_SIZE,
        });
        if (disposed) return false;

        if (mongoRes.usedMongo && mongoRes.orders.length > 0) {
          hasPaginatedOrders = true;
          const existingSet = new Set([
            ...liveOrders.map((o) => o.id),
            ...olderOrders.map((o) => o.id),
          ]);
          const fresh = mongoRes.orders.filter((o) => !existingSet.has(o.id) && !deletedOrderIds.has(o.id));
          for (const o of fresh) {
            knownOrderIds.add(o.id);
          }
          if (fresh.length > 0) {
            olderOrders = [...olderOrders, ...fresh];
            ordersDirty = true;
            mongoOrdersCursor = mongoRes.nextCursor || fresh[fresh.length - 1].createdAt;
            hasMoreOrders = mongoRes.hasMore;
            emit();
            return true;
          }
        }
      }

      const cursor = olderOrdersTailDoc || liveOrdersTailDoc;
      if (!cursor) {
        hasMoreOrders = false;
        emit();
        return false;
      }

      const ordersCol = collection(db, 'workspaces', uid, 'orders');
      const nextQuery = isWarehouseViewer
        ? ordersOrderedQuerySupported
          ? query(
              ordersCol,
              where('ownerUid', '==', uid),
              where('warehouseUids', 'array-contains', warehouseViewerUid),
              orderBy('createdAt', 'desc'),
              startAfter(cursor),
              limit(ORDERS_PAGE_SIZE)
            )
          : query(
              ordersCol,
              where('ownerUid', '==', uid),
              where('warehouseUids', 'array-contains', warehouseViewerUid),
              startAfter(cursor),
              limit(ORDERS_PAGE_SIZE)
            )
        : ordersOrderedQuerySupported
        ? query(
            ordersCol,
            where('ownerUid', '==', uid),
            orderBy('createdAt', 'desc'),
            startAfter(cursor),
            limit(ORDERS_PAGE_SIZE)
          )
        : query(ordersCol, where('ownerUid', '==', uid), startAfter(cursor), limit(ORDERS_PAGE_SIZE));

      const snap = await getDocs(nextQuery);
      if (disposed) return false;

      hasPaginatedOrders = true;
      if (snap.empty) {
        hasMoreOrders = false;
        emit();
        return false;
      }

      const fetched = snap.docs.map((d) => stripOrder(d.data()));
      for (const o of fetched) {
        knownOrderIds.add(o.id);
      }
      olderOrders = [...olderOrders, ...fetched];
      ordersDirty = true;
      olderOrdersTailDoc = snap.docs[snap.docs.length - 1];
      hasMoreOrders = snap.docs.length >= ORDERS_PAGE_SIZE;
      if (!isWarehouseViewer) {
        syncOrdersToMongoBackground(fetched);
      }
      emit();
      return true;
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.LIST, `${wsPath}/orders`);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
      return false;
    } finally {
      loadingOrdersPage = false;
    }
  };

  const loadMoreStockLogs = async (): Promise<boolean> => {
    if (disposed || loadingStockLogsPage || !hasMoreStockLogs) return false;

    loadingStockLogsPage = true;
    try {
      const oldestLogCreatedAt =
        mongoStockLogsCursor ||
        (olderStockLogs.length > 0 ? olderStockLogs[olderStockLogs.length - 1].createdAt : '') ||
        (liveStockLogs.length > 0 ? liveStockLogs[liveStockLogs.length - 1].createdAt : '');

      if (oldestLogCreatedAt) {
        const excludeIds = [
          ...liveStockLogs.map((l) => l.id),
          ...olderStockLogs.slice(-200).map((l) => l.id),
        ];
        const mongoRes = await queryMoreStockLogsFromMongo({
          cursorCreatedAt: oldestLogCreatedAt,
          excludeIds,
          limit: STOCK_LOGS_PAGE_SIZE,
        });
        if (disposed) return false;

        if (mongoRes.usedMongo && mongoRes.stockLogs.length > 0) {
          hasPaginatedStockLogs = true;
          const existingSet = new Set([
            ...liveStockLogs.map((l) => l.id),
            ...olderStockLogs.map((l) => l.id),
          ]);
          const fresh = mongoRes.stockLogs.filter((l) => !existingSet.has(l.id));
          if (fresh.length > 0) {
            olderStockLogs = [...olderStockLogs, ...fresh];
            stockLogsDirty = true;
            mongoStockLogsCursor = mongoRes.nextCursor || fresh[fresh.length - 1].createdAt;
            hasMoreStockLogs = mongoRes.hasMore;
            emit();
            return true;
          }
        }
      }

      const cursor = olderStockLogsTailDoc || liveStockLogsTailDoc;
      if (!cursor) {
        hasMoreStockLogs = false;
        emit();
        return false;
      }

      const stockLogsCol = collection(db, 'workspaces', uid, 'stockLogs');
      const nextQuery = stockLogsOrderedQuerySupported
        ? query(
            stockLogsCol,
            where('ownerUid', '==', uid),
            orderBy('createdAt', 'desc'),
            startAfter(cursor),
            limit(STOCK_LOGS_PAGE_SIZE)
          )
        : query(
            stockLogsCol,
            where('ownerUid', '==', uid),
            startAfter(cursor),
            limit(STOCK_LOGS_PAGE_SIZE)
          );

      const snap = await getDocs(nextQuery);
      if (disposed) return false;

      hasPaginatedStockLogs = true;
      if (snap.empty) {
        hasMoreStockLogs = false;
        emit();
        return false;
      }

      const fetched = snap.docs.map((d) => stripStockLog(d.data()));
      olderStockLogs = [...olderStockLogs, ...fetched];
      stockLogsDirty = true;
      olderStockLogsTailDoc = snap.docs[snap.docs.length - 1];
      hasMoreStockLogs = snap.docs.length >= STOCK_LOGS_PAGE_SIZE;
      syncStockLogsToMongoBackground(fetched);
      emit();
      return true;
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.LIST, `${wsPath}/stockLogs`);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
      return false;
    } finally {
      loadingStockLogsPage = false;
    }
  };

  const searchOrdersFromMongo = async (params: {
    search: string;
    operatorEmail?: string;
    staffName?: string;
    paymentStatus?: 'paid' | 'unpaid' | '';
    limit?: number;
  }): Promise<Order[]> => {
    if (disposed) return [];
    const q = String(params.search || '').trim();
    if (!q) return [];
    const mongoRes = await queryMoreOrdersFromMongo({
      cursorCreatedAt: '',
      excludeIds: [],
      search: q,
      operatorEmail: params.operatorEmail || '',
      staffName: params.staffName || '',
      paymentStatus: params.paymentStatus || '',
      limit: params.limit || 60,
    });
    if (disposed || !mongoRes.usedMongo || mongoRes.orders.length === 0) {
      return [];
    }
    const existingSet = new Set([
      ...liveOrders.map((o) => o.id),
      ...olderOrders.map((o) => o.id),
    ]);
    const fresh = mongoRes.orders.filter(
      (o) => o?.id && !existingSet.has(o.id) && !deletedOrderIds.has(o.id)
    );
    if (fresh.length > 0) {
      for (const o of fresh) knownOrderIds.add(o.id);
      olderOrders = [...olderOrders, ...fresh];
      ordersDirty = true;
      emit();
    }
    return mongoRes.orders.filter((o) => o?.id && !deletedOrderIds.has(o.id));
  };

  const evictOrders = (ids: string[]) => {
    if (!ids.length || disposed) return;
    const removeSet = new Set(ids);
    for (const id of ids) {
      deletedOrderIds.add(id);
    }
    olderOrders = olderOrders.filter((o) => !removeSet.has(o.id));
    liveOrders = liveOrders.filter((o) => !removeSet.has(o.id));
    ordersDirty = true;
    emit();
  };

  const evictStockLogs = (ids: string[]) => {
    if (!ids.length || disposed) return;
    const removeSet = new Set(ids);
    for (const id of ids) {
      deletedStockLogIds.add(id);
    }
    olderStockLogs = olderStockLogs.filter((l) => !removeSet.has(l.id));
    liveStockLogs = liveStockLogs.filter((l) => !removeSet.has(l.id));
    stockLogsDirty = true;
    emit();
  };

  const ordersDiffer = (a: Order, b: Order): boolean =>
    a.paymentStatus !== b.paymentStatus ||
    a.totalAmount !== b.totalAmount ||
    a.totalCost !== b.totalCost ||
    a.customerName !== b.customerName ||
    a.customerPhone !== b.customerPhone ||
    a.customerAddress !== b.customerAddress ||
    a.dueDate !== b.dueDate ||
    a.note !== b.note ||
    a.staffName !== b.staffName ||
    a.items.length !== b.items.length;

  const stockLogsDiffer = (a: StockLogEntry, b: StockLogEntry): boolean =>
    a.addedQuantity !== b.addedQuantity ||
    a.newStock !== b.newStock ||
    a.productName !== b.productName;

  const runMongoDeltaCheck = async () => {
    if (disposed || mongoDeltaInFlight) return;
    mongoDeltaInFlight = true;
    try {
      await flushAllPendingMongoOps();
      const delta = await fetchMongoChanges(lastMongoDeltaCursor);
      if (disposed || !delta || !delta.configured || !delta.ok) return;
      if (delta.serverNow) {
        lastMongoDeltaCursor = delta.serverNow;
      }
      if (delta.workspaceDeleted) {
        callbacks.onDeleted();
        return;
      }

      let mutated = false;

      if (delta.deletedOrderIds.length > 0) {
        const removeSet = new Set(delta.deletedOrderIds);
        for (const id of delta.deletedOrderIds) {
          if (!deletedOrderIds.has(id)) {
            deletedOrderIds.add(id);
            mutated = true;
            ordersDirty = true;
          }
        }
        const nextOlder = olderOrders.filter((o) => !removeSet.has(o.id));
        const nextLive = liveOrders.filter((o) => !removeSet.has(o.id));
        if (nextOlder.length !== olderOrders.length || nextLive.length !== liveOrders.length) {
          olderOrders = nextOlder;
          liveOrders = nextLive;
          ordersDirty = true;
          mutated = true;
        }
      }

      if (delta.deletedStockLogIds.length > 0) {
        const removeSet = new Set(delta.deletedStockLogIds);
        for (const id of delta.deletedStockLogIds) {
          if (!deletedStockLogIds.has(id)) {
            deletedStockLogIds.add(id);
            mutated = true;
            stockLogsDirty = true;
          }
        }
        const nextOlderLogs = olderStockLogs.filter((l) => !removeSet.has(l.id));
        const nextLiveLogs = liveStockLogs.filter((l) => !removeSet.has(l.id));
        if (
          nextOlderLogs.length !== olderStockLogs.length ||
          nextLiveLogs.length !== liveStockLogs.length
        ) {
          olderStockLogs = nextOlderLogs;
          liveStockLogs = nextLiveLogs;
          stockLogsDirty = true;
          mutated = true;
        }
      }

      if (delta.recentOrders.length > 0) {
        const liveIdxMap = new Map(liveOrders.map((o, idx) => [o.id, idx]));
        const olderIdxMap = new Map(olderOrders.map((o, idx) => [o.id, idx]));
        for (const ro of delta.recentOrders) {
          if (!ro?.id || deletedOrderIds.has(ro.id)) continue;
          const li = liveIdxMap.get(ro.id);
          if (li !== undefined) {
            if (ordersDiffer(liveOrders[li], ro)) {
              liveOrders[li] = ro;
              ordersDirty = true;
              mutated = true;
            }
          } else {
            const oi = olderIdxMap.get(ro.id);
            if (oi !== undefined) {
              if (ordersDiffer(olderOrders[oi], ro)) {
                olderOrders[oi] = ro;
                ordersDirty = true;
                mutated = true;
              }
            } else {
              olderOrders = [ro, ...olderOrders];
              ordersDirty = true;
              mutated = true;
            }
          }
        }
      }

      if (delta.recentStockLogs.length > 0) {
        const liveIdxMap = new Map(liveStockLogs.map((l, idx) => [l.id, idx]));
        const olderIdxMap = new Map(olderStockLogs.map((l, idx) => [l.id, idx]));
        for (const rl of delta.recentStockLogs) {
          if (!rl?.id || deletedStockLogIds.has(rl.id)) continue;
          const li = liveIdxMap.get(rl.id);
          if (li !== undefined) {
            if (stockLogsDiffer(liveStockLogs[li], rl)) {
              liveStockLogs[li] = rl;
              stockLogsDirty = true;
              mutated = true;
            }
          } else {
            const oi = olderIdxMap.get(rl.id);
            if (oi !== undefined) {
              if (stockLogsDiffer(olderStockLogs[oi], rl)) {
                olderStockLogs[oi] = rl;
                stockLogsDirty = true;
                mutated = true;
              }
            } else {
              olderStockLogs = [rl, ...olderStockLogs];
              stockLogsDirty = true;
              mutated = true;
            }
          }
        }
      }

      if (mutated) {
        emit();
      }
    } finally {
      mongoDeltaInFlight = false;
    }
  };

  // Defer initial background MongoDB delta sync by 2.2s so cold mobile boot is uncontested
  if (typeof window !== 'undefined') {
    initialDeltaTimerId = window.setTimeout(() => {
      initialDeltaTimerId = null;
      if (!disposed) {
        void runMongoDeltaCheck();
      }
    }, 2200);
  }

  const unsubLocalBroadcast = subscribeToLocalSyncBroadcast((msg) => {
    if (disposed) return;
    if (msg.type === 'workspace:deleted') {
      callbacks.onDeleted();
      return;
    }
    if (msg.type === 'mongo:deleted' && msg.kind === 'order' && Array.isArray(msg.ids)) {
      evictOrders(msg.ids);
    } else if (msg.type === 'mongo:deleted' && msg.kind === 'stock_log' && Array.isArray(msg.ids)) {
      evictStockLogs(msg.ids);
    }
    void runMongoDeltaCheck();
  });

  const onVisibleOrOnline = () => {
    if (disposed) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    void runMongoDeltaCheck();
  };

  let mongoPollTimer: number | null = null;
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', onVisibleOrOnline);
    window.addEventListener('online', onVisibleOrOnline);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibleOrOnline);
    }
    // Firestore realtime onSnapshot handles live updates instantly; poll MongoDB every 30s for cross-device archival sync
    mongoPollTimer = window.setInterval(() => {
      if (disposed) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void runMongoDeltaCheck();
    }, 30_000);
  }

  return {
    unsubscribe: () => {
      disposed = true;
      unsubLocalBroadcast();
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onVisibleOrOnline);
        window.removeEventListener('online', onVisibleOrOnline);
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', onVisibleOrOnline);
        }
        if (mongoPollTimer !== null) {
          window.clearInterval(mongoPollTimer);
          mongoPollTimer = null;
        }
        if (emitTimerId !== null) {
          window.clearTimeout(emitTimerId);
          emitTimerId = null;
        }
        if (backfillTimerId !== null) {
          window.clearTimeout(backfillTimerId);
          backfillTimerId = null;
        }
        if (initialDeltaTimerId !== null) {
          window.clearTimeout(initialDeltaTimerId);
          initialDeltaTimerId = null;
        }
      }
      unsubRoot();
      unsubDeveloperVault();
      unsubProducts();
      unsubOrders();
      unsubStaff();
      unsubPrices();
      unsubStockLogs();
      unsubProblems();
    },
    loadMoreOrders,
    loadMoreStockLogs,
    searchOrdersFromMongo,
    evictOrders,
    evictStockLogs,
  };
}

/* =========================================================
   MUTATIONS
   ========================================================= */

export async function saveProductFs(
  uid: string,
  payload: Partial<Product>,
  currentProducts: Product[],
  settings: WorkspaceSettings,
  operatorEmail = ''
): Promise<void> {
  const name = String(payload.name || '').trim().slice(0, 200);
  if (!name) throw new Error('សូមបញ្ចូលឈ្មោះទំនិញ។');

  const now = new Date();
  const cleanStock = Math.max(0, Math.floor(Number(payload.stock) || 0));
  const cleanCost = Math.max(0, Number(payload.costPrice) || 0);
  const cleanSell = Math.max(0, Number(payload.sellingPrice) || 0);
  const cleanPromo = Math.max(0, Number(payload.promotion) || 0);
  const cleanOp = operatorEmail.trim().toLowerCase().slice(0, 200);
  const existing = payload.id ? currentProducts.find((p) => p.id === payload.id) : undefined;
  const masterOwnerEmail = String(auth.currentUser?.email || cleanOp || '').trim().toLowerCase();

  if (existing) {
    const prodPath = `workspaces/${uid}/products/${existing.id}`;
    const prodRef = doc(db, 'workspaces', uid, 'products', existing.id);
    const delta = cleanStock - existing.stock;
    const warehouseUids = computeWarehouseUidsForOperator(
      settings.warehouseProfiles,
      existing.operatorEmail || cleanOp || masterOwnerEmail,
      masterOwnerEmail
    );
    const batch = writeBatch(db);
    batch.update(prodRef, {
      name,
      imageUrl: String(payload.imageUrl ?? existing.imageUrl).slice(0, 2000),
      costPrice: cleanCost,
      sellingPrice: cleanSell,
      promotion: cleanPromo,
      stock: cleanStock,
      barcode: String(payload.barcode ?? existing.barcode).trim().slice(0, 120),
      category: String(payload.category ?? existing.category).trim().slice(0, 120),
      warehouse: String(payload.warehouse ?? existing.warehouse).trim().slice(0, 120),
      warehouseUids,
      updatedAt: now.toISOString(),
      serverUpdatedAt: serverTimestamp(),
    });
    let createdStockLog: StockLogEntry | null = null;
    if (delta > 0) {
      const logId = makeDocId('stk');
      createdStockLog = {
        id: logId,
        productId: existing.id,
        productName: name,
        addedQuantity: delta,
        previousStock: existing.stock,
        newStock: cleanStock,
        warehouse: String(payload.warehouse ?? existing.warehouse).trim().slice(0, 120),
        date: `${formatDateLocal(now)} ${formatTimeLocal(now)}`,
        createdAt: now.toISOString(),
        ...(cleanOp ? { operatorEmail: cleanOp } : {}),
      };
      batch.set(doc(db, 'workspaces', uid, 'stockLogs', logId), {
        ...createdStockLog,
        ownerUid: uid,
        serverCreatedAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
      if (createdStockLog) {
        syncStockLogsToMongoBackground([createdStockLog]);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, prodPath);
    }
    return;
  }

  const newId = makeDocId('prd');
  const prodPath = `workspaces/${uid}/products/${newId}`;
  const maxSort = currentProducts.reduce((m, p) => Math.max(m, p.sortOrder), -1);
  const warehouse = String(payload.warehouse || settings.warehouses[0] || '')
    .trim()
    .slice(0, 120);

  const newWarehouseUids = computeWarehouseUidsForOperator(
    settings.warehouseProfiles,
    cleanOp || masterOwnerEmail,
    masterOwnerEmail
  );

  const batch = writeBatch(db);
  batch.set(doc(db, 'workspaces', uid, 'products', newId), {
    id: newId,
    ownerUid: uid,
    name,
    imageUrl: String(payload.imageUrl || '').slice(0, 2000),
    costPrice: cleanCost,
    sellingPrice: cleanSell,
    promotion: cleanPromo,
    stock: cleanStock,
    barcode: String(payload.barcode || '').trim().slice(0, 120),
    category: String(payload.category || settings.categories[0] || 'ទូទៅ').trim().slice(0, 120),
    warehouse,
    warehouseUids: newWarehouseUids,
    sortOrder: maxSort + 1,
    updatedAt: now.toISOString(),
    ...(cleanOp ? { operatorEmail: cleanOp } : {}),
    serverUpdatedAt: serverTimestamp(),
  });

  let createdStockLog: StockLogEntry | null = null;
  if (cleanStock > 0) {
    const logId = makeDocId('stk');
    createdStockLog = {
      id: logId,
      productId: newId,
      productName: name,
      addedQuantity: cleanStock,
      previousStock: 0,
      newStock: cleanStock,
      warehouse,
      date: `${formatDateLocal(now)} ${formatTimeLocal(now)}`,
      createdAt: now.toISOString(),
      ...(cleanOp ? { operatorEmail: cleanOp } : {}),
    };
    batch.set(doc(db, 'workspaces', uid, 'stockLogs', logId), {
      ...createdStockLog,
      ownerUid: uid,
      serverCreatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
    if (createdStockLog) {
      syncStockLogsToMongoBackground([createdStockLog]);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, prodPath);
  }
}

export async function updateProductImageFs(
  uid: string,
  productId: string,
  imageUrl: string
): Promise<void> {
  const cleanId = String(productId || '').trim();
  const cleanUrl = String(imageUrl || '').trim().slice(0, 2000);
  if (!cleanId) throw new Error('Product ID is required.');
  if (!cleanUrl) throw new Error('Product image URL is required.');

  const prodPath = `workspaces/${uid}/products/${cleanId}`;
  try {
    await updateDoc(doc(db, 'workspaces', uid, 'products', cleanId), {
      imageUrl: cleanUrl,
      updatedAt: new Date().toISOString(),
      serverUpdatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, prodPath);
  }
}

export async function deleteProductFs(uid: string, productId: string): Promise<void> {
  const path = `workspaces/${uid}/products/${productId}`;
  try {
    await deleteDoc(doc(db, 'workspaces', uid, 'products', productId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function reorderProductsFs(uid: string, orderedIds: string[]): Promise<void> {
  const path = `workspaces/${uid}/products`;
  const batch = writeBatch(db);
  orderedIds.forEach((id, idx) => {
    batch.update(doc(db, 'workspaces', uid, 'products', id), {
      sortOrder: idx,
      serverUpdatedAt: serverTimestamp(),
    });
  });
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function addStockLogFs(
  uid: string,
  productId: string,
  addedQuantity: number,
  operatorEmail = ''
): Promise<void> {
  const qty = Math.floor(Number(addedQuantity) || 0);
  if (!productId || qty <= 0) {
    throw new Error('សូមជ្រើសរើសទំនិញ និងចំនួនស្តុកបន្ថែមអោយបានត្រឹមត្រូវ។');
  }
  const prodRef = doc(db, 'workspaces', uid, 'products', productId);
  const logId = makeDocId('stk');
  const logRef = doc(db, 'workspaces', uid, 'stockLogs', logId);
  const now = new Date();
  const cleanOp = operatorEmail.trim().toLowerCase().slice(0, 200);
  let createdEntry: StockLogEntry | null = null;

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(prodRef);
      if (!snap.exists()) throw new Error('រកមិនឃើញទំនិញនេះទេ។');
      const prod = stripProduct(snap.data());
      const newStock = prod.stock + qty;
      tx.update(prodRef, {
        stock: newStock,
        updatedAt: now.toISOString(),
        serverUpdatedAt: serverTimestamp(),
      });
      createdEntry = {
        id: logId,
        productId: prod.id,
        productName: prod.name,
        addedQuantity: qty,
        previousStock: prod.stock,
        newStock,
        warehouse: prod.warehouse,
        date: `${formatDateLocal(now)} ${formatTimeLocal(now)}`,
        createdAt: now.toISOString(),
        ...(cleanOp ? { operatorEmail: cleanOp } : {}),
      };
      tx.set(logRef, {
        ...createdEntry,
        ownerUid: uid,
        serverCreatedAt: serverTimestamp(),
      });
    });
    if (createdEntry) {
      syncStockLogsToMongoBackground([createdEntry]);
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('សូមជ្រើសរើស')) throw err;
    handleFirestoreError(err, OperationType.WRITE, `workspaces/${uid}/stockLogs/${logId}`);
  }
}

export async function createOrderFs(
  uid: string,
  userEmail: string,
  operatorEmail: string,
  displayName: string,
  payload: Record<string, unknown>,
  _currentOrdersCount: number,
  settings: WorkspaceSettings,
  staff: StaffMember[],
  currentProducts: Product[] = []
): Promise<Order> {
  const rawItems = Array.isArray(payload.items)
    ? (payload.items as Array<{
        productId: string;
        quantity: number;
        customUnitPrice?: number;
      }>)
    : [];
  if (rawItems.length === 0) {
    throw new Error('កន្ត្រកទំនិញទទេ! សូមជ្រើសរើសទំនិញជាមុនសិន។');
  }

  const orderId = makeDocId('ord');
  const orderRef = doc(db, 'workspaces', uid, 'orders', orderId);
  const now = new Date();
  const nowIso = now.toISOString();

  // Resolve products from already-synced live catalog first (0 network reads),
  // falling back to getDoc only for any ID missing from local state.
  const productById = new Map<string, Product>(currentProducts.map((p) => [p.id, p]));
  const missingIds = Array.from(
    new Set(rawItems.map((it) => it.productId).filter((pid) => pid && !productById.has(pid)))
  );
  if (missingIds.length > 0) {
    const fetchedSnaps = await Promise.all(
      missingIds.map((pid) => getDoc(doc(db, 'workspaces', uid, 'products', pid)))
    );
    for (const snap of fetchedSnaps) {
      if (snap.exists()) {
        const p = stripProduct(snap.data());
        productById.set(p.id, p);
      }
    }
  }

  const builtItems: OrderItem[] = [];
  const usedQtyByProdId = new Map<string, { prod: Product; qtyUsed: number }>();
  let subtotalAmount = 0;
  let totalCost = 0;

  for (let i = 0; i < rawItems.length; i++) {
    const pid = rawItems[i].productId;
    const qty = Math.floor(Number(rawItems[i].quantity) || 0);
    const prod = pid ? productById.get(pid) : undefined;
    if (!prod || qty <= 0) {
      throw new Error('ទិន្នន័យទំនិញមិនត្រឹមត្រូវ។');
    }

    const existingUsage = usedQtyByProdId.get(prod.id);
    const alreadyUsed = existingUsage ? existingUsage.qtyUsed : 0;
    const remaining = prod.stock - alreadyUsed;
    if (prod.stock <= 0) {
      throw new Error(
        `ទំនិញ "${prod.name}" អស់ពីស្តុកហើយ! មិនអនុញ្ញាតឱ្យបញ្ជាទិញជាដាច់ខាត។`
      );
    }
    if (remaining < qty) {
      throw new Error(
        `ស្តុកទំនិញ "${prod.name}" មិនគ្រប់គ្រាន់ទេ (នៅសល់ ${Math.max(0, remaining)})។`
      );
    }
    usedQtyByProdId.set(prod.id, { prod, qtyUsed: alreadyUsed + qty });

    const catalogUnitPrice = Math.max(0, prod.sellingPrice - (prod.promotion || 0));
    const hasManualPrice =
      rawItems[i].customUnitPrice !== undefined &&
      Number.isFinite(Number(rawItems[i].customUnitPrice)) &&
      Number(rawItems[i].customUnitPrice) >= 0;
    const effectiveUnitPrice = hasManualPrice
      ? roundUsdPrecision(Number(rawItems[i].customUnitPrice))
      : catalogUnitPrice;

    subtotalAmount += effectiveUnitPrice * qty;
    totalCost += prod.costPrice * qty;
    builtItems.push({
      productId: prod.id,
      productName: prod.name,
      quantity: qty,
      unitPrice: effectiveUnitPrice,
      ...(Math.abs(effectiveUnitPrice - catalogUnitPrice) > 0.0001
        ? { catalogUnitPrice }
        : {}),
      costPrice: prod.costPrice,
      warehouse: prod.warehouse,
    });
  }

  const cleanSubtotal = roundUsdPrecision(subtotalAmount);
  const discountType: 'amount' | 'percent' =
    payload.discountType === 'percent' ? 'percent' : 'amount';
  const rawDiscountVal = Math.max(0, Number(payload.discountValue) || 0);
  const cleanDiscountValue =
    discountType === 'percent'
      ? Math.min(100, Math.round(rawDiscountVal * 100) / 100)
      : roundUsdPrecision(rawDiscountVal);
  const discountAmount =
    discountType === 'percent'
      ? Math.min(
          cleanSubtotal,
          roundUsdPrecision(cleanSubtotal * (cleanDiscountValue / 100))
        )
      : Math.min(cleanSubtotal, cleanDiscountValue);
  const finalTotalAmount = Math.max(0, roundUsdPrecision(cleanSubtotal - discountAmount));

  const dateStamp = `${String(now.getFullYear()).slice(-2)}${String(
    now.getMonth() + 1
  ).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const uniqSuffix = crypto.randomUUID().replace(/-/g, '').slice(0, 5).toUpperCase();
  const paymentStatus: 'paid' | 'unpaid' =
    payload.paymentStatus === 'unpaid' ? 'unpaid' : 'paid';

  const customerNameClean = String(payload.customerName || '').trim().slice(0, 200);
  const customerPhoneClean = String(payload.customerPhone || '').trim().slice(0, 64);
  const customerAddressClean = String(payload.customerAddress || '').trim().slice(0, 500);
  const storeNameClean = String(payload.storeName || '').trim().slice(0, 120);
  const groupNameClean = String(payload.groupName || '').trim().slice(0, 120);

  if (
    !customerNameClean ||
    !customerPhoneClean ||
    !customerAddressClean ||
    !storeNameClean ||
    !groupNameClean
  ) {
    throw new Error(
      'មិនអនុញ្ញាតឱ្យបញ្ជាទិញជាដាច់ខាត៖ សូមបំពេញ ឈ្មោះអតិថិជន, លេខទូរស័ព្ទ, អាសយដ្ឋាន, ឈ្មោះហាង និង ឈ្មោះ Groups ជាមុនសិន!'
    );
  }

  const createdOrder: Order = {
    id: orderId,
    orderNumber: `DR-${dateStamp}-${uniqSuffix}`,
    date: String(payload.date || formatDateLocal(now)).slice(0, 32),
    time: String(payload.time || formatTimeLocal(now)).slice(0, 32),
    createdAt: nowIso,
    customerName: customerNameClean,
    customerPhone: customerPhoneClean,
    customerAddress: customerAddressClean,
    storeName: storeNameClean,
    groupName: groupNameClean,
    staffName: String(payload.staffName || staff[0]?.name || displayName).trim().slice(0, 120),
    warehouse: (builtItems[0]?.warehouse || settings.warehouses[0] || '').slice(0, 120),
    paymentStatus,
    dueDate: String(payload.dueDate || '').trim().slice(0, 32),
    note: String(payload.note || '').trim().slice(0, 1000),
    items: builtItems,
    subtotalAmount: cleanSubtotal,
    discountType,
    discountValue: cleanDiscountValue,
    discountAmount,
    totalAmount: finalTotalAmount,
    totalCost: roundUsdPrecision(totalCost),
    createdByEmail: userEmail,
    operatorEmail: operatorEmail || userEmail,
  };

  const orderWarehouseUids = computeWarehouseUidsForOperator(
    settings.warehouseProfiles,
    operatorEmail || userEmail,
    userEmail
  );

  const batch = writeBatch(db);
  for (const [pid, { qtyUsed }] of usedQtyByProdId.entries()) {
    batch.update(doc(db, 'workspaces', uid, 'products', pid), {
      stock: increment(-qtyUsed),
      updatedAt: nowIso,
      serverUpdatedAt: serverTimestamp(),
    });
  }
  batch.set(orderRef, {
    ...createdOrder,
    warehouseUids: orderWarehouseUids,
    ownerUid: uid,
    serverCreatedAt: serverTimestamp(),
    serverUpdatedAt: serverTimestamp(),
  });

  try {
    const commitPromise = batch.commit();
    // With IndexedDB offline persistence enabled, Firestore applies the atomic batch locally
    // right away and syncs to the backend once connectivity stabilizes. Do not freeze POS
    // order submission if the browser is offline or experiencing intermittent network stalls.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      commitPromise.catch(() => {});
    } else {
      const INTERMITTENT_COMMIT_GRACE_MS = 2500;
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        commitPromise.finally(() => {
          if (timer !== undefined) clearTimeout(timer);
        }),
        new Promise<void>((resolve) => {
          timer = setTimeout(() => {
            commitPromise.catch(() => {});
            resolve();
          }, INTERMITTENT_COMMIT_GRACE_MS);
        }),
      ]);
    }
  } catch (err) {
    const code = (err as { code?: string })?.code || '';
    const msg = err instanceof Error ? err.message : String(err || '');
    if (
      code === 'permission-denied' ||
      msg.toLowerCase().includes('missing or insufficient permissions')
    ) {
      // Check whether another device consumed stock just before commit (firestore.rules enforces stock >= 0)
      const serverChecks = await Promise.all(
        Array.from(usedQtyByProdId.entries()).map(async ([pid, info]) => {
          const sSnap = await getDocFromServer(doc(db, 'workspaces', uid, 'products', pid)).catch(
            () => null
          );
          if (!sSnap || !sSnap.exists()) return null;
          const latest = stripProduct(sSnap.data());
          if (latest.stock < info.qtyUsed) {
            return latest;
          }
          return null;
        })
      );
      const depleted = serverChecks.find((p): p is Product => Boolean(p));
      if (depleted) {
        throw new Error(
          `ស្តុកទំនិញ "${depleted.name}" មិនគ្រប់គ្រាន់ទេ (នៅសល់ ${depleted.stock})។`
        );
      }
    }
    handleFirestoreError(err, OperationType.CREATE, `workspaces/${uid}/orders/${orderId}`);
  }

  syncOrdersToMongoBackground([createdOrder]);
  return createdOrder;
}

export async function updateOrderFs(
  uid: string,
  orderId: string,
  payload: Partial<Order>
): Promise<void> {
  const orderRef = doc(db, 'workspaces', uid, 'orders', orderId);
  const now = new Date();
  let mirroredOrder: Order | null = null;

  try {
    await runTransaction(db, async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists()) throw new Error('រកមិនឃើញការបញ្ជាទិញនេះទេ។');
      const existing = stripOrder(orderSnap.data());

      if (!Array.isArray(payload.items)) {
        const nextStatus: 'paid' | 'unpaid' =
          payload.paymentStatus === 'paid' || payload.paymentStatus === 'unpaid'
            ? payload.paymentStatus
            : existing.paymentStatus;

        const hasOtherFields =
          payload.date !== undefined ||
          payload.time !== undefined ||
          payload.customerName !== undefined ||
          payload.customerPhone !== undefined ||
          payload.customerAddress !== undefined ||
          payload.storeName !== undefined ||
          payload.groupName !== undefined ||
          payload.staffName !== undefined ||
          payload.note !== undefined;

        const nextDueDate = payload.dueDate !== undefined ? String(payload.dueDate) : existing.dueDate;

        if (!hasOtherFields) {
          mirroredOrder = {
            ...existing,
            paymentStatus: nextStatus,
            dueDate: nextDueDate,
          };
          tx.update(orderRef, {
            paymentStatus: nextStatus,
            dueDate: nextDueDate,
            serverUpdatedAt: serverTimestamp(),
          });
          return;
        }

        const updatedFields = {
          date: payload.date !== undefined ? String(payload.date) : existing.date,
          time: payload.time !== undefined ? String(payload.time) : existing.time,
          customerName:
            payload.customerName !== undefined
              ? String(payload.customerName).trim().slice(0, 200)
              : existing.customerName,
          customerPhone:
            payload.customerPhone !== undefined
              ? String(payload.customerPhone).trim().slice(0, 64)
              : existing.customerPhone,
          customerAddress:
            payload.customerAddress !== undefined
              ? String(payload.customerAddress).trim().slice(0, 500)
              : existing.customerAddress,
          storeName: payload.storeName !== undefined ? String(payload.storeName) : existing.storeName,
          groupName: payload.groupName !== undefined ? String(payload.groupName) : existing.groupName,
          staffName: payload.staffName !== undefined ? String(payload.staffName) : existing.staffName,
          paymentStatus: nextStatus,
          dueDate: nextDueDate,
          note: payload.note !== undefined ? String(payload.note) : existing.note,
        };
        mirroredOrder = { ...existing, ...updatedFields };
        tx.update(orderRef, {
          ...updatedFields,
          serverUpdatedAt: serverTimestamp(),
        });
        return;
      }

      if (payload.items.length === 0) {
        throw new Error('ការបញ្ជាទិញត្រូវមានទំនិញយ៉ាងតិច 1 មុខ។');
      }

      const involvedIds = Array.from(
        new Set([
          ...existing.items.map((i) => i.productId),
          ...payload.items.map((i) => i.productId),
        ])
      );

      const prodSnaps = await Promise.all(
        involvedIds.map((pid) => tx.get(doc(db, 'workspaces', uid, 'products', pid)))
      );
      const prodMap = new Map<string, { ref: (typeof prodSnaps)[0]['ref']; prod: Product }>();
      const tempStock = new Map<string, number>();

      for (const snap of prodSnaps) {
        if (snap.exists()) {
          const p = stripProduct(snap.data());
          prodMap.set(p.id, { ref: snap.ref, prod: p });
          tempStock.set(p.id, p.stock);
        }
      }

      for (const oldItem of existing.items) {
        if (tempStock.has(oldItem.productId)) {
          tempStock.set(
            oldItem.productId,
            (tempStock.get(oldItem.productId) || 0) + oldItem.quantity
          );
        }
      }

      for (const newItem of payload.items) {
        const qty = Math.floor(Number(newItem.quantity) || 0);
        if (qty <= 0) throw new Error('ចំនួនទំនិញត្រូវធំជាង 0។');
        if (tempStock.has(newItem.productId)) {
          const avail = tempStock.get(newItem.productId)!;
          if (avail <= 0) {
            const pName = prodMap.get(newItem.productId)?.prod.name || newItem.productName;
            throw new Error(
              `ទំនិញ "${pName}" អស់ពីស្តុកហើយ! មិនអនុញ្ញាតឱ្យបញ្ជាទិញជាដាច់ខាត។`
            );
          }
          if (avail < qty) {
            const pName = prodMap.get(newItem.productId)?.prod.name || newItem.productName;
            throw new Error(`ស្តុក "${pName}" មិនគ្រប់គ្រាន់ទេ (អាចប្រើបាន ${avail})។`);
          }
          tempStock.set(newItem.productId, avail - qty);
        }
      }

      for (const [pid, entry] of prodMap.entries()) {
        const nextStock = tempStock.get(pid);
        if (nextStock !== undefined && nextStock !== entry.prod.stock) {
          tx.update(entry.ref, {
            stock: nextStock,
            updatedAt: now.toISOString(),
            serverUpdatedAt: serverTimestamp(),
          });
        }
      }

      const finalItems: OrderItem[] = payload.items.map((it) => {
        const prod = prodMap.get(it.productId)?.prod;
        const qty = Math.floor(Number(it.quantity) || 1);
        const unitPrice = roundUsdPrecision(
          Number(it.unitPrice ?? (prod ? Math.max(0, prod.sellingPrice - prod.promotion) : 0))
        );
        const costPrice = Math.max(0, Number(it.costPrice ?? (prod ? prod.costPrice : 0)));
        return {
          productId: it.productId,
          productName: prod?.name || it.productName,
          quantity: qty,
          unitPrice,
          ...(it.catalogUnitPrice !== undefined
            ? { catalogUnitPrice: Number(it.catalogUnitPrice) }
            : {}),
          costPrice,
          warehouse: prod?.warehouse || it.warehouse || existing.warehouse,
        };
      });

      const subtotalAmount = roundUsdPrecision(
        finalItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
      );
      const discountType: 'amount' | 'percent' =
        (payload.discountType ?? existing.discountType) === 'percent' ? 'percent' : 'amount';
      const rawDiscountVal = Math.max(
        0,
        Number(payload.discountValue ?? existing.discountValue ?? 0) || 0
      );
      const cleanDiscountValue =
        discountType === 'percent'
          ? Math.min(100, Math.round(rawDiscountVal * 100) / 100)
          : roundUsdPrecision(rawDiscountVal);
      const discountAmount =
        discountType === 'percent'
          ? Math.min(
              subtotalAmount,
              roundUsdPrecision(subtotalAmount * (cleanDiscountValue / 100))
            )
          : Math.min(subtotalAmount, cleanDiscountValue);
      const totalAmount = Math.max(0, roundUsdPrecision(subtotalAmount - discountAmount));
      const totalCost = roundUsdPrecision(
        finalItems.reduce((sum, i) => sum + i.costPrice * i.quantity, 0)
      );

      const nextStatus: 'paid' | 'unpaid' =
        payload.paymentStatus === 'paid' || payload.paymentStatus === 'unpaid'
          ? payload.paymentStatus
          : existing.paymentStatus;

      const fullUpdateFields = {
        date: payload.date !== undefined ? String(payload.date) : existing.date,
        time: payload.time !== undefined ? String(payload.time) : existing.time,
        customerName:
          payload.customerName !== undefined
            ? String(payload.customerName).trim().slice(0, 200)
            : existing.customerName,
        customerPhone:
          payload.customerPhone !== undefined
            ? String(payload.customerPhone).trim().slice(0, 64)
            : existing.customerPhone,
        customerAddress:
          payload.customerAddress !== undefined
            ? String(payload.customerAddress).trim().slice(0, 500)
            : existing.customerAddress,
        storeName: payload.storeName !== undefined ? String(payload.storeName) : existing.storeName,
        groupName: payload.groupName !== undefined ? String(payload.groupName) : existing.groupName,
        staffName: payload.staffName !== undefined ? String(payload.staffName) : existing.staffName,
        paymentStatus: nextStatus,
        dueDate: payload.dueDate !== undefined ? String(payload.dueDate) : existing.dueDate,
        note: payload.note !== undefined ? String(payload.note) : existing.note,
        items: finalItems,
        subtotalAmount,
        discountType,
        discountValue: cleanDiscountValue,
        discountAmount,
        totalAmount,
        totalCost,
      };
      mirroredOrder = { ...existing, ...fullUpdateFields };
      tx.update(orderRef, {
        ...fullUpdateFields,
        serverUpdatedAt: serverTimestamp(),
      });
    });
    if (mirroredOrder) {
      syncOrdersToMongoBackground([mirroredOrder]);
    }
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes('ស្តុក') ||
        err.message.includes('ចំនួនទំនិញ') ||
        err.message.includes('ការបញ្ជាទិញ'))
    ) {
      throw err;
    }
    handleFirestoreError(err, OperationType.UPDATE, `workspaces/${uid}/orders/${orderId}`);
  }
}

export async function deleteOrderFs(uid: string, orderId: string): Promise<void> {
  const cleanId = String(orderId || '').trim();
  if (!cleanId) return;
  const orderRef = doc(db, 'workspaces', uid, 'orders', cleanId);
  const now = new Date();
  markOrdersDeletedLocally([cleanId]);
  try {
    await runTransaction(db, async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists()) return;
      const ord = stripOrder(orderSnap.data());

      const prodSnaps = await Promise.all(
        ord.items.map((it) => tx.get(doc(db, 'workspaces', uid, 'products', it.productId)))
      );

      for (let i = 0; i < ord.items.length; i++) {
        const snap = prodSnaps[i];
        if (snap.exists()) {
          const prod = stripProduct(snap.data());
          tx.update(snap.ref, {
            stock: prod.stock + ord.items[i].quantity,
            updatedAt: now.toISOString(),
            serverUpdatedAt: serverTimestamp(),
          });
        }
      }

      tx.delete(orderRef);
    });
    await deleteOrdersFromMongoSync([cleanId]);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `workspaces/${uid}/orders/${cleanId}`);
  }
}

export async function deleteOrdersNoRestoreFs(
  uid: string,
  orderIds: string[],
  scope?: MongoOrderDeleteScope | null
): Promise<void> {
  const uniqueIds = Array.from(new Set(orderIds.map((id) => id.trim()).filter(Boolean)));
  const hasScope = Boolean(scope && (scope.operatorEmail || scope.staffName));
  if (uniqueIds.length === 0 && !hasScope) return;

  const ordersColPath = `workspaces/${uid}/orders`;
  const BATCH_LIMIT = 450;

  if (uniqueIds.length > 0) {
    markOrdersDeletedLocally(uniqueIds);
  }

  try {
    const deletedSet = new Set<string>(uniqueIds);

    for (let i = 0; i < uniqueIds.length; i += BATCH_LIMIT) {
      const chunk = uniqueIds.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const orderId of chunk) {
        batch.delete(doc(db, 'workspaces', uid, 'orders', orderId));
      }
      await batch.commit();
    }

    // When deleting ALL reports in an unfiltered scope, also delete any unloaded older orders
    // in Firestore matching the same operator/sale scope so nothing stays orphaned.
    if (hasScope && scope) {
      const targetOp = (scope.operatorEmail || '').trim().toLowerCase();
      const targetSaleKey = scope.staffName ? normalizeSaleKey(scope.staffName) : '';
      const isMaster = Boolean(scope.isMasterAdmin);
      const extraIds: string[] = [];

      const remainingSnap = await getDocs(
        query(collection(db, 'workspaces', uid, 'orders'), where('ownerUid', '==', uid))
      );
      for (const d of remainingSnap.docs) {
        if (deletedSet.has(d.id)) continue;
        const ord = stripOrder(d.data());
        const ordOp = (ord.operatorEmail || ord.createdByEmail || '').trim().toLowerCase();
        const opMatches = !targetOp || ordOp === targetOp || (isMaster && !ordOp);
        const saleMatches = !targetSaleKey || normalizeSaleKey(ord.staffName) === targetSaleKey;
        if (opMatches && saleMatches) {
          extraIds.push(d.id);
          deletedSet.add(d.id);
        }
      }

      if (extraIds.length > 0) {
        markOrdersDeletedLocally(extraIds);
        for (let i = 0; i < extraIds.length; i += BATCH_LIMIT) {
          const chunk = extraIds.slice(i, i + BATCH_LIMIT);
          const batch = writeBatch(db);
          for (const orderId of chunk) {
            batch.delete(doc(db, 'workspaces', uid, 'orders', orderId));
          }
          await batch.commit();
        }
      }
    }

    await deleteOrdersFromMongoSync(Array.from(deletedSet), scope || undefined);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, ordersColPath);
  }
}

export async function addProblemCustomerFs(
  uid: string,
  payload: { name: string; phone: string; note: string; sourceOrderId?: string }
): Promise<void> {
  const id = makeDocId('prob');
  const path = `workspaces/${uid}/problemCustomers/${id}`;
  try {
    await setDoc(doc(db, 'workspaces', uid, 'problemCustomers', id), {
      id,
      ownerUid: uid,
      name: payload.name.trim().slice(0, 200),
      phone: payload.phone.trim().slice(0, 64),
      normalizedPhone: normalizePhone(payload.phone).slice(0, 64),
      note: (payload.note || '').trim().slice(0, 1000),
      sourceOrderId: (payload.sourceOrderId || '').slice(0, 128),
      createdAt: new Date().toISOString(),
      serverCreatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteProblemCustomerFs(uid: string, id: string): Promise<void> {
  const path = `workspaces/${uid}/problemCustomers/${id}`;
  try {
    await deleteDoc(doc(db, 'workspaces', uid, 'problemCustomers', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveStaffFs(
  uid: string,
  payload: Partial<StaffMember>,
  operatorEmail = ''
): Promise<void> {
  const name = String(payload.name || '').trim().slice(0, 200);
  if (!name) throw new Error('សូមបញ្ចូលឈ្មោះបុគ្គលិក។');
  const cleanOp = operatorEmail.trim().toLowerCase().slice(0, 200);

  if (payload.id) {
    const path = `workspaces/${uid}/staff/${payload.id}`;
    try {
      await updateDoc(doc(db, 'workspaces', uid, 'staff', payload.id), {
        name,
        photoUrl: String(payload.photoUrl || '').slice(0, 2000),
        position: String(payload.position || 'បុគ្គលិកលក់').trim().slice(0, 120),
        phone: String(payload.phone || '').trim().slice(0, 64),
        address: String(payload.address || '').trim().slice(0, 400),
        serverUpdatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
    return;
  }

  const id = makeDocId('stf');
  const path = `workspaces/${uid}/staff/${id}`;
  try {
    await setDoc(doc(db, 'workspaces', uid, 'staff', id), {
      id,
      ownerUid: uid,
      name,
      photoUrl: String(payload.photoUrl || '').slice(0, 2000),
      position: String(payload.position || 'បុគ្គលិកលក់').trim().slice(0, 120),
      phone: String(payload.phone || '').trim().slice(0, 64),
      address: String(payload.address || '').trim().slice(0, 400),
      createdAt: new Date().toISOString(),
      ...(cleanOp ? { operatorEmail: cleanOp } : {}),
      serverUpdatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteStaffFs(uid: string, staffId: string): Promise<void> {
  const path = `workspaces/${uid}/staff/${staffId}`;
  try {
    await deleteDoc(doc(db, 'workspaces', uid, 'staff', staffId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function savePriceRecordFs(
  uid: string,
  payload: { id?: string; productName: string; imageUrl: string; prices: PriceTier[] },
  operatorEmail = ''
): Promise<void> {
  const productName = payload.productName.trim().slice(0, 200);
  if (!productName) throw new Error('សូមបញ្ចូលឈ្មោះទំនិញ។');
  const cleanOp = operatorEmail.trim().toLowerCase().slice(0, 200);

  if (payload.id) {
    const path = `workspaces/${uid}/priceRecords/${payload.id}`;
    try {
      await updateDoc(doc(db, 'workspaces', uid, 'priceRecords', payload.id), {
        productName,
        imageUrl: (payload.imageUrl || '').slice(0, 2000),
        prices: payload.prices.slice(0, 30),
        updatedAt: new Date().toISOString(),
        serverUpdatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
    return;
  }

  const id = makeDocId('prc');
  const path = `workspaces/${uid}/priceRecords/${id}`;
  try {
    await setDoc(doc(db, 'workspaces', uid, 'priceRecords', id), {
      id,
      ownerUid: uid,
      productName,
      imageUrl: (payload.imageUrl || '').slice(0, 2000),
      prices: payload.prices.slice(0, 30),
      updatedAt: new Date().toISOString(),
      ...(cleanOp ? { operatorEmail: cleanOp } : {}),
      serverUpdatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deletePriceRecordFs(uid: string, id: string): Promise<void> {
  const path = `workspaces/${uid}/priceRecords/${id}`;
  try {
    await deleteDoc(doc(db, 'workspaces', uid, 'priceRecords', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function updateSettingsFs(
  uid: string,
  currentSettings: WorkspaceSettings,
  patch: Partial<WorkspaceSettings>
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error('សូមចូលគណនី Admin ជាមុនសិន មុនពេលរក្សាទុកការកំណត់។');
  }
  const path = `workspaces/${uid}`;
  const rawMerged = {
    ...currentSettings,
    ...patch,
  };
  const merged: WorkspaceSettings = {
    personalName: String(rawMerged.personalName || '').slice(0, 200),
    personalPhone: String(rawMerged.personalPhone || '').slice(0, 64),
    businessName: String(rawMerged.businessName || 'DR-POS').slice(0, 200),
    darkMode: Boolean(rawMerged.darkMode),
    language:
      rawMerged.language === 'en' || rawMerged.language === 'kr' ? rawMerged.language : 'kh',
    currency:
      rawMerged.currency === 'kh' || rawMerged.currency === 'kr' ? rawMerged.currency : 'en',
    soundEnabled: Boolean(rawMerged.soundEnabled),
    warehouses: (Array.isArray(rawMerged.warehouses) ? rawMerged.warehouses : [])
      .map((x) => String(x || ''))
      .slice(0, 100),
    stores: (Array.isArray(rawMerged.stores) ? rawMerged.stores : [])
      .map((x) => String(x || ''))
      .slice(0, 100),
    groups: (Array.isArray(rawMerged.groups) ? rawMerged.groups : [])
      .map((x) => String(x || ''))
      .slice(0, 100),
    categories: (Array.isArray(rawMerged.categories) ? rawMerged.categories : [])
      .map((x) => String(x || ''))
      .slice(0, 100),
    accessRules: (Array.isArray(rawMerged.accessRules) ? rawMerged.accessRules : []).slice(0, 100),
    saleProfiles: (Array.isArray(rawMerged.saleProfiles) ? rawMerged.saleProfiles : []).slice(
      0,
      100
    ),
    adminProfiles: (Array.isArray(rawMerged.adminProfiles) ? rawMerged.adminProfiles : []).slice(
      0,
      100
    ),
    warehouseProfiles: (Array.isArray(rawMerged.warehouseProfiles)
      ? rawMerged.warehouseProfiles
      : []
    )
      .slice(0, 100)
      .map((wp) => ({
        id: String(wp.id || ''),
        uid: String(wp.uid || ''),
        name: String(wp.name || '').trim().slice(0, 200),
        email: String(wp.email || '').trim().toLowerCase().slice(0, 200),
        assignedAdminEmail: String(wp.assignedAdminEmail || '')
          .trim()
          .toLowerCase()
          .slice(0, 200),
        active: wp.active !== false,
        createdAt: String(wp.createdAt || ''),
      }))
      .filter((wp) => Boolean(wp.uid && wp.email)),
  };
  try {
    await updateDoc(doc(db, 'workspaces', uid), {
      settings: merged,
      serverUpdatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateSalePreferencesFs(
  uid: string,
  saleName: string,
  patch: Partial<SaleUserPreferences>
): Promise<SaleUserPreferences> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error('សូមចូលគណនីជាមុនសិន មុនពេលរក្សាទុកការកំណត់ផ្ទាល់ខ្លួន។');
  }
  const targetSaleKey = normalizeSaleKey(saleName);
  if (!targetSaleKey) {
    return {};
  }
  const path = `workspaces/${uid}`;
  const wsRef = doc(db, 'workspaces', uid);

  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(wsRef);
      if (!snap.exists()) {
        throw new Error('មិនមានទិន្នន័យ Workspace នៅក្នុងប្រព័ន្ធទេ។');
      }
      const data = snap.data() || {};
      const latestSettings = (data.settings || {}) as Partial<WorkspaceSettings>;
      const currentProfiles = Array.isArray(latestSettings.saleProfiles)
        ? (latestSettings.saleProfiles as SaleProfile[])
        : [];

      const matchingProfiles = currentProfiles.filter(
        (sp) => normalizeSaleKey(sp?.name || '') === targetSaleKey
      );
      if (matchingProfiles.length === 0) {
        const standalonePrefs: SaleUserPreferences = {
          ...(typeof patch.darkMode === 'boolean' ? { darkMode: patch.darkMode } : {}),
          ...(typeof patch.soundEnabled === 'boolean' ? { soundEnabled: patch.soundEnabled } : {}),
          ...(patch.language === 'kh' || patch.language === 'en' || patch.language === 'kr'
            ? { language: patch.language }
            : {}),
          updatedAt: new Date().toISOString().slice(0, 64),
        };
        return standalonePrefs;
      }

      let latestPrevPrefs: SaleUserPreferences = {};
      let latestPrevMs = -1;
      for (const mp of matchingProfiles) {
        if (mp.preferences && typeof mp.preferences === 'object') {
          const ts = Date.parse(String(mp.preferences.updatedAt || '')) || 0;
          if (ts >= latestPrevMs) {
            latestPrevMs = ts;
            latestPrevPrefs = mp.preferences;
          }
        }
      }

      const nextPrefs: SaleUserPreferences = {
        ...(typeof patch.darkMode === 'boolean'
          ? { darkMode: patch.darkMode }
          : typeof latestPrevPrefs.darkMode === 'boolean'
            ? { darkMode: latestPrevPrefs.darkMode }
            : {}),
        ...(typeof patch.soundEnabled === 'boolean'
          ? { soundEnabled: patch.soundEnabled }
          : typeof latestPrevPrefs.soundEnabled === 'boolean'
            ? { soundEnabled: latestPrevPrefs.soundEnabled }
            : {}),
        ...(patch.language === 'kh' || patch.language === 'en' || patch.language === 'kr'
          ? { language: patch.language }
          : latestPrevPrefs.language === 'kh' ||
              latestPrevPrefs.language === 'en' ||
              latestPrevPrefs.language === 'kr'
            ? { language: latestPrevPrefs.language }
            : {}),
        updatedAt: new Date().toISOString().slice(0, 64),
      };

      const nextProfiles = currentProfiles.map((sp) =>
        normalizeSaleKey(sp?.name || '') === targetSaleKey
          ? { ...sp, preferences: nextPrefs }
          : sp
      );

      tx.update(wsRef, {
        settings: {
          ...latestSettings,
          saleProfiles: nextProfiles.slice(0, 100),
        },
        serverUpdatedAt: serverTimestamp(),
      });

      return nextPrefs;
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
    return {};
  }
}

export async function updateWorkspaceLicenseFs(
  uid: string,
  license: WorkspaceLicense
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const path = `workspaces/${uid}`;
  const cleanLicense: WorkspaceLicense = {
    trialStartedAt: String(license.trialStartedAt || new Date().toISOString()).slice(0, 64),
    expireAt: String(license.expireAt || new Date().toISOString()).slice(0, 64),
    planType: license.planType === 'paid' ? 'paid' : 'trial',
    telegramUrl: String(license.telegramUrl || 'https://t.me/houtdara').slice(0, 500),
    developerUpdatedAt: String(license.developerUpdatedAt || '').slice(0, 64),
  };
  try {
    await updateDoc(doc(db, 'workspaces', uid), {
      license: cleanLicense,
      serverUpdatedAt: serverTimestamp(),
    });
  } catch (err) {
    if (!auth.currentUser || auth.currentUser.uid !== uid) return;
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteAccountWorkspaceFs(
  uid: string,
  options?: { masterEmail?: string; subAdminEmails?: string[]; warehouseEmails?: string[] }
): Promise<void> {
  const emailSet = new Set<string>();
  const subEmailSet = new Set<string>();
  const whEmailSet = new Set<string>();
  const whUidSet = new Set<string>();

  let masterEmail = String(options?.masterEmail || auth.currentUser?.email || '')
    .trim()
    .toLowerCase();
  if (masterEmail && masterEmail.includes('@')) {
    emailSet.add(masterEmail);
  }
  for (const se of options?.subAdminEmails || []) {
    const clean = String(se || '').trim().toLowerCase();
    if (clean && clean.includes('@')) {
      subEmailSet.add(clean);
      emailSet.add(clean);
    }
  }
  for (const we of options?.warehouseEmails || []) {
    const clean = String(we || '').trim().toLowerCase();
    if (clean && clean.includes('@')) {
      whEmailSet.add(clean);
    }
  }

  // Read authoritative workspace root doc to make sure ALL sub-admin & warehouse Gmails are captured before deletion
  try {
    const wsRef = doc(db, 'workspaces', uid);
    const wsSnap = await getDocFromServer(wsRef).catch(() => getDoc(wsRef));
    if (wsSnap.exists()) {
      const wsData = wsSnap.data() as {
        ownerEmail?: string;
        settings?: {
          adminProfiles?: Array<{ email?: string }>;
          warehouseProfiles?: Array<{ uid?: string; email?: string }>;
        };
      };
      const docOwnerEmail = String(wsData?.ownerEmail || '').trim().toLowerCase();
      if (docOwnerEmail && docOwnerEmail.includes('@')) {
        if (!masterEmail) masterEmail = docOwnerEmail;
        emailSet.add(docOwnerEmail);
      }
      const docAdmins = Array.isArray(wsData?.settings?.adminProfiles)
        ? wsData.settings!.adminProfiles!
        : [];
      for (const adm of docAdmins) {
        const cleanAdm = String(adm?.email || '').trim().toLowerCase();
        if (cleanAdm && cleanAdm.includes('@')) {
          subEmailSet.add(cleanAdm);
          emailSet.add(cleanAdm);
        }
      }
      const docWhs = Array.isArray(wsData?.settings?.warehouseProfiles)
        ? wsData.settings!.warehouseProfiles!
        : [];
      for (const wh of docWhs) {
        const cleanWh = String(wh?.email || '').trim().toLowerCase();
        if (cleanWh && cleanWh.includes('@')) {
          whEmailSet.add(cleanWh);
        }
        const cleanWhUid = String(wh?.uid || '').trim();
        if (cleanWhUid) {
          whUidSet.add(cleanWhUid);
        }
      }
    }
  } catch {
    // Proceed with caller-supplied email list if workspace doc is already unreadable
  }

  const allEmails = Array.from(emailSet);
  const allSubEmails = Array.from(subEmailSet);
  const allWhEmails = Array.from(whEmailSet);

  // 1. Purge MongoDB workspace partition BEFORE auth.currentUser is deleted (requires valid ID token)
  const mongoDeleted = await deleteWorkspaceFromMongoSync(allEmails);
  if (!mongoDeleted && typeof navigator !== 'undefined' && navigator.onLine !== false) {
    const detail = getLastMongoErrorDetail();
    throw new Error(
      detail
        ? `មិនអាចលុបរបាយការណ៍ពី MongoDB បានទេនៅពេលនេះ។ សូមពិនិត្យការតភ្ជាប់អ៊ីនធឺណិត រួចព្យាយាមម្ដងទៀត! (${detail})`
        : 'មិនអាចលុបរបាយការណ៍ពី MongoDB បានទេនៅពេលនេះ។ សូមពិនិត្យការតភ្ជាប់អ៊ីនធឺណិត រួចព្យាយាមម្ដងទៀត!'
    );
  }

  // 2. Unregister Master Admin Gmail + ALL Sub-Admin & Warehouse Manager Gmails from Developer Vault (Server + Firestore)
  await unregisterWorkspaceAccountRegistry({
    uid,
    masterEmail,
    subAdminEmails: allSubEmails,
    warehouseEmails: allWhEmails,
  });

  // Clean up warehouseDirectory docs
  for (const whUid of whUidSet) {
    await deleteDoc(doc(db, 'warehouseDirectory', whUid)).catch(() => {});
  }

  // 3. Delete all Firestore subcollections
  const subcollections = [
    'products',
    'orders',
    'staff',
    'priceRecords',
    'stockLogs',
    'problemCustomers',
    'salePresence',
    'activityLogs',
    'warehouseMembers',
  ] as const;

  for (const sub of subcollections) {
    const subPath = `workspaces/${uid}/${sub}`;
    try {
      const snap = await getDocs(
        query(collection(db, 'workspaces', uid, sub), where('ownerUid', '==', uid))
      );
      if (!snap.empty) {
        const BATCH_LIMIT = 450;
        for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
          const batch = writeBatch(db);
          snap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, subPath);
    }
  }

  // 4. Delete workspace root document last
  try {
    await deleteDoc(doc(db, 'workspaces', uid));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `workspaces/${uid}`);
  }
}

const knownPresenceDocs = new Set<string>();
const presenceWriteQueues = new Map<string, Promise<void>>();

function enqueuePresenceWrite(queueKey: string, task: () => Promise<void>): Promise<void> {
  const prev = presenceWriteQueues.get(queueKey) || Promise.resolve();
  const next = prev.catch(() => {}).then(task);
  presenceWriteQueues.set(queueKey, next);
  return next.finally(() => {
    if (presenceWriteQueues.get(queueKey) === next) {
      presenceWriteQueues.delete(queueKey);
    }
  });
}

function stripSalePresence(
  raw: Record<string, unknown>,
  observedAtMs?: number
): SalePresence {
  const srvTs = raw.serverUpdatedAt as { toMillis?: () => number } | undefined;
  const serverUpdatedMs =
    srvTs && typeof srvTs.toMillis === 'function' ? srvTs.toMillis() : undefined;
  return {
    id: String(raw.id || ''),
    ownerUid: String(raw.ownerUid || ''),
    saleName: String(raw.saleName || ''),
    saleKey: String(raw.saleKey || ''),
    ownerAdminEmail: String(raw.ownerAdminEmail || '').toLowerCase(),
    online: Boolean(raw.online),
    activePage: String(raw.activePage || 'dashboard'),
    deviceType: String(raw.deviceType || 'desktop'),
    loggedInAt: String(raw.loggedInAt || ''),
    lastSeenAt: String(raw.lastSeenAt || ''),
    ...(serverUpdatedMs ? { serverUpdatedMs } : {}),
    ...(observedAtMs ? { observedAtMs } : {}),
  };
}

export async function upsertSalePresenceFs(
  uid: string,
  payload: {
    presenceId: string;
    saleName: string;
    saleKey: string;
    ownerAdminEmail: string;
    online: boolean;
    activePage: string;
    deviceType: string;
    loggedInAt: string;
  }
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const cleanId = payload.presenceId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  const cleanName = payload.saleName.trim().slice(0, 200);
  const cleanKey = payload.saleKey.trim().toLowerCase().slice(0, 200);
  if (!cleanId || !cleanName || !cleanKey) return;

  const queueKey = `${uid}:${cleanId}`;
  return enqueuePresenceWrite(queueKey, async () => {
    if (!auth.currentUser || auth.currentUser.uid !== uid) return;
    const ref = doc(db, 'workspaces', uid, 'salePresence', cleanId);
    const nowIso = new Date().toISOString();
    const cleanLoggedInAt = String(payload.loggedInAt || nowIso).slice(0, 64);
    const updateBody = {
      saleName: cleanName,
      saleKey: cleanKey,
      ownerAdminEmail: payload.ownerAdminEmail.trim().toLowerCase().slice(0, 200),
      online: Boolean(payload.online),
      activePage: String(payload.activePage || 'dashboard').slice(0, 64),
      deviceType: String(payload.deviceType || 'desktop').slice(0, 32),
      lastSeenAt: nowIso,
      serverUpdatedAt: serverTimestamp(),
    };

    const createFullDoc = async () => {
      await setDoc(ref, {
        id: cleanId,
        ownerUid: uid,
        ...updateBody,
        loggedInAt: cleanLoggedInAt,
      });
      knownPresenceDocs.add(queueKey);
    };

    try {
      if (!knownPresenceDocs.has(queueKey)) {
        const snap = await getDocFromServer(ref).catch(() => getDoc(ref).catch(() => null));
        if (!snap || !snap.exists()) {
          await createFullDoc();
          return;
        }
        knownPresenceDocs.add(queueKey);
      }
      await updateDoc(ref, updateBody);
    } catch {
      knownPresenceDocs.delete(queueKey);
      try {
        const snap = await getDocFromServer(ref).catch(() => null);
        if (!snap || !snap.exists()) {
          await createFullDoc();
        } else {
          knownPresenceDocs.add(queueKey);
          await updateDoc(ref, updateBody);
        }
      } catch {
        // Ignore transient offline/unauthenticated teardown races
      }
    }
  });
}

export async function markSalePresenceOfflineFs(
  uid: string,
  presenceId: string
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const cleanId = presenceId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  if (!cleanId) return;
  const queueKey = `${uid}:${cleanId}`;
  return enqueuePresenceWrite(queueKey, async () => {
    if (!auth.currentUser || auth.currentUser.uid !== uid) return;
    try {
      await updateDoc(doc(db, 'workspaces', uid, 'salePresence', cleanId), {
        online: false,
        lastSeenAt: new Date().toISOString(),
        serverUpdatedAt: serverTimestamp(),
      });
    } catch {
      // Ignore if document wasn't created yet or user signed out mid-flight
    }
  });
}

export function subscribeToSalePresence(
  uid: string,
  onUpdate: (items: SalePresence[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `workspaces/${uid}/salePresence`;
  const q = query(collection(db, 'workspaces', uid, 'salePresence'), where('ownerUid', '==', uid));
  const observedMap = new Map<string, { sig: string; observedAtMs: number }>();
  let hasInitialServerSnap = false;

  return onSnapshot(
    q,
    (snap) => {
      const nowMs = Date.now();
      const activeIds = new Set<string>();
      const list = snap.docs.map((d) => {
        activeIds.add(d.id);
        const data = d.data() as Record<string, unknown>;
        const srvTs = data.serverUpdatedAt as { toMillis?: () => number } | undefined;
        const srvMs = srvTs && typeof srvTs.toMillis === 'function' ? srvTs.toMillis() : '';
        const sig = `${Boolean(data.online)}|${String(data.lastSeenAt || '')}|${String(
          data.activePage || ''
        )}|${srvMs}`;

        const prev = observedMap.get(d.id);
        let observedAtMs = prev?.observedAtMs;
        if (!snap.metadata.fromCache && hasInitialServerSnap) {
          if (!prev || prev.sig !== sig) {
            observedAtMs = nowMs;
            observedMap.set(d.id, { sig, observedAtMs });
          }
        } else if (!prev) {
          observedMap.set(d.id, { sig, observedAtMs: 0 });
        } else if (prev.sig !== sig && !snap.metadata.fromCache) {
          observedAtMs = nowMs;
          observedMap.set(d.id, { sig, observedAtMs });
        }

        return stripSalePresence(data, observedAtMs || undefined);
      });

      for (const cachedId of observedMap.keys()) {
        if (!activeIds.has(cachedId)) {
          observedMap.delete(cachedId);
        }
      }
      if (!snap.metadata.fromCache) {
        hasInitialServerSnap = true;
      }
      onUpdate(list);
    },
    (err) => {
      if (onError) {
        try {
          handleFirestoreError(err, OperationType.LIST, path);
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    }
  );
}

function stripSaleActivityLog(raw: Record<string, unknown>): SaleActivityLog {
  const srvTs = raw.serverCreatedAt as { toMillis?: () => number } | undefined;
  const serverCreatedMs =
    srvTs && typeof srvTs.toMillis === 'function' ? srvTs.toMillis() : undefined;
  const validActions = new Set<SaleActivityActionType>([
    'order_created',
    'order_updated',
    'payment_updated',
    'order_deleted',
    'orders_bulk_deleted',
    'problem_customer_added',
  ]);
  const rawAction = String(raw.actionType || 'order_created') as SaleActivityActionType;
  return {
    id: String(raw.id || ''),
    ownerUid: String(raw.ownerUid || ''),
    saleName: String(raw.saleName || ''),
    saleKey: String(raw.saleKey || ''),
    ownerAdminEmail: String(raw.ownerAdminEmail || '').toLowerCase(),
    actionType: validActions.has(rawAction) ? rawAction : 'order_created',
    ...(raw.targetId ? { targetId: String(raw.targetId) } : {}),
    ...(raw.orderNumber ? { orderNumber: String(raw.orderNumber) } : {}),
    ...(raw.customerName ? { customerName: String(raw.customerName) } : {}),
    ...(typeof raw.amount === 'number' && Number.isFinite(raw.amount)
      ? { amount: Number(raw.amount) }
      : {}),
    summary: String(raw.summary || ''),
    createdAt: String(raw.createdAt || ''),
    ...(serverCreatedMs ? { serverCreatedMs } : {}),
  };
}

export async function logSaleActivityFs(
  uid: string,
  payload: {
    saleName: string;
    saleKey: string;
    ownerAdminEmail: string;
    actionType: SaleActivityActionType;
    targetId?: string;
    orderNumber?: string;
    customerName?: string;
    amount?: number;
    summary: string;
  }
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const cleanSaleName = String(payload.saleName || '').trim().slice(0, 200);
  const cleanSaleKey = String(payload.saleKey || '').trim().toLowerCase().slice(0, 200);
  if (!cleanSaleName || !cleanSaleKey) return;

  const id = makeDocId('act');
  const path = `workspaces/${uid}/activityLogs/${id}`;
  const docBody: Record<string, unknown> = {
    id,
    ownerUid: uid,
    saleName: cleanSaleName,
    saleKey: cleanSaleKey,
    ownerAdminEmail: String(payload.ownerAdminEmail || '').trim().toLowerCase().slice(0, 200),
    actionType: payload.actionType,
    summary: String(payload.summary || '').trim().slice(0, 500),
    createdAt: new Date().toISOString().slice(0, 64),
    serverCreatedAt: serverTimestamp(),
  };

  if (payload.targetId) {
    docBody.targetId = String(payload.targetId).trim().slice(0, 128);
  }
  if (payload.orderNumber) {
    docBody.orderNumber = String(payload.orderNumber).trim().slice(0, 64);
  }
  if (payload.customerName) {
    docBody.customerName = String(payload.customerName).trim().slice(0, 200);
  }
  if (typeof payload.amount === 'number' && Number.isFinite(payload.amount) && payload.amount >= 0) {
    docBody.amount = roundUsdPrecision(payload.amount);
  }

  try {
    await setDoc(doc(db, 'workspaces', uid, 'activityLogs', id), docBody);
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.CREATE, path);
    } catch {
      // Non-fatal audit logging failure should not crash user's primary workflow
    }
  }
}

export function subscribeToSaleActivityLogs(
  uid: string,
  onUpdate: (items: SaleActivityLog[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `workspaces/${uid}/activityLogs`;
  const logsCol = collection(db, 'workspaces', uid, 'activityLogs');
  let unsub: Unsubscribe = () => {};
  let disposed = false;

  const attach = (withOrderBy: boolean) => {
    unsub();
    const q = withOrderBy
      ? query(logsCol, where('ownerUid', '==', uid), orderBy('createdAt', 'desc'), limit(120))
      : query(logsCol, where('ownerUid', '==', uid), limit(120));

    unsub = onSnapshot(
      q,
      (snap) => {
        const cutoffMs = getLogRetentionCutoffMs();
        const items = snap.docs
          .map((d) => stripSaleActivityLog(d.data() as Record<string, unknown>))
          .filter((item) => !isTimestampExpired(item.createdAt, item.serverCreatedMs, cutoffMs))
          .sort((a, b) => (b.serverCreatedMs || Date.parse(b.createdAt) || 0) - (a.serverCreatedMs || Date.parse(a.createdAt) || 0));
        onUpdate(items);
      },
      (err) => {
        if (withOrderBy && isFailedPreconditionError(err) && !disposed) {
          attach(false);
          return;
        }
        if (onError) {
          try {
            handleFirestoreError(err, OperationType.LIST, path);
          } catch (wrapped) {
            onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
          }
        }
      }
    );
  };

  attach(true);
  return () => {
    disposed = true;
    unsub();
  };
}

async function purgeExpiredSubcollectionDocsFs(
  uid: string,
  subcollection: 'stockLogs' | 'activityLogs',
  cutoffMs: number,
  cutoffIso: string
): Promise<string[]> {
  if (!uid || !auth.currentUser || auth.currentUser.uid !== uid) return [];
  const colRef = collection(db, 'workspaces', uid, subcollection);
  const path = `workspaces/${uid}/${subcollection}`;
  const deletedIds: string[] = [];
  const BATCH_LIMIT = 450;
  const MAX_ROUNDS = 10;

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      if (!auth.currentUser || auth.currentUser.uid !== uid) break;
      const snap = await getDocs(
        query(colRef, where('ownerUid', '==', uid), where('createdAt', '<', cutoffIso), limit(BATCH_LIMIT))
      );
      if (snap.empty) break;

      const batch = writeBatch(db);
      for (const d of snap.docs) {
        batch.delete(d.ref);
        deletedIds.push(d.id);
      }
      await batch.commit();

      if (snap.docs.length < BATCH_LIMIT) break;
    }
    return deletedIds;
  } catch (err) {
    if (isFailedPreconditionError(err)) {
      try {
        const snap = await getDocs(query(colRef, where('ownerUid', '==', uid)));
        const expiredDocs = snap.docs.filter((d) => {
          const data = d.data() as Record<string, unknown>;
          const srvTs = data.serverCreatedAt as { toMillis?: () => number } | undefined;
          const srvMs = srvTs && typeof srvTs.toMillis === 'function' ? srvTs.toMillis() : undefined;
          return isTimestampExpired(String(data.createdAt || ''), srvMs, cutoffMs);
        });
        for (let i = 0; i < expiredDocs.length; i += BATCH_LIMIT) {
          if (!auth.currentUser || auth.currentUser.uid !== uid) break;
          const chunk = expiredDocs.slice(i, i + BATCH_LIMIT);
          const batch = writeBatch(db);
          for (const d of chunk) {
            batch.delete(d.ref);
            deletedIds.push(d.id);
          }
          await batch.commit();
        }
        return deletedIds;
      } catch (fallbackErr) {
        try {
          handleFirestoreError(fallbackErr, OperationType.DELETE, path);
        } catch {
          // Non-fatal cleanup error
        }
        return deletedIds;
      }
    }
    try {
      handleFirestoreError(err, OperationType.DELETE, path);
    } catch {
      // Non-fatal cleanup error
    }
    return deletedIds;
  }
}

export async function purgeExpiredStockLogsFs(
  uid: string,
  days = LOG_RETENTION_DAYS
): Promise<{ deletedCount: number; deletedIds: string[] }> {
  if (!uid || !auth.currentUser || auth.currentUser.uid !== uid) {
    return { deletedCount: 0, deletedIds: [] };
  }
  const cutoffMs = getLogRetentionCutoffMs(days);
  const cutoffIso = new Date(cutoffMs).toISOString();

  const deletedIds = await purgeExpiredSubcollectionDocsFs(uid, 'stockLogs', cutoffMs, cutoffIso);
  if (deletedIds.length > 0) {
    await deleteStockLogsFromMongoSync(deletedIds).catch(() => false);
  }
  const mongoCutoff = await purgeExpiredStockLogsFromMongoSync(cutoffIso).catch(() => ({
    ok: false,
    deletedCount: 0,
  }));

  return {
    deletedCount: Math.max(deletedIds.length, mongoCutoff.deletedCount),
    deletedIds,
  };
}

export async function purgeExpiredActivityLogsFs(
  uid: string,
  days = LOG_RETENTION_DAYS
): Promise<{ deletedCount: number; deletedIds: string[] }> {
  if (!uid || !auth.currentUser || auth.currentUser.uid !== uid) {
    return { deletedCount: 0, deletedIds: [] };
  }
  const cutoffMs = getLogRetentionCutoffMs(days);
  const cutoffIso = new Date(cutoffMs).toISOString();

  const deletedIds = await purgeExpiredSubcollectionDocsFs(uid, 'activityLogs', cutoffMs, cutoffIso);
  return {
    deletedCount: deletedIds.length,
    deletedIds,
  };
}
