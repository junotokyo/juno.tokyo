import { filmatorKv as kv } from './_lib/kv.js';
import { jstDateKey } from './_lib/date.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
};

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_ATTEMPTS = 30;
const RATE_LIMIT_GLOBAL_MAX_ATTEMPTS = 300;

// Redis EVAL (Lua) — atomic check + decrement。JS eval() ではない。
const RATE_LIMIT_SCRIPT = `
local code_key = KEYS[1]
local global_key = KEYS[2]
local code_max = tonumber(ARGV[1])
local global_max = tonumber(ARGV[2])
local window_seconds = tonumber(ARGV[3])

local code_attempts = redis.call("INCR", code_key)
if code_attempts == 1 then
  redis.call("EXPIRE", code_key, window_seconds)
end

local global_attempts = redis.call("INCR", global_key)
if global_attempts == 1 then
  redis.call("EXPIRE", global_key, window_seconds)
end

if code_attempts > code_max or global_attempts > global_max then
  return 0
end

return 1
`;

const REDEEM_PROMO_SCRIPT = `
local key = KEYS[1]
local today = ARGV[1]
local raw = redis.call("GET", key)

if not raw then
  return 0
end

local ok, data = pcall(cjson.decode, raw)
if not ok or type(data) ~= "table" then
  return 0
end

if type(data["expires"]) ~= "string" or data["expires"] < today then
  return 0
end

if type(data["count"]) ~= "number" or data["count"] <= 0 then
  return 0
end

data["count"] = data["count"] - 1
redis.call("SET", key, cjson.encode(data))
return 1
`;

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

async function withinRateLimit(code) {
  // Privacy invariant: throttle keys include only endpoint/code buckets, never IP/UA.
  const result = await kv.eval(RATE_LIMIT_SCRIPT, [
    `promo-redeem-rate:${code}`,
    'promo-redeem-rate:global',
  ], [
    String(RATE_LIMIT_MAX_ATTEMPTS),
    String(RATE_LIMIT_GLOBAL_MAX_ATTEMPTS),
    String(RATE_LIMIT_WINDOW_SECONDS),
  ]);
  return Number(result) === 1;
}

async function redeemPromoCode(key, today) {
  const result = await kv.eval(REDEEM_PROMO_SCRIPT, [key], [today]);
  return Number(result) === 1;
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
    if (!(await withinRateLimit(code))) {
      res.setHeader('Retry-After', String(RATE_LIMIT_WINDOW_SECONDS));
      res.status(429).send(JSON.stringify({ success: false, error: 'rate_limited' }));
      return;
    }

    const success = await redeemPromoCode(key, jstDateKey());
    res.status(200).send(JSON.stringify({ success }));
  } catch {
    res.status(503).send(JSON.stringify({ success: false }));
  }
}
