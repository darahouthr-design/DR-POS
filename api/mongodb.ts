import type { IncomingMessage, ServerResponse } from 'http';
import { readJsonBody, sendJson } from '../lib/developerRegistry';
import {
  runMongoAnalytics,
  runMongoChanges,
  runMongoQueryOrders,
  runMongoQueryStockLogs,
  runMongoStatus,
  runMongoSync,
} from '../lib/mongoPartition';

function getAction(req: IncomingMessage, body: Record<string, unknown>): string {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const qAction = String(url.searchParams.get('action') || '').trim().toLowerCase();
    if (qAction) return qAction;
  } catch {
    // Fallback to body action
  }
  const bAction = String(body.action || '').trim().toLowerCase();
  if (bAction) return bAction;
  return req.method === 'GET' ? 'status' : '';
}

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  try {
    const body = req.method === 'POST' ? await readJsonBody(req) : {};
    const action = getAction(req, body);
    const headers = req.headers as Record<string, string | string[] | undefined>;

    if (action === 'status') {
      const result = await runMongoStatus();
      sendJson(res, result.status, result.body);
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'POST required for this action' });
      return;
    }

    if (action === 'sync') {
      const result = await runMongoSync(headers, body);
      sendJson(res, result.status, result.body);
      return;
    }

    if (action === 'changes') {
      const result = await runMongoChanges(headers, body);
      sendJson(res, result.status, result.body);
      return;
    }

    if (action === 'orders') {
      const result = await runMongoQueryOrders(headers, body);
      sendJson(res, result.status, result.body);
      return;
    }

    if (action === 'stock-logs') {
      const result = await runMongoQueryStockLogs(headers, body);
      sendJson(res, result.status, result.body);
      return;
    }

    if (action === 'analytics') {
      const result = await runMongoAnalytics(headers, body);
      sendJson(res, result.status, result.body);
      return;
    }

    sendJson(res, 400, { error: 'Unknown MongoDB partition action' });
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'MongoDB partition handler failed',
    });
  }
}
