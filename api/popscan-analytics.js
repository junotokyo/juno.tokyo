import { kv } from './_lib/kv.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
};

const ALLOWED_EVENTS = new Set([
  'launch',
  'save_succeeded',
  'save_failed',
  'paywall_shown',
  'purchase_succeeded',
  'promo_redeemed',
  'error_occurred',
]);

const ERROR_EVENTS = new Set(['save_failed', 'error_occurred']);

const ALLOWED_ERROR_CODES = new Set([
  'network.timeout',
  'network.offline',
  'network.server_error',
  'storekit.product_not_found',
  'storekit.purchase_failed',
  'storekit.purchase_cancelled',
  'storekit.verification_failed',
  'storekit.restore_failed',
  'camera.permission_denied',
  'camera.session_failed',
  'camera.capture_failed',
  'vision.no_rectangle',
  'vision.detection_failed',
  'photos.permission_denied',
  'photos.write_failed',
  'photos.fetch_failed',
  'promo.invalid_code',
  'promo.network_error',
  'quota.time_endpoint_failed',
  'unknown',
]);

const META_MAX_LEN = 32;
const ERROR_LOG_TTL_SECONDS = 60 * 60 * 24 * 7;
const ERROR_LOG_MAX_PER_DAY = 100;

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

function isShortString(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= META_MAX_LEN;
}

function dateKey(now) {
  return now.toISOString().slice(0, 10);
}

function hourKey(now) {
  return now.toISOString().slice(0, 13);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    setHeaders(res, CORS_HEADERS);
    res.status(204).end();
    return;
  }

  setHeaders(res, CORS_HEADERS);

  if (req.method !== 'POST') {
    res.status(405).send(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
    return;
  }

  const body = parseBody(req);
  if (body === null || typeof body !== 'object') {
    res.status(400).send(JSON.stringify({ ok: false, error: 'invalid_body' }));
    return;
  }

  const event = typeof body.event === 'string' ? body.event : '';
  if (!ALLOWED_EVENTS.has(event)) {
    res.status(400).send(JSON.stringify({ ok: false, error: 'invalid_event' }));
    return;
  }

  let errorCode = null;
  if (body.error_code != null) {
    if (typeof body.error_code !== 'string' || !ALLOWED_ERROR_CODES.has(body.error_code)) {
      res.status(400).send(JSON.stringify({ ok: false, error: 'invalid_error_code' }));
      return;
    }
    errorCode = body.error_code;
  }

  const appVersion = isShortString(body.app_version) ? body.app_version : null;
  const build = isShortString(body.build) ? body.build : null;
  const osVersion = isShortString(body.os_version) ? body.os_version : null;

  try {
    const now = new Date();
    const date = dateKey(now);

    await kv.incr(`stats:${date}:${event}`);
    if (errorCode) {
      await kv.incr(`stats:${date}:${event}:${errorCode}`);
    }

    if (ERROR_EVENTS.has(event) && errorCode) {
      const entry = {
        ts_hour: hourKey(now),
        event,
        code: errorCode,
        app_version: appVersion,
        build,
        os_version: osVersion,
      };
      const logKey = `error_log:${date}`;
      await kv.lpush(logKey, JSON.stringify(entry));
      await kv.ltrim(logKey, 0, ERROR_LOG_MAX_PER_DAY - 1);
      await kv.expire(logKey, ERROR_LOG_TTL_SECONDS);
    }

    res.status(200).send(JSON.stringify({ ok: true }));
  } catch {
    res.status(500).send(JSON.stringify({ ok: false, error: 'kv_failure' }));
  }
}
