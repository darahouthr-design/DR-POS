import crypto from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';

const MAX_BYTES = 512 * 1024;
const MIN_BYTES = 32 * 1024;
const DEFAULT_BYTES = 256 * 1024;
const PROBE_BUFFER = crypto.randomBytes(MAX_BYTES);

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method === 'HEAD') {
    res.statusCode = 200;
    res.end();
    return;
  }
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  let requested = DEFAULT_BYTES;
  try {
    const parsedUrl = new URL(req.url || '/api/speed-probe', 'http://localhost');
    const b = Number(parsedUrl.searchParams.get('bytes'));
    if (Number.isFinite(b) && b > 0) {
      requested = Math.max(MIN_BYTES, Math.min(MAX_BYTES, Math.floor(b)));
    }
  } catch {
    requested = DEFAULT_BYTES;
  }

  const chunk = PROBE_BUFFER.subarray(0, requested);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', String(chunk.byteLength));
  res.setHeader('Content-Encoding', 'identity');
  res.setHeader('X-Probe-Bytes', String(chunk.byteLength));
  res.end(chunk);
}
