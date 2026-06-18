import { kv } from './_lib/kv.js';

export default async function handler(req, res) {
  const now = new Date();
  const body = {
    iso8601: now.toISOString(),
    unix: Math.floor(now.getTime() / 1000),
  };

  if (req.headers['x-popscan-purpose'] === 'quota_check') {
    try {
      const promoValue = await kv.get('popscan:promo');
      body.p = promoValue === 'true' || promoValue === true;
    } catch {
      body.p = false;
    }
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(JSON.stringify(body));
}
