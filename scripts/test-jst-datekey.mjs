import { strict as assert } from 'node:assert';
import { jstDateKey, jstHourKey } from '../api/_lib/date.js';

// dateKey: JST 境界 4 ケース
// Case A: JST 23:30 (UTC 14:30) → JST 日付 = 当日
assert.equal(jstDateKey(new Date('2026-05-12T14:30:00Z')), '2026-05-12');
// Case B: JST 00:30 翌日 (UTC 15:30) → JST 日付 = 翌日（バグの核心）
assert.equal(jstDateKey(new Date('2026-05-12T15:30:00Z')), '2026-05-13');
// Case C: JST 08:59 (UTC 23:59 前日) → JST 日付 = 当日
assert.equal(jstDateKey(new Date('2026-05-11T23:59:00Z')), '2026-05-12');
// Case D: JST 09:00 (UTC 00:00) → JST 日付 = 当日
assert.equal(jstDateKey(new Date('2026-05-12T00:00:00Z')), '2026-05-12');

// hourKey: JST 境界
assert.equal(jstHourKey(new Date('2026-05-12T15:30:00Z')), '2026-05-13T00');
assert.equal(jstHourKey(new Date('2026-05-12T14:59:00Z')), '2026-05-12T23');

console.log('OK');
