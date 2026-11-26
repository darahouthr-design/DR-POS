import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: false });
dotenv.config({ override: false });
import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import type {
  WorkspaceData,
  WorkspaceLicense,
  ProblemCustomer,
  Product,
  Order,
  OrderItem,
  StaffMember,
  PriceRecordItem,
  StockLogEntry,
  WorkspaceSettings,
} from './src/types';
import type {
  DeveloperVaultState,
  OtpChallengeRecord,
} from './lib/developerRegistry';

const FALLBACK_TELEGRAM_URL = 'https://t.me/Hout_Dara_HR';

// Pre-allocated incompressible random payload (512 KB) for accurate internet speed testing
const SPEED_PROBE_MAX_BYTES = 512 * 1024;
const SPEED_PROBE_MIN_BYTES = 32 * 1024;
const SPEED_PROBE_DEFAULT_BYTES = 256 * 1024;
const SPEED_PROBE_BUFFER = crypto.randomBytes(SPEED_PROBE_MAX_BYTES);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface AccountRecord {
  email: string;
  passwordHash: string;
  displayName: string;
  createdAt: string;
}

interface SessionRecord {
  token: string;
  email: string;
  displayName: string;
  operatorEmail: string;
  createdAt: string;
}

interface MasterAdminLicenseRecord {
  email: string;
  uid?: string;
  displayName: string;
  trialStartedAt: string;
  expireAt: string;
  planType: 'trial' | 'paid';
  developerUpdatedAt: string;
}

interface SubAdminRegistryRecord {
  email: string;
  masterEmail: string;
  name: string;
  createdAt: string;
}

interface DevSessionRecord {
  token: string;
  createdAt: string;
  expiresAt: number;
}

interface DeveloperLicenseState {
  telegramUrl: string;
  masterAdmins: Record<string, MasterAdminLicenseRecord>;
  subAdminEmails: Record<string, SubAdminRegistryRecord>;
  otpChallenges?: Record<string, OtpChallengeRecord>;
  devSessions: Record<string, DevSessionRecord>;
}

interface DatabaseSchema {
  accounts: Record<string, AccountRecord>;
  sessions: Record<string, SessionRecord>;
  workspaces: Record<string, WorkspaceData>;
  problemCustomers: ProblemCustomer[];
  developer?: DeveloperLicenseState;
}

function normalizeEmail(raw: string): string {
  return String(raw || '').trim().toLowerCase();
}

function normalizePhone(raw: string): string {
  const digits = String(raw || '').replace(/\D+/g, '');
  if (digits.startsWith('855') && digits.length > 8) {
    return '0' + digits.slice(3);
  }
  if (digits.startsWith('82') && digits.length > 9) {
    return '0' + digits.slice(2);
  }
  return digits;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`drpos_salt_v1:${password}`).digest('hex');
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

function createSeedWorkspace(email: string, displayName: string): WorkspaceData {
  const products: Product[] = [];
  const staff: StaffMember[] = [];
  const orders: Order[] = [];
  const priceRecords: PriceRecordItem[] = [];
  const stockLogs: StockLogEntry[] = [];

  const settings: WorkspaceSettings = {
    personalName: displayName || email.split('@')[0],
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
  };

  return {
    email,
    products,
    orders,
    staff,
    priceRecords,
    stockLogs,
    settings,
  };
}

function createDefaultDeveloperState(): DeveloperLicenseState {
  return {
    telegramUrl: FALLBACK_TELEGRAM_URL,
    masterAdmins: {},
    subAdminEmails: {},
    otpChallenges: {},
    devSessions: {},
  };
}

function addDaysIso(baseDate: Date, days: number): string {
  const next = new Date(baseDate.getTime());
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function addMonthsOrYearsIso(
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

function normalizeTelegramUrl(raw: string): string {
  const v = String(raw || '').trim();
  if (!v) return FALLBACK_TELEGRAM_URL;
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  if (v.startsWith('@')) return `https://t.me/${v.slice(1)}`;
  if (v.startsWith('t.me/')) return `https://${v}`;
  return `https://t.me/${v.replace(/^\/+/, '')}`;
}

function createInitialDb(): DatabaseSchema {
  return {
    accounts: {},
    sessions: {},
    workspaces: {},
    problemCustomers: [],
    developer: createDefaultDeveloperState(),
  };
}

function loadDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial = createInitialDb();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    const devRaw = parsed.developer || createDefaultDeveloperState();
    const LEGACY_SAMPLE_PROBLEM_IDS = new Set(['prob-1', 'prob-2']);
    const rawProblems = Array.isArray(parsed.problemCustomers) ? parsed.problemCustomers : [];
    const cleanedProblems = rawProblems.filter((pc) => !LEGACY_SAMPLE_PROBLEM_IDS.has(pc.id));

    const LEGACY_PRD = new Set(['prd-1', 'prd-2', 'prd-3', 'prd-4']);
    const LEGACY_STF = new Set(['stf-1', 'stf-2', 'stf-3']);
    const LEGACY_ORD = new Set([
      'ord-1004',
      'ord-1003',
      'ord-1002',
      'ord-1001',
      'ord-1000',
      'ord-0999',
      'ord-0998',
      'ord-0997',
    ]);
    const LEGACY_PRC = new Set(['prc-1', 'prc-2']);
    const LEGACY_STK = new Set(['stk-1', 'stk-2']);
    const LEGACY_WH = new Set(['ឃ្លាំងភ្នំពេញ (Main)', 'ឃ្លាំងសៀមរាប (Branch)', 'ឃ្លាំងបាត់ដំបង']);
    const LEGACY_ST = new Set(['DR-POS សាខាទួលគោក', 'DR-POS សាខាបឹងកេងកង', 'DR-POS សាខាសៀមរាប']);
    const LEGACY_GR = new Set([
      'ក្រុមលក់ទី១ (VIP Online)',
      'ក្រុមលក់បោះដុំ (Wholesale)',
      'ក្រុមលក់រាយ (Retail Counter)',
    ]);
    const LEGACY_CAT = new Set([
      'ឧបករណ៍អេឡិចត្រូនិក',
      'ឧបករណ៍សំឡេង',
      'សម្ភារៈប្រើប្រាស់',
      'កុំព្យូទ័រ និងគ្រឿងបន្លាស់',
    ]);

    const cleanedWorkspaces: Record<string, WorkspaceData> = {};
    for (const [k, ws] of Object.entries(parsed.workspaces || {})) {
      cleanedWorkspaces[k] = {
        ...ws,
        products: (ws.products || []).filter((p) => !LEGACY_PRD.has(p.id)),
        staff: (ws.staff || []).filter((s) => !LEGACY_STF.has(s.id)),
        orders: (ws.orders || []).filter((o) => !LEGACY_ORD.has(o.id)),
        priceRecords: (ws.priceRecords || []).filter((pr) => !LEGACY_PRC.has(pr.id)),
        stockLogs: (ws.stockLogs || []).filter((sl) => !LEGACY_STK.has(sl.id)),
        settings: {
          ...ws.settings,
          personalPhone: ws.settings?.personalPhone === '012 990 881' ? '' : ws.settings?.personalPhone || '',
          warehouses: (ws.settings?.warehouses || []).filter((w) => !LEGACY_WH.has(w)),
          stores: (ws.settings?.stores || []).filter((s) => !LEGACY_ST.has(s)),
          groups: (ws.settings?.groups || []).filter((g) => !LEGACY_GR.has(g)),
          categories: (ws.settings?.categories || []).filter((c) => !LEGACY_CAT.has(c)),
        },
      };
    }

    const result: DatabaseSchema = {
      accounts: parsed.accounts || {},
      sessions: parsed.sessions || {},
      workspaces: cleanedWorkspaces,
      problemCustomers: cleanedProblems,
      developer: {
        telegramUrl: devRaw.telegramUrl || FALLBACK_TELEGRAM_URL,
        masterAdmins: devRaw.masterAdmins || {},
        subAdminEmails: devRaw.subAdminEmails || {},
        otpChallenges: devRaw.otpChallenges || {},
        devSessions: devRaw.devSessions || {},
      },
    };
    if (cleanedProblems.length !== rawProblems.length) {
      fs.writeFileSync(DB_FILE, JSON.stringify(result, null, 2), 'utf8');
    }
    return result;
  } catch {
    return createInitialDb();
  }
}

let db: DatabaseSchema = loadDb();

function ensureDeveloperState(): DeveloperLicenseState {
  if (!db.developer) {
    db.developer = createDefaultDeveloperState();
  }
  return db.developer;
}

function mirrorVaultToLocalDb(state: DeveloperVaultState): void {
  const devState = ensureDeveloperState();
  devState.telegramUrl = state.telegramUrl || FALLBACK_TELEGRAM_URL;
  devState.masterAdmins = { ...state.masterAdmins };
  devState.subAdminEmails = { ...state.subAdminEmails };
  devState.otpChallenges = { ...(state.otpChallenges || {}) };
  saveDb();
}

function saveDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist db.json:', err);
  }
}

function getSessionFromReq(req: express.Request): SessionRecord | null {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return null;
  const session = db.sessions[token];
  if (!session) return null;
  if (!db.accounts[session.email]) return null;
  return session;
}

interface ClientSocketMeta {
  ws: WebSocket;
  email: string | null;
}

const clients = new Set<ClientSocketMeta>();

function broadcastWorkspace(email: string, eventType: string, payload: unknown) {
  const target = normalizeEmail(email);
  const message = JSON.stringify({
    type: eventType,
    email: target,
    workspace: db.workspaces[target],
    payload,
    timestamp: new Date().toISOString(),
  });
  for (const client of clients) {
    if (client.email === target && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

function broadcastProblemCustomers(eventType: string, payload?: unknown) {
  const message = JSON.stringify({
    type: eventType,
    problemCustomers: db.problemCustomers,
    payload,
    timestamp: new Date().toISOString(),
  });
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

async function startServer() {
  // Enable TypeScript / .js-mapped ESM resolution when launched directly via `node server.ts`
  try {
    const { register } = await import('tsx/esm/api');
    register();
  } catch {
    // Already running under tsx CLI
  }

  const [
    {
      DEFAULT_TELEGRAM_URL,
      runAuthGateCheck,
      runDeveloperOverview,
      runRegisterMaster,
      runSyncWorkspace,
      runUnregisterWorkspaceAccount,
      runUpdateDeveloperTelegram,
      runUpdateMasterAdminExpire,
      runVerifyDeveloper,
      seedMemoryVaultFallback,
    },
    {
      runDeveloperIssueMasterOtp,
      runGetDeveloperEmailConfig,
      runRequestMasterOtp,
      runSaveDeveloperEmailConfig,
      runVerifyMasterOtp,
    },
    {
      runMongoAnalytics,
      runMongoChanges,
      runMongoQueryOrders,
      runMongoQueryStockLogs,
      runMongoStatus,
      runMongoSync,
    },
    {
      runDeveloperUpdateMasterPassword,
      runPendingMasterPasswordSync,
      runResolveDeveloperPasswordLogin,
      runSyncMasterPassword,
    },
  ] = await Promise.all([
    import('./lib/developerRegistry'),
    import('./lib/masterOtp'),
    import('./lib/mongoPartition'),
    import('./lib/masterCredentials'),
  ]);

  seedMemoryVaultFallback({
    telegramUrl: db.developer?.telegramUrl || DEFAULT_TELEGRAM_URL,
    masterAdmins: db.developer?.masterAdmins || {},
    subAdminEmails: db.developer?.subAdminEmails || {},
    otpChallenges: db.developer?.otpChallenges || {},
    updatedAt: '',
  });

  const app = express();
  const server = http.createServer(app);
  app.use(express.json({ limit: '15mb' }));

  // --- DEVELOPER KEY, LICENSE EXPIRATION & MASTER/SUB-ADMIN REGISTRY ---

  // Check whether an email is a Settings Sub-Admin (blocked from external AuthGate) or already a Master Admin
  app.post('/api/auth/gate-check', async (req, res) => {
    const result = await runAuthGateCheck(req.body || {}, mirrorVaultToLocalDb);
    res.status(result.status).json(result.body);
  });

  // Request OTP for creating a new Master Admin account
  app.post('/api/auth/request-master-otp', async (req, res) => {
    const result = await runRequestMasterOtp(req.body || {}, mirrorVaultToLocalDb);
    res.status(result.status).json(result.body);
  });

  // Verify 6-digit OTP for creating a new Master Admin account
  app.post('/api/auth/verify-master-otp', async (req, res) => {
    const result = await runVerifyMasterOtp(req.body || {}, mirrorVaultToLocalDb);
    res.status(result.status).json(result.body);
  });

  // Authenticated Developer: Issue 6-digit OTP for a new Master Admin Gmail
  app.post('/api/developer/master-otp', async (req, res) => {
    const result = await runDeveloperIssueMasterOtp(
      req.headers as Record<string, string | string[] | undefined>,
      req.body || {},
      mirrorVaultToLocalDb
    );
    res.status(result.status).json(result.body);
  });

  // Authenticated Developer: Read/Configure Email OTP Delivery (Gmail App Password / SMTP / Resend)
  app.get('/api/developer/email-config', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const result = await runGetDeveloperEmailConfig(
      req.headers as Record<string, string | string[] | undefined>
    );
    res.status(result.status).json(result.body);
  });

  app.post('/api/developer/email-config', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const result = await runSaveDeveloperEmailConfig(
      req.headers as Record<string, string | string[] | undefined>,
      req.body || {}
    );
    res.status(result.status).json(result.body);
  });

  // Register Master Admin immediately upon creation (1-month Free Trial default)
  app.post('/api/developer/register-master', async (req, res) => {
    const result = await runRegisterMaster(req.body || {}, mirrorVaultToLocalDb);
    res.status(result.status).json(result.body);
  });

  // Unregister Master Admin + all Sub-Admin Gmails from developerVault on Delete Account
  app.post('/api/developer/delete-account', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const result = await runUnregisterWorkspaceAccount(
      req.headers as Record<string, string | string[] | undefined>,
      req.body || {},
      mirrorVaultToLocalDb
    );
    res.status(result.status).json(result.body);
  });

  // Synchronize Master Admin workspace license & Settings Sub-Admins with server registry
  app.post('/api/developer/sync-workspace', async (req, res) => {
    const result = await runSyncWorkspace(req.body || {}, mirrorVaultToLocalDb);
    res.status(result.status).json(result.body);
  });

  // Verify Key Developer
  app.post('/api/developer/verify', async (req, res) => {
    const result = await runVerifyDeveloper(req.body || {}, mirrorVaultToLocalDb);
    res.status(result.status).json(result.body);
  });

  // Get Developer Console overview
  app.get('/api/developer/overview', async (req, res) => {
    const result = await runDeveloperOverview(req.headers, mirrorVaultToLocalDb);
    res.status(result.status).json(result.body);
  });

  // Set / Extend Master Admin Expiration Date (by Months, Years, Exact Date, or Expire Now)
  app.post('/api/developer/master-admins/expire', async (req, res) => {
    const result = await runUpdateMasterAdminExpire(req.headers, req.body || {}, mirrorVaultToLocalDb);
    res.status(result.status).json(result.body);
  });

  // Update Developer Telegram Link
  app.post('/api/developer/telegram', async (req, res) => {
    const result = await runUpdateDeveloperTelegram(req.headers, req.body || {}, mirrorVaultToLocalDb);
    res.status(result.status).json(result.body);
  });

  // --- ACCURATE LIVE INTERNET SPEED PROBE ---
  app.head('/api/speed-probe', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.status(200).end();
  });

  app.get('/api/speed-probe', (req, res) => {
    const requested = Number(req.query?.bytes);
    const byteCount = Number.isFinite(requested)
      ? Math.max(SPEED_PROBE_MIN_BYTES, Math.min(SPEED_PROBE_MAX_BYTES, Math.floor(requested)))
      : SPEED_PROBE_DEFAULT_BYTES;
    const chunk = SPEED_PROBE_BUFFER.subarray(0, byteCount);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', String(chunk.byteLength));
    res.setHeader('Content-Encoding', 'identity');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Probe-Bytes', String(chunk.byteLength));
    res.status(200).send(chunk);
  });

  // --- MASTER ADMIN PASSWORD VAULT & DEVELOPER PASSWORD MANAGEMENT ---
  app.post('/api/auth/sync-master-password', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const result = await runSyncMasterPassword(
      req.headers as Record<string, string | string[] | undefined>,
      req.body || {}
    );
    res.status(result.status).json(result.body);
  });

  app.post('/api/auth/resolve-dev-password', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const result = await runResolveDeveloperPasswordLogin(req.body || {});
    res.status(result.status).json(result.body);
  });

  app.get('/api/auth/pending-password-sync', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const result = await runPendingMasterPasswordSync(
      req.headers as Record<string, string | string[] | undefined>
    );
    res.status(result.status).json(result.body);
  });

  app.post('/api/developer/master-admins/password', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const result = await runDeveloperUpdateMasterPassword(
      req.headers as Record<string, string | string[] | undefined>,
      req.body || {}
    );
    res.status(result.status).json(result.body);
  });

  // --- HYBRID FIREBASE + MONGODB PARTITION ROUTES ---
  app.all('/api/mongodb', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    try {
      const qAction = String(req.query?.action || '').trim().toLowerCase();
      const bAction = String((req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>).action : '') || '')
        .trim()
        .toLowerCase();
      const action = qAction || bAction || (req.method === 'GET' ? 'status' : '');
      const headers = req.headers as Record<string, string | string[] | undefined>;
      const payload = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;

      if (action === 'status') {
        const result = await runMongoStatus();
        res.status(result.status).json(result.body);
        return;
      }
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'POST required for this action' });
        return;
      }
      if (action === 'sync') {
        const result = await runMongoSync(headers, payload);
        res.status(result.status).json(result.body);
        return;
      }
      if (action === 'changes') {
        const result = await runMongoChanges(headers, payload);
        res.status(result.status).json(result.body);
        return;
      }
      if (action === 'orders') {
        const result = await runMongoQueryOrders(headers, payload);
        res.status(result.status).json(result.body);
        return;
      }
      if (action === 'stock-logs') {
        const result = await runMongoQueryStockLogs(headers, payload);
        res.status(result.status).json(result.body);
        return;
      }
      if (action === 'analytics') {
        const result = await runMongoAnalytics(headers, payload);
        res.status(result.status).json(result.body);
        return;
      }
      res.status(400).json({ error: 'Unknown MongoDB partition action' });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'MongoDB partition handler failed',
      });
    }
  });

  // --- AUTHENTICATION ROUTES ---

  // Check whether an email exists (used by Continue Password / Gmail check)
  app.post('/api/auth/check-email', (req, res) => {
    const email = normalizeEmail(req.body?.email);
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'សូមបញ្ចូលអ៊ីមែល Gmail អោយបានត្រឹមត្រូវ។' });
      return;
    }
    const acc = db.accounts[email];
    res.json({
      exists: Boolean(acc),
      displayName: acc?.displayName || '',
    });
  });

  // Create Account (strictly 1 Gmail = 1 Account, never twice)
  app.post('/api/auth/register', (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const confirmPassword = String(req.body?.confirmPassword || '');
    const displayName = String(req.body?.displayName || '').trim() || email.split('@')[0];
    const operatorEmail = normalizeEmail(req.body?.operatorEmail) || email;

    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'សូមបញ្ចូលអាសយដ្ឋាន Gmail អោយបានត្រឹមត្រូវ។' });
      return;
    }
    if (db.accounts[email]) {
      res.status(409).json({
        error: 'Gmail នេះបានបង្កើតគណនីរួចហើយ! Gmail 1 មិនអាច Create Account បានពីរដងជាដាច់ខាត។ សូមប្រើ Sign in វិញ។',
      });
      return;
    }
    if (password.length < 4) {
      res.status(400).json({ error: 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច 4 តួអក្សរ។' });
      return;
    }
    if (confirmPassword && password !== confirmPassword) {
      res.status(400).json({ error: 'ពាក្យសម្ងាត់ និង Continue Password មិនដូចគ្នាទេ។' });
      return;
    }

    const now = new Date().toISOString();
    db.accounts[email] = {
      email,
      passwordHash: hashPassword(password),
      displayName,
      createdAt: now,
    };
    db.workspaces[email] = createSeedWorkspace(email, displayName);

    const token = crypto.randomUUID();
    const session: SessionRecord = {
      token,
      email,
      displayName,
      operatorEmail,
      createdAt: now,
    };
    db.sessions[token] = session;
    saveDb();

    res.json({
      session,
      workspace: db.workspaces[email],
      problemCustomers: db.problemCustomers,
    });
  });

  // Sign in with Gmail & Password (or Continue Password)
  app.post('/api/auth/login', (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const operatorEmail = normalizeEmail(req.body?.operatorEmail) || email;

    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'សូមបញ្ចូល Gmail អោយបានត្រឹមត្រូវ។' });
      return;
    }
    const account = db.accounts[email];
    if (!account) {
      res.status(404).json({
        error: 'រកមិនឃើញគណនី Gmail នេះទេ។ សូមចុច Create Account ដើម្បីបង្កើតគណនីថ្មី។',
      });
      return;
    }
    if (account.passwordHash !== hashPassword(password)) {
      res.status(401).json({ error: 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ។ សូមព្យាយាមម្ដងទៀត។' });
      return;
    }

    if (!db.workspaces[email]) {
      db.workspaces[email] = createSeedWorkspace(email, account.displayName);
    }

    const token = crypto.randomUUID();
    const session: SessionRecord = {
      token,
      email,
      displayName: account.displayName,
      operatorEmail,
      createdAt: new Date().toISOString(),
    };
    db.sessions[token] = session;
    saveDb();

    res.json({
      session,
      workspace: db.workspaces[email],
      problemCustomers: db.problemCustomers,
    });
  });

  // Validate saved session on revisit so user never needs to login again
  app.get('/api/auth/session', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'Session expired or invalid' });
      return;
    }
    if (!db.workspaces[session.email]) {
      db.workspaces[session.email] = createSeedWorkspace(session.email, session.displayName);
      saveDb();
    }
    res.json({
      session,
      workspace: db.workspaces[session.email],
      problemCustomers: db.problemCustomers,
    });
  });

  // Update active operator email on current session (for multi-staff access control testing/use)
  app.post('/api/auth/operator', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const operatorEmail = normalizeEmail(req.body?.operatorEmail) || session.email;
    session.operatorEmail = operatorEmail;
    db.sessions[session.token] = session;
    saveDb();
    res.json({ session });
  });

  // Sign out
  app.post('/api/auth/logout', (req, res) => {
    const session = getSessionFromReq(req);
    if (session) {
      delete db.sessions[session.token];
      saveDb();
    }
    res.json({ ok: true });
  });

  // Delete Account permanently
  app.delete('/api/auth/account', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const email = session.email;
    delete db.accounts[email];
    delete db.workspaces[email];
    for (const [tok, sess] of Object.entries(db.sessions)) {
      if (sess.email === email) {
        delete db.sessions[tok];
      }
    }
    saveDb();
    broadcastWorkspace(email, 'account:deleted', { email });
    res.json({ ok: true });
  });

  // --- WORKSPACE DATA ROUTES (SCOPED BY GMAIL) ---

  // Add or Update Product (+ automatic Stock Log when stock increases)
  app.post('/api/products', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const ws = db.workspaces[session.email];
    const body = req.body as Partial<Product>;
    const now = new Date();
    const cleanStock = Math.max(0, Math.floor(Number(body.stock) || 0));
    const cleanCost = Math.max(0, Number(body.costPrice) || 0);
    const cleanSell = Math.max(0, Number(body.sellingPrice) || 0);
    const cleanPromo = Math.max(0, Number(body.promotion) || 0);

    if (!body.name || !String(body.name).trim()) {
      res.status(400).json({ error: 'សូមបញ្ចូលឈ្មោះទំនិញ។' });
      return;
    }

    const existingIdx = body.id ? ws.products.findIndex((p) => p.id === body.id) : -1;
    if (existingIdx >= 0) {
      const prev = ws.products[existingIdx];
      const delta = cleanStock - prev.stock;
      const updated: Product = {
        ...prev,
        name: String(body.name).trim(),
        imageUrl: body.imageUrl !== undefined ? String(body.imageUrl) : prev.imageUrl,
        costPrice: cleanCost,
        sellingPrice: cleanSell,
        promotion: cleanPromo,
        stock: cleanStock,
        barcode: String(body.barcode ?? prev.barcode).trim(),
        category: String(body.category ?? prev.category).trim(),
        warehouse: String(body.warehouse ?? prev.warehouse).trim(),
        updatedAt: now.toISOString(),
      };
      ws.products[existingIdx] = updated;

      if (delta > 0) {
        const log: StockLogEntry = {
          id: `stk-${crypto.randomUUID().slice(0, 8)}`,
          productId: updated.id,
          productName: updated.name,
          addedQuantity: delta,
          previousStock: prev.stock,
          newStock: cleanStock,
          warehouse: updated.warehouse,
          date: `${formatDateLocal(now)} ${formatTimeLocal(now)}`,
          createdAt: now.toISOString(),
        };
        ws.stockLogs.unshift(log);
      }
      saveDb();
      broadcastWorkspace(session.email, 'product:updated', updated);
      res.json({ workspace: ws, product: updated });
      return;
    }

    const maxSort = ws.products.reduce((m, p) => Math.max(m, p.sortOrder), -1);
    const created: Product = {
      id: `prd-${crypto.randomUUID().slice(0, 8)}`,
      name: String(body.name).trim(),
      imageUrl: String(body.imageUrl || ''),
      costPrice: cleanCost,
      sellingPrice: cleanSell,
      promotion: cleanPromo,
      stock: cleanStock,
      barcode: String(body.barcode || '').trim(),
      category: String(body.category || ws.settings.categories[0] || 'ទូទៅ').trim(),
      warehouse: String(body.warehouse || ws.settings.warehouses[0] || '').trim(),
      sortOrder: maxSort + 1,
      updatedAt: now.toISOString(),
    };
    ws.products.push(created);

    if (cleanStock > 0) {
      ws.stockLogs.unshift({
        id: `stk-${crypto.randomUUID().slice(0, 8)}`,
        productId: created.id,
        productName: created.name,
        addedQuantity: cleanStock,
        previousStock: 0,
        newStock: cleanStock,
        warehouse: created.warehouse,
        date: `${formatDateLocal(now)} ${formatTimeLocal(now)}`,
        createdAt: now.toISOString(),
      });
    }

    saveDb();
    broadcastWorkspace(session.email, 'product:created', created);
    res.json({ workspace: ws, product: created });
  });

  // Delete Product
  app.delete('/api/products/:id', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const ws = db.workspaces[session.email];
    ws.products = ws.products.filter((p) => p.id !== req.params.id);
    ws.products.sort((a, b) => a.sortOrder - b.sortOrder).forEach((p, idx) => {
      p.sortOrder = idx;
    });
    saveDb();
    broadcastWorkspace(session.email, 'product:deleted', { id: req.params.id });
    res.json({ workspace: ws });
  });

  // Reorder Products (synced immediately to POS & all devices on same Gmail)
  app.put('/api/products/reorder', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const orderedIds: string[] = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : [];
    const ws = db.workspaces[session.email];
    const map = new Map(ws.products.map((p) => [p.id, p]));
    const nextProducts: Product[] = [];
    orderedIds.forEach((id, idx) => {
      const found = map.get(id);
      if (found) {
        found.sortOrder = idx;
        nextProducts.push(found);
        map.delete(id);
      }
    });
    let offset = nextProducts.length;
    for (const leftover of map.values()) {
      leftover.sortOrder = offset++;
      nextProducts.push(leftover);
    }
    ws.products = nextProducts;
    saveDb();
    broadcastWorkspace(session.email, 'product:reordered', { orderedIds });
    res.json({ workspace: ws });
  });

  // Add Stock Directly (+ Stock Log)
  app.post('/api/stock-logs', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const ws = db.workspaces[session.email];
    const productId = String(req.body?.productId || '');
    const addQty = Math.floor(Number(req.body?.addedQuantity) || 0);
    const product = ws.products.find((p) => p.id === productId);
    if (!product || addQty <= 0) {
      res.status(400).json({ error: 'សូមជ្រើសរើសទំនិញ និងចំនួនស្តុកបន្ថែមអោយបានត្រឹមត្រូវ។' });
      return;
    }
    const now = new Date();
    const prevStock = product.stock;
    product.stock += addQty;
    product.updatedAt = now.toISOString();

    const entry: StockLogEntry = {
      id: `stk-${crypto.randomUUID().slice(0, 8)}`,
      productId: product.id,
      productName: product.name,
      addedQuantity: addQty,
      previousStock: prevStock,
      newStock: product.stock,
      warehouse: product.warehouse,
      date: `${formatDateLocal(now)} ${formatTimeLocal(now)}`,
      createdAt: now.toISOString(),
    };
    ws.stockLogs.unshift(entry);
    saveDb();
    broadcastWorkspace(session.email, 'stock:added', entry);
    res.json({ workspace: ws, entry });
  });

  // Create Order (deducts stock accurately & triggers realtime + audio alert across devices)
  app.post('/api/orders', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const ws = db.workspaces[session.email];
    const rawItems: Array<{ productId: string; quantity: number }> = Array.isArray(req.body?.items)
      ? req.body.items
      : [];

    if (rawItems.length === 0) {
      res.status(400).json({ error: 'កន្ត្រកទំនិញទទេ! សូមជ្រើសរើសទំនិញជាមុនសិន។' });
      return;
    }

    // Verify stock availability first
    for (const item of rawItems) {
      const prod = ws.products.find((p) => p.id === item.productId);
      const qty = Math.floor(Number(item.quantity) || 0);
      if (!prod || qty <= 0) {
        res.status(400).json({ error: 'ទិន្នន័យទំនិញមិនត្រឹមត្រូវ។' });
        return;
      }
      if (prod.stock < qty) {
        res.status(400).json({
          error: `ស្តុកទំនិញ "${prod.name}" មិនគ្រប់គ្រាន់ទេ (នៅសល់ ${prod.stock})។`,
        });
        return;
      }
    }

    const now = new Date();
    const builtItems: OrderItem[] = [];
    let totalAmount = 0;
    let totalCost = 0;

    for (const item of rawItems) {
      const prod = ws.products.find((p) => p.id === item.productId)!;
      const qty = Math.floor(Number(item.quantity));
      prod.stock -= qty;
      prod.updatedAt = now.toISOString();

      const effectiveUnitPrice = Math.max(0, prod.sellingPrice - (prod.promotion || 0));
      totalAmount += effectiveUnitPrice * qty;
      totalCost += prod.costPrice * qty;

      builtItems.push({
        productId: prod.id,
        productName: prod.name,
        quantity: qty,
        unitPrice: effectiveUnitPrice,
        costPrice: prod.costPrice,
        warehouse: prod.warehouse,
      });
    }

    const nextSeq = 1001 + ws.orders.length;
    const paymentStatus = req.body?.paymentStatus === 'unpaid' ? 'unpaid' : 'paid';
    const order: Order = {
      id: `ord-${crypto.randomUUID().slice(0, 8)}`,
      orderNumber: `DR-${nextSeq}`,
      date: String(req.body?.date || formatDateLocal(now)),
      time: String(req.body?.time || formatTimeLocal(now)),
      createdAt: now.toISOString(),
      customerName: String(req.body?.customerName || 'អតិថិជនទូទៅ').trim(),
      customerPhone: String(req.body?.customerPhone || '').trim(),
      customerAddress: String(req.body?.customerAddress || '').trim(),
      storeName: String(req.body?.storeName || ws.settings.stores[0] || '').trim(),
      groupName: String(req.body?.groupName || ws.settings.groups[0] || '').trim(),
      staffName: String(req.body?.staffName || ws.staff[0]?.name || session.displayName).trim(),
      warehouse: builtItems[0]?.warehouse || ws.settings.warehouses[0] || '',
      paymentStatus,
      dueDate: String(req.body?.dueDate || '').trim(),
      note: String(req.body?.note || '').trim(),
      items: builtItems,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      createdByEmail: session.email,
      operatorEmail: session.operatorEmail || session.email,
    };

    ws.orders.unshift(order);
    saveDb();
    broadcastWorkspace(session.email, 'order:created', order);
    res.json({ workspace: ws, order });
  });

  // Update Order (reconciles stock deltas accurately when items change, updates due dates & status)
  app.put('/api/orders/:id', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const ws = db.workspaces[session.email];
    const idx = ws.orders.findIndex((o) => o.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ error: 'រកមិនឃើញការបញ្ជាទិញនេះទេ។' });
      return;
    }

    const existing = ws.orders[idx];
    const incomingItems: OrderItem[] | undefined = Array.isArray(req.body?.items)
      ? req.body.items
      : undefined;

    let finalItems = existing.items;
    let totalAmount = existing.totalAmount;
    let totalCost = existing.totalCost;

    if (incomingItems) {
      if (incomingItems.length === 0) {
        res.status(400).json({ error: 'ការបញ្ជាទិញត្រូវមានទំនិញយ៉ាងតិច 1 មុខ។' });
        return;
      }

      // Compute temporary stock after restoring existing order quantities
      const tempStock = new Map<string, number>();
      for (const p of ws.products) {
        tempStock.set(p.id, p.stock);
      }
      for (const oldItem of existing.items) {
        tempStock.set(oldItem.productId, (tempStock.get(oldItem.productId) || 0) + oldItem.quantity);
      }

      // Validate new quantities
      for (const newItem of incomingItems) {
        const qty = Math.floor(Number(newItem.quantity) || 0);
        if (qty <= 0) {
          res.status(400).json({ error: 'ចំនួនទំនិញត្រូវធំជាង 0។' });
          return;
        }
        const avail = tempStock.get(newItem.productId);
        if (avail !== undefined && avail < qty) {
          const pName = ws.products.find((p) => p.id === newItem.productId)?.name || newItem.productName;
          res.status(400).json({ error: `ស្តុក "${pName}" មិនគ្រប់គ្រាន់ទេ (អាចប្រើបាន ${avail})។` });
          return;
        }
        if (avail !== undefined) {
          tempStock.set(newItem.productId, avail - qty);
        }
      }

      // Apply reconciled stock to products
      for (const p of ws.products) {
        const updatedStock = tempStock.get(p.id);
        if (updatedStock !== undefined) {
          p.stock = updatedStock;
        }
      }

      finalItems = incomingItems.map((it) => {
        const prod = ws.products.find((p) => p.id === it.productId);
        const qty = Math.floor(Number(it.quantity) || 1);
        const unitPrice = Number(it.unitPrice ?? (prod ? Math.max(0, prod.sellingPrice - prod.promotion) : 0));
        const costPrice = Number(it.costPrice ?? (prod ? prod.costPrice : 0));
        return {
          productId: it.productId,
          productName: prod?.name || it.productName,
          quantity: qty,
          unitPrice,
          costPrice,
          warehouse: prod?.warehouse || it.warehouse || existing.warehouse,
        };
      });

      totalAmount = Math.round(finalItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) * 100) / 100;
      totalCost = Math.round(finalItems.reduce((sum, i) => sum + i.costPrice * i.quantity, 0) * 100) / 100;
    }

    const nextPaymentStatus: 'paid' | 'unpaid' =
      req.body?.paymentStatus === 'paid' || req.body?.paymentStatus === 'unpaid'
        ? req.body.paymentStatus
        : existing.paymentStatus;

    const updatedOrder: Order = {
      ...existing,
      date: req.body?.date !== undefined ? String(req.body.date) : existing.date,
      time: req.body?.time !== undefined ? String(req.body.time) : existing.time,
      customerName:
        req.body?.customerName !== undefined ? String(req.body.customerName).trim() : existing.customerName,
      customerPhone:
        req.body?.customerPhone !== undefined ? String(req.body.customerPhone).trim() : existing.customerPhone,
      customerAddress:
        req.body?.customerAddress !== undefined
          ? String(req.body.customerAddress).trim()
          : existing.customerAddress,
      storeName: req.body?.storeName !== undefined ? String(req.body.storeName) : existing.storeName,
      groupName: req.body?.groupName !== undefined ? String(req.body.groupName) : existing.groupName,
      staffName: req.body?.staffName !== undefined ? String(req.body.staffName) : existing.staffName,
      paymentStatus: nextPaymentStatus,
      dueDate: req.body?.dueDate !== undefined ? String(req.body.dueDate) : existing.dueDate,
      note: req.body?.note !== undefined ? String(req.body.note) : existing.note,
      items: finalItems,
      totalAmount,
      totalCost,
    };

    ws.orders[idx] = updatedOrder;
    saveDb();
    broadcastWorkspace(session.email, 'order:updated', updatedOrder);
    res.json({ workspace: ws, order: updatedOrder });
  });

  // Delete Order (restores stock accurately back to products!)
  app.delete('/api/orders/:id', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const ws = db.workspaces[session.email];
    const target = ws.orders.find((o) => o.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'រកមិនឃើញការបញ្ជាទិញនេះទេ។' });
      return;
    }

    // Restore product stock
    const now = new Date().toISOString();
    for (const item of target.items) {
      const prod = ws.products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stock += item.quantity;
        prod.updatedAt = now;
      }
    }

    ws.orders = ws.orders.filter((o) => o.id !== req.params.id);
    saveDb();
    broadcastWorkspace(session.email, 'order:deleted', { id: req.params.id });
    res.json({ workspace: ws });
  });

  // --- GLOBAL PROBLEM CUSTOMERS (SHARED ACROSS ALL DEVICES & ALL GMAIL ACCOUNTS) ---

  app.get('/api/problem-customers', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    res.json({ problemCustomers: db.problemCustomers });
  });

  app.post('/api/problem-customers', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const name = String(req.body?.name || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const note = String(req.body?.note || '').trim();
    const normalized = normalizePhone(phone);

    if (!name || !normalized) {
      res.status(400).json({ error: 'សូមបញ្ចូលឈ្មោះ និងលេខទូរស័ព្ទអតិថិជនមានបញ្ហា។' });
      return;
    }

    // Update if same normalized phone already exists, or add new
    const existingIdx = db.problemCustomers.findIndex((c) => c.normalizedPhone === normalized);
    if (existingIdx >= 0) {
      db.problemCustomers[existingIdx] = {
        ...db.problemCustomers[existingIdx],
        name,
        phone,
        normalizedPhone: normalized,
        note: note || db.problemCustomers[existingIdx].note,
      };
      saveDb();
      broadcastProblemCustomers('problemCustomer:updated', db.problemCustomers[existingIdx]);
      res.json({ problemCustomers: db.problemCustomers, item: db.problemCustomers[existingIdx] });
      return;
    }

    const record: ProblemCustomer = {
      id: `prob-${crypto.randomUUID().slice(0, 8)}`,
      name,
      phone,
      normalizedPhone: normalized,
      note,
      sourceOrderId: req.body?.sourceOrderId ? String(req.body.sourceOrderId) : undefined,
      createdAt: new Date().toISOString(),
    };
    db.problemCustomers.unshift(record);
    saveDb();
    broadcastProblemCustomers('problemCustomer:created', record);
    res.json({ problemCustomers: db.problemCustomers, item: record });
  });

  app.delete('/api/problem-customers/:id', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    db.problemCustomers = db.problemCustomers.filter((c) => c.id !== req.params.id);
    saveDb();
    broadcastProblemCustomers('problemCustomer:deleted', { id: req.params.id });
    res.json({ problemCustomers: db.problemCustomers });
  });

  // --- STAFF MANAGEMENT ---

  app.post('/api/staff', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const ws = db.workspaces[session.email];
    const name = String(req.body?.name || '').trim();
    if (!name) {
      res.status(400).json({ error: 'សូមបញ្ចូលឈ្មោះបុគ្គលិក។' });
      return;
    }

    const id = req.body?.id ? String(req.body.id) : '';
    const existingIdx = id ? ws.staff.findIndex((s) => s.id === id) : -1;
    if (existingIdx >= 0) {
      ws.staff[existingIdx] = {
        ...ws.staff[existingIdx],
        name,
        photoUrl: String(req.body?.photoUrl ?? ws.staff[existingIdx].photoUrl),
        position: String(req.body?.position ?? ws.staff[existingIdx].position).trim(),
        phone: String(req.body?.phone ?? ws.staff[existingIdx].phone).trim(),
        address: String(req.body?.address ?? ws.staff[existingIdx].address).trim(),
      };
      saveDb();
      broadcastWorkspace(session.email, 'staff:updated', ws.staff[existingIdx]);
      res.json({ workspace: ws });
      return;
    }

    const member: StaffMember = {
      id: `stf-${crypto.randomUUID().slice(0, 8)}`,
      name,
      photoUrl: String(req.body?.photoUrl || ''),
      position: String(req.body?.position || 'បុគ្គលិកលក់').trim(),
      phone: String(req.body?.phone || '').trim(),
      address: String(req.body?.address || '').trim(),
      createdAt: new Date().toISOString(),
    };
    ws.staff.push(member);
    saveDb();
    broadcastWorkspace(session.email, 'staff:created', member);
    res.json({ workspace: ws });
  });

  app.delete('/api/staff/:id', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const ws = db.workspaces[session.email];
    ws.staff = ws.staff.filter((s) => s.id !== req.params.id);
    saveDb();
    broadcastWorkspace(session.email, 'staff:deleted', { id: req.params.id });
    res.json({ workspace: ws });
  });

  // --- PRICE RECORDS ---

  app.post('/api/price-records', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const ws = db.workspaces[session.email];
    const productName = String(req.body?.productName || '').trim();
    if (!productName) {
      res.status(400).json({ error: 'សូមបញ្ចូលឈ្មោះទំនិញ។' });
      return;
    }

    const rawPrices = Array.isArray(req.body?.prices) ? req.body.prices : [];
    const prices = rawPrices
      .map((p: { id?: string; label?: string; amount?: number }, index: number) => ({
        id: p.id || `pt-${crypto.randomUUID().slice(0, 6)}-${index}`,
        label: String(p.label || `តម្លៃទី ${index + 1}`).trim(),
        amount: Math.max(0, Number(p.amount) || 0),
      }))
      .filter((p: { amount: number; label: string }) => p.label.length > 0);

    const id = req.body?.id ? String(req.body.id) : '';
    const idx = id ? ws.priceRecords.findIndex((r) => r.id === id) : -1;
    if (idx >= 0) {
      ws.priceRecords[idx] = {
        ...ws.priceRecords[idx],
        productName,
        imageUrl: String(req.body?.imageUrl ?? ws.priceRecords[idx].imageUrl),
        prices,
        updatedAt: new Date().toISOString(),
      };
      saveDb();
      broadcastWorkspace(session.email, 'priceRecord:updated', ws.priceRecords[idx]);
      res.json({ workspace: ws });
      return;
    }

    const record: PriceRecordItem = {
      id: `prc-${crypto.randomUUID().slice(0, 8)}`,
      productName,
      imageUrl: String(req.body?.imageUrl || ''),
      prices,
      updatedAt: new Date().toISOString(),
    };
    ws.priceRecords.unshift(record);
    saveDb();
    broadcastWorkspace(session.email, 'priceRecord:created', record);
    res.json({ workspace: ws });
  });

  app.delete('/api/price-records/:id', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const ws = db.workspaces[session.email];
    ws.priceRecords = ws.priceRecords.filter((r) => r.id !== req.params.id);
    saveDb();
    broadcastWorkspace(session.email, 'priceRecord:deleted', { id: req.params.id });
    res.json({ workspace: ws });
  });

  // --- SETTINGS & MASTER DATA ---

  app.put('/api/settings', (req, res) => {
    const session = getSessionFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const ws = db.workspaces[session.email];
    const incoming = req.body as Partial<WorkspaceSettings>;
    ws.settings = {
      ...ws.settings,
      ...incoming,
      warehouses: Array.isArray(incoming.warehouses) ? incoming.warehouses : ws.settings.warehouses,
      stores: Array.isArray(incoming.stores) ? incoming.stores : ws.settings.stores,
      groups: Array.isArray(incoming.groups) ? incoming.groups : ws.settings.groups,
      categories: Array.isArray(incoming.categories) ? incoming.categories : ws.settings.categories,
      accessRules: Array.isArray(incoming.accessRules) ? incoming.accessRules : ws.settings.accessRules,
    };

    if (incoming.personalName && db.accounts[session.email]) {
      db.accounts[session.email].displayName = incoming.personalName;
      session.displayName = incoming.personalName;
    }

    saveDb();
    broadcastWorkspace(session.email, 'settings:updated', ws.settings);
    res.json({ workspace: ws });
  });

  // --- WEBSOCKET REALTIME MULTI-DEVICE SERVER ---
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url ? request.url.split('?')[0] : '';
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (wsClient) => {
        wss.emit('connection', wsClient, request);
      });
    }
  });

  wss.on('connection', (wsClient) => {
    const meta: ClientSocketMeta = { ws: wsClient, email: null };
    clients.add(meta);

    wsClient.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type === 'auth' && typeof msg.token === 'string') {
          const session = db.sessions[msg.token];
          if (session && db.accounts[session.email]) {
            meta.email = session.email;
            wsClient.send(
              JSON.stringify({
                type: 'init',
                email: session.email,
                workspace: db.workspaces[session.email],
                problemCustomers: db.problemCustomers,
                activeDevices: Array.from(clients).filter((c) => c.email === session.email).length,
              })
            );
            // Notify all devices on same Gmail about active connected device count
            const deviceCount = Array.from(clients).filter((c) => c.email === session.email).length;
            for (const c of clients) {
              if (c.email === session.email && c.ws.readyState === WebSocket.OPEN) {
                c.ws.send(JSON.stringify({ type: 'presence', activeDevices: deviceCount }));
              }
            }
          }
        }
      } catch {
        // Ignore malformed socket frames
      }
    });

    wsClient.on('close', () => {
      const prevEmail = meta.email;
      clients.delete(meta);
      if (prevEmail) {
        const deviceCount = Array.from(clients).filter((c) => c.email === prevEmail).length;
        for (const c of clients) {
          if (c.email === prevEmail && c.ws.readyState === WebSocket.OPEN) {
            c.ws.send(JSON.stringify({ type: 'presence', activeDevices: deviceCount }));
          }
        }
      }
    });
  });

  // --- VITE MIDDLEWARE OR STATIC PROD ASSETS ---
  const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(path.join(__dirname, 'dist', 'index.html'));
  if (!isProd || process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(
      express.static(distPath, {
        maxAge: '7d',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`DR-POS Realtime Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
