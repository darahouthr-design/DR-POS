import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getMongoDb } from './mongoPartition.js';
import {
  DEFAULT_TELEGRAM_URL,
  getDeveloperAccessKey,
  getDeveloperTokenFromHeaders,
  mutateVaultState,
  normalizeEmail,
  readVaultState,
  verifyDeveloperToken,
  type ApiResult,
  type DeveloperVaultState,
  type OtpChallengeRecord,
} from './developerRegistry.js';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
const OTP_VERIFIED_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_OTP_ATTEMPTS = 5;

const usedChallengeJtis = new Set<string>();

function getOtpSigningKey(): Buffer {
  const secret = String(
    process.env.OTP_SECRET || process.env.DEVELOPER_TOKEN_SECRET || getDeveloperAccessKey()
  );
  return crypto.createHash('sha256').update(`drpos_master_otp_v1:${secret}`).digest();
}

export function hashEmailKey(email: string): string {
  return crypto.createHash('sha256').update(normalizeEmail(email)).digest('hex').slice(0, 24);
}

export function maskEmailAddress(email: string): string {
  const clean = normalizeEmail(email);
  const atIdx = clean.indexOf('@');
  if (atIdx <= 1) return clean;
  const local = clean.slice(0, atIdx);
  const domain = clean.slice(atIdx + 1);
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeOtpDigits(raw: unknown): string {
  const mapped = String(raw || '').replace(/[\u17E0-\u17E9\uFF10-\uFF19]/g, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 0x17e0 && code <= 0x17e9) return String(code - 0x17e0);
    if (code >= 0xff10 && code <= 0xff19) return String(code - 0xff10);
    return ch;
  });
  return mapped.replace(/\D+/g, '').trim();
}

function generateSixDigitOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

function computeOtpDigest(jti: string, email: string, otp: string, salt: string): string {
  return crypto
    .createHmac('sha256', getOtpSigningKey())
    .update(`otp:${jti}:${normalizeEmail(email)}:${otp}:${salt}`)
    .digest('hex');
}

function safeHexEqual(aHex: string, bHex: string): boolean {
  if (!aHex || !bHex || aHex.length !== bHex.length) return false;
  const a = Buffer.from(aHex, 'utf8');
  const b = Buffer.from(bHex, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

interface SignedChallengePayload {
  v: 1;
  jti: string;
  emailHash: string;
  salt: string;
  otpDigest: string;
  exp: number;
}

function signChallengeToken(payload: SignedChallengePayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getOtpSigningKey()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyChallengeToken(token: string): SignedChallengePayload | null {
  const clean = String(token || '').trim();
  const dotIdx = clean.indexOf('.');
  if (dotIdx <= 0 || dotIdx >= clean.length - 1) return null;
  const encoded = clean.slice(0, dotIdx);
  const sig = clean.slice(dotIdx + 1);
  const expectedSig = crypto
    .createHmac('sha256', getOtpSigningKey())
    .update(encoded)
    .digest('base64url');
  if (!safeHexEqual(sig, expectedSig)) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as SignedChallengePayload;
    if (
      parsed.v !== 1 ||
      !parsed.jti ||
      !parsed.emailHash ||
      !parsed.salt ||
      !parsed.otpDigest ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function issueMasterOtpVerifiedToken(email: string, jti: string): string {
  const now = Date.now();
  const payload = {
    v: 1,
    emailHash: hashEmailKey(email),
    jti,
    iat: now,
    exp: now + OTP_VERIFIED_TOKEN_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getOtpSigningKey()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyMasterOtpVerifiedToken(rawToken: unknown, email: string): boolean {
  const clean = String(rawToken || '').trim();
  const dotIdx = clean.indexOf('.');
  if (dotIdx <= 0 || dotIdx >= clean.length - 1) return false;
  const encoded = clean.slice(0, dotIdx);
  const sig = clean.slice(dotIdx + 1);
  const expectedSig = crypto
    .createHmac('sha256', getOtpSigningKey())
    .update(encoded)
    .digest('base64url');
  if (!safeHexEqual(sig, expectedSig)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      v?: number;
      emailHash?: string;
      exp?: number;
    };
    return (
      parsed.v === 1 &&
      parsed.emailHash === hashEmailKey(email) &&
      typeof parsed.exp === 'number' &&
      Date.now() <= parsed.exp
    );
  } catch {
    return false;
  }
}

export type EmailDeliveryMode = 'gmail' | 'smtp' | 'resend';

export interface ResolvedEmailDeliveryConfig {
  source: 'console' | 'env';
  origin?: 'console' | 'env-mirror';
  mode: EmailDeliveryMode;
  gmailUser?: string;
  gmailAppPassword?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  resendApiKey?: string;
  fromEmail?: string;
  updatedAt?: string;
}

interface StoredEncryptedEmailDoc {
  secretId: string;
  payloadEnc: string;
  origin?: 'console' | 'env-mirror';
  envDigest?: string;
  updatedAt: string;
}

const EMAIL_SECRET_COLLECTION = 'drpos_server_secrets';
const EMAIL_SECRET_DOC_ID = 'master_otp_email_delivery_v1';
const LOCAL_EMAIL_SECRET_FILE = path.resolve(process.cwd(), 'data', 'email_delivery.enc.json');
const EMAIL_ENC_PREFIX = 'gcm1:';
const EMAIL_CACHE_HIT_TTL_MS = 60 * 1000;
const EMAIL_CACHE_MISS_TTL_MS = 3 * 1000;

let cachedEmailConfig: { expiresAt: number; value: ResolvedEmailDeliveryConfig | null } = {
  expiresAt: 0,
  value: null,
};
let lastMirroredEnvDigest = '';

function getEmailSecretEncryptionKey(): Buffer {
  const secret = String(
    process.env.DEVELOPER_VAULT_ENCRYPTION_KEY ||
      process.env.DEVELOPER_TOKEN_SECRET ||
      getDeveloperAccessKey()
  ).trim();
  return crypto.createHash('sha256').update(`drpos_email_secret_aes256_v1:${secret}`).digest();
}

function encryptEmailPayload(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEmailSecretEncryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${EMAIL_ENC_PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

function decryptEmailPayload(encoded: string): string {
  if (!encoded || !encoded.startsWith(EMAIL_ENC_PREFIX)) return '';
  const parts = encoded.slice(EMAIL_ENC_PREFIX.length).split('.');
  if (parts.length !== 3) return '';
  try {
    const iv = Buffer.from(parts[0], 'base64url');
    const tag = Buffer.from(parts[1], 'base64url');
    const ciphertext = Buffer.from(parts[2], 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEmailSecretEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

function parseSavedEmailConfig(
  rawJson: string,
  docOrigin?: 'console' | 'env-mirror'
): ResolvedEmailDeliveryConfig | null {
  if (!rawJson) return null;
  try {
    const parsed = JSON.parse(rawJson) as Partial<ResolvedEmailDeliveryConfig>;
    const origin: 'console' | 'env-mirror' =
      parsed.origin === 'env-mirror' || docOrigin === 'env-mirror' ? 'env-mirror' : 'console';
    const source: 'console' | 'env' = origin === 'env-mirror' ? 'env' : 'console';
    if (parsed.mode === 'gmail' && parsed.gmailUser && parsed.gmailAppPassword) {
      return {
        source,
        origin,
        mode: 'gmail',
        gmailUser: normalizeEmail(parsed.gmailUser),
        gmailAppPassword: String(parsed.gmailAppPassword).replace(/\s+/g, ''),
        fromEmail: String(parsed.fromEmail || '').trim(),
        updatedAt: String(parsed.updatedAt || ''),
      };
    }
    if (parsed.mode === 'smtp' && parsed.smtpHost && parsed.smtpUser && parsed.smtpPass) {
      return {
        source,
        origin,
        mode: 'smtp',
        smtpHost: String(parsed.smtpHost).trim(),
        smtpPort: Number(parsed.smtpPort) || 587,
        smtpUser: String(parsed.smtpUser).trim(),
        smtpPass: String(parsed.smtpPass),
        fromEmail: String(parsed.fromEmail || '').trim(),
        updatedAt: String(parsed.updatedAt || ''),
      };
    }
    if (parsed.mode === 'resend' && parsed.resendApiKey && parsed.fromEmail) {
      return {
        source,
        origin,
        mode: 'resend',
        resendApiKey: String(parsed.resendApiKey).trim(),
        fromEmail: String(parsed.fromEmail).trim(),
        updatedAt: String(parsed.updatedAt || ''),
      };
    }
  } catch {
    // Ignore malformed config payload
  }
  return null;
}

function readLocalEncryptedEmailDoc(): StoredEncryptedEmailDoc | null {
  try {
    if (!fs.existsSync(LOCAL_EMAIL_SECRET_FILE)) return null;
    const raw = fs.readFileSync(LOCAL_EMAIL_SECRET_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoredEncryptedEmailDoc>;
    if (parsed && parsed.secretId === EMAIL_SECRET_DOC_ID && typeof parsed.payloadEnc === 'string') {
      return {
        secretId: EMAIL_SECRET_DOC_ID,
        payloadEnc: parsed.payloadEnc,
        updatedAt: String(parsed.updatedAt || ''),
      };
    }
  } catch {
    // Ignore local file read failure
  }
  return null;
}

function writeLocalEncryptedEmailDoc(doc: StoredEncryptedEmailDoc | null): boolean {
  try {
    if (!doc) {
      if (fs.existsSync(LOCAL_EMAIL_SECRET_FILE)) {
        fs.unlinkSync(LOCAL_EMAIL_SECRET_FILE);
      }
      return true;
    }
    const dir = path.dirname(LOCAL_EMAIL_SECRET_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_EMAIL_SECRET_FILE, JSON.stringify(doc, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    });
    return true;
  } catch {
    return false;
  }
}

function setEmailConfigCache(value: ResolvedEmailDeliveryConfig | null): void {
  cachedEmailConfig = {
    value,
    expiresAt: Date.now() + (value ? EMAIL_CACHE_HIT_TTL_MS : EMAIL_CACHE_MISS_TTL_MS),
  };
}

async function readStoredEmailConfig(): Promise<ResolvedEmailDeliveryConfig | null> {
  if (Date.now() < cachedEmailConfig.expiresAt) {
    return cachedEmailConfig.value;
  }

  let latestDoc: StoredEncryptedEmailDoc | null = readLocalEncryptedEmailDoc();
  try {
    const db = await getMongoDb();
    if (db) {
      const col = db.collection<StoredEncryptedEmailDoc>(EMAIL_SECRET_COLLECTION);
      const found = await col.findOne({ secretId: EMAIL_SECRET_DOC_ID });
      if (found && typeof found.payloadEnc === 'string') {
        if (!latestDoc || String(found.updatedAt || '') >= String(latestDoc.updatedAt || '')) {
          latestDoc = {
            secretId: EMAIL_SECRET_DOC_ID,
            payloadEnc: found.payloadEnc,
            origin: found.origin === 'env-mirror' ? 'env-mirror' : 'console',
            envDigest: typeof found.envDigest === 'string' ? found.envDigest : '',
            updatedAt: String(found.updatedAt || ''),
          };
        }
      }
    }
  } catch {
    // Continue with local file fallback; short miss TTL allows fast retry
  }

  const parsed = latestDoc
    ? parseSavedEmailConfig(decryptEmailPayload(latestDoc.payloadEnc), latestDoc.origin)
    : null;
  setEmailConfigCache(parsed);
  return parsed;
}

function cleanEnvValue(raw: unknown): string {
  const s = String(raw || '').replace(/\r/g, '').trim();
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    return s.slice(1, -1).trim();
  }
  return s;
}

function readEnvEmailConfig(): ResolvedEmailDeliveryConfig | null {
  let smtpHost = cleanEnvValue(process.env.SMTP_HOST);
  const smtpUser = cleanEnvValue(process.env.SMTP_USER);
  let smtpPass = cleanEnvValue(process.env.SMTP_PASS);
  const fromEmail = cleanEnvValue(process.env.OTP_FROM_EMAIL);

  if (!smtpHost && smtpUser.toLowerCase().endsWith('@gmail.com') && smtpPass) {
    smtpHost = 'smtp.gmail.com';
  }
  if (smtpHost.toLowerCase().includes('gmail') && /^[a-z0-9]{4}(?:\s+[a-z0-9]{4}){3}$/i.test(smtpPass)) {
    smtpPass = smtpPass.replace(/\s+/g, '');
  }
  if (smtpHost && smtpUser && smtpPass) {
    return {
      source: 'env',
      origin: 'env-mirror',
      mode: 'smtp',
      smtpHost,
      smtpPort: Number(cleanEnvValue(process.env.SMTP_PORT) || 587) || 587,
      smtpUser,
      smtpPass,
      fromEmail,
    };
  }

  const gmailUser = normalizeEmail(
    cleanEnvValue(process.env.GMAIL_USER) ||
      (smtpUser.includes('@') ? smtpUser : '') ||
      (fromEmail.includes('@') && !fromEmail.includes('<') ? fromEmail : '')
  );
  const gmailPass = cleanEnvValue(process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS).replace(
    /\s+/g,
    ''
  );
  if (gmailUser && gmailPass) {
    return {
      source: 'env',
      origin: 'env-mirror',
      mode: 'gmail',
      gmailUser,
      gmailAppPassword: gmailPass,
      fromEmail,
    };
  }

  const resendKey = cleanEnvValue(process.env.RESEND_API_KEY);
  if (resendKey) {
    return {
      source: 'env',
      origin: 'env-mirror',
      mode: 'resend',
      resendApiKey: resendKey,
      fromEmail: fromEmail || 'DR-POS <onboarding@resend.dev>',
    };
  }

  return null;
}

async function mirrorEnvConfigToMongoIfNeeded(envCfg: ResolvedEmailDeliveryConfig): Promise<void> {
  const digest = crypto
    .createHash('sha256')
    .update(JSON.stringify({ ...envCfg, updatedAt: '' }))
    .digest('hex')
    .slice(0, 24);
  if (digest === lastMirroredEnvDigest) return;
  lastMirroredEnvDigest = digest;
  try {
    const db = await getMongoDb();
    if (!db) return;
    const col = db.collection<StoredEncryptedEmailDoc>(EMAIL_SECRET_COLLECTION);
    const existing = await col.findOne({ secretId: EMAIL_SECRET_DOC_ID });
    if (existing && existing.origin !== 'env-mirror') {
      // Respect explicit Console config stored by Developer
      return;
    }
    if (existing && existing.envDigest === digest) {
      return;
    }
    const nowIso = new Date().toISOString();
    const mirrorPayload: ResolvedEmailDeliveryConfig = {
      ...envCfg,
      source: 'env',
      origin: 'env-mirror',
      updatedAt: nowIso,
    };
    await col.updateOne(
      { secretId: EMAIL_SECRET_DOC_ID },
      {
        $set: {
          secretId: EMAIL_SECRET_DOC_ID,
          origin: 'env-mirror',
          envDigest: digest,
          payloadEnc: encryptEmailPayload(JSON.stringify(mirrorPayload)),
          updatedAt: nowIso,
        },
      },
      { upsert: true }
    );
  } catch {
    // Non-fatal: env mirror is best-effort for multi-instance deployments
  }
}

export async function resolveEmailDeliveryConfig(): Promise<ResolvedEmailDeliveryConfig | null> {
  const stored = await readStoredEmailConfig();
  if (stored && stored.origin !== 'env-mirror') {
    return stored;
  }
  const envCfg = readEnvEmailConfig();
  if (envCfg) {
    void mirrorEnvConfigToMongoIfNeeded(envCfg);
    return envCfg;
  }
  if (stored) {
    return stored;
  }
  return null;
}

export async function isEmailDeliveryConfigured(): Promise<boolean> {
  const cfg = await resolveEmailDeliveryConfig();
  return Boolean(cfg);
}

function summarizeEmailConfig(cfg: ResolvedEmailDeliveryConfig | null) {
  if (!cfg) {
    return {
      configured: false,
      source: 'none' as const,
      mode: null,
      maskedAccount: '',
      smtpHost: '',
      smtpPort: 587,
      fromEmail: '',
      updatedAt: '',
    };
  }
  const rawAccount =
    cfg.mode === 'gmail'
      ? cfg.gmailUser || ''
      : cfg.mode === 'smtp'
      ? cfg.smtpUser || ''
      : cfg.fromEmail || 'Resend API';
  const maskedAccount = rawAccount.includes('@') ? maskEmailAddress(rawAccount) : rawAccount;
  return {
    configured: true,
    source: cfg.source,
    mode: cfg.mode,
    maskedAccount,
    smtpHost: cfg.smtpHost || '',
    smtpPort: cfg.smtpPort || 587,
    fromEmail: cfg.fromEmail || '',
    updatedAt: cfg.updatedAt || '',
  };
}

function buildOtpEmailContent(toEmail: string, otpCode: string, isTest = false) {
  const subject = isTest
    ? 'DR-POS: សាកល្បងសេវាផ្ញើ Email OTP ជោគជ័យ'
    : 'DR-POS: លេខកូដ OTP បង្កើតគណនី Master Admin ថ្មី';
  const textBody = [
    isTest
      ? `DR-POS - ការសាកល្បងផ្ញើ Email OTP ដោយស្វ័យប្រវត្តិជោគជ័យ!`
      : `DR-POS - ការផ្ទៀងផ្ទាត់បង្កើតគណនី Master Admin ថ្មី`,
    ``,
    `លេខកូដ OTP ៦ ខ្ទង់របស់អ្នកគឺ: ${otpCode}`,
    `អ៊ីមែល: ${toEmail}`,
    `សុពលភាព: ១០ នាទី`,
    ``,
    `សូមកុំចែករំលែកលេខកូដនេះទៅអ្នកដទៃ។`,
  ].join('\n');

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff; color: #111827;">
      <h2 style="margin: 0 0 8px; font-size: 18px; color: #0f766e;">DR-POS · ${isTest ? 'Test Email Delivery' : 'ផ្ទៀងផ្ទាត់ OTP'}</h2>
      <p style="margin: 0 0 16px; font-size: 14px; color: #4b5563;">
        ${
          isTest
            ? `សេវាផ្ញើ Email OTP ត្រូវបានភ្ជាប់ដោយជោគជ័យសម្រាប់ <strong>${toEmail}</strong>៖`
            : `សូមប្រើលេខកូដ OTP ៦ ខ្ទង់ខាងក្រោម ដើម្បីបញ្ជាក់ការបង្កើតគណនី <strong>Master Admin ថ្មី</strong> សម្រាប់ <strong>${toEmail}</strong>៖`
        }
      </p>
      <div style="margin: 20px 0; padding: 16px; text-align: center; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 10px;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f766e; font-family: monospace;">${otpCode}</span>
      </div>
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        លេខកូដនេះមានសុពលភាពរយៈពេល <strong>១០ នាទី</strong> ហើយអាចប្រើបានតែម្ដងប៉ុណ្ណោះ។
      </p>
    </div>
  `.trim();

  return { subject, textBody, htmlBody };
}

async function sendOtpEmailWithConfig(
  cfg: ResolvedEmailDeliveryConfig,
  toEmail: string,
  otpCode: string,
  isTest = false
): Promise<void> {
  const { subject, textBody, htmlBody } = buildOtpEmailContent(toEmail, otpCode, isTest);

  if (cfg.mode === 'resend' && cfg.resendApiKey) {
    const fromAddr = cfg.fromEmail || 'DR-POS <onboarding@resend.dev>';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddr,
        to: [toEmail],
        subject,
        text: textBody,
        html: htmlBody,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Resend API error (${res.status}): ${errBody.slice(0, 220)}`);
    }
    return;
  }

  const nodemailer = await import('nodemailer');

  if (cfg.mode === 'smtp' && cfg.smtpHost && cfg.smtpUser && cfg.smtpPass) {
    const port = Number(cfg.smtpPort || 587);
    const transporter = nodemailer.default.createTransport({
      host: cfg.smtpHost,
      port,
      secure: port === 465,
      auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    const rawFrom = cfg.fromEmail || cfg.smtpUser;
    const fromAddr = rawFrom.includes('<') ? rawFrom : `DR-POS <${rawFrom}>`;
    await transporter.sendMail({
      from: fromAddr,
      to: toEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
    return;
  }

  if (cfg.mode === 'gmail' && cfg.gmailUser && cfg.gmailAppPassword) {
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: { user: cfg.gmailUser, pass: cfg.gmailAppPassword },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    const rawFrom = cfg.fromEmail || cfg.gmailUser;
    const fromAddr = rawFrom.includes('<') ? rawFrom : `DR-POS <${rawFrom}>`;
    await transporter.sendMail({
      from: fromAddr,
      to: toEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
    return;
  }

  throw new Error('OTP_EMAIL_NOT_CONFIGURED');
}

async function sendOtpEmail(toEmail: string, otpCode: string): Promise<void> {
  const cfg = await resolveEmailDeliveryConfig();
  if (!cfg) {
    throw new Error('OTP_EMAIL_NOT_CONFIGURED');
  }
  await sendOtpEmailWithConfig(cfg, toEmail, otpCode, false);
}

export async function runGetDeveloperEmailConfig(
  headers: Record<string, string | string[] | undefined>
): Promise<ApiResult> {
  const token = getDeveloperTokenFromHeaders(headers);
  if (!verifyDeveloperToken(token)) {
    return { status: 401, body: { error: 'Developer session expired or invalid' } };
  }
  const cfg = await resolveEmailDeliveryConfig();
  return {
    status: 200,
    body: {
      ok: true,
      ...summarizeEmailConfig(cfg),
    },
  };
}

export async function runSaveDeveloperEmailConfig(
  headers: Record<string, string | string[] | undefined>,
  payload: Record<string, unknown>
): Promise<ApiResult> {
  const token = getDeveloperTokenFromHeaders(headers);
  if (!verifyDeveloperToken(token)) {
    return { status: 401, body: { error: 'Developer session expired or invalid' } };
  }

  const action = String(payload?.action || 'save').trim().toLowerCase();
  if (action === 'test') {
    const activeCfg = await resolveEmailDeliveryConfig();
    if (!activeCfg) {
      return {
        status: 400,
        body: { error: 'ម៉ាស៊ីនមេមិនទាន់មានការកំណត់សេវាផ្ញើ Email នៅឡើយទេ។ សូមបំពេញព័ត៌មានជាមុនសិន។' },
      };
    }
    const testToEmail = normalizeEmail(payload?.testToEmail || '');
    try {
      if (testToEmail && isValidEmailFormat(testToEmail)) {
        await sendOtpEmailWithConfig(activeCfg, testToEmail, '123456', true);
      } else if (activeCfg.mode !== 'resend') {
        const nodemailer = await import('nodemailer');
        const transporter =
          activeCfg.mode === 'gmail'
            ? nodemailer.default.createTransport({
                service: 'gmail',
                auth: { user: activeCfg.gmailUser, pass: activeCfg.gmailAppPassword },
                connectionTimeout: 10_000,
                greetingTimeout: 10_000,
                socketTimeout: 15_000,
              })
            : nodemailer.default.createTransport({
                host: activeCfg.smtpHost,
                port: Number(activeCfg.smtpPort || 587),
                secure: Number(activeCfg.smtpPort || 587) === 465,
                auth: { user: activeCfg.smtpUser, pass: activeCfg.smtpPass },
                connectionTimeout: 10_000,
                greetingTimeout: 10_000,
                socketTimeout: 15_000,
              });
        await transporter.verify();
      } else {
        return {
          status: 400,
          body: { error: 'សូមបញ្ចូល Gmail ទទួល Email សាកល្បង ដើម្បីផ្ទៀងផ្ទាត់ Resend API។' },
        };
      }
      return {
        status: 200,
        body: {
          ok: true,
          testedEmail: testToEmail && isValidEmailFormat(testToEmail) ? testToEmail : undefined,
          ...summarizeEmailConfig(activeCfg),
        },
      };
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Connection failed';
      return {
        status: 400,
        body: {
          error: `ការសាកល្បងសេវា Email មិនជោគជ័យទេ (${detail.slice(0, 180)})`,
        },
      };
    }
  }

  if (action === 'clear') {
    let persisted = false;
    try {
      const db = await getMongoDb();
      if (db) {
        await db.collection<StoredEncryptedEmailDoc>(EMAIL_SECRET_COLLECTION).deleteOne({
          secretId: EMAIL_SECRET_DOC_ID,
        });
        persisted = true;
      }
    } catch {
      // Ignore Mongo clear errors
    }
    const localCleared = writeLocalEncryptedEmailDoc(null);
    cachedEmailConfig = { expiresAt: 0, value: null };
    lastMirroredEnvDigest = '';
    const envCfg = await resolveEmailDeliveryConfig();
    return {
      status: 200,
      body: {
        ok: true,
        cleared: true,
        persisted,
        localCleared,
        ...summarizeEmailConfig(envCfg),
      },
    };
  }

  const mode = String(payload?.mode || 'gmail').trim().toLowerCase() as EmailDeliveryMode;
  const fromEmail = String(payload?.fromEmail || '').trim();
  const testToEmail = normalizeEmail(payload?.testToEmail || '');
  const nowIso = new Date().toISOString();

  let candidate: ResolvedEmailDeliveryConfig;
  if (mode === 'gmail') {
    const gmailUser = normalizeEmail(payload?.gmailUser || '');
    const gmailAppPassword = String(payload?.gmailAppPassword || '').replace(/\s+/g, '').trim();
    if (!isValidEmailFormat(gmailUser)) {
      return { status: 400, body: { error: 'សូមបញ្ចូលអាសយដ្ឋាន Gmail អ្នកផ្ញើ (Sender Gmail) អោយបានត្រឹមត្រូវ។' } };
    }
    if (gmailAppPassword.length < 8) {
      return {
        status: 400,
        body: { error: 'សូមបញ្ចូល Gmail App Password ១៦ ខ្ទង់ (បង្កើតពី Google Account → App Passwords)។' },
      };
    }
    candidate = {
      source: 'console',
      origin: 'console',
      mode: 'gmail',
      gmailUser,
      gmailAppPassword,
      fromEmail,
      updatedAt: nowIso,
    };
  } else if (mode === 'smtp') {
    const smtpHost = String(payload?.smtpHost || '').trim();
    const smtpPort = Number(payload?.smtpPort || 587) || 587;
    const smtpUser = String(payload?.smtpUser || '').trim();
    let smtpPass = String(payload?.smtpPass || '').trim();
    if (smtpHost.toLowerCase().includes('gmail') && /^[a-z0-9]{4}(?:\s+[a-z0-9]{4}){3}$/i.test(smtpPass)) {
      smtpPass = smtpPass.replace(/\s+/g, '');
    }
    if (!smtpHost || !smtpUser || !smtpPass) {
      return { status: 400, body: { error: 'សូមបំពេញ SMTP Host, SMTP Username និង SMTP Password អោយបានគ្រប់គ្រាន់។' } };
    }
    candidate = {
      source: 'console',
      origin: 'console',
      mode: 'smtp',
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      fromEmail,
      updatedAt: nowIso,
    };
  } else if (mode === 'resend') {
    const resendApiKey = String(payload?.resendApiKey || '').trim();
    if (!resendApiKey) {
      return { status: 400, body: { error: 'សូមបញ្ចូល Resend API Key (ចាប់ផ្ដើមដោយ re_...) ជាមុនសិន។' } };
    }
    candidate = {
      source: 'console',
      origin: 'console',
      mode: 'resend',
      resendApiKey,
      fromEmail: fromEmail || 'DR-POS <onboarding@resend.dev>',
      updatedAt: nowIso,
    };
  } else {
    return { status: 400, body: { error: 'ប្រភេទសេវាផ្ញើ Email មិនត្រឹមត្រូវទេ។' } };
  }

  // Verify credentials live before persisting so invalid passwords are caught immediately
  try {
    if (testToEmail && isValidEmailFormat(testToEmail)) {
      await sendOtpEmailWithConfig(candidate, testToEmail, '123456', true);
    } else if (candidate.mode !== 'resend') {
      const nodemailer = await import('nodemailer');
      const transporter =
        candidate.mode === 'gmail'
          ? nodemailer.default.createTransport({
              service: 'gmail',
              auth: { user: candidate.gmailUser, pass: candidate.gmailAppPassword },
              connectionTimeout: 10_000,
              greetingTimeout: 10_000,
              socketTimeout: 15_000,
            })
          : nodemailer.default.createTransport({
              host: candidate.smtpHost,
              port: Number(candidate.smtpPort || 587),
              secure: Number(candidate.smtpPort || 587) === 465,
              auth: { user: candidate.smtpUser, pass: candidate.smtpPass },
              connectionTimeout: 10_000,
              greetingTimeout: 10_000,
              socketTimeout: 15_000,
            });
      await transporter.verify();
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Connection failed';
    return {
      status: 400,
      body: {
        error: `មិនអាចភ្ជាប់សេវាផ្ញើ Email បានទេ! សូមពិនិត្យ Gmail App Password ឬ SMTP ម្ដងទៀត (${detail})`,
      },
    };
  }

  const encryptedDoc: StoredEncryptedEmailDoc = {
    secretId: EMAIL_SECRET_DOC_ID,
    origin: 'console',
    payloadEnc: encryptEmailPayload(JSON.stringify(candidate)),
    updatedAt: nowIso,
  };

  let persistedIn: 'mongodb' | 'local-file' | 'memory' = 'memory';
  try {
    const db = await getMongoDb();
    if (db) {
      await db
        .collection<StoredEncryptedEmailDoc>(EMAIL_SECRET_COLLECTION)
        .updateOne({ secretId: EMAIL_SECRET_DOC_ID }, { $set: encryptedDoc }, { upsert: true });
      persistedIn = 'mongodb';
    }
  } catch {
    // Fallback to local encrypted file
  }

  if (writeLocalEncryptedEmailDoc(encryptedDoc) && persistedIn === 'memory') {
    persistedIn = 'local-file';
  }

  setEmailConfigCache(candidate);

  return {
    status: 200,
    body: {
      ok: true,
      persistedIn,
      testedEmail: testToEmail && isValidEmailFormat(testToEmail) ? testToEmail : undefined,
      ...summarizeEmailConfig(candidate),
    },
  };
}

export async function runRequestMasterOtp(
  payload: Record<string, unknown>,
  onMirrorLocal?: (state: DeveloperVaultState) => void
): Promise<ApiResult> {
  const email = normalizeEmail(payload?.email);
  if (!isValidEmailFormat(email)) {
    return {
      status: 400,
      body: { error: 'សូមបញ្ចូលអាសយដ្ឋាន Gmail អោយបានត្រឹមត្រូវ (ឧ. example@gmail.com)។' },
    };
  }

  const state = await readVaultState(onMirrorLocal);
  const telegramUrl = state.telegramUrl || DEFAULT_TELEGRAM_URL;

  if (state.subAdminEmails[email]) {
    return {
      status: 403,
      body: {
        error:
          'គណនី Gmail នេះត្រូវបានបង្កើតជា Admin រង (Admin 2, 3...) នៅក្នុង Settings មិនអាចបង្កើត Master Admin បានទេ!',
      },
    };
  }

  if (state.warehouseEmails?.[email]) {
    return {
      status: 403,
      body: {
        error:
          'គណនី Gmail នេះត្រូវបានបង្កើតជា «អ្នកគ្រប់គ្រងឃ្លាំង» នៅក្នុង Settings មិនអាចបង្កើត Master Admin បានទេ!',
      },
    };
  }

  if (state.masterAdmins[email]) {
    return {
      status: 409,
      body: {
        error:
          'គណនី Gmail នេះបានចុះឈ្មោះជា «Master Admin» រួចហើយ! សូមប្រើផ្ទាំង Sign In ដើម្បីចូលប្រើប្រាស់។',
      },
    };
  }

  if (!(await isEmailDeliveryConfigured())) {
    return {
      status: 503,
      body: {
        code: 'OTP_EMAIL_NOT_CONFIGURED',
        emailDeliveryConfigured: false,
        telegramUrl,
        error:
          'ម៉ាស៊ីនមេមិនទាន់ភ្ជាប់សេវាផ្ញើ Email (SMTP / Gmail App Password) ដោយស្វ័យប្រវត្តិទេ! សូមទាក់ទង Developer តាម Telegram ឬឱ្យ Developer ភ្ជាប់ Gmail App Password / បង្កើតលេខកូដ OTP ៦ ខ្ទង់នៅក្នុង Key Developer Console។',
      },
    };
  }

  const emailHash = hashEmailKey(email);
  const existing = state.otpChallenges?.[emailHash];
  const nowMs = Date.now();
  if (existing && existing.source === 'email' && !existing.usedAt) {
    const createdMs = new Date(existing.createdAt).getTime();
    if (!Number.isNaN(createdMs) && nowMs - createdMs < OTP_RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((OTP_RESEND_COOLDOWN_MS - (nowMs - createdMs)) / 1000)
      );
      return {
        status: 429,
        body: {
          retryAfterSeconds,
          error: `សូមរង់ចាំ ${retryAfterSeconds} វិនាទី មុនពេលផ្ញើលេខកូដ OTP ម្ដងទៀត។`,
        },
      };
    }
  }

  const otpCode = generateSixDigitOtp();
  const jti = crypto.randomUUID();
  const salt = crypto.randomBytes(8).toString('hex');
  const otpDigest = computeOtpDigest(jti, email, otpCode, salt);
  const createdAt = new Date(nowMs).toISOString();
  const expMs = nowMs + OTP_TTL_MS;
  const expiresAt = new Date(expMs).toISOString();

  // Send OTP email first so failed SMTP delivery does not lock the user in a 30s cooldown
  try {
    await sendOtpEmail(email, otpCode);
  } catch (err) {
    const detail = err instanceof Error ? err.message.slice(0, 180) : 'Email delivery error';
    console.error('Failed to send Master Admin OTP email:', err);
    return {
      status: 502,
      body: {
        code: 'OTP_EMAIL_SEND_FAILED',
        emailDeliveryConfigured: true,
        telegramUrl,
        detail,
        error:
          `មិនអាចផ្ញើ Email OTP បានទេនៅពេលនេះ (${detail})។ សូមពិនិត្យការកំណត់ Email Server ក្នុង Key Developer Console ឬស្នើសុំ OTP ពី Developer តាម Telegram។`,
      },
    };
  }

  const challengeRecord: OtpChallengeRecord = {
    emailHash,
    maskedEmail: maskEmailAddress(email),
    jti,
    salt,
    otpDigest,
    createdAt,
    expiresAt,
    usedAt: '',
    attempts: 0,
    source: 'email',
  };

  await mutateVaultState<boolean>((working) => {
    working.otpChallenges = {
      ...(working.otpChallenges || {}),
      [emailHash]: challengeRecord,
    };
    return { changed: true, result: true };
  }, onMirrorLocal);

  const challengeToken = signChallengeToken({
    v: 1,
    jti,
    emailHash,
    salt,
    otpDigest,
    exp: expMs,
  });

  return {
    status: 200,
    body: {
      ok: true,
      delivery: 'email',
      email,
      maskedEmail: maskEmailAddress(email),
      expiresAt,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      resendCooldownSeconds: Math.floor(OTP_RESEND_COOLDOWN_MS / 1000),
      challengeToken,
      telegramUrl,
    },
  };
}

export async function runDeveloperIssueMasterOtp(
  headers: Record<string, string | string[] | undefined>,
  payload: Record<string, unknown>,
  onMirrorLocal?: (state: DeveloperVaultState) => void
): Promise<ApiResult> {
  const token = getDeveloperTokenFromHeaders(headers);
  if (!verifyDeveloperToken(token)) {
    return { status: 401, body: { error: 'Developer session expired or invalid' } };
  }

  const email = normalizeEmail(payload?.email);
  if (!isValidEmailFormat(email)) {
    return {
      status: 400,
      body: { error: 'សូមបញ្ចូល Gmail របស់ «Master Admin ថ្មី» អោយបានត្រឹមត្រូវ។' },
    };
  }

  const alsoSendEmail = Boolean(payload?.alsoSendEmail);
  const state = await readVaultState(onMirrorLocal);

  if (state.subAdminEmails[email]) {
    return {
      status: 403,
      body: {
        error:
          'Gmail នេះជា Admin រង (Admin 2, 3...) នៅក្នុង Setting មិនអាចបង្កើតគណនី Master Admin បានទេ។',
      },
    };
  }

  if (state.warehouseEmails?.[email]) {
    return {
      status: 403,
      body: {
        error:
          'Gmail នេះជាអ្នកគ្រប់គ្រងឃ្លាំងនៅក្នុង Setting មិនអាចបង្កើតគណនី Master Admin បានទេ។',
      },
    };
  }

  if (state.masterAdmins[email]) {
    return {
      status: 409,
      body: {
        error: 'Gmail នេះបានចុះឈ្មោះជា Master Admin រួចរាល់ហើយ! មិនចាំបាច់បង្កើត OTP ថ្មីទេ។',
      },
    };
  }

  const emailHash = hashEmailKey(email);
  const otpCode = generateSixDigitOtp();
  const jti = crypto.randomUUID();
  const salt = crypto.randomBytes(8).toString('hex');
  const otpDigest = computeOtpDigest(jti, email, otpCode, salt);
  const nowMs = Date.now();
  const createdAt = new Date(nowMs).toISOString();
  const expMs = nowMs + OTP_TTL_MS;
  const expiresAt = new Date(expMs).toISOString();

  const challengeRecord: OtpChallengeRecord = {
    emailHash,
    maskedEmail: maskEmailAddress(email),
    jti,
    salt,
    otpDigest,
    createdAt,
    expiresAt,
    usedAt: '',
    attempts: 0,
    source: 'developer',
  };

  await mutateVaultState<boolean>((working) => {
    working.otpChallenges = {
      ...(working.otpChallenges || {}),
      [emailHash]: challengeRecord,
    };
    return { changed: true, result: true };
  }, onMirrorLocal);

  let emailedToUser = false;
  let emailError = '';
  if (alsoSendEmail && (await isEmailDeliveryConfigured())) {
    try {
      await sendOtpEmail(email, otpCode);
      emailedToUser = true;
    } catch (err) {
      emailedToUser = false;
      emailError = err instanceof Error ? err.message.slice(0, 180) : 'Email delivery failed';
    }
  }

  return {
    status: 200,
    body: {
      ok: true,
      email,
      maskedEmail: maskEmailAddress(email),
      otpCode,
      expiresAt,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      emailedToUser,
      ...(emailError ? { emailError } : {}),
    },
  };
}

export async function runVerifyMasterOtp(
  payload: Record<string, unknown>,
  onMirrorLocal?: (state: DeveloperVaultState) => void
): Promise<ApiResult> {
  const email = normalizeEmail(payload?.email);
  const otp = normalizeOtpDigits(payload?.otp);
  const rawChallengeToken = String(payload?.challengeToken || '').trim();

  if (!isValidEmailFormat(email)) {
    return {
      status: 400,
      body: { error: 'សូមបញ្ចូលអាសយដ្ឋាន Gmail អោយបានត្រឹមត្រូវ។' },
    };
  }

  if (!/^\d{6}$/.test(otp)) {
    return {
      status: 400,
      body: { error: 'សូមបញ្ចូលលេខកូដ OTP ៦ ខ្ទង់អោយបានត្រឹមត្រូវ។' },
    };
  }

  const emailHash = hashEmailKey(email);
  const nowMs = Date.now();
  const state = await readVaultState(onMirrorLocal);

  if (state.subAdminEmails[email]) {
    return {
      status: 403,
      body: {
        error:
          'គណនី Gmail នេះត្រូវបានបង្កើតជា Admin រង (Admin 2, 3...) នៅក្នុង Settings មិនអាចបង្កើត Master Admin បានទេ!',
      },
    };
  }

  if (state.warehouseEmails?.[email]) {
    return {
      status: 403,
      body: {
        error:
          'គណនី Gmail នេះត្រូវបានបង្កើតជា «អ្នកគ្រប់គ្រងឃ្លាំង» នៅក្នុង Settings មិនអាចបង្កើត Master Admin បានទេ!',
      },
    };
  }

  const storedChallenge = state.otpChallenges?.[emailHash];
  const tokenPayload = rawChallengeToken ? verifyChallengeToken(rawChallengeToken) : null;
  const matchingToken =
    tokenPayload && tokenPayload.emailHash === emailHash ? tokenPayload : null;

  // Prefer authoritative vault challenge if present, else fallback to valid signed token
  if (storedChallenge) {
    if (storedChallenge.usedAt || usedChallengeJtis.has(storedChallenge.jti)) {
      return {
        status: 400,
        body: { error: 'លេខកូដ OTP នេះត្រូវបានប្រើប្រាស់រួចហើយ! សូមស្នើសុំលេខកូដ OTP ថ្មី។' },
      };
    }

    const expMs = new Date(storedChallenge.expiresAt).getTime();
    if (Number.isNaN(expMs) || nowMs > expMs) {
      return {
        status: 400,
        body: { error: 'លេខកូដ OTP នេះផុតកំណត់ហើយ (លើស ១០ នាទី)! សូមស្នើសុំលេខកូដថ្មី។' },
      };
    }

    if ((storedChallenge.attempts || 0) >= MAX_OTP_ATTEMPTS) {
      return {
        status: 429,
        body: {
          error: 'អ្នកបានបញ្ចូលលេខកូដ OTP ខុសច្រើនដងពេក! សូមស្នើសុំលេខកូដ OTP ថ្មី។',
        },
      };
    }

    const expectedDigest =
      storedChallenge.source === 'client_dev'
        ? crypto
            .createHash('sha256')
            .update(
              `drpos_client_otp_v1:a882249ff19ca7af4920b868d261332526482edb0454e3e02268fb16e4c532bf:${storedChallenge.jti}:${email}:${otp}:${storedChallenge.salt}`
            )
            .digest('hex')
        : computeOtpDigest(storedChallenge.jti, email, otp, storedChallenge.salt);

    if (!safeHexEqual(expectedDigest, storedChallenge.otpDigest)) {
      const nextAttempts = (storedChallenge.attempts || 0) + 1;
      await mutateVaultState<boolean>((working) => {
        const cur = working.otpChallenges?.[emailHash];
        if (!cur || cur.jti !== storedChallenge.jti) {
          return { changed: false, result: false };
        }
        working.otpChallenges = {
          ...(working.otpChallenges || {}),
          [emailHash]: { ...cur, attempts: nextAttempts },
        };
        return { changed: true, result: true };
      }, onMirrorLocal);

      const remaining = Math.max(0, MAX_OTP_ATTEMPTS - nextAttempts);
      return {
        status: 401,
        body: {
          error:
            remaining > 0
              ? `លេខកូដ OTP មិនត្រឹមត្រូវទេ! (នៅសល់ឱកាសសាកល្បង ${remaining} ដង)`
              : 'អ្នកបានបញ្ចូលលេខកូដ OTP ខុសអស់ឱកាសហើយ! សូមស្នើសុំលេខកូដ OTP ថ្មី។',
        },
      };
    }

    // Consume single-use challenge
    usedChallengeJtis.add(storedChallenge.jti);
    await mutateVaultState<boolean>((working) => {
      const cur = working.otpChallenges?.[emailHash];
      if (!cur || cur.jti !== storedChallenge.jti) {
        return { changed: false, result: false };
      }
      working.otpChallenges = {
        ...(working.otpChallenges || {}),
        [emailHash]: { ...cur, usedAt: new Date(nowMs).toISOString() },
      };
      return { changed: true, result: true };
    }, onMirrorLocal);

    const otpVerifiedToken = issueMasterOtpVerifiedToken(email, storedChallenge.jti);
    return {
      status: 200,
      body: {
        ok: true,
        verified: true,
        email,
        otpVerifiedToken,
      },
    };
  }

  if (matchingToken) {
    if (usedChallengeJtis.has(matchingToken.jti)) {
      return {
        status: 400,
        body: { error: 'លេខកូដ OTP នេះត្រូវបានប្រើប្រាស់រួចហើយ! សូមស្នើសុំលេខកូដ OTP ថ្មី។' },
      };
    }
    if (nowMs > matchingToken.exp) {
      return {
        status: 400,
        body: { error: 'លេខកូដ OTP នេះផុតកំណត់ហើយ! សូមស្នើសុំលេខកូដថ្មី។' },
      };
    }
    const expectedDigest = computeOtpDigest(matchingToken.jti, email, otp, matchingToken.salt);
    if (!safeHexEqual(expectedDigest, matchingToken.otpDigest)) {
      return {
        status: 401,
        body: { error: 'លេខកូដ OTP មិនត្រឹមត្រូវទេ! សូមពិនិត្យលេខកូដ ៦ ខ្ទង់ម្ដងទៀត។' },
      };
    }

    usedChallengeJtis.add(matchingToken.jti);
    const otpVerifiedToken = issueMasterOtpVerifiedToken(email, matchingToken.jti);
    return {
      status: 200,
      body: {
        ok: true,
        verified: true,
        email,
        otpVerifiedToken,
      },
    };
  }

  return {
    status: 404,
    body: {
      error:
        'មិនទាន់មានលេខកូដ OTP សម្រាប់ Gmail នេះទេ ឬ OTP ផុតកំណត់ហើយ! សូមចុច "ផ្ញើ OTP" ឬទទួលយកលេខកូដ OTP ពី Developer។',
    },
  };
}
