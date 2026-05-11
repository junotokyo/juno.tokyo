import { kv } from './_lib/kv.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
};

function setHeaders(res, headers) {
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
}

function parseBody(req) {
  if (req.body == null) return {};
  if (typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(String(req.body));
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    setHeaders(res, CORS_HEADERS);
    res.status(204).end();
    return;
  }

  setHeaders(res, CORS_HEADERS);

  if (req.method !== 'POST') {
    res.status(405).send(JSON.stringify({ success: false }));
    return;
  }

  const body = parseBody(req);
  if (body === null) {
    res.status(400).send(JSON.stringify({ success: false }));
    return;
  }

  const code = String(body.code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{1,8}$/.test(code)) {
    res.status(200).send(JSON.stringify({ success: false }));
    return;
  }

  try {
    const key = `promo-code:${code}`;
    const data = await kv.get(key);

    if (!data || typeof data !== 'object') {
      res.status(200).send(JSON.stringify({ success: false }));
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (typeof data.expires !== 'string' || data.expires < today) {
      res.status(200).send(JSON.stringify({ success: false }));
      return;
    }

    if (typeof data.count !== 'number' || data.count <= 0) {
      res.status(200).send(JSON.stringify({ success: false }));
      return;
    }

    data.count -= 1;
    await kv.set(key, data);

    res.status(200).send(JSON.stringify({ success: true }));
  } catch {
    res.status(503).send(JSON.stringify({ success: false }));
  }
}
