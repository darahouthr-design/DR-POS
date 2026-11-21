import type { ProblemCustomer, WorkspaceData, WorkspacePaginationState } from '../types';

const BOOT_CACHE_PREFIX = 'drpos_ws_boot_v1_';
const BOOT_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHED_ORDERS = 40;
const MAX_CACHED_PRODUCTS = 250;
const MAX_CACHED_STOCK_LOGS = 25;
const MAX_CACHED_PRICES = 100;
const MAX_CACHED_PROBLEMS = 120;
const MAX_CACHE_BYTES = 450_000;

export interface WorkspaceBootSnapshot {
  uid: string;
  savedAt: number;
  workspace: WorkspaceData;
  problemCustomers: ProblemCustomer[];
  pagination: WorkspacePaginationState;
}

function cacheKey(uid: string): string {
  return `${BOOT_CACHE_PREFIX}${uid}`;
}

export function loadWorkspaceBootSnapshot(uid: string): WorkspaceBootSnapshot | null {
  if (!uid || typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkspaceBootSnapshot>;
    if (!parsed || parsed.uid !== uid || !parsed.workspace || !parsed.workspace.settings) {
      return null;
    }
    const age = Date.now() - Number(parsed.savedAt || 0);
    if (!Number.isFinite(age) || age < 0 || age > BOOT_CACHE_MAX_AGE_MS) {
      window.localStorage.removeItem(cacheKey(uid));
      return null;
    }
    return {
      uid,
      savedAt: Number(parsed.savedAt),
      workspace: parsed.workspace,
      problemCustomers: Array.isArray(parsed.problemCustomers) ? parsed.problemCustomers : [],
      pagination: parsed.pagination || { hasMoreOrders: false, hasMoreStockLogs: false },
    };
  } catch {
    return null;
  }
}

export function saveWorkspaceBootSnapshot(
  uid: string,
  workspace: WorkspaceData,
  problemCustomers: ProblemCustomer[],
  pagination: WorkspacePaginationState
): void {
  if (!uid || typeof window === 'undefined' || !window.localStorage) return;
  try {
    const compactWorkspace: WorkspaceData = {
      email: workspace.email,
      settings: workspace.settings,
      license: workspace.license,
      products: workspace.products.slice(0, MAX_CACHED_PRODUCTS),
      orders: workspace.orders.slice(0, MAX_CACHED_ORDERS),
      staff: workspace.staff.slice(0, 120),
      priceRecords: workspace.priceRecords.slice(0, MAX_CACHED_PRICES),
      stockLogs: workspace.stockLogs.slice(0, MAX_CACHED_STOCK_LOGS),
    };
    const payload: WorkspaceBootSnapshot = {
      uid,
      savedAt: Date.now(),
      workspace: compactWorkspace,
      problemCustomers: problemCustomers.slice(0, MAX_CACHED_PROBLEMS),
      pagination: {
        hasMoreOrders: Boolean(pagination.hasMoreOrders || workspace.orders.length > MAX_CACHED_ORDERS),
        hasMoreStockLogs: Boolean(
          pagination.hasMoreStockLogs || workspace.stockLogs.length > MAX_CACHED_STOCK_LOGS
        ),
      },
    };
    let serialized = JSON.stringify(payload);
    // If product/order data exceeds safe localStorage budget, store minimal shell (settings + latest 15 orders)
    if (serialized.length > MAX_CACHE_BYTES) {
      payload.workspace.orders = workspace.orders.slice(0, 15);
      payload.workspace.stockLogs = [];
      payload.workspace.priceRecords = [];
      payload.problemCustomers = problemCustomers.slice(0, 40);
      serialized = JSON.stringify(payload);
    }
    if (serialized.length <= MAX_CACHE_BYTES) {
      window.localStorage.setItem(cacheKey(uid), serialized);
    }
  } catch {
    // Ignore storage quota or private mode errors
  }
}

export function clearWorkspaceBootSnapshot(uid?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (uid) {
      window.localStorage.removeItem(cacheKey(uid));
      return;
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(BOOT_CACHE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      window.localStorage.removeItem(k);
    }
  } catch {
    // Ignore
  }
}
