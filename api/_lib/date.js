const TIME_ZONE = 'Asia/Tokyo';

export function jstDateKey(now = new Date()) {
  return now.toLocaleDateString('sv-SE', { timeZone: TIME_ZONE });
}

export function jstHourKey(now = new Date()) {
  const jstMs = now.getTime() + 9 * 60 * 60 * 1000;
  return new Date(jstMs).toISOString().slice(0, 13);
}
