import { kv } from './_lib/kv.js';
import { jstDateKey, jstHourKey } from './_lib/date.js';
import { clampPhotos, bucketForPhotos } from './_lib/photos-bucket.js';
import {
  ALLOWED_EVENTS,
  ALLOWED_ERROR_CODES,
  ERROR_EVENTS,
} from './_lib/filmator-event-codes.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
};

const META_MAX_LEN = 32;
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

  const isErrorEvent = ERROR_EVENTS.has(event);
  if (isErrorEvent && errorCode == null) {
    res.status(400).send(JSON.stringify({ ok: false, error: 'missing_error_code' }));
    return;
  }
  if (!isErrorEvent && errorCode != null) {
    res.status(400).send(JSON.stringify({ ok: false, error: 'unexpected_error_code' }));
    return;
  }

  // export_succeeded は photos 必須（クライアントが整数を送る・サーバが 1..100000 にクランプ）
  let photos = null;
  if (event === 'export_succeeded') {
    photos = clampPhotos(body.photos);
    if (photos == null) {
      res.status(400).send(JSON.stringify({ ok: false, error: 'invalid_photos' }));
      return;
    }
  } else if (body.photos != null) {
    res.status(400).send(JSON.stringify({ ok: false, error: 'unexpected_photos' }));
    return;
  }

  const appVersion = isShortString(body.app_version) ? body.app_version : null;
  const build = isShortString(body.build) ? body.build : null;
  const osVersion = isShortString(body.os_version) ? body.os_version : null;

  try {
    const now = new Date();
    const date = jstDateKey(now);

    await kv.incr(`filmator:stats:${date}:${event}`);
    if (errorCode) {
      await kv.incr(`filmator:stats:${date}:${event}:${errorCode}`);
    }
    if (photos != null) {
      await kv.incrby(`filmator:stats:${date}:export_succeeded:photos`, photos);
      await kv.incr(`filmator:stats:${date}:export_size:${bucketForPhotos(photos)}`);
    }

    if (isErrorEvent) {
      const entry = {
        ts_hour: jstHourKey(now),
        event,
        code: errorCode,
        app_version: appVersion,
        build,
        os_version: osVersion,
      };
      const logKey = `filmator:error_log:${date}`;
      await kv.lpush(logKey, JSON.stringify(entry));
      await kv.ltrim(logKey, 0, ERROR_LOG_MAX_PER_DAY - 1);
    }

    res.status(200).send(JSON.stringify({ ok: true }));
  } catch {
    res.status(500).send(JSON.stringify({ ok: false, error: 'kv_failure' }));
  }
}
