import {
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import type { AdminProfile, WorkspaceLicense } from '../types';

export interface MasterAdminLicenseRecord {
  email: string;
  uid?: string;
  displayName: string;
  trialStartedAt: string;
  expireAt: string;
  planType: 'trial' | 'paid';
  developerUpdatedAt: string;
}

export interface GateCheckResult {
  isSubAdmin: boolean;
  masterEmail: string;
  isRegisteredMaster: boolean;
  telegramUrl: string;
}

export interface SyncWorkspaceLicenseResult {
  license: WorkspaceLicense;
  shouldUpdateFirestore: boolean;
  telegramUrl: string;
}

export const DEFAULT_TELEGRAM_URL = 'https://t.me/houtdara';

// Cryptographic SHA-256 digest & capability vault ID (no plaintext key stored in client bundle)
const EXPECTED_DEV_VAULT_DIGEST =
  'a882249ff19ca7af4920b868d261332526482edb0454e3e02268fb16e4c532bf';
export const CLIENT_VAULT_DOC_ID = 'devvault_a882249ff19ca7af4920b868d2613325';
const CLIENT_DEV_TOKEN_PREFIX = 'client_fs_';

interface SubAdminRegistryEntry {
  email: string;
  masterEmail: string;
  name: string;
  createdAt: string;
}

interface ClientVaultState {
  vaultId: string;
  telegramUrl: string;
  masterAdmins: Record<string, MasterAdminLicenseRecord>;
  subAdminEmails: Record<string, SubAdminRegistryEntry>;
  otpChallenges?: Record<string, unknown>;
  updatedAt: string;
}

function cleanDevKeyInput(raw: string): string {
  return String(raw || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyKeyClientFallback(rawKey: string): Promise<boolean> {
  const clean = cleanDevKeyInput(rawKey);
  if (!clean || typeof crypto === 'undefined' || !crypto.subtle) return false;
  const hex = await sha256Hex(`drpos_dev_vault_v1:${clean}`);
  return hex === EXPECTED_DEV_VAULT_DIGEST;
}

async function fetchClientVault(forceServer = false): Promise<ClientVaultState> {
  const vaultPath = `developerVault/${CLIENT_VAULT_DOC_ID}`;
  const vaultRef = doc(db, 'developerVault', CLIENT_VAULT_DOC_ID);
  let snap;
  try {
    snap = forceServer ? await getDocFromServer(vaultRef) : await getDoc(vaultRef);
  } catch (err) {
    const code = (err as { code?: string })?.code || '';
    if (code === 'permission-denied') {
      handleFirestoreError(err, OperationType.GET, vaultPath);
    }
    if (forceServer) {
      try {
        snap = await getDoc(vaultRef);
      } catch (fallbackErr) {
        const fbCode = (fallbackErr as { code?: string })?.code || '';
        if (fbCode === 'permission-denied') {
          handleFirestoreError(fallbackErr, OperationType.GET, vaultPath);
        }
        throw fallbackErr;
      }
    } else {
      throw err;
    }
  }
  if (!snap.exists()) {
    return {
      vaultId: CLIENT_VAULT_DOC_ID,
      telegramUrl: DEFAULT_TELEGRAM_URL,
      masterAdmins: {},
      subAdminEmails: {},
      updatedAt: '',
    };
  }
  const data = snap.data() as Partial<ClientVaultState>;
  return {
    vaultId: CLIENT_VAULT_DOC_ID,
    telegramUrl: String(data.telegramUrl || DEFAULT_TELEGRAM_URL),
    masterAdmins: (data.masterAdmins && typeof data.masterAdmins === 'object'
      ? data.masterAdmins
      : {}) as Record<string, MasterAdminLicenseRecord>,
    subAdminEmails: (data.subAdminEmails && typeof data.subAdminEmails === 'object'
      ? data.subAdminEmails
      : {}) as Record<string, SubAdminRegistryEntry>,
    otpChallenges:
      data.otpChallenges && typeof data.otpChallenges === 'object'
        ? (data.otpChallenges as Record<string, unknown>)
        : undefined,
    updatedAt: String(data.updatedAt || ''),
  };
}

async function saveClientVault(next: ClientVaultState): Promise<void> {
  await setDoc(doc(db, 'developerVault', CLIENT_VAULT_DOC_ID), {
    vaultId: CLIENT_VAULT_DOC_ID,
    telegramUrl: next.telegramUrl || DEFAULT_TELEGRAM_URL,
    masterAdmins: next.masterAdmins || {},
    subAdminEmails: next.subAdminEmails || {},
    ...(next.otpChallenges ? { otpChallenges: next.otpChallenges } : {}),
    updatedAt: new Date().toISOString(),
    serverUpdatedAt: serverTimestamp(),
  });
}

export interface DeveloperVaultSnapshotData {
  exists: boolean;
  telegramUrl: string;
  masterAdmins: Record<string, MasterAdminLicenseRecord>;
  sortedMasterAdminsList: MasterAdminLicenseRecord[];
  subAdminEmails: Record<string, SubAdminRegistryEntry>;
  updatedAt: string;
}

export function subscribeToDeveloperVault(
  onData: (vault: DeveloperVaultSnapshotData) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'developerVault', CLIENT_VAULT_DOC_ID),
    (snap) => {
      if (!snap.exists()) {
        onData({
          exists: false,
          telegramUrl: DEFAULT_TELEGRAM_URL,
          masterAdmins: {},
          sortedMasterAdminsList: [],
          subAdminEmails: {},
          updatedAt: '',
        });
        return;
      }
      const data = snap.data() as Partial<ClientVaultState>;
      const rawMasters = (
        data.masterAdmins && typeof data.masterAdmins === 'object' ? data.masterAdmins : {}
      ) as Record<string, MasterAdminLicenseRecord>;
      const normalizedMasters: Record<string, MasterAdminLicenseRecord> = {};
      for (const [k, rec] of Object.entries(rawMasters)) {
        if (!rec || typeof rec !== 'object') continue;
        const email = String(rec.email || k).trim().toLowerCase();
        if (!email) continue;
        normalizedMasters[email] = {
          ...rec,
          email,
          planType: rec.planType === 'paid' ? 'paid' : 'trial',
          developerUpdatedAt: String(rec.developerUpdatedAt || ''),
        };
      }
      const subAdminEmails = (
        data.subAdminEmails && typeof data.subAdminEmails === 'object' ? data.subAdminEmails : {}
      ) as Record<string, SubAdminRegistryEntry>;

      onData({
        exists: true,
        telegramUrl: String(data.telegramUrl || DEFAULT_TELEGRAM_URL),
        masterAdmins: normalizedMasters,
        sortedMasterAdminsList: sortedMasterAdmins(normalizedMasters),
        subAdminEmails,
        updatedAt: String(data.updatedAt || ''),
      });
    },
    (err) => {
      if (onError) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  );
}

function addDaysIso(baseDate: Date, days: number): string {
  const next = new Date(baseDate.getTime());
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function addMonthsOrYearsIso(baseDate: Date, unit: 'months' | 'years', amount: number): string {
  const next = new Date(baseDate.getTime());
  const origDay = next.getDate();
  if (unit === 'years') {
    next.setFullYear(next.getFullYear() + amount);
  } else {
    next.setMonth(next.getMonth() + amount);
  }
  if (next.getDate() < origDay) {
    next.setDate(0);
  }
  return next.toISOString();
}

function normalizeTelegramUrl(raw: string): string {
  const v = String(raw || '').trim();
  if (!v) return DEFAULT_TELEGRAM_URL;
  if (v.startsWith('http://') || v.startsWith('https://')) return v.slice(0, 500);
  if (v.startsWith('@')) return `https://t.me/${v.slice(1)}`.slice(0, 500);
  if (v.startsWith('t.me/')) return `https://${v}`.slice(0, 500);
  return `https://t.me/${v.replace(/^\/+/, '')}`.slice(0, 500);
}

function sortedMasterAdmins(
  map: Record<string, MasterAdminLicenseRecord>
): MasterAdminLicenseRecord[] {
  return Object.values(map).sort((a, b) => b.trialStartedAt.localeCompare(a.trialStartedAt));
}

async function tryJson<T>(res: Response): Promise<{ isJson: boolean; data: T | null }> {
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (!ct.includes('application/json')) {
    return { isJson: false, data: null };
  }
  try {
    const data = (await res.json()) as T;
    return { isJson: true, data };
  } catch {
    return { isJson: false, data: null };
  }
}

export function buildDefaultTrialLicense(now = new Date()): WorkspaceLicense {
  return {
    trialStartedAt: now.toISOString(),
    expireAt: addMonthsOrYearsIso(now, 'months', 1),
    planType: 'trial',
    telegramUrl: DEFAULT_TELEGRAM_URL,
    developerUpdatedAt: '',
  };
}

export function isWorkspaceExpired(license?: WorkspaceLicense | null): boolean {
  if (!license?.expireAt) return false;
  const ts = new Date(license.expireAt).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() > ts;
}

export function getLicenseRemainingSummary(license?: WorkspaceLicense | null): {
  expired: boolean;
  daysLeft: number;
  hoursLeft: number;
  formattedExpireDate: string;
} {
  if (!license?.expireAt) {
    return {
      expired: false,
      daysLeft: 30,
      hoursLeft: 720,
      formattedExpireDate: '-',
    };
  }
  const ts = new Date(license.expireAt).getTime();
  if (Number.isNaN(ts)) {
    return {
      expired: false,
      daysLeft: 30,
      hoursLeft: 720,
      formattedExpireDate: license.expireAt,
    };
  }
  const diffMs = ts - Date.now();
  const expired = diffMs <= 0;
  const hoursLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return {
    expired,
    daysLeft,
    hoursLeft,
    formattedExpireDate: `${yyyy}-${mm}-${dd} ${hh}:${min}`,
  };
}

export async function checkEmailAuthGate(email: string): Promise<GateCheckResult> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const res = await fetch('/api/auth/gate-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });
    const parsed = await tryJson<GateCheckResult>(res);
    if (res.ok && parsed.isJson && parsed.data) {
      return parsed.data;
    }
  } catch {
    // Fallback to Firestore vault
  }

  try {
    const vault = await fetchClientVault();
    const subRec = vault.subAdminEmails[cleanEmail];
    const masterRec = vault.masterAdmins[cleanEmail];
    return {
      isSubAdmin: Boolean(subRec),
      masterEmail: subRec?.masterEmail || '',
      isRegisteredMaster: Boolean(masterRec),
      telegramUrl: vault.telegramUrl || DEFAULT_TELEGRAM_URL,
    };
  } catch {
    return {
      isSubAdmin: false,
      masterEmail: '',
      isRegisteredMaster: false,
      telegramUrl: DEFAULT_TELEGRAM_URL,
    };
  }
}

export async function registerMasterAdminLicense(payload: {
  uid: string;
  email: string;
  displayName: string;
}): Promise<WorkspaceLicense> {
  try {
    const res = await fetch('/api/developer/register-master', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const parsed = await tryJson<{ license?: WorkspaceLicense; error?: string }>(res);
    if (res.status === 403 && parsed.data?.error) {
      throw new Error(parsed.data.error);
    }
    if (res.ok && parsed.isJson && parsed.data?.license) {
      return parsed.data.license;
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Switch Account')) {
      throw err;
    }
  }

  try {
    const cleanEmail = payload.email.trim().toLowerCase();
    const vault = await fetchClientVault();
    if (vault.subAdminEmails[cleanEmail]) {
      throw new Error(
        'គណនី Gmail នេះត្រូវបានបង្កើតនៅក្នុង Setting សម្រាប់ Switch Account ប៉ុណ្ណោះ មិនអាចបង្កើត Admin មេ បានទៀតទេ!'
      );
    }
    if (!vault.masterAdmins[cleanEmail]) {
      const now = new Date();
      vault.masterAdmins[cleanEmail] = {
        email: cleanEmail,
        uid: payload.uid,
        displayName: payload.displayName || cleanEmail.split('@')[0] || 'Admin',
        trialStartedAt: now.toISOString(),
        expireAt: addMonthsOrYearsIso(now, 'months', 1),
        planType: 'trial',
        developerUpdatedAt: '',
      };
      await saveClientVault(vault);
    }
    const rec = vault.masterAdmins[cleanEmail];
    return {
      trialStartedAt: rec.trialStartedAt,
      expireAt: rec.expireAt,
      planType: rec.planType,
      telegramUrl: vault.telegramUrl || DEFAULT_TELEGRAM_URL,
      developerUpdatedAt: rec.developerUpdatedAt || '',
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes('Switch Account')) {
      throw err;
    }
    return buildDefaultTrialLicense();
  }
}

function pickNewerLicenseCandidate(
  primary: WorkspaceLicense | undefined,
  secondary: WorkspaceLicense | undefined
): WorkspaceLicense | undefined {
  if (!primary) return secondary;
  if (!secondary) return primary;
  const pUpdated = primary.developerUpdatedAt || '';
  const sUpdated = secondary.developerUpdatedAt || '';
  if (sUpdated > pUpdated) return secondary;
  if (pUpdated > sUpdated) return primary;
  const pExp = primary.expireAt ? new Date(primary.expireAt).getTime() : 0;
  const sExp = secondary.expireAt ? new Date(secondary.expireAt).getTime() : 0;
  if (!Number.isNaN(sExp) && !Number.isNaN(pExp) && sExp > pExp) {
    return secondary;
  }
  return primary;
}

export async function syncWorkspaceLicenseWithServer(
  payload: {
    uid: string;
    email: string;
    displayName: string;
    license?: WorkspaceLicense;
    subAdmins: AdminProfile[];
  },
  options?: { forceServer?: boolean }
): Promise<SyncWorkspaceLicenseResult | null> {
  const forceServer = Boolean(options?.forceServer);
  const cleanEmail = payload.email.trim().toLowerCase();

  const fetchFromServerApi = async (): Promise<SyncWorkspaceLicenseResult | null> => {
    try {
      const res = await fetch('/api/developer/sync-workspace', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(payload),
      });
      const parsed = await tryJson<SyncWorkspaceLicenseResult>(res);
      if (res.ok && parsed.isJson && parsed.data?.license) {
        return parsed.data;
      }
    } catch {
      // Fallback to Firestore vault
    }
    return null;
  };

  if (forceServer && cleanEmail && cleanEmail.includes('@')) {
    const [apiSettled, vaultSettled] = await Promise.allSettled([
      fetchFromServerApi(),
      fetchClientVault(true),
    ]);
    const apiRes = apiSettled.status === 'fulfilled' ? apiSettled.value : null;
    const directVault = vaultSettled.status === 'fulfilled' ? vaultSettled.value : null;
    const directRec = directVault?.masterAdmins[cleanEmail];
    const directLicense: WorkspaceLicense | undefined = directRec
      ? {
          trialStartedAt: directRec.trialStartedAt,
          expireAt: directRec.expireAt,
          planType: directRec.planType,
          telegramUrl: directVault?.telegramUrl || DEFAULT_TELEGRAM_URL,
          developerUpdatedAt: directRec.developerUpdatedAt || '',
        }
      : undefined;

    if (apiRes || directLicense) {
      const chosen = pickNewerLicenseCandidate(apiRes?.license, directLicense);
      if (chosen) {
        const shouldUpdateFirestore =
          !payload.license ||
          payload.license.expireAt !== chosen.expireAt ||
          payload.license.telegramUrl !== chosen.telegramUrl ||
          payload.license.planType !== chosen.planType ||
          payload.license.developerUpdatedAt !== chosen.developerUpdatedAt;
        return {
          license: chosen,
          shouldUpdateFirestore,
          telegramUrl: chosen.telegramUrl || DEFAULT_TELEGRAM_URL,
        };
      }
    }
  } else {
    const apiRes = await fetchFromServerApi();
    if (apiRes) return apiRes;
  }

  try {
    if (!cleanEmail || !cleanEmail.includes('@')) return null;
    const vault = await fetchClientVault(forceServer);
    let changed = false;
    let rec = vault.masterAdmins[cleanEmail];
    if (!rec) {
      const now = new Date();
      rec = {
        email: cleanEmail,
        uid: payload.uid,
        displayName: payload.displayName || cleanEmail.split('@')[0] || 'Admin',
        trialStartedAt: payload.license?.trialStartedAt || now.toISOString(),
        expireAt: payload.license?.expireAt || addMonthsOrYearsIso(now, 'months', 1),
        planType: payload.license?.planType === 'paid' ? 'paid' : 'trial',
        developerUpdatedAt: payload.license?.developerUpdatedAt || '',
      };
      vault.masterAdmins[cleanEmail] = rec;
      changed = true;
    }

    if (Array.isArray(payload.subAdmins)) {
      const prevForMaster = Object.entries(vault.subAdminEmails)
        .filter(([, val]) => val.masterEmail === cleanEmail)
        .map(([k, val]) => `${k}:${val.name}`)
        .sort()
        .join('|');

      const nextForMasterEntries: Array<[string, SubAdminRegistryEntry]> = [];
      for (const sa of payload.subAdmins) {
        const subEmail = (sa.email || '').trim().toLowerCase();
        if (!subEmail || !subEmail.includes('@') || subEmail === cleanEmail) continue;
        if (vault.masterAdmins[subEmail]) continue;
        nextForMasterEntries.push([
          subEmail,
          {
            email: subEmail,
            masterEmail: cleanEmail,
            name: String(sa.name || subEmail.split('@')[0] || 'Admin').trim(),
            createdAt: String(sa.createdAt || new Date().toISOString()),
          },
        ]);
      }

      const nextForMaster = nextForMasterEntries
        .map(([k, val]) => `${k}:${val.name}`)
        .sort()
        .join('|');

      if (prevForMaster !== nextForMaster) {
        for (const [subKey, subVal] of Object.entries(vault.subAdminEmails)) {
          if (subVal.masterEmail === cleanEmail) {
            delete vault.subAdminEmails[subKey];
          }
        }
        for (const [subEmail, subRec] of nextForMasterEntries) {
          vault.subAdminEmails[subEmail] = subRec;
        }
        changed = true;
      }
    }

    if (changed) {
      await saveClientVault(vault);
    }

    const authoritativeLicense: WorkspaceLicense = {
      trialStartedAt: rec.trialStartedAt,
      expireAt: rec.expireAt,
      planType: rec.planType,
      telegramUrl: vault.telegramUrl || DEFAULT_TELEGRAM_URL,
      developerUpdatedAt: rec.developerUpdatedAt || '',
    };

    const shouldUpdateFirestore =
      !payload.license ||
      payload.license.expireAt !== authoritativeLicense.expireAt ||
      payload.license.telegramUrl !== authoritativeLicense.telegramUrl ||
      payload.license.planType !== authoritativeLicense.planType ||
      payload.license.developerUpdatedAt !== authoritativeLicense.developerUpdatedAt;

    return {
      license: authoritativeLicense,
      shouldUpdateFirestore,
      telegramUrl: authoritativeLicense.telegramUrl,
    };
  } catch {
    return null;
  }
}

export async function unregisterWorkspaceAccountRegistry(payload: {
  uid: string;
  masterEmail: string;
  subAdminEmails: string[];
}): Promise<{ removedMaster: boolean; removedSubEmails: string[] }> {
  const cleanMaster = payload.masterEmail.trim().toLowerCase();
  const cleanSubList = Array.from(
    new Set(
      payload.subAdminEmails
        .map((e) => String(e || '').trim().toLowerCase())
        .filter((e) => e.includes('@'))
    )
  );
  const subSet = new Set(cleanSubList);

  let removedMaster = false;
  const removedSubs = new Set<string>();

  try {
    const token = await auth.currentUser?.getIdToken().catch(() => '');
    if (token) {
      const res = await fetch('/api/developer/delete-account', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uid: payload.uid,
          masterEmail: cleanMaster,
          subAdminEmails: cleanSubList,
        }),
      });
      const parsed = await tryJson<{
        ok?: boolean;
        removedMaster?: boolean;
        removedSubEmails?: string[];
      }>(res);
      if (res.ok && parsed.isJson && parsed.data?.ok) {
        removedMaster = Boolean(parsed.data.removedMaster);
        for (const se of parsed.data.removedSubEmails || []) {
          if (se) removedSubs.add(String(se).trim().toLowerCase());
        }
      }
    }
  } catch {
    // Fallback / verify directly against Firestore developerVault below
  }

  // Always verify and clean Firestore developerVault directly so realtime snapshots update immediately
  try {
    const vault = await fetchClientVault(true);
    let changed = false;

    for (const [k, rec] of Object.entries(vault.masterAdmins)) {
      const kNorm = k.trim().toLowerCase();
      const recEmail = String(rec?.email || k).trim().toLowerCase();
      if ((payload.uid && rec?.uid === payload.uid) || (cleanMaster && (kNorm === cleanMaster || recEmail === cleanMaster))) {
        delete vault.masterAdmins[k];
        removedMaster = true;
        changed = true;
      }
    }

    for (const [subKey, subRec] of Object.entries(vault.subAdminEmails)) {
      const cleanSubKey = subKey.trim().toLowerCase();
      const recMaster = String(subRec?.masterEmail || '').trim().toLowerCase();
      if ((cleanMaster && recMaster === cleanMaster) || subSet.has(cleanSubKey)) {
        delete vault.subAdminEmails[subKey];
        removedSubs.add(cleanSubKey);
        changed = true;
      }
    }

    if (changed) {
      await saveClientVault(vault);
    }
  } catch {
    // Non-fatal if vault cleanup already completed on server
  }

  return {
    removedMaster,
    removedSubEmails: Array.from(removedSubs),
  };
}

export async function verifyDeveloperKeyApi(key: string): Promise<{
  devToken: string;
  telegramUrl: string;
  masterAdmins: MasterAdminLicenseRecord[];
}> {
  const cleanKey = cleanDevKeyInput(key);
  let serverUnavailable = false;

  try {
    const res = await fetch('/api/developer/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: cleanKey }),
    });
    const parsed = await tryJson<{
      error?: string;
      devToken?: string;
      telegramUrl?: string;
      masterAdmins?: MasterAdminLicenseRecord[];
    }>(res);

    if (res.status === 401 || res.status === 403) {
      throw new Error(parsed.data?.error || 'លេខ Key Developer មិនត្រឹមត្រូវទេ!');
    }

    if (res.ok && parsed.isJson && parsed.data?.devToken) {
      return {
        devToken: parsed.data.devToken,
        telegramUrl: parsed.data.telegramUrl || DEFAULT_TELEGRAM_URL,
        masterAdmins: Array.isArray(parsed.data.masterAdmins) ? parsed.data.masterAdmins : [],
      };
    }

    if (res.status === 404 || res.status === 405 || !parsed.isJson) {
      serverUnavailable = true;
    } else if (!res.ok) {
      throw new Error(parsed.data?.error || 'លេខ Key Developer មិនត្រឹមត្រូវទេ!');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Key Developer')) {
      throw err;
    }
    serverUnavailable = true;
  }

  if (serverUnavailable) {
    const valid = await verifyKeyClientFallback(cleanKey);
    if (!valid) {
      throw new Error('លេខ Key Developer មិនត្រឹមត្រូវទេ! មានតែ Developer ប៉ុណ្ណោះដែលអាចចូលប្រើបាន។');
    }
    const vault = await fetchClientVault();
    return {
      devToken: `${CLIENT_DEV_TOKEN_PREFIX}${EXPECTED_DEV_VAULT_DIGEST}`,
      telegramUrl: vault.telegramUrl || DEFAULT_TELEGRAM_URL,
      masterAdmins: sortedMasterAdmins(vault.masterAdmins),
    };
  }

  throw new Error('លេខ Key Developer មិនត្រឹមត្រូវទេ!');
}

export async function updateMasterAdminExpireApi(
  devToken: string,
  payload: {
    email: string;
    displayName?: string;
    mode: 'add' | 'exact' | 'expire-now' | 'reset-trial';
    unit?: 'months' | 'years';
    amount?: number;
    fromNow?: boolean;
    exactDate?: string;
  }
): Promise<{
  masterAdmin: MasterAdminLicenseRecord;
  masterAdmins: MasterAdminLicenseRecord[];
}> {
  if (!devToken.startsWith(CLIENT_DEV_TOKEN_PREFIX)) {
    try {
      const res = await fetch('/api/developer/master-admins/expire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-developer-token': devToken,
        },
        body: JSON.stringify(payload),
      });
      const parsed = await tryJson<{
        error?: string;
        masterAdmin?: MasterAdminLicenseRecord;
        masterAdmins?: MasterAdminLicenseRecord[];
      }>(res);
      if (res.ok && parsed.isJson && parsed.data?.masterAdmin) {
        return {
          masterAdmin: parsed.data.masterAdmin,
          masterAdmins: Array.isArray(parsed.data.masterAdmins) ? parsed.data.masterAdmins : [],
        };
      }
      if (
        parsed.isJson &&
        parsed.data?.error &&
        res.status !== 404 &&
        res.status !== 405 &&
        res.status !== 503 &&
        res.status < 500
      ) {
        throw new Error(parsed.data.error);
      }
    } catch (err) {
      if (err instanceof Error && !err.message.includes('Failed to fetch')) {
        throw err;
      }
    }
  }

  // Firestore-direct fallback
  const email = payload.email.trim().toLowerCase();
  const vault = await fetchClientVault();
  if (vault.subAdminEmails[email]) {
    throw new Error('Gmail នេះជា Sub-Admin ដែលបង្កើតក្នុង Setting មិនមែនជា Admin មេ ទេ។');
  }

  const now = new Date();
  const existing = vault.masterAdmins[email];
  const displayName =
    String(payload.displayName || existing?.displayName || email.split('@')[0] || 'Admin មេ').trim();

  let nextExpireAt = existing?.expireAt || addMonthsOrYearsIso(now, 'months', 1);
  let nextPlanType: 'trial' | 'paid' = existing?.planType || 'trial';

  if (payload.mode === 'expire-now') {
    nextExpireAt = new Date(now.getTime() - 60 * 1000).toISOString();
    nextPlanType = 'paid';
  } else if (payload.mode === 'reset-trial') {
    nextExpireAt = addMonthsOrYearsIso(now, 'months', 1);
    nextPlanType = 'trial';
  } else if (payload.mode === 'exact') {
    const exactRaw = String(payload.exactDate || '').trim();
    const parsedDate = new Date(exactRaw.includes('T') ? exactRaw : `${exactRaw}T23:59:59`);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error('ទម្រង់កាលបរិច្ឆេទ Expire មិនត្រឹមត្រូវទេ។');
    }
    nextExpireAt = parsedDate.toISOString();
    nextPlanType = 'paid';
  } else {
    const unit: 'months' | 'years' = payload.unit === 'years' ? 'years' : 'months';
    const amount = Math.max(1, Math.min(100, Math.floor(Number(payload.amount) || 1)));
    const currentExpireDate = existing?.expireAt ? new Date(existing.expireAt) : now;
    const baseDate =
      !payload.fromNow &&
      !Number.isNaN(currentExpireDate.getTime()) &&
      currentExpireDate.getTime() > now.getTime()
        ? currentExpireDate
        : now;
    nextExpireAt = addMonthsOrYearsIso(baseDate, unit, amount);
    nextPlanType = 'paid';
  }

  const updatedRec: MasterAdminLicenseRecord = {
    email,
    uid: existing?.uid,
    displayName,
    trialStartedAt: existing?.trialStartedAt || now.toISOString(),
    expireAt: nextExpireAt,
    planType: nextPlanType,
    developerUpdatedAt: now.toISOString(),
  };
  vault.masterAdmins[email] = updatedRec;
  await saveClientVault(vault);
  return {
    masterAdmin: updatedRec,
    masterAdmins: sortedMasterAdmins(vault.masterAdmins),
  };
}

export async function fetchDeveloperOverviewApi(devToken: string): Promise<{
  telegramUrl: string;
  masterAdmins: MasterAdminLicenseRecord[];
}> {
  if (!devToken.startsWith(CLIENT_DEV_TOKEN_PREFIX)) {
    try {
      const res = await fetch('/api/developer/overview', {
        method: 'GET',
        headers: {
          'x-developer-token': devToken,
        },
      });
      const parsed = await tryJson<{
        error?: string;
        telegramUrl?: string;
        masterAdmins?: MasterAdminLicenseRecord[];
      }>(res);
      if (res.ok && parsed.isJson && parsed.data) {
        return {
          telegramUrl: parsed.data.telegramUrl || DEFAULT_TELEGRAM_URL,
          masterAdmins: Array.isArray(parsed.data.masterAdmins) ? parsed.data.masterAdmins : [],
        };
      }
    } catch {
      // Fallback to Firestore
    }
  }

  const vault = await fetchClientVault();
  return {
    telegramUrl: vault.telegramUrl || DEFAULT_TELEGRAM_URL,
    masterAdmins: sortedMasterAdmins(vault.masterAdmins),
  };
}

export async function updateDeveloperTelegramApi(
  devToken: string,
  telegramUrl: string
): Promise<string> {
  if (!devToken.startsWith(CLIENT_DEV_TOKEN_PREFIX)) {
    try {
      const res = await fetch('/api/developer/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-developer-token': devToken,
        },
        body: JSON.stringify({ telegramUrl }),
      });
      const parsed = await tryJson<{
        error?: string;
        telegramUrl?: string;
      }>(res);
      if (res.ok && parsed.isJson && parsed.data?.telegramUrl) {
        return parsed.data.telegramUrl;
      }
      if (
        parsed.isJson &&
        parsed.data?.error &&
        res.status !== 404 &&
        res.status !== 405 &&
        res.status !== 503 &&
        res.status < 500
      ) {
        throw new Error(parsed.data.error);
      }
    } catch (err) {
      if (err instanceof Error && !err.message.includes('Failed to fetch')) {
        throw err;
      }
    }
  }

  const vault = await fetchClientVault();
  const normalized = normalizeTelegramUrl(telegramUrl);
  vault.telegramUrl = normalized;
  const nowIso = new Date().toISOString();
  for (const [k, rec] of Object.entries(vault.masterAdmins)) {
    vault.masterAdmins[k] = { ...rec, developerUpdatedAt: nowIso };
  }
  await saveClientVault(vault);
  return normalized;
}

interface ClientOtpChallengeRecord {
  emailHash: string;
  maskedEmail: string;
  jti: string;
  salt: string;
  otpDigest: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string;
  attempts: number;
  source: 'email' | 'developer' | 'client_dev';
}

const MAX_CLIENT_OTP_ATTEMPTS = 5;
const CLIENT_OTP_TTL_MS = 10 * 60 * 1000;

async function clientEmailHash(email: string): Promise<string> {
  const hex = await sha256Hex(email.trim().toLowerCase());
  return hex.slice(0, 24);
}

function clientMaskEmail(email: string): string {
  const clean = email.trim().toLowerCase();
  const atIdx = clean.indexOf('@');
  if (atIdx <= 1) return clean;
  const local = clean.slice(0, atIdx);
  const domain = clean.slice(atIdx + 1);
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

async function clientOtpDigest(jti: string, email: string, otp: string, salt: string): Promise<string> {
  return sha256Hex(
    `drpos_client_otp_v1:${EXPECTED_DEV_VAULT_DIGEST}:${jti}:${email.trim().toLowerCase()}:${otp}:${salt}`
  );
}

function generateClientSixDigitOtp(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return String(100000 + (arr[0] % 900000));
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateClientRandomHex(bytesLen = 8): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(bytesLen);
    crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

function pruneClientOtpChallenges(
  rawMap: Record<string, unknown> | undefined
): Record<string, ClientOtpChallengeRecord> {
  if (!rawMap || typeof rawMap !== 'object') return {};
  const now = Date.now();
  const GRACE_MS = 60 * 60 * 1000;
  const active: ClientOtpChallengeRecord[] = [];
  for (const val of Object.values(rawMap)) {
    if (!val || typeof val !== 'object') continue;
    const rec = val as Partial<ClientOtpChallengeRecord>;
    if (!rec.emailHash || !rec.jti || !rec.salt || !rec.otpDigest) continue;
    const expMs = new Date(String(rec.expiresAt || '')).getTime();
    if (!Number.isNaN(expMs) && expMs + GRACE_MS < now) continue;
    if (rec.usedAt) {
      const usedMs = new Date(rec.usedAt).getTime();
      if (!Number.isNaN(usedMs) && usedMs + GRACE_MS < now) continue;
    }
    active.push({
      emailHash: String(rec.emailHash),
      maskedEmail: String(rec.maskedEmail || ''),
      jti: String(rec.jti),
      salt: String(rec.salt),
      otpDigest: String(rec.otpDigest),
      createdAt: String(rec.createdAt || ''),
      expiresAt: String(rec.expiresAt || ''),
      usedAt: String(rec.usedAt || ''),
      attempts: Math.max(0, Math.floor(Number(rec.attempts) || 0)),
      source:
        rec.source === 'developer'
          ? 'developer'
          : rec.source === 'client_dev'
          ? 'client_dev'
          : 'email',
    });
  }
  active.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const out: Record<string, ClientOtpChallengeRecord> = {};
  for (const rec of active.slice(0, 100)) {
    out[rec.emailHash] = rec;
  }
  return out;
}

export interface RequestMasterOtpResponse {
  ok: boolean;
  delivery?: 'email';
  email?: string;
  maskedEmail?: string;
  expiresAt?: string;
  expiresInSeconds?: number;
  resendCooldownSeconds?: number;
  challengeToken?: string;
  telegramUrl?: string;
  emailDeliveryConfigured?: boolean;
  code?: string;
  retryAfterSeconds?: number;
  error?: string;
}

export async function requestMasterAdminOtpApi(email: string): Promise<RequestMasterOtpResponse> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return {
      ok: false,
      error: 'សូមបញ្ចូលអាសយដ្ឋាន Gmail អោយបានត្រឹមត្រូវ (ឧ. example@gmail.com)។',
    };
  }

  let serverUnavailable = false;
  try {
    const res = await fetch('/api/auth/request-master-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });
    const parsed = await tryJson<RequestMasterOtpResponse>(res);
    if (
      parsed.isJson &&
      parsed.data &&
      res.status !== 404 &&
      res.status !== 405
    ) {
      return {
        ...parsed.data,
        ok: res.ok && Boolean(parsed.data.ok),
      };
    }
    serverUnavailable = true;
  } catch {
    serverUnavailable = true;
  }

  // Fallback when running on static preview / CDN without /api/* Node backend
  if (serverUnavailable) {
    try {
      const gate = await checkEmailAuthGate(cleanEmail);
      if (gate.isSubAdmin) {
        return {
          ok: false,
          error:
            'គណនី Gmail នេះត្រូវបានបង្កើតជា Admin រង (Admin 2, 3...) នៅក្នុង Settings មិនអាចបង្កើត Admin មេ បានទេ!',
        };
      }
      if (gate.isRegisteredMaster) {
        return {
          ok: false,
          error:
            'គណនី Gmail នេះបានចុះឈ្មោះជា «Admin មេ» រួចហើយ! សូមប្រើផ្ទាំង Sign In ដើម្បីចូលប្រើប្រាស់។',
        };
      }
      return {
        ok: false,
        code: 'OTP_EMAIL_NOT_CONFIGURED',
        emailDeliveryConfigured: false,
        telegramUrl: gate.telegramUrl || DEFAULT_TELEGRAM_URL,
        error:
          'ម៉ាស៊ីនមេមិនទាន់ភ្ជាប់សេវាផ្ញើ Email OTP ដោយស្វ័យប្រវត្តិទេ! សូមទាក់ទង Developer តាម Telegram ឬបើក Key Developer Console ដើម្បីបង្កើតលេខកូដ OTP ៦ ខ្ទង់សម្រាប់ Gmail នេះ។',
      };
    } catch {
      return {
        ok: false,
        code: 'OTP_EMAIL_NOT_CONFIGURED',
        emailDeliveryConfigured: false,
        telegramUrl: DEFAULT_TELEGRAM_URL,
        error:
          'សូមទាក់ទង Developer តាម Telegram ឬបើក Key Developer Console ដើម្បីបង្កើតលេខកូដ OTP ៦ ខ្ទង់។',
      };
    }
  }

  return {
    ok: false,
    error: 'មិនអាចផ្ញើលេខកូដ OTP បានទេនៅពេលនេះ។ សូមព្យាយាមម្ដងទៀត។',
  };
}

export interface VerifyMasterOtpResponse {
  ok: boolean;
  verified?: boolean;
  email?: string;
  otpVerifiedToken?: string;
  error?: string;
}

export async function verifyMasterAdminOtpApi(payload: {
  email: string;
  otp: string;
  challengeToken?: string;
}): Promise<VerifyMasterOtpResponse> {
  const cleanEmail = payload.email.trim().toLowerCase();
  const cleanOtp = payload.otp.replace(/\D+/g, '').trim();

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return {
      ok: false,
      error: 'សូមបញ្ចូលអាសយដ្ឋាន Gmail អោយបានត្រឹមត្រូវ។',
    };
  }
  if (!/^\d{6}$/.test(cleanOtp)) {
    return {
      ok: false,
      error: 'សូមបញ្ចូលលេខកូដ OTP ៦ ខ្ទង់អោយបានត្រឹមត្រូវ។',
    };
  }

  let shouldCheckFirestoreFallback = false;
  try {
    const res = await fetch('/api/auth/verify-master-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        otp: cleanOtp,
        challengeToken: payload.challengeToken || '',
      }),
    });
    const parsed = await tryJson<VerifyMasterOtpResponse>(res);
    if (res.ok && parsed.isJson && parsed.data?.verified) {
      return {
        ...parsed.data,
        ok: true,
      };
    }
    if (
      parsed.isJson &&
      parsed.data?.error &&
      res.status !== 404 &&
      res.status !== 405 &&
      res.status < 500
    ) {
      return {
        ...parsed.data,
        ok: false,
      };
    }
    shouldCheckFirestoreFallback = true;
  } catch {
    shouldCheckFirestoreFallback = true;
  }

  if (shouldCheckFirestoreFallback) {
    try {
      const vault = await fetchClientVault(true);
      if (vault.subAdminEmails[cleanEmail]) {
        return {
          ok: false,
          error:
            'គណនី Gmail នេះត្រូវបានបង្កើតជា Admin រង (Admin 2, 3...) នៅក្នុង Settings មិនអាចបង្កើត Admin មេ បានទេ!',
        };
      }
      const emailHash = await clientEmailHash(cleanEmail);
      const challenges = pruneClientOtpChallenges(vault.otpChallenges);
      const challenge = challenges[emailHash];
      if (!challenge) {
        return {
          ok: false,
          error:
            'មិនទាន់មានលេខកូដ OTP សម្រាប់ Gmail នេះទេ ឬ OTP ផុតកំណត់ហើយ! សូមទទួលយកលេខកូដ OTP ពី Developer។',
        };
      }
      if (challenge.usedAt) {
        return {
          ok: false,
          error: 'លេខកូដ OTP នេះត្រូវបានប្រើប្រាស់រួចហើយ! សូមស្នើសុំលេខកូដ OTP ថ្មី។',
        };
      }
      const expMs = new Date(challenge.expiresAt).getTime();
      if (Number.isNaN(expMs) || Date.now() > expMs) {
        return {
          ok: false,
          error: 'លេខកូដ OTP នេះផុតកំណត់ហើយ (លើស ១០ នាទី)! សូមស្នើសុំលេខកូដថ្មី។',
        };
      }
      if (challenge.attempts >= MAX_CLIENT_OTP_ATTEMPTS) {
        return {
          ok: false,
          error: 'អ្នកបានបញ្ចូលលេខកូដ OTP ខុសច្រើនដងពេក! សូមស្នើសុំលេខកូដ OTP ថ្មី។',
        };
      }
      if (challenge.source !== 'client_dev') {
        return {
          ok: false,
          error: 'លេខកូដ OTP នេះតម្រូវឱ្យផ្ទៀងផ្ទាត់តាម Server API! សូមបង្កើត OTP ថ្មីម្ដងទៀត។',
        };
      }

      const expectedDigest = await clientOtpDigest(challenge.jti, cleanEmail, cleanOtp, challenge.salt);
      if (expectedDigest !== challenge.otpDigest) {
        const nextAttempts = challenge.attempts + 1;
        challenges[emailHash] = { ...challenge, attempts: nextAttempts };
        await saveClientVault({ ...vault, otpChallenges: challenges });
        const remaining = Math.max(0, MAX_CLIENT_OTP_ATTEMPTS - nextAttempts);
        return {
          ok: false,
          error:
            remaining > 0
              ? `លេខកូដ OTP មិនត្រឹមត្រូវទេ! (នៅសល់ឱកាសសាកល្បង ${remaining} ដង)`
              : 'អ្នកបានបញ្ចូលលេខកូដ OTP ខុសអស់ឱកាសហើយ! សូមស្នើសុំលេខកូដ OTP ថ្មី។',
        };
      }

      challenges[emailHash] = { ...challenge, usedAt: new Date().toISOString() };
      await saveClientVault({ ...vault, otpChallenges: challenges });
      const verifiedToken = await sha256Hex(`client_verified:${challenge.jti}:${cleanEmail}`);
      return {
        ok: true,
        verified: true,
        email: cleanEmail,
        otpVerifiedToken: verifiedToken,
      };
    } catch {
      return {
        ok: false,
        error: 'មិនអាចផ្ទៀងផ្ទាត់លេខកូដ OTP បានទេនៅពេលនេះ។ សូមព្យាយាមម្ដងទៀត។',
      };
    }
  }

  return {
    ok: false,
    error: 'មិនអាចផ្ទៀងផ្ទាត់លេខកូដ OTP បានទេនៅពេលនេះ។ សូមព្យាយាមម្ដងទៀត។',
  };
}

export interface DeveloperIssueOtpResponse {
  ok: boolean;
  email?: string;
  maskedEmail?: string;
  otpCode?: string;
  expiresAt?: string;
  expiresInSeconds?: number;
  emailedToUser?: boolean;
  error?: string;
}

export async function issueDeveloperMasterOtpApi(
  devToken: string,
  payload: { email: string; alsoSendEmail?: boolean }
): Promise<DeveloperIssueOtpResponse> {
  const cleanEmail = payload.email.trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('សូមបញ្ចូល Gmail របស់ «Admin មេថ្មី» អោយបានត្រឹមត្រូវ។');
  }

  if (!devToken.startsWith(CLIENT_DEV_TOKEN_PREFIX)) {
    try {
      const res = await fetch('/api/developer/master-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-developer-token': devToken,
        },
        body: JSON.stringify({
          email: cleanEmail,
          alsoSendEmail: Boolean(payload.alsoSendEmail),
        }),
      });
      const parsed = await tryJson<DeveloperIssueOtpResponse>(res);
      if (res.ok && parsed.isJson && parsed.data?.otpCode) {
        return parsed.data;
      }
      if (
        parsed.isJson &&
        parsed.data?.error &&
        res.status !== 404 &&
        res.status !== 405 &&
        res.status < 500
      ) {
        throw new Error(parsed.data.error);
      }
    } catch (err) {
      if (err instanceof Error && !err.message.includes('Failed to fetch')) {
        throw err;
      }
    }
  }

  // Firestore-direct fallback when server API is unavailable or client-dev token is active
  const vault = await fetchClientVault(true);
  if (vault.subAdminEmails[cleanEmail]) {
    throw new Error('Gmail នេះជា Admin រង (Admin 2, 3...) នៅក្នុង Setting មិនអាចបង្កើតគណនី Admin មេ បានទេ។');
  }
  if (vault.masterAdmins[cleanEmail]) {
    throw new Error('Gmail នេះបានចុះឈ្មោះជា Admin មេ រួចរាល់ហើយ! មិនចាំបាច់បង្កើត OTP ថ្មីទេ។');
  }

  const emailHash = await clientEmailHash(cleanEmail);
  const otpCode = generateClientSixDigitOtp();
  const jti =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : generateClientRandomHex(16);
  const salt = generateClientRandomHex(8);
  const otpDigest = await clientOtpDigest(jti, cleanEmail, otpCode, salt);
  const nowMs = Date.now();
  const expiresAt = new Date(nowMs + CLIENT_OTP_TTL_MS).toISOString();

  const challenges = pruneClientOtpChallenges(vault.otpChallenges);
  challenges[emailHash] = {
    emailHash,
    maskedEmail: clientMaskEmail(cleanEmail),
    jti,
    salt,
    otpDigest,
    createdAt: new Date(nowMs).toISOString(),
    expiresAt,
    usedAt: '',
    attempts: 0,
    source: 'client_dev',
  };

  await saveClientVault({
    ...vault,
    otpChallenges: challenges,
  });

  return {
    ok: true,
    email: cleanEmail,
    maskedEmail: clientMaskEmail(cleanEmail),
    otpCode,
    expiresAt,
    expiresInSeconds: Math.floor(CLIENT_OTP_TTL_MS / 1000),
    emailedToUser: false,
  };
}
