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

  // Accept body as raw string ("true"/"false"), JSON ({value}/string), or
  // form-urlencoded ({"true": ""} from `--data 'true'` without explicit content-type).
  let value;
  const b = req.body;
  if (typeof b === 'string') {
    value = b.trim();
  } else if (b && typeof b === 'object') {
    if (typeof b.value === 'string') value = b.value.trim();
    else if (Object.prototype.hasOwnProperty.call(b, 'true')) value = 'true';
    else if (Object.prototype.hasOwnProperty.call(b, 'false')) value = 'false';
    else value = '';
  } else {
    value = '';
  }

  if (value !== 'true' && value !== 'false') {
    res.status(400).send('Body must be "true" or "false"');
    return;
  }

  await kv.set('promo', value);

  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify({ promo: value === 'true' }));
}
