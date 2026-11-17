import type { IncomingMessage, ServerResponse } from 'http';
import { readJsonBody, runUnregisterWorkspaceAccount, sendJson } from '../../lib/developerRegistry.js';

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }
  const headers = req.headers as Record<string, string | string[] | undefined>;
  const body = await readJsonBody(req);
  const result = await runUnregisterWorkspaceAccount(headers, body);
  sendJson(res, result.status, result.body);
}
