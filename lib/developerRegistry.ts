import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { AdminProfile, WorkspaceLicense } from '../src/types.js';
import { verifyFirebaseIdToken } from './mongoPartition.js';

export const DEFAULT_DEVELOPER_KEY = '975596700@houtdara';
export const DEFAULT_TELEGRAM_URL = 'https://t.me/Hout_Dara_HR';
export const VAULT_DOC_ID = 'devvault_a882249ff19ca7af4920b868d2613325';

export interface MasterAdminLicenseRecord {
  email: string;
  uid?: string;
  displayName: string;
  trialStartedAt: string;
  expireAt: string;
  planType: 'trial' | 'paid';
  developerUpdatedAt: string;
}

export interface SubAdminRegistryRecord {
  email: string;
  masterEmail: string;
  name: string;
  createdAt: string;
}

export interface OtpChallengeRecord {
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

export interface DeveloperVaultState {
  telegramUrl: string;
  masterAdmins: Record<string, MasterAdminLicenseRecord>;
  subAdminEmails: Record<string, SubAdminRegistryRecord>;
  otpChallenges?: Record<string, OtpChallengeRecord>;
  updatedAt: string;
}

interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId: string;
}

const FALLBACK_FIREBASE_CONFIG: FirebaseAppletConfig = {
  projectId: 'device-streaming-82b54df4',
  apiKey: 'AIzaSyDON4t9Evxw0gkJFATHs9-tAaziRwAvqWo',
  firestoreDatabaseId: 'ai-studio-drpos-9cabd018-5fb5-407d-9beb-49c30ba87234',
};

let cachedConfig: FirebaseAppletConfig | null = null;

function getFirebaseConfig(): FirebaseAppletConfig {
  if (cachedConfig) return cachedConfig;

  const envProject = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const envApiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  const envDbId = process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID;

  if (envProject && envApiKey && envDbId) {
    cachedConfig = {
      projectId: envProject,
      apiKey: envApiKey,
      firestoreDatabaseId: envDbId,
    };
    return cachedConfig;
  }

  const runtimeDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
  const candidatePaths = [
    path.resolve(process.cwd(), 'firebase-applet-config.json'),
    path.resolve(runtimeDir, '..', 'firebase-applet-config.json'),
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const parsed = JSON.parse(fs.readFileSync(p, 'utf8')) as Partial<FirebaseAppletConfig>;
        if (parsed.projectId && parsed.apiKey && parsed.firestoreDatabaseId) {
          cachedConfig = {
            projectId: parsed.projectId,
            apiKey: parsed.apiKey,
            firestoreDatabaseId: parsed.firestoreDatabaseId,
          };
          return cachedConfig;
        }
      }
    } catch {
      // Try next candidate
    }
  }

  cachedConfig = FALLBACK_FIREBASE_CONFIG;
  return cachedConfig;
}

export function normalizeEmail(raw: unknown): string {
  return String(raw || '').trim().toLowerCase();
}

export function normalizeTelegramUrl(raw: unknown): string {
  const v = String(raw || '').trim();
  if (!v) return DEFAULT_TELEGRAM_URL;
  if (v.startsWith('http://') || v.startsWith('https://')) return v.slice(0, 500);
  if (v.startsWith('@')) return `https://t.me/${v.slice(1)}`.slice(0, 500);
  if (v.startsWith('t.me/')) return `https://${v}`.slice(0, 500);
  return `https://t.me/${v.replace(/^\/+/, '')}`.slice(0, 500);
}

export function addDaysIso(baseDate: Date, days: number): string {
  const next = new Date(baseDate.getTime());
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

export function addMonthsOrYearsIso(
  baseDate: Date,
  unit: 'months' | 'years',
  amount: number
): string {
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

export function getDeveloperAccessKey(): string {
  return String(process.env.DEVELOPER_ACCESS_KEY || DEFAULT_DEVELOPER_KEY)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

export function verifyDeveloperKey(inputKey: unknown): boolean {
  const cleanInput = String(inputKey || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
  const expectedKey = getDeveloperAccessKey();
  const provided = Buffer.from(cleanInput, 'utf8');
  const expected = Buffer.from(expectedKey, 'utf8');
  if (provided.length === 0 || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}

function getTokenSigningKey(): Buffer {
  const secret = String(process.env.DEVELOPER_TOKEN_SECRET || getDeveloperAccessKey());
  return crypto.createHash('sha256').update(`drpos_dev_hmac_v1:${secret}`).digest();
}

export function issueDeveloperToken(ttlMs = 4 * 60 * 60 * 1000): string {
  const now = Date.now();
  const payload = {
    iat: now,
    exp: now + ttlMs,
    jti: crypto.randomUUID(),
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getTokenSigningKey()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyDeveloperToken(rawToken: unknown): boolean {
  const token = String(rawToken || '').trim();
  if (!token) return false;
  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0 || dotIdx >= token.length - 1) return false;
  const encoded = token.slice(0, dotIdx);
  const providedSig = token.slice(dotIdx + 1);
  const expectedSig = crypto
    .createHmac('sha256', getTokenSigningKey())
    .update(encoded)
    .digest('base64url');
  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      exp?: number;
    };
    return typeof parsed.exp === 'number' && Date.now() <= parsed.exp;
  } catch {
    return false;
  }
}

export function getDeveloperTokenFromHeaders(
  headers: Record<string, string | string[] | undefined>
): string {
  const raw = headers['x-developer-token'];
  if (Array.isArray(raw)) return String(raw[0] || '').trim();
  return String(raw || '').trim();
}

export function createDefaultVaultState(): DeveloperVaultState {
  return {
    telegramUrl: DEFAULT_TELEGRAM_URL,
    masterAdmins: {},
    subAdminEmails: {},
    otpChallenges: {},
    updatedAt: '',
  };
}

// --- Firestore REST API Encoding / Decoding Helpers ---

interface FirestoreRestValue {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  nullValue?: null;
  mapValue?: { fields?: Record<string, FirestoreRestValue> };
}

function encodeStringMap(entries: Record<string, Record<string, unknown>>): FirestoreRestValue {
  const fields: Record<string, FirestoreRestValue> = {};
  for (const [key, val] of Object.entries(entries)) {
    if (!key || !val || typeof val !== 'object') continue;
    const innerFields: Record<string, FirestoreRestValue> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v === undefined || v === null) continue;
      if (typeof v === 'string') {
        innerFields[k] = { stringValue: v };
      } else if (typeof v === 'boolean') {
        innerFields[k] = { booleanValue: v };
      } else if (typeof v === 'number' && Number.isFinite(v)) {
        innerFields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
      }
    }
    fields[key] = { mapValue: { fields: innerFields } };
  }
  return { mapValue: { fields } };
}

function decodeMasterAdmins(
  rawField?: FirestoreRestValue
): Record<string, MasterAdminLicenseRecord> {
  const out: Record<string, MasterAdminLicenseRecord> = {};
  const mapFields = rawField?.mapValue?.fields;
  if (!mapFields) return out;
  for (const [k, v] of Object.entries(mapFields)) {
    const f = v?.mapValue?.fields;
    if (!f) continue;
    const email = normalizeEmail(f.email?.stringValue || k);
    if (!email) continue;
    out[email] = {
      email,
      ...(f.uid?.stringValue ? { uid: f.uid.stringValue } : {}),
      displayName: f.displayName?.stringValue || email.split('@')[0] || 'Admin',
      trialStartedAt: f.trialStartedAt?.stringValue || new Date().toISOString(),
      expireAt: f.expireAt?.stringValue || addMonthsOrYearsIso(new Date(), 'months', 1),
      planType: f.planType?.stringValue === 'paid' ? 'paid' : 'trial',
      developerUpdatedAt: f.developerUpdatedAt?.stringValue || '',
    };
  }
  return out;
}

function decodeSubAdminEmails(
  rawField?: FirestoreRestValue
): Record<string, SubAdminRegistryRecord> {
  const out: Record<string, SubAdminRegistryRecord> = {};
  const mapFields = rawField?.mapValue?.fields;
  if (!mapFields) return out;
  for (const [k, v] of Object.entries(mapFields)) {
    const f = v?.mapValue?.fields;
    if (!f) continue;
    const email = normalizeEmail(f.email?.stringValue || k);
    const masterEmail = normalizeEmail(f.masterEmail?.stringValue || '');
    if (!email || !masterEmail) continue;
    out[email] = {
      email,
      masterEmail,
      name: f.name?.stringValue || email.split('@')[0] || 'Admin',
      createdAt: f.createdAt?.stringValue || new Date().toISOString(),
    };
  }
  return out;
}

function decodeOtpChallenges(
  rawField?: FirestoreRestValue
): Record<string, OtpChallengeRecord> {
  const out: Record<string, OtpChallengeRecord> = {};
  const mapFields = rawField?.mapValue?.fields;
  if (!mapFields) return out;
  for (const [k, v] of Object.entries(mapFields)) {
    const f = v?.mapValue?.fields;
    if (!f) continue;
    const emailHash = String(f.emailHash?.stringValue || k).trim();
    const jti = String(f.jti?.stringValue || '').trim();
    const salt = String(f.salt?.stringValue || '').trim();
    const otpDigest = String(f.otpDigest?.stringValue || '').trim();
    if (!emailHash || !jti || !salt || !otpDigest) continue;
    const attemptsNum = Number(f.attempts?.integerValue ?? f.attempts?.doubleValue ?? 0);
    out[emailHash] = {
      emailHash,
      maskedEmail: String(f.maskedEmail?.stringValue || ''),
      jti,
      salt,
      otpDigest,
      createdAt: String(f.createdAt?.stringValue || ''),
      expiresAt: String(f.expiresAt?.stringValue || ''),
      usedAt: String(f.usedAt?.stringValue || ''),
      attempts: Number.isFinite(attemptsNum) ? Math.max(0, Math.floor(attemptsNum)) : 0,
      source:
        f.source?.stringValue === 'developer'
          ? 'developer'
          : f.source?.stringValue === 'client_dev'
          ? 'client_dev'
          : 'email',
    };
  }
  return pruneOtpChallenges(out);
}

export function pruneOtpChallenges(
  map: Record<string, OtpChallengeRecord> | undefined
): Record<string, OtpChallengeRecord> {
  if (!map) return {};
  const now = Date.now();
  const GRACE_MS = 60 * 60 * 1000;
  const active: OtpChallengeRecord[] = [];
  for (const rec of Object.values(map)) {
    if (!rec || !rec.emailHash || !rec.otpDigest) continue;
    const expMs = new Date(rec.expiresAt).getTime();
    if (!Number.isNaN(expMs) && expMs + GRACE_MS < now) continue;
    if (rec.usedAt) {
      const usedMs = new Date(rec.usedAt).getTime();
      if (!Number.isNaN(usedMs) && usedMs + GRACE_MS < now) continue;
    }
    active.push(rec);
  }
  active.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const out: Record<string, OtpChallengeRecord> = {};
  for (const rec of active.slice(0, 100)) {
    out[rec.emailHash] = rec;
  }
  return out;
}

interface LoadedVault {
  state: DeveloperVaultState;
  exists: boolean;
  updateTime?: string;
}

// Local in-memory / optional fallback state (e.g. if offline during unit check)
let memoryFallbackVault: DeveloperVaultState | null = null;

export function seedMemoryVaultFallback(seed?: Partial<DeveloperVaultState>): void {
  if (!seed) return;
  const cur = memoryFallbackVault || createDefaultVaultState();
  memoryFallbackVault = mergeVaultStates(cur, {
    telegramUrl: seed.telegramUrl || DEFAULT_TELEGRAM_URL,
    masterAdmins: seed.masterAdmins || {},
    subAdminEmails: seed.subAdminEmails || {},
    otpChallenges: seed.otpChallenges || {},
    updatedAt: seed.updatedAt || '',
  });
}

export function mergeVaultStates(
  base: DeveloperVaultState,
  incoming: DeveloperVaultState
): DeveloperVaultState {
  const masterAdmins: Record<string, MasterAdminLicenseRecord> = { ...base.masterAdmins };
  for (const [k, rec] of Object.entries(incoming.masterAdmins || {})) {
    const existing = masterAdmins[k];
    if (!existing) {
      masterAdmins[k] = rec;
    } else if (
      rec.developerUpdatedAt &&
      (!existing.developerUpdatedAt || rec.developerUpdatedAt > existing.developerUpdatedAt)
    ) {
      masterAdmins[k] = rec;
    } else {
      masterAdmins[k] = {
        ...existing,
        uid: existing.uid || rec.uid,
        displayName: existing.displayName || rec.displayName,
      };
    }
  }
  const subAdminEmails: Record<string, SubAdminRegistryRecord> = {
    ...(incoming.subAdminEmails || {}),
    ...(base.subAdminEmails || {}),
  };

  const otpChallenges: Record<string, OtpChallengeRecord> = { ...(base.otpChallenges || {}) };
  for (const [k, rec] of Object.entries(incoming.otpChallenges || {})) {
    const existing = otpChallenges[k];
    if (!existing || (rec.createdAt || '') > (existing.createdAt || '')) {
      otpChallenges[k] = rec;
    } else if (rec.jti === existing.jti) {
      otpChallenges[k] = {
        ...existing,
        usedAt: existing.usedAt || rec.usedAt,
        attempts: Math.max(existing.attempts || 0, rec.attempts || 0),
      };
    }
  }

  const telegramUrl =
    incoming.updatedAt && (!base.updatedAt || incoming.updatedAt > base.updatedAt)
      ? incoming.telegramUrl || base.telegramUrl
      : base.telegramUrl || incoming.telegramUrl || DEFAULT_TELEGRAM_URL;

  const updatedAt =
    incoming.updatedAt > base.updatedAt ? incoming.updatedAt : base.updatedAt;

  return {
    telegramUrl: telegramUrl || DEFAULT_TELEGRAM_URL,
    masterAdmins,
    subAdminEmails,
    otpChallenges: pruneOtpChallenges(otpChallenges),
    updatedAt,
  };
}

async function fetchVaultFromFirestore(): Promise<LoadedVault | null> {
  const cfg = getFirebaseConfig();
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    cfg.projectId
  )}/databases/${encodeURIComponent(cfg.firestoreDatabaseId)}/documents/developerVault/${encodeURIComponent(
    VAULT_DOC_ID
  )}?key=${encodeURIComponent(cfg.apiKey)}`;

  try {
    const res = await fetch(url, { method: 'GET', headers: { 'Cache-Control': 'no-cache, no-store' } });
    if (res.status === 404) {
      const seedState = memoryFallbackVault
        ? { ...memoryFallbackVault }
        : createDefaultVaultState();
      return { state: seedState, exists: false };
    }
    if (!res.ok) {
      return null;
    }
    const json = (await res.json()) as {
      fields?: Record<string, FirestoreRestValue>;
      updateTime?: string;
    };
    const fields = json.fields || {};
    const state: DeveloperVaultState = {
      telegramUrl: fields.telegramUrl?.stringValue || DEFAULT_TELEGRAM_URL,
      masterAdmins: decodeMasterAdmins(fields.masterAdmins),
      subAdminEmails: decodeSubAdminEmails(fields.subAdminEmails),
      otpChallenges: decodeOtpChallenges(fields.otpChallenges),
      updatedAt: fields.updatedAt?.stringValue || '',
    };
    if (fields.vaultId) {
      memoryFallbackVault = state;
      return { state, exists: true, updateTime: json.updateTime };
    }
    memoryFallbackVault = memoryFallbackVault
      ? mergeVaultStates(memoryFallbackVault, state)
      : state;
    return {
      state: memoryFallbackVault || state,
      exists: true,
      updateTime: json.updateTime,
    };
  } catch {
    return null;
  }
}

async function commitVaultToFirestore(
  state: DeveloperVaultState,
  exists: boolean,
  updateTime?: string
): Promise<'ok' | 'conflict' | 'error'> {
  const cfg = getFirebaseConfig();
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    cfg.projectId
  )}/databases/${encodeURIComponent(cfg.firestoreDatabaseId)}/documents:commit?key=${encodeURIComponent(
    cfg.apiKey
  )}`;

  const docName = `projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents/developerVault/${VAULT_DOC_ID}`;
  const cleanUpdatedAt = (state.updatedAt || new Date().toISOString()).slice(0, 64);

  const masterEntries: Record<string, Record<string, unknown>> = {};
  for (const [k, rec] of Object.entries(state.masterAdmins)) {
    masterEntries[k] = {
      email: rec.email,
      ...(rec.uid ? { uid: rec.uid } : {}),
      displayName: rec.displayName,
      trialStartedAt: rec.trialStartedAt,
      expireAt: rec.expireAt,
      planType: rec.planType,
      developerUpdatedAt: rec.developerUpdatedAt || '',
    };
  }

  const subEntries: Record<string, Record<string, unknown>> = {};
  for (const [k, rec] of Object.entries(state.subAdminEmails)) {
    subEntries[k] = {
      email: rec.email,
      masterEmail: rec.masterEmail,
      name: rec.name,
      createdAt: rec.createdAt,
    };
  }

  const prunedOtp = pruneOtpChallenges(state.otpChallenges);
  const otpEntries: Record<string, Record<string, unknown>> = {};
  for (const [k, rec] of Object.entries(prunedOtp)) {
    otpEntries[k] = {
      emailHash: rec.emailHash,
      maskedEmail: rec.maskedEmail,
      jti: rec.jti,
      salt: rec.salt,
      otpDigest: rec.otpDigest,
      createdAt: rec.createdAt,
      expiresAt: rec.expiresAt,
      usedAt: rec.usedAt || '',
      attempts: Math.max(0, Math.floor(rec.attempts || 0)),
      source:
        rec.source === 'developer'
          ? 'developer'
          : rec.source === 'client_dev'
          ? 'client_dev'
          : 'email',
    };
  }

  const body = {
    writes: [
      {
        update: {
          name: docName,
          fields: {
            vaultId: { stringValue: VAULT_DOC_ID },
            telegramUrl: { stringValue: normalizeTelegramUrl(state.telegramUrl) },
            masterAdmins: encodeStringMap(masterEntries),
            subAdminEmails: encodeStringMap(subEntries),
            otpChallenges: encodeStringMap(otpEntries),
            updatedAt: { stringValue: cleanUpdatedAt },
          },
        },
        updateTransforms: [
          {
            fieldPath: 'serverUpdatedAt',
            setToServerValue: 'REQUEST_TIME',
          },
        ],
        currentDocument:
          exists && updateTime ? { updateTime } : { exists: false },
      },
    ],
  };

  try {
    const res = await fetch(commitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      memoryFallbackVault = state;
      return 'ok';
    }
    if (res.status === 409 || res.status === 400) {
      const txt = await res.text().catch(() => '');
      if (txt.includes('FAILED_PRECONDITION') || txt.includes('ALREADY_EXISTS') || res.status === 409) {
        return 'conflict';
      }
    }
    return 'error';
  } catch {
    return 'error';
  }
}

export async function readVaultState(
  onMirrorLocal?: (state: DeveloperVaultState) => void
): Promise<DeveloperVaultState> {
  const remote = await fetchVaultFromFirestore();
  if (remote) {
    let state = remote.state;
    if (!remote.exists && memoryFallbackVault) {
      state = mergeVaultStates(state, memoryFallbackVault);
    }
    if (onMirrorLocal) onMirrorLocal(state);
    return state;
  }
  return memoryFallbackVault || createDefaultVaultState();
}

export async function mutateVaultState<T>(
  mutator: (state: DeveloperVaultState) => { changed: boolean; result: T },
  onMirrorLocal?: (state: DeveloperVaultState) => void,
  options?: { requireRemotePersistence?: boolean }
): Promise<{ value: T; persistedToCloud: boolean }> {
  const MAX_RETRIES = 5;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const remote = await fetchVaultFromFirestore();
    if (!remote) break;

    const working: DeveloperVaultState = {
      telegramUrl: remote.state.telegramUrl || DEFAULT_TELEGRAM_URL,
      masterAdmins: { ...remote.state.masterAdmins },
      subAdminEmails: { ...remote.state.subAdminEmails },
      otpChallenges: pruneOtpChallenges(remote.state.otpChallenges),
      updatedAt: remote.state.updatedAt || '',
    };

    if (!remote.exists && memoryFallbackVault) {
      const merged = mergeVaultStates(working, memoryFallbackVault);
      working.telegramUrl = merged.telegramUrl;
      working.masterAdmins = merged.masterAdmins;
      working.subAdminEmails = merged.subAdminEmails;
      working.otpChallenges = pruneOtpChallenges(merged.otpChallenges);
      working.updatedAt = merged.updatedAt;
    }

    const { changed, result } = mutator(working);
    if (!changed && remote.exists) {
      if (onMirrorLocal) onMirrorLocal(working);
      return { value: result, persistedToCloud: true };
    }

    working.otpChallenges = pruneOtpChallenges(working.otpChallenges);
    working.updatedAt = new Date().toISOString();
    const status = await commitVaultToFirestore(working, remote.exists, remote.updateTime);
    if (status === 'ok') {
      if (onMirrorLocal) onMirrorLocal(working);
      return { value: result, persistedToCloud: true };
    }
    if (status === 'error') {
      break;
    }
  }

  // Fallback to in-memory state if Firestore is momentarily unreachable
  const fallback: DeveloperVaultState = memoryFallbackVault
    ? {
        ...memoryFallbackVault,
        masterAdmins: { ...memoryFallbackVault.masterAdmins },
        subAdminEmails: { ...memoryFallbackVault.subAdminEmails },
        otpChallenges: pruneOtpChallenges(memoryFallbackVault.otpChallenges),
      }
    : createDefaultVaultState();
  const { result } = mutator(fallback);
  if (!options?.requireRemotePersistence) {
    fallback.otpChallenges = pruneOtpChallenges(fallback.otpChallenges);
    fallback.updatedAt = new Date().toISOString();
    memoryFallbackVault = fallback;
    if (onMirrorLocal) onMirrorLocal(fallback);
  }
  return { value: result, persistedToCloud: false };
}

function sortedMasterAdmins(state: DeveloperVaultState): MasterAdminLicenseRecord[] {
  return Object.values(state.masterAdmins).sort((a, b) =>
    b.trialStartedAt.localeCompare(a.trialStartedAt)
  );
}

// --- Route Logic Handlers (Shared by Express server.ts & Vercel /api/*) ---

export interface ApiResult {
  status: number;
  body: Record<string, unknown>;
}

export async function runAuthGateCheck(
  payload: Record<string, unknown>,
  onMirrorLocal?: (state: DeveloperVaultState) => void
): Promise<ApiResult> {
  const email = normalizeEmail(payload?.email);
  if (!email || !email.includes('@')) {
    return {
      status: 400,
      body: { error: 'សូមបញ្ចូលអ៊ីមែល Gmail អោយបានត្រឹមត្រូវ។' },
    };
  }
  const state = await readVaultState(onMirrorLocal);
  const subRec = state.subAdminEmails[email];
  const masterRec = state.masterAdmins[email];
  return {
    status: 200,
    body: {
      isSubAdmin: Boolean(subRec),
      masterEmail: subRec?.masterEmail || '',
      isRegisteredMaster: Boolean(masterRec),
      telegramUrl: state.telegramUrl || DEFAULT_TELEGRAM_URL,
    },
  };
}

export async function runRegisterMaster(
  payload: Record<string, unknown>,
  onMirrorLocal?: (state: DeveloperVaultState) => void
): Promise<ApiResult> {
  const email = normalizeEmail(payload?.email);
  const uid = String(payload?.uid || '').trim();
  const displayName =
    String(payload?.displayName || '').trim() || email.split('@')[0] || 'Admin';

  if (!email || !email.includes('@')) {
    return { status: 400, body: { error: 'Invalid email' } };
  }

  const { value } = await mutateVaultState<ApiResult>((state) => {
    if (state.subAdminEmails[email]) {
      return {
        changed: false,
        result: {
          status: 403,
          body: {
            error:
              'គណនី Gmail នេះត្រូវបានបង្កើតនៅក្នុង Setting សម្រាប់ Switch Account ប៉ុណ្ណោះ មិនអាចបង្កើត Admin មេ បានទៀតទេ!',
          },
        },
      };
    }

    let changed = false;
    if (!state.masterAdmins[email]) {
      const now = new Date();
      state.masterAdmins[email] = {
        email,
        uid: uid || undefined,
        displayName,
        trialStartedAt: now.toISOString(),
        expireAt: addMonthsOrYearsIso(now, 'months', 1),
        planType: 'trial',
        developerUpdatedAt: '',
      };
      changed = true;
    } else if (uid && !state.masterAdmins[email].uid) {
      state.masterAdmins[email] = { ...state.masterAdmins[email], uid };
      changed = true;
    }

    const rec = state.masterAdmins[email];
    const license: WorkspaceLicense = {
      trialStartedAt: rec.trialStartedAt,
      expireAt: rec.expireAt,
      planType: rec.planType,
      telegramUrl: state.telegramUrl || DEFAULT_TELEGRAM_URL,
      developerUpdatedAt: rec.developerUpdatedAt || '',
    };

    return {
      changed,
      result: {
        status: 200,
        body: {
          license,
          telegramUrl: state.telegramUrl || DEFAULT_TELEGRAM_URL,
        },
      },
    };
  }, onMirrorLocal);
  return value;
}

export async function runSyncWorkspace(
  payload: Record<string, unknown>,
  onMirrorLocal?: (state: DeveloperVaultState) => void
): Promise<ApiResult> {
  const email = normalizeEmail(payload?.email);
  const uid = String(payload?.uid || '').trim();
  const displayName =
    String(payload?.displayName || '').trim() || email.split('@')[0] || 'Admin';
  const incomingLicense = payload?.license as WorkspaceLicense | undefined;
  const subAdminsRaw = Array.isArray(payload?.subAdmins)
    ? (payload.subAdmins as Array<Partial<AdminProfile>>)
    : null;

  if (!email || !email.includes('@')) {
    return { status: 400, body: { error: 'Invalid master email' } };
  }

  const { value } = await mutateVaultState<ApiResult>((state) => {
    let changed = false;
    let rec = state.masterAdmins[email];
    if (!rec) {
      const now = new Date();
      rec = {
        email,
        uid: uid || undefined,
        displayName,
        trialStartedAt: incomingLicense?.trialStartedAt || now.toISOString(),
        expireAt: incomingLicense?.expireAt || addMonthsOrYearsIso(now, 'months', 1),
        planType: incomingLicense?.planType === 'paid' ? 'paid' : 'trial',
        developerUpdatedAt: incomingLicense?.developerUpdatedAt || '',
      };
      state.masterAdmins[email] = rec;
      changed = true;
    } else {
      const updatedRec = { ...rec };
      if (uid && updatedRec.uid !== uid) {
        updatedRec.uid = uid;
        changed = true;
      }
      if (displayName && !updatedRec.displayName) {
        updatedRec.displayName = displayName;
        changed = true;
      }
      if (changed) {
        state.masterAdmins[email] = updatedRec;
        rec = updatedRec;
      }
    }

    if (subAdminsRaw !== null) {
      const prevForMaster = Object.entries(state.subAdminEmails)
        .filter(([, val]) => val.masterEmail === email)
        .map(([k, val]) => `${k}:${val.name}`)
        .sort()
        .join('|');

      const nextForMasterEntries: Array<[string, SubAdminRegistryRecord]> = [];
      for (const sa of subAdminsRaw) {
        const subEmail = normalizeEmail(sa.email || '');
        if (!subEmail || !subEmail.includes('@') || subEmail === email) continue;
        if (state.masterAdmins[subEmail]) continue;
        nextForMasterEntries.push([
          subEmail,
          {
            email: subEmail,
            masterEmail: email,
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
        for (const [subKey, subVal] of Object.entries(state.subAdminEmails)) {
          if (subVal.masterEmail === email) {
            delete state.subAdminEmails[subKey];
          }
        }
        for (const [subEmail, subRec] of nextForMasterEntries) {
          state.subAdminEmails[subEmail] = subRec;
        }
        changed = true;
      }
    }

    const authoritativeLicense: WorkspaceLicense = {
      trialStartedAt: rec.trialStartedAt,
      expireAt: rec.expireAt,
      planType: rec.planType,
      telegramUrl: state.telegramUrl || DEFAULT_TELEGRAM_URL,
      developerUpdatedAt: rec.developerUpdatedAt || '',
    };

    const shouldUpdateFirestore =
      !incomingLicense ||
      incomingLicense.expireAt !== authoritativeLicense.expireAt ||
      incomingLicense.telegramUrl !== authoritativeLicense.telegramUrl ||
      incomingLicense.planType !== authoritativeLicense.planType ||
      incomingLicense.developerUpdatedAt !== authoritativeLicense.developerUpdatedAt;

    return {
      changed,
      result: {
        status: 200,
        body: {
          license: authoritativeLicense,
          shouldUpdateFirestore,
          telegramUrl: authoritativeLicense.telegramUrl,
        },
      },
    };
  }, onMirrorLocal);
  return value;
}

export async function runUnregisterWorkspaceAccount(
  headers: Record<string, string | string[] | undefined>,
  payload: Record<string, unknown>,
  onMirrorLocal?: (state: DeveloperVaultState) => void
): Promise<ApiResult> {
  const user = await verifyFirebaseIdToken(headers);
  if (!user) {
    return { status: 401, body: { error: 'Unauthorized Firebase session' } };
  }

  const masterEmail = normalizeEmail(user.email || payload?.masterEmail || payload?.email);
  const extraSubEmails = Array.isArray(payload?.subAdminEmails)
    ? (payload.subAdminEmails as unknown[]).map((v) => normalizeEmail(v)).filter((e) => e.includes('@'))
    : [];
  const subEmailSet = new Set(extraSubEmails);

  const removedEmailHashes = new Set<string>();
  const recordEmailHash = (em: string) => {
    if (!em || !em.includes('@')) return;
    const hex = crypto.createHash('sha256').update(em).digest('hex').slice(0, 24);
    removedEmailHashes.add(hex);
  };
  if (masterEmail) recordEmailHash(masterEmail);
  for (const se of subEmailSet) recordEmailHash(se);

  const removedSubEmails: string[] = [];
  let removedMaster = false;

  const { value, persistedToCloud } = await mutateVaultState<ApiResult>((state) => {
    let changed = false;

    for (const [k, rec] of Object.entries(state.masterAdmins)) {
      const normalizedKey = normalizeEmail(k);
      const matchesUid = Boolean(rec?.uid && rec.uid === user.uid);
      const matchesMaster = Boolean(masterEmail && (normalizedKey === masterEmail || normalizeEmail(rec?.email) === masterEmail));
      if (matchesUid || matchesMaster) {
        recordEmailHash(normalizedKey);
        if (rec?.email) recordEmailHash(normalizeEmail(rec.email));
        delete state.masterAdmins[k];
        removedMaster = true;
        changed = true;
      }
    }

    for (const [subKey, subRec] of Object.entries(state.subAdminEmails)) {
      const cleanSubKey = normalizeEmail(subKey);
      const cleanRecMaster = normalizeEmail(subRec?.masterEmail);
      const belongsToMaster = Boolean(masterEmail && cleanRecMaster === masterEmail);
      const explicitlyListed = subEmailSet.has(cleanSubKey);
      if (belongsToMaster || explicitlyListed) {
        recordEmailHash(cleanSubKey);
        delete state.subAdminEmails[subKey];
        removedSubEmails.push(cleanSubKey);
        changed = true;
      }
    }

    if (state.otpChallenges && removedEmailHashes.size > 0) {
      for (const [hKey, ch] of Object.entries(state.otpChallenges)) {
        if (removedEmailHashes.has(hKey) || removedEmailHashes.has(String(ch?.emailHash || ''))) {
          delete state.otpChallenges[hKey];
          changed = true;
        }
      }
    }

    return {
      changed,
      result: {
        status: 200,
        body: {
          ok: true,
          removedMaster,
          removedSubEmails,
        },
      },
    };
  }, onMirrorLocal);

  if (value.status === 200) {
    return {
      status: 200,
      body: {
        ...value.body,
        persistedToCloud,
      },
    };
  }
  return value;
}

export async function runVerifyDeveloper(
  payload: Record<string, unknown>,
  onMirrorLocal?: (state: DeveloperVaultState) => void
): Promise<ApiResult> {
  const key = payload?.key;
  if (!verifyDeveloperKey(key)) {
    return {
      status: 401,
      body: {
        error: 'លេខ Key Developer មិនត្រឹមត្រូវទេ! មានតែ Developer ប៉ុណ្ណោះដែលអាចចូលប្រើបាន។',
      },
    };
  }
  const state = await readVaultState(onMirrorLocal);
  const devToken = issueDeveloperToken();
  return {
    status: 200,
    body: {
      ok: true,
      devToken,
      telegramUrl: state.telegramUrl || DEFAULT_TELEGRAM_URL,
      masterAdmins: sortedMasterAdmins(state),
    },
  };
}

export async function runDeveloperOverview(
  headers: Record<string, string | string[] | undefined>,
  onMirrorLocal?: (state: DeveloperVaultState) => void
): Promise<ApiResult> {
  const token = getDeveloperTokenFromHeaders(headers);
  if (!verifyDeveloperToken(token)) {
    return { status: 401, body: { error: 'Developer session expired or invalid' } };
  }
  const state = await readVaultState(onMirrorLocal);
  return {
    status: 200,
    body: {
      telegramUrl: state.telegramUrl || DEFAULT_TELEGRAM_URL,
      masterAdmins: sortedMasterAdmins(state),
    },
  };
}

export async function runUpdateMasterAdminExpire(
  headers: Record<string, string | string[] | undefined>,
  payload: Record<string, unknown>,
  onMirrorLocal?: (state: DeveloperVaultState) => void
): Promise<ApiResult> {
  const token = getDeveloperTokenFromHeaders(headers);
  if (!verifyDeveloperToken(token)) {
    return { status: 401, body: { error: 'Developer session expired or invalid' } };
  }
  const email = normalizeEmail(payload?.email);
  if (!email || !email.includes('@')) {
    return {
      status: 400,
      body: { error: 'សូមបញ្ចូល Gmail របស់ Admin មេ អោយបានត្រឹមត្រូវ។' },
    };
  }

  const { value, persistedToCloud } = await mutateVaultState<ApiResult>(
    (state) => {
      if (state.subAdminEmails[email]) {
        return {
          changed: false,
          result: {
            status: 400,
            body: {
              error: 'Gmail នេះជា Sub-Admin ដែលបង្កើតក្នុង Setting មិនមែនជា Admin មេ ទេ។',
            },
          },
        };
      }

      const now = new Date();
      const existing = state.masterAdmins[email];
      const displayName = String(
        payload?.displayName || existing?.displayName || email.split('@')[0] || 'Admin មេ'
      ).trim();

      const mode = String(payload?.mode || 'add') as
        | 'add'
        | 'exact'
        | 'expire-now'
        | 'reset-trial';
      let nextExpireAt = existing?.expireAt || addMonthsOrYearsIso(now, 'months', 1);
      let nextPlanType: 'trial' | 'paid' = existing?.planType || 'trial';

      if (mode === 'expire-now') {
        nextExpireAt = new Date(now.getTime() - 60 * 1000).toISOString();
        nextPlanType = 'paid';
      } else if (mode === 'reset-trial') {
        nextExpireAt = addMonthsOrYearsIso(now, 'months', 1);
        nextPlanType = 'trial';
      } else if (mode === 'exact') {
        const exactRaw = String(payload?.exactDate || '').trim();
        const parsed = new Date(exactRaw.includes('T') ? exactRaw : `${exactRaw}T23:59:59`);
        if (Number.isNaN(parsed.getTime())) {
          return {
            changed: false,
            result: { status: 400, body: { error: 'ទម្រង់កាលបរិច្ឆេទ Expire មិនត្រឹមត្រូវទេ។' } },
          };
        }
        nextExpireAt = parsed.toISOString();
        nextPlanType = 'paid';
      } else {
        const unit: 'months' | 'years' = payload?.unit === 'years' ? 'years' : 'months';
        const amount = Math.max(1, Math.min(100, Math.floor(Number(payload?.amount) || 1)));
        const fromNow = Boolean(payload?.fromNow);
        const currentExpireDate = existing?.expireAt ? new Date(existing.expireAt) : now;
        const baseDate =
          !fromNow &&
          !Number.isNaN(currentExpireDate.getTime()) &&
          currentExpireDate.getTime() > now.getTime()
            ? currentExpireDate
            : now;
        nextExpireAt = addMonthsOrYearsIso(baseDate, unit, amount);
        nextPlanType = 'paid';
      }

      const devUpdatedAt = now.toISOString();
      state.masterAdmins[email] = {
        email,
        uid: existing?.uid,
        displayName,
        trialStartedAt: existing?.trialStartedAt || now.toISOString(),
        expireAt: nextExpireAt,
        planType: nextPlanType,
        developerUpdatedAt: devUpdatedAt,
      };

      return {
        changed: true,
        result: {
          status: 200,
          body: {
            ok: true,
            masterAdmin: state.masterAdmins[email],
            masterAdmins: sortedMasterAdmins(state),
          },
        },
      };
    },
    onMirrorLocal,
    { requireRemotePersistence: true }
  );

  if (value.status === 200 && !persistedToCloud) {
    return {
      status: 503,
      body: { error: 'Cloud Firestore sync unavailable from server, please retry via client' },
    };
  }
  return value;
}

export async function runUpdateDeveloperTelegram(
  headers: Record<string, string | string[] | undefined>,
  payload: Record<string, unknown>,
  onMirrorLocal?: (state: DeveloperVaultState) => void
): Promise<ApiResult> {
  const token = getDeveloperTokenFromHeaders(headers);
  if (!verifyDeveloperToken(token)) {
    return { status: 401, body: { error: 'Developer session expired or invalid' } };
  }
  const normalized = normalizeTelegramUrl(payload?.telegramUrl || '');

  const { value, persistedToCloud } = await mutateVaultState<ApiResult>(
    (state) => {
      state.telegramUrl = normalized;
      const nowIso = new Date().toISOString();
      for (const [k, rec] of Object.entries(state.masterAdmins)) {
        state.masterAdmins[k] = { ...rec, developerUpdatedAt: nowIso };
      }
      return {
        changed: true,
        result: {
          status: 200,
          body: {
            ok: true,
            telegramUrl: normalized,
          },
        },
      };
    },
    onMirrorLocal,
    { requireRemotePersistence: true }
  );

  if (value.status === 200 && !persistedToCloud) {
    return {
      status: 503,
      body: { error: 'Cloud Firestore sync unavailable from server, please retry via client' },
    };
  }
  return value;
}

// --- Shared Serverless Request/Response Helpers ---

export async function readJsonBody(req: {
  body?: unknown;
  [Symbol.asyncIterator]?: () => AsyncIterator<Buffer | string>;
}): Promise<Record<string, unknown>> {
  if (Buffer.isBuffer(req.body)) {
    const raw = req.body.toString('utf8').trim();
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof req[Symbol.asyncIterator] === 'function') {
    const chunks: Buffer[] = [];
    for await (const chunk of req as AsyncIterable<Buffer | string>) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

export function sendJson(
  res: {
    statusCode?: number;
    setHeader: (name: string, value: string) => void;
    status?: (code: number) => { json: (data: unknown) => void };
    end: (chunk?: string) => void;
  },
  statusCode: number,
  data: unknown
): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  if (typeof res.status === 'function') {
    const ret = res.status(statusCode);
    if (ret && typeof ret.json === 'function') {
      ret.json(data);
      return;
    }
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}
