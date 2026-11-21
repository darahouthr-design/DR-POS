import type { IncomingMessage, ServerResponse } from 'http';
import { sendJson } from '../../lib/developerRegistry.js';
import { runPendingMasterPasswordSync } from '../../lib/masterCredentials.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }
  const result = await runPendingMasterPasswordSync(req.headers);
  sendJson(res, result.status, result.body);
}
