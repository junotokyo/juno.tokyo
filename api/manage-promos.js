import { kv } from './_lib/kv.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

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

function authCheck(req) {
  const token = req.headers['x-admin-token'];
  return token && token === process.env.POPSCAN_ADMIN_TOKEN;
}

async function listAllPromoCodeKeys() {
  const keys = [];
  let cursor = '0';
  do {
    const result = await kv.scan(cursor, { match: 'promo-code:*', count: 1000 });
    cursor = String(result[0]);
    for (const k of result[1]) keys.push(k);
  } while (cursor !== '0');
  return keys;
}

export default async function handler(req, res) {
  setHeaders(res, JSON_HEADERS);

  if (!authCheck(req)) {
    res.status(401).send(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  if (req.method === 'GET') {
    try {
      const keys = await listAllPromoCodeKeys();
      const values = keys.length ? await kv.mget(...keys) : [];
      const codes = keys.map((key, i) => {
        const data = values[i] && typeof values[i] === 'object' ? values[i] : {};
        return { code: key.replace('promo-code:', ''), ...data };
      });
      res.status(200).send(JSON.stringify(codes));
    } catch (err) {
      res.status(500).send(JSON.stringify({ error: String(err) }));
    }
    return;
  }

  if (req.method === 'POST') {
    const body = parseBody(req);
    if (body === null) {
      res.status(400).send(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    const code = String(body.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{1,8}$/.test(code)) {
      res.status(400).send(JSON.stringify({ error: 'code must be 1-8 alphanumeric characters' }));
      return;
    }

    const expires = String(body.expires || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expires)) {
      res.status(400).send(JSON.stringify({ error: 'expires must be yyyy-mm-dd' }));
      return;
    }

    const count = parseInt(body.count, 10);
    if (isNaN(count) || count < 0) {
      res.status(400).send(JSON.stringify({ error: 'count must be a non-negative integer' }));
      return;
    }

    try {
      await kv.set(`promo-code:${code}`, { expires, count });
      res.status(200).send(JSON.stringify({ code, expires, count }));
    } catch (err) {
      res.status(500).send(JSON.stringify({ error: String(err) }));
    }
    return;
  }

  if (req.method === 'DELETE') {
    const body = parseBody(req);
    if (body === null) {
      res.status(400).send(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    const code = String(body.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{1,8}$/.test(code)) {
      res.status(400).send(JSON.stringify({ error: 'code must be 1-8 alphanumeric characters' }));
      return;
    }

    try {
      await kv.del(`promo-code:${code}`);
      res.status(200).send(JSON.stringify({ deleted: code }));
    } catch (err) {
      res.status(500).send(JSON.stringify({ error: String(err) }));
    }
    return;
  }

  res.status(405).send(JSON.stringify({ error: 'Method Not Allowed' }));
}
