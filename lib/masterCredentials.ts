import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Collection } from 'mongodb';
import { getMongoDb, verifyFirebaseIdToken } from './mongoPartition.js';
import {
  getDeveloperAccessKey,
  getDeveloperTokenFromHeaders,
  normalizeEmail,
  readVaultState,
  verifyDeveloperToken,
  type ApiResult,
} from './developerRegistry.js';

export interface StoredMasterCredentialDoc {
  email: string;
  uid?: string;
  displayName?: string;
  currentPasswordEnc: string;
  firebaseSyncedPasswordEnc: string;
  needsFirebaseSync: boolean;
  updatedAt: string;
  updatedBy: 'master' | 'developer';
}

export interface DecryptedMasterPasswordInfo {
  email: string;
  password: string;
  updatedAt: string;
  updatedBy: 'master' | 'developer';
  needsFirebaseSync: boolean;
}

const COLLECTION_NAME = 'drpos_master_admin_credentials';
const LOCAL_ENC_FILE = path.resolve(process.cwd(), 'data', 'master_credentials.enc.json');
const TMP_ENC_FILE = '/tmp/drpos_master_credentials.enc.json';
const ENC_PREFIX = 'gcm1:';

// In-memory rate limiter for password resolution (anti-brute-force)
const resolveAttemptsMap = new Map<string, { count: number; resetAt: number }>();
const RESOLVE_MAX_ATTEMPTS = 10;
const RESOLVE_WINDOW_MS = 15 * 60 * 1000;

let memoryCache: Record<string, StoredMasterCredentialDoc> | null = null;
let mongoIndexReady = false;

function getEncryptionKey(): Buffer {
  const secret = String(
    process.env.DEVELOPER_VAULT_ENCRYPTION_KEY ||
      process.env.DEVELOPER_TOKEN_SECRET ||
      getDeveloperAccessKey()
  ).trim();
  return crypto.createHash('sha256').update(`drpos_master_cred_aes256_v1:${secret}`).digest();
}

function encryptSecret(plaintext: string): string {
  if (!plaintext) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

function decryptSecret(encoded: string): string {
  if (!encoded || !encoded.startsWith(ENC_PREFIX)) return '';
  const body = encoded.slice(ENC_PREFIX.length);
  const parts = body.split('.');
  if (parts.length !== 3) return '';
  try {
    const iv = Buffer.from(parts[0], 'base64url');
    const tag = Buffer.from(parts[1], 'base64url');
    const ciphertext = Buffer.from(parts[2], 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plain.toString('utf8');
  } catch {
    return '';
  }
}

function constantTimeEquals(aStr: string, bStr: string): boolean {
  const a = Buffer.from(aStr, 'utf8');
  const b = Buffer.from(bStr, 'utf8');
  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function readLocalFileStore(): Record<string, StoredMasterCredentialDoc> {
  if (memoryCache) return memoryCache;
  for (const filePath of [LOCAL_ENC_FILE, TMP_ENC_FILE]) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw) as Record<string, StoredMasterCredentialDoc>;
        if (parsed && typeof parsed === 'object') {
          memoryCache = parsed;
          return memoryCache;
        }
      }
    } catch {
      // Ignore corrupt or unavailable local fallback file
    }
  }
  memoryCache = {};
  return memoryCache;
}

function writeLocalFileStore(map: Record<string, StoredMasterCredentialDoc>): void {
  memoryCache = map;
  const serialized = JSON.stringify(map, null, 2);
  for (const filePath of [LOCAL_ENC_FILE, TMP_ENC_FILE]) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, serialized, {
        encoding: 'utf8',
        mode: 0o600,
      });
    } catch {
      // Serverless read-only filesystem on process.cwd(): /tmp fallback still persists per warm container
    }
  }
}

async function getCredCollection(): Promise<Collection<StoredMasterCredentialDoc> | null> {
  const db = await getMongoDb();
  if (!db) return null;
  const col = db.collection<StoredMasterCredentialDoc>(COLLECTION_NAME);
  if (!mongoIndexReady) {
    mongoIndexReady = true;
    col.createIndex({ email: 1 }, { unique: true }).catch(() => {});
  }
  return col;
}

async function getCredentialDoc(email: string): Promise<StoredMasterCredentialDoc | null> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return null;
  const col = await getCredCollection();
  if (col) {
    try {
      const found = await col.findOne({ email: cleanEmail });
      if (found) {
        const local = readLocalFileStore();
        local[cleanEmail] = {
          email: found.email,
          uid: found.uid,
          displayName: found.displayName,
          currentPasswordEnc: found.currentPasswordEnc,
          firebaseSyncedPasswordEnc: found.firebaseSyncedPasswordEnc,
          needsFirebaseSync: Boolean(found.needsFirebaseSync),
          updatedAt: found.updatedAt,
          updatedBy: found.updatedBy === 'developer' ? 'developer' : 'master',
        };
        return local[cleanEmail];
      }
    } catch {
      // Fall through to local store
    }
  }
  const local = readLocalFileStore();
  return local[cleanEmail] || null;
}

async function upsertCredentialDoc(doc: StoredMasterCredentialDoc): Promise<void> {
  const cleanEmail = normalizeEmail(doc.email);
  if (!cleanEmail) return;
  const normalized: StoredMasterCredentialDoc = {
    ...doc,
    email: cleanEmail,
  };
  const col = await getCredCollection();
  if (col) {
    try {
      await col.updateOne({ email: cleanEmail }, { $set: normalized }, { upsert: true });
    } catch {
      // Continue to local fallback write
    }
  }
  const local = readLocalFileStore();
  local[cleanEmail] = normalized;
  writeLocalFileStore(local);
}

export async function deleteMasterCredentialByEmail(email: string): Promise<void> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return;
  const col = await getCredCollection();
  if (col) {
    try {
      await col.deleteOne({ email: cleanEmail });
    } catch {
      // Ignore delete errors
    }
  }
  const local = readLocalFileStore();
  if (local[cleanEmail]) {
    delete local[cleanEmail];
    writeLocalFileStore(local);
  }
}

export async function getAllDecryptedMasterPasswordsMap(): Promise<
  Record<string, DecryptedMasterPasswordInfo>
> {
  const merged: Record<string, StoredMasterCredentialDoc> = { ...readLocalFileStore() };
  const col = await getCredCollection();
  if (col) {
    try {
      const docs = await col.find({}).limit(5000).toArray();
      for (const d of docs) {
        const em = normalizeEmail(d.email);
        if (!em) continue;
        const existing = merged[em];
        if (!existing || (d.updatedAt || '') >= (existing.updatedAt || '')) {
          merged[em] = {
            email: em,
            uid: d.uid,
            displayName: d.displayName,
            currentPasswordEnc: d.currentPasswordEnc,
            firebaseSyncedPasswordEnc: d.firebaseSyncedPasswordEnc,
            needsFirebaseSync: Boolean(d.needsFirebaseSync),
            updatedAt: d.updatedAt || '',
            updatedBy: d.updatedBy === 'developer' ? 'developer' : 'master',
          };
        }
      }
    } catch {
      // Keep local fallback records
    }
  }

  const out: Record<string, DecryptedMasterPasswordInfo> = {};
  for (const [email, rec] of Object.entries(merged)) {
    const plain = decryptSecret(rec.currentPasswordEnc);
    if (!plain) continue;
    out[email] = {
      email,
      password: plain,
      updatedAt: rec.updatedAt || '',
      updatedBy: rec.updatedBy === 'developer' ? 'developer' : 'master',
      needsFirebaseSync: Boolean(rec.needsFirebaseSync),
    };
  }
  return out;
}

/**
 * Internal server-only helper for live Firestore REST refresh on behalf of authorized
 * Warehouse Managers belonging to this Master Admin. Never exposed over HTTP.
 */
export async function getMasterPasswordForServerSync(email: string): Promise<string | null> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return null;
  const doc = await getCredentialDoc(cleanEmail);
  if (!doc) return null;
  const pass = decryptSecret(doc.firebaseSyncedPasswordEnc) || decryptSecret(doc.currentPasswordEnc);
  return pass || null;
}

function checkResolveRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = resolveAttemptsMap.get(key);
  if (!entry || entry.resetAt <= now) {
    resolveAttemptsMap.set(key, { count: 1, resetAt: now + RESOLVE_WINDOW_MS });
    if (resolveAttemptsMap.size > 1000) {
      for (const [k, v] of resolveAttemptsMap.entries()) {
        if (v.resetAt <= now) resolveAttemptsMap.delete(k);
      }
    }
    return true;
  }
  if (entry.count >= RESOLVE_MAX_ATTEMPTS) {
    return false;
  }
  entry.count += 1;
  return true;
}

/**
 * Authenticated Firebase user syncs their verified password to the encrypted Developer Vault.
 * If a Developer has already overridden the password (needsFirebaseSync=true) and this call
 * came from a normal login with the OLD password, we reject with 409 so the client signs out
 * and enforces the Developer's new password immediately.
 */
export async function runSyncMasterPassword(
  headers: Record<string, string | string[] | undefined>,
  payload: Record<string, unknown>
): Promise<ApiResult> {
  const user = await verifyFirebaseIdToken(headers);
  if (!user || !user.email) {
    return { status: 401, body: { error: 'Unauthorized Firebase session' } };
  }

  const password = String(payload?.password || '');
  const source = String(payload?.source || 'login'); // 'register' | 'login' | 'settings' | 'dev-sync'
  const displayName = String(payload?.displayName || '').trim();

  if (password.length < 6 || password.length > 128) {
    return {
      status: 400,
      body: { error: 'លេខសម្ងាត់ត្រូវមានចន្លោះពី 6 ទៅ 128 តួអក្សរ។' },
    };
  }

  const cleanEmail = normalizeEmail(user.email);
  const existing = await getCredentialDoc(cleanEmail);

  // If Developer already changed the password and user just logged in using the stale Firebase password,
  // reject the stale login immediately!
  if (source === 'login' && existing?.needsFirebaseSync) {
    const expectedNew = decryptSecret(existing.currentPasswordEnc);
    if (expectedNew && !constantTimeEquals(password, expectedNew)) {
      return {
        status: 409,
        body: {
          passwordOverriddenByDeveloper: true,
          error:
            'លេខសម្ងាត់គណនី Master Admin នេះត្រូវបានផ្លាស់ប្ដូរដោយ Developer រួចហើយ! សូមប្រើលេខសម្ងាត់ថ្មី។',
        },
      };
    }
  }

  const nowIso = new Date().toISOString();
  const enc = encryptSecret(password);
  const updatedBy: 'master' | 'developer' =
    source === 'dev-sync' ? 'developer' : 'master';

  await upsertCredentialDoc({
    email: cleanEmail,
    uid: user.uid,
    displayName: displayName || existing?.displayName || cleanEmail.split('@')[0] || 'Admin',
    currentPasswordEnc: enc,
    firebaseSyncedPasswordEnc: enc,
    needsFirebaseSync: false,
    updatedAt: nowIso,
    updatedBy,
  });

  return {
    status: 200,
    body: {
      ok: true,
      synced: true,
    },
  };
}

/**
 * Used during Email + Password sign-in when Firebase Auth rejects a Developer-updated password
 * that has not yet been synced into Google's Firebase Auth store.
 * Verifies the submitted password against the encrypted Developer-set password using timingSafeEqual.
 */
export async function runResolveDeveloperPasswordLogin(
  payload: Record<string, unknown>
): Promise<ApiResult> {
  const cleanEmail = normalizeEmail(payload?.email);
  const password = String(payload?.password || '');

  if (!cleanEmail || !cleanEmail.includes('@') || password.length < 6 || password.length > 128) {
    return { status: 200, body: { matched: false } };
  }

  if (!checkResolveRateLimit(cleanEmail)) {
    return {
      status: 429,
      body: {
        matched: false,
        error: 'អ្នកបានព្យាយាមច្រើនដងពេក! សូមរង់ចាំ ១៥ នាទី រួចព្យាយាមម្ដងទៀត។',
      },
    };
  }

  const existing = await getCredentialDoc(cleanEmail);
  if (!existing || !existing.needsFirebaseSync) {
    return { status: 200, body: { matched: false } };
  }

  const expectedCurrent = decryptSecret(existing.currentPasswordEnc);
  if (!expectedCurrent || !constantTimeEquals(password, expectedCurrent)) {
    return { status: 200, body: { matched: false } };
  }

  const firebaseSyncedPassword = decryptSecret(existing.firebaseSyncedPasswordEnc);
  return {
    status: 200,
    body: {
      matched: true,
      hasSyncPassword: Boolean(firebaseSyncedPassword),
      syncPassword: firebaseSyncedPassword || '',
    },
  };
}

/**
 * Allows an already-authenticated Master Admin (e.g. via Google Sign-In) to automatically
 * sync a Developer-updated password into their Firebase Auth credential.
 */
export async function runPendingMasterPasswordSync(
  headers: Record<string, string | string[] | undefined>
): Promise<ApiResult> {
  const user = await verifyFirebaseIdToken(headers);
  if (!user || !user.email) {
    return { status: 401, body: { error: 'Unauthorized Firebase session' } };
  }

  const cleanEmail = normalizeEmail(user.email);
  const existing = await getCredentialDoc(cleanEmail);
  if (!existing || !existing.needsFirebaseSync) {
    return { status: 200, body: { pending: false } };
  }

  const newPassword = decryptSecret(existing.currentPasswordEnc);
  if (!newPassword) {
    return { status: 200, body: { pending: false } };
  }

  return {
    status: 200,
    body: {
      pending: true,
      newPassword,
    },
  };
}

/**
 * Developer-ONLY endpoint (strictly protected by HMAC-signed x-developer-token).
 * Updates the password of any Master Admin account.
 */
export async function runDeveloperUpdateMasterPassword(
  headers: Record<string, string | string[] | undefined>,
  payload: Record<string, unknown>
): Promise<ApiResult> {
  const token = getDeveloperTokenFromHeaders(headers);
  if (!verifyDeveloperToken(token)) {
    return { status: 401, body: { error: 'Developer session expired or invalid' } };
  }

  const cleanEmail = normalizeEmail(payload?.email);
  const newPassword = String(payload?.newPassword || '').trim();

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return {
      status: 400,
      body: { error: 'សូមបញ្ចូល Gmail របស់ Master Admin អោយបានត្រឹមត្រូវ។' },
    };
  }
  if (newPassword.length < 6 || newPassword.length > 128) {
    return {
      status: 400,
      body: { error: 'លេខសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច 6 តួអក្សរ (អតិបរមា 128 តួអក្សរ)។' },
    };
  }

  const vault = await readVaultState();
  if (vault.subAdminEmails[cleanEmail]) {
    return {
      status: 400,
      body: { error: 'Gmail នេះជា Sub-Admin មិនមែនជា Master Admin ទេ។' },
    };
  }

  const existing = await getCredentialDoc(cleanEmail);
  const nowIso = new Date().toISOString();
  const nextEnc = encryptSecret(newPassword);

  // Preserve the last known Firebase-synced password so the next login can seamlessly
  // authenticate against Firebase Auth and immediately call updatePassword(user, newPassword).
  const preservedFirebaseSyncedEnc =
    existing?.firebaseSyncedPasswordEnc || existing?.currentPasswordEnc || '';
  const firebaseAlreadyMatches =
    Boolean(preservedFirebaseSyncedEnc) &&
    constantTimeEquals(decryptSecret(preservedFirebaseSyncedEnc), newPassword);

  const masterMeta = vault.masterAdmins[cleanEmail];
  await upsertCredentialDoc({
    email: cleanEmail,
    uid: existing?.uid || masterMeta?.uid,
    displayName:
      String(payload?.displayName || '').trim() ||
      existing?.displayName ||
      masterMeta?.displayName ||
      cleanEmail.split('@')[0] ||
      'Master Admin',
    currentPasswordEnc: nextEnc,
    firebaseSyncedPasswordEnc: preservedFirebaseSyncedEnc,
    needsFirebaseSync: !firebaseAlreadyMatches,
    updatedAt: nowIso,
    updatedBy: 'developer',
  });

  return {
    status: 200,
    body: {
      ok: true,
      email: cleanEmail,
      masterPassword: newPassword,
      passwordUpdatedAt: nowIso,
      passwordUpdatedBy: 'developer',
      passwordPendingSync: !firebaseAlreadyMatches,
      hasFirebaseSyncBridge: Boolean(preservedFirebaseSyncedEnc),
    },
  };
}
