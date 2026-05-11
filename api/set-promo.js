import { kv } from './_lib/kv.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.POPSCAN_ADMIN_TOKEN) {
    res.status(401).send('Unauthorized');
    return;
  }

  const raw = typeof req.body === 'string' ? req.body : (req.body == null ? '' : String(req.body));
  const value = raw.trim();
  if (value !== 'true' && value !== 'false') {
    res.status(400).send('Body must be "true" or "false"');
    return;
  }

  await kv.set('promo', value);

  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify({ promo: value === 'true' }));
}
