import type { IncomingMessage, ServerResponse } from 'http';
import { readJsonBody, sendJson } from '../../lib/developerRegistry.js';
import { runSyncMasterPassword } from '../../lib/masterCredentials.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }
  const body = await readJsonBody(req);
  const result = await runSyncMasterPassword(req.headers, body);
  sendJson(res, result.status, result.body);
}
