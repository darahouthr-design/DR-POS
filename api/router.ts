import crypto from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import {
  readJsonBody,
  runAuthGateCheck,
  runDeveloperOverview,
  runRegisterMaster,
  runSyncWorkspace,
  runUnregisterWorkspaceAccount,
  runUpdateDeveloperTelegram,
  runUpdateMasterAdminExpire,
  runVerifyDeveloper,
  sendJson,
} from '../lib/developerRegistry.js';
import {
  runDeveloperIssueMasterOtp,
  runGetDeveloperEmailConfig,
  runRequestMasterOtp,
  runSaveDeveloperEmailConfig,
  runVerifyMasterOtp,
} from '../lib/masterOtp.js';
import {
  runDeveloperUpdateMasterPassword,
  runPendingMasterPasswordSync,
  runResolveDeveloperPasswordLogin,
  runSyncMasterPassword,
} from '../lib/masterCredentials.js';
import { runWarehouseFeed, runWarehouseSync } from '../lib/warehouseFeed.js';

const MAX_PROBE_BYTES = 512 * 1024;
const MIN_PROBE_BYTES = 32 * 1024;
const DEFAULT_PROBE_BYTES = 256 * 1024;
const PROBE_BUFFER = crypto.randomBytes(MAX_PROBE_BYTES);

function resolveApiRoute(req: IncomingMessage): { route: string; url: URL } {
  const parsed = new URL(req.url || '/api', 'http://localhost');
  const fromQuery = String(parsed.searchParams.get('__route') || '')
    .trim()
    .replace(/^\/+|\/+$/g, '');
  if (fromQuery) {
    return { route: fromQuery, url: parsed };
  }
  const fromPath = parsed.pathname
    .replace(/^\/api\/?/, '')
    .replace(/^\/+|\/+$/g, '');
  return { route: fromPath, url: parsed };
}

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const { route, url } = resolveApiRoute(req);
  const method = String(req.method || 'GET').toUpperCase();
  const headers = req.headers as Record<string, string | string[] | undefined>;

  try {
    // --- Accurate Live Internet Speed Probe ---
    if (route === 'speed-probe') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      if (method === 'HEAD') {
        res.statusCode = 200;
        res.end();
        return;
      }
      if (method !== 'GET') {
        res.statusCode = 405;
        res.end('Method Not Allowed');
        return;
      }
      const requestedRaw = Number(url.searchParams.get('bytes'));
      const byteCount =
        Number.isFinite(requestedRaw) && requestedRaw > 0
          ? Math.max(MIN_PROBE_BYTES, Math.min(MAX_PROBE_BYTES, Math.floor(requestedRaw)))
          : DEFAULT_PROBE_BYTES;
      const chunk = PROBE_BUFFER.subarray(0, byteCount);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', String(chunk.byteLength));
      res.setHeader('Content-Encoding', 'identity');
      res.setHeader('X-Probe-Bytes', String(chunk.byteLength));
      res.end(chunk);
      return;
    }

    // --- GET Routes ---
    if (route === 'developer/overview') {
      if (method !== 'GET') {
        sendJson(res, 405, { error: 'Method Not Allowed' });
        return;
      }
      const result = await runDeveloperOverview(headers);
      sendJson(res, result.status, result.body);
      return;
    }

    if (route === 'developer/email-config' && method === 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      const result = await runGetDeveloperEmailConfig(headers);
      sendJson(res, result.status, result.body);
      return;
    }

    if (route === 'auth/pending-password-sync') {
      if (method !== 'GET') {
        sendJson(res, 405, { error: 'Method Not Allowed' });
        return;
      }
      const result = await runPendingMasterPasswordSync(headers);
      sendJson(res, result.status, result.body);
      return;
    }

    if (route === 'warehouse/feed') {
      if (method !== 'GET') {
        sendJson(res, 405, { error: 'Method Not Allowed' });
        return;
      }
      res.setHeader('Cache-Control', 'no-store');
      const result = await runWarehouseFeed(headers, {
        sinceVersion: url.searchParams.get('sinceVersion') || undefined,
        force: url.searchParams.get('force') || undefined,
      });
      sendJson(res, result.status, result.body);
      return;
    }

    // --- POST Routes ---
    if (method !== 'POST') {
      sendJson(res, 405, { error: 'Method Not Allowed' });
      return;
    }

    const body = await readJsonBody(req);

    switch (route) {
      case 'auth/gate-check': {
        const result = await runAuthGateCheck(body);
        sendJson(res, result.status, result.body);
        return;
      }
      case 'auth/request-master-otp': {
        const result = await runRequestMasterOtp(body);
        sendJson(res, result.status, result.body);
        return;
      }
      case 'auth/verify-master-otp': {
        const result = await runVerifyMasterOtp(body);
        sendJson(res, result.status, result.body);
        return;
      }
      case 'auth/sync-master-password': {
        const result = await runSyncMasterPassword(headers, body);
        sendJson(res, result.status, result.body);
        return;
      }
      case 'auth/resolve-dev-password': {
        const result = await runResolveDeveloperPasswordLogin(body);
        sendJson(res, result.status, result.body);
        return;
      }
      case 'developer/verify': {
        const result = await runVerifyDeveloper(body);
        sendJson(res, result.status, result.body);
        return;
      }
      case 'developer/register-master': {
        const result = await runRegisterMaster(body);
        sendJson(res, result.status, result.body);
        return;
      }
      case 'developer/sync-workspace': {
        const result = await runSyncWorkspace(body);
        sendJson(res, result.status, result.body);
        return;
      }
      case 'developer/delete-account': {
        const result = await runUnregisterWorkspaceAccount(headers, body);
        sendJson(res, result.status, result.body);
        return;
      }
      case 'developer/master-otp': {
        const result = await runDeveloperIssueMasterOtp(headers, body);
        sendJson(res, result.status, result.body);
        return;
      }
      case 'developer/email-config': {
        res.setHeader('Cache-Control', 'no-store');
        const result = await runSaveDeveloperEmailConfig(headers, body);
        sendJson(res, result.status, result.body);
        return;
      }
      case 'developer/telegram': {
        const result = await runUpdateDeveloperTelegram(headers, body);
        sendJson(res, result.status, result.body);
        return;
      }
      case 'developer/master-admins/expire': {
        const result = await runUpdateMasterAdminExpire(headers, body);
        sendJson(res, result.status, result.body);
        return;
      }
      case 'developer/master-admins/password': {
        const result = await runDeveloperUpdateMasterPassword(headers, body);
        sendJson(res, result.status, result.body);
        return;
      }
      case 'warehouse/sync': {
        res.setHeader('Cache-Control', 'no-store');
        const result = await runWarehouseSync(headers, body);
        sendJson(res, result.status, result.body);
        return;
      }
      default: {
        sendJson(res, 404, { error: `API route not found: /api/${route}` });
        return;
      }
    }
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Internal API router error',
    });
  }
}
