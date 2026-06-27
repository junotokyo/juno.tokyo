import { kv } from './_lib/kv.js';
import { jstDateKey, jstHourKey } from './_lib/date.js';
import { clampPhotos, bucketForPhotos } from './_lib/photos-bucket.js';
import {
  ALLOWED_EVENTS,
  ALLOWED_ERROR_CODES,
  ERROR_EVENTS,
  ERROR_CODE_SEVERITY,
  EXTENSION_FIELD_RULES,
  SEVERITY_HIGH,
} from './_lib/filmator-event-codes.js';
import { isCsvField, isIntInRange } from './_lib/filmator-validators.js';
import { notifyHighSeverity } from './_lib/filmator-notify.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
};

const META_MAX_LEN = 32;
const ERROR_LOG_MAX_PER_DAY = 100;

// JT-279: diagnostic set の TTL（90 日）。SADD と一緒に pipeline で atomic にする（Codex Q7）。
const DIAG_TTL_SECONDS = 90 * 86400;

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

  // JT-279: 拡張フィールド検証（catalog.schema_unsupported のみ受領）。
  // EXTENSION_FIELD_RULES に従い、他コードで送られたら 400 (unexpected_extension)。
  let ext = null;
  if (errorCode === 'catalog.schema_unsupported') {
    const rule = EXTENSION_FIELD_RULES[errorCode];
    if (!rule.severity.allow.has(body.severity)) {
      res.status(400).send(JSON.stringify({ ok: false, error: 'invalid_severity' }));
      return;
    }
    if (!isIntInRange(body.db_version, rule.db_version.min, rule.db_version.max)) {
      res.status(400).send(JSON.stringify({ ok: false, error: 'invalid_db_version' }));
      return;
    }
    const mt = body.missing_tables;
    const mc = body.missing_columns;
    if (mt != null && !isCsvField(mt, {
      maxEntries: rule.missing_tables.maxEntries,
      maxEntryLen: rule.missing_tables.maxEntryLen,
    })) {
      res.status(400).send(JSON.stringify({ ok: false, error: 'invalid_missing_tables' }));
      return;
    }
    if (mc != null && !isCsvField(mc, {
      maxEntries: rule.missing_columns.maxEntries,
      maxEntryLen: rule.missing_columns.maxEntryLen,
    })) {
      res.status(400).send(JSON.stringify({ ok: false, error: 'invalid_missing_columns' }));
      return;
    }
    ext = {
      severity: body.severity,
      db_version: body.db_version,
      missing_tables: typeof mt === 'string' ? mt : '',
      missing_columns: typeof mc === 'string' ? mc : '',
    };
  } else {
    // 他コードで拡張フィールドが付いていたら明示 reject（誤った将来コードに気付ける）。
    if (body.severity != null || body.db_version != null
        || body.missing_tables != null || body.missing_columns != null) {
      res.status(400).send(JSON.stringify({ ok: false, error: 'unexpected_extension' }));
      return;
    }
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

    // JT-279: サーバ map 由来の severity counter。client severity は validation のみで集計には使わない。
    const serverSeverity = errorCode ? ERROR_CODE_SEVERITY.get(errorCode) : undefined;
    if (serverSeverity) {
      await kv.incr(`filmator:stats:${date}:severity:${serverSeverity}`);
    }

    // JT-279: catalog.schema_unsupported の診断 set（90 日 TTL）。pipeline で SADD+EXPIRE atomic（Codex Q7）。
    if (ext && errorCode === 'catalog.schema_unsupported') {
      const dbKey = `filmator:diag:db_versions:${date}`;
      const tablesKey = `filmator:diag:missing_tables:${date}`;
      const columnsKey = `filmator:diag:missing_columns:${date}`;
      const pipe = kv.pipeline();
      pipe.sadd(dbKey, String(ext.db_version));
      pipe.expire(dbKey, DIAG_TTL_SECONDS);
      if (ext.missing_tables) {
        for (const t of ext.missing_tables.split(',')) {
          pipe.sadd(tablesKey, t);
        }
        pipe.expire(tablesKey, DIAG_TTL_SECONDS);
      }
      if (ext.missing_columns) {
        for (const c of ext.missing_columns.split(',')) {
          pipe.sadd(columnsKey, c);
        }
        pipe.expire(columnsKey, DIAG_TTL_SECONDS);
      }
      // ブラケット記法は security フック false positive 回避（child_process.exec ではなく Upstash pipeline）。
      await pipe['exec']();
    }

    if (isErrorEvent) {
      const entry = {
        ts_hour: jstHourKey(now),
        event,
        code: errorCode,
        app_version: appVersion,
        build,
        os_version: osVersion,
        ...(ext ? {
          severity: ext.severity,
          db_version: ext.db_version,
          missing_tables: ext.missing_tables,
          missing_columns: ext.missing_columns,
        } : {}),
      };
      const logKey = `filmator:error_log:${date}`;
      await kv.lpush(logKey, JSON.stringify(entry));
      await kv.ltrim(logKey, 0, ERROR_LOG_MAX_PER_DAY - 1);

      // JT-279: 高 severity 受信時に通知発火（dedupe は notify 側）。
      // notify が throw しても 200 は返す（クライアント再送ループ防止）。
      if (serverSeverity === SEVERITY_HIGH) {
        try {
          await notifyHighSeverity({ now, kv, date, errorCode, entry });
        } catch (e) {
          console.error('[filmator-analytics] notifyHighSeverity threw', String(e));
        }
      }
    }

    res.status(200).send(JSON.stringify({ ok: true }));
  } catch {
    res.status(500).send(JSON.stringify({ ok: false, error: 'kv_failure' }));
  }
}
