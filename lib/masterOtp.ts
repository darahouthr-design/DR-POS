import crypto from 'crypto';
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

export function isEmailDeliveryConfigured(): boolean {
  const smtpHost = String(process.env.SMTP_HOST || '').trim();
  const smtpUser = String(process.env.SMTP_USER || '').trim();
  const smtpPass = String(process.env.SMTP_PASS || '').trim();
  if (smtpHost && smtpUser && smtpPass) return true;
  const gmailUser = String(process.env.GMAIL_USER || '').trim();
  const gmailPass = String(process.env.GMAIL_APP_PASSWORD || '').trim();
  return Boolean(gmailUser && gmailPass);
}

async function sendOtpEmail(toEmail: string, otpCode: string): Promise<void> {
  const subject = 'DR-POS: លេខកូដ OTP បង្កើតគណនី Admin មេថ្មី';
  const textBody = [
    `DR-POS - ការផ្ទៀងផ្ទាត់បង្កើតគណនី Admin មេថ្មី`,
    ``,
    `លេខកូដ OTP ៦ ខ្ទង់របស់អ្នកគឺ: ${otpCode}`,
    `អ៊ីមែល: ${toEmail}`,
    `សុពលភាព: ១០ នាទី`,
    ``,
    `សូមកុំចែករំលែកលេខកូដនេះទៅអ្នកដទៃ។`,
  ].join('\n');

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff; color: #111827;">
      <h2 style="margin: 0 0 8px; font-size: 18px; color: #0f766e;">DR-POS · ផ្ទៀងផ្ទាត់ OTP</h2>
      <p style="margin: 0 0 16px; font-size: 14px; color: #4b5563;">
        សូមប្រើលេខកូដ OTP ៦ ខ្ទង់ខាងក្រោម ដើម្បីបញ្ជាក់ការបង្កើតគណនី <strong>Admin មេថ្មី</strong> សម្រាប់ <strong>${toEmail}</strong>៖
      </p>
      <div style="margin: 20px 0; padding: 16px; text-align: center; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 10px;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f766e; font-family: monospace;">${otpCode}</span>
      </div>
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        លេខកូដនេះមានសុពលភាពរយៈពេល <strong>១០ នាទី</strong> ហើយអាចប្រើបានតែម្ដងប៉ុណ្ណោះ។
      </p>
    </div>
  `.trim();

  const smtpHost = String(process.env.SMTP_HOST || '').trim();
  const smtpUser = String(process.env.SMTP_USER || '').trim();
  const smtpPass = String(process.env.SMTP_PASS || '').trim();
  if (smtpHost && smtpUser && smtpPass) {
    const nodemailer = await import('nodemailer');
    const port = Number(process.env.SMTP_PORT || 587);
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port,
      secure: port === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });
    const fromAddr = String(process.env.OTP_FROM_EMAIL || '').trim() || smtpUser;
    await transporter.sendMail({
      from: fromAddr,
      to: toEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
    return;
  }

  const gmailUser = String(process.env.GMAIL_USER || '').trim();
  const gmailPass = String(process.env.GMAIL_APP_PASSWORD || '').trim();
  if (gmailUser && gmailPass) {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    });
    const fromAddr = String(process.env.OTP_FROM_EMAIL || '').trim() || `DR-POS <${gmailUser}>`;
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
          'គណនី Gmail នេះត្រូវបានបង្កើតជា Admin រង (Admin 2, 3...) នៅក្នុង Settings មិនអាចបង្កើត Admin មេ បានទេ!',
      },
    };
  }

  if (state.masterAdmins[email]) {
    return {
      status: 409,
      body: {
        error:
          'គណនី Gmail នេះបានចុះឈ្មោះជា «Admin មេ» រួចហើយ! សូមប្រើផ្ទាំង Sign In ដើម្បីចូលប្រើប្រាស់។',
      },
    };
  }

  if (!isEmailDeliveryConfigured()) {
    return {
      status: 503,
      body: {
        code: 'OTP_EMAIL_NOT_CONFIGURED',
        emailDeliveryConfigured: false,
        telegramUrl,
        error:
          'ម៉ាស៊ីនមេមិនទាន់ភ្ជាប់សេវាផ្ញើ Email (SMTP / Gmail App Password) ដោយស្វ័យប្រវត្តិទេ! សូមទាក់ទង Developer តាម Telegram ឬឱ្យ Developer បង្កើតលេខកូដ OTP ៦ ខ្ទង់នៅក្នុង Key Developer Console សម្រាប់ Gmail របស់អ្នក។',
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

  try {
    await sendOtpEmail(email, otpCode);
  } catch (err) {
    console.error('Failed to send Master Admin OTP email:', err);
    return {
      status: 502,
      body: {
        emailDeliveryConfigured: true,
        telegramUrl,
        error:
          'មិនអាចផ្ញើ Email OTP បានទេនៅពេលនេះ។ សូមពិនិត្យការកំណត់ Email Server ឬស្នើសុំ OTP ពី Developer តាម Telegram។',
      },
    };
  }

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
      body: { error: 'សូមបញ្ចូល Gmail របស់ «Admin មេថ្មី» អោយបានត្រឹមត្រូវ។' },
    };
  }

  const alsoSendEmail = Boolean(payload?.alsoSendEmail);
  const state = await readVaultState(onMirrorLocal);

  if (state.subAdminEmails[email]) {
    return {
      status: 403,
      body: {
        error:
          'Gmail នេះជា Admin រង (Admin 2, 3...) នៅក្នុង Setting មិនអាចបង្កើតគណនី Admin មេ បានទេ។',
      },
    };
  }

  if (state.masterAdmins[email]) {
    return {
      status: 409,
      body: {
        error: 'Gmail នេះបានចុះឈ្មោះជា Admin មេ រួចរាល់ហើយ! មិនចាំបាច់បង្កើត OTP ថ្មីទេ។',
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
  if (alsoSendEmail && isEmailDeliveryConfigured()) {
    try {
      await sendOtpEmail(email, otpCode);
      emailedToUser = true;
    } catch {
      emailedToUser = false;
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
    },
  };
}

export async function runVerifyMasterOtp(
  payload: Record<string, unknown>,
  onMirrorLocal?: (state: DeveloperVaultState) => void
): Promise<ApiResult> {
  const email = normalizeEmail(payload?.email);
  const otp = String(payload?.otp || '').replace(/\D+/g, '').trim();
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
          'គណនី Gmail នេះត្រូវបានបង្កើតជា Admin រង (Admin 2, 3...) នៅក្នុង Settings មិនអាចបង្កើត Admin មេ បានទេ!',
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
