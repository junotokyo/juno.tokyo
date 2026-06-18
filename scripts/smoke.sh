#!/usr/bin/env bash
# Vercel デプロイ後の smoke test
# 使い方:
#   POPSCAN_BASIC_PASS=xxx ./scripts/smoke.sh https://juno.tokyo
#   POPSCAN_BASIC_PASS=xxx ./scripts/smoke.sh https://juno-tokyo-xxx.vercel.app
#
# POPSCAN_BASIC_PASS は Vercel 環境変数 ADMIN_BASIC_PASS と同じ値。

set -eu

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <BASE_URL>" >&2
  exit 1
fi

BASE="${1%/}"
BASIC_PASS="${POPSCAN_BASIC_PASS:-}"
if [[ -z "$BASIC_PASS" ]]; then
  echo "POPSCAN_BASIC_PASS が未設定" >&2
  exit 1
fi
BASIC_AUTH="admin:$BASIC_PASS"

CODE="SMK$RANDOM"
EXPIRES="2099-12-31"
PASS=0
FAIL=0

step() { echo "──────────────────────────────────────"; echo "▶ $*"; }
ok()   { echo "  ✅ $*"; PASS=$((PASS+1)); }
ng()   { echo "  ❌ $*"; FAIL=$((FAIL+1)); }

assert_status() {
  local actual="$1" expected="$2" label="$3"
  if [[ "$actual" == "$expected" ]]; then ok "$label ($actual)"; else ng "$label expected=$expected actual=$actual"; fi
}

# =========================================================
# 1. /popscan/admin/ Basic 認証（critical: matcher 漏れ＝認証バイパス事故）
# =========================================================

step "/popscan/admin/ Basic Auth により 401 期待"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/popscan/admin/")
assert_status "$S" "401" "/popscan/admin/ 401"

step "/popscan/admin/ X-Robots-Tag noindex 確認 (401 レスポンスにも付く)"
H=$(curl -s -I "$BASE/popscan/admin/" | tr -d '\r')
echo "  $H" | grep -qi 'x-robots-tag.*noindex' && ok "noindex あり" || ng "noindex なし"

step "/popscan/admin/ WWW-Authenticate Basic ヘッダ確認"
echo "  $H" | grep -qi 'www-authenticate.*basic' && ok "Basic 認証要求あり" || ng "WWW-Authenticate なし"

step "/popscan/admin (trailing slash なし) Basic 401 期待"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/popscan/admin")
assert_status "$S" "401" "/popscan/admin 401"

step "/popscan/admin/ Basic 認証あり → 200 期待"
S=$(curl -s -o /dev/null -w '%{http_code}' -u "$BASIC_AUTH" "$BASE/popscan/admin/")
assert_status "$S" "200" "/popscan/admin/ 認証成功"

step "/popscan/admin/stats/ Basic 401 期待"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/popscan/admin/stats/")
assert_status "$S" "401" "/popscan/admin/stats/ 401"

step "/popscan/admin/stats/ Basic 認証あり → 200 期待"
S=$(curl -s -o /dev/null -w '%{http_code}' -u "$BASIC_AUTH" "$BASE/popscan/admin/stats/")
assert_status "$S" "200" "/popscan/admin/stats/ 認証成功"

step "/popscan/admin-stats 認証なし (401 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/popscan/admin-stats")
assert_status "$S" "401" "/popscan/admin-stats 401"

step "/popscan/admin-stats?days=7 認証あり → 200 + JSON 妥当"
RES=$(curl -sS -u "$BASIC_AUTH" "$BASE/popscan/admin-stats?days=7")
echo "  ($(echo "$RES" | wc -c | tr -d ' ') bytes)"
echo "$RES" | grep -q '"days"' && ok "days フィールドあり" || ng "days フィールド無し"
echo "$RES" | grep -q '"launch"' && ok "events.launch あり" || ng "events.launch 無し"
echo "$RES" | grep -q '"errorsByCode"' && ok "errorsByCode あり" || ng "errorsByCode 無し"

step "/popscan/admin-stats?days=999 → clamp 30 (200 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -u "$BASIC_AUTH" "$BASE/popscan/admin-stats?days=999")
assert_status "$S" "200" "/popscan/admin-stats clamp"

step "/popscan/admin-error-log 認証なし (401 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/popscan/admin-error-log")
assert_status "$S" "401" "/popscan/admin-error-log 401"

step "/popscan/admin-error-log?days=3 認証あり → 200 + JSON 妥当"
RES=$(curl -sS -u "$BASIC_AUTH" "$BASE/popscan/admin-error-log?days=3")
echo "  ($(echo "$RES" | wc -c | tr -d ' ') bytes)"
echo "$RES" | grep -q '"entries"' && ok "entries フィールドあり" || ng "entries フィールド無し"

# =========================================================
# 2. /popscan/time
# =========================================================

step "/popscan/time (通常)"
RES=$(curl -sS "$BASE/popscan/time")
echo "  $RES"
echo "$RES" | grep -q '"iso8601"' && ok "iso8601 あり" || ng "iso8601 なし"
echo "$RES" | grep -q '"unix"'    && ok "unix あり"    || ng "unix なし"
echo "$RES" | grep -q '"p"'       && ng "p フィールドが付いている (本来は無し)" || ok "p フィールド無し"

step "/popscan/time (quota_check)"
RES=$(curl -sS -H 'x-popscan-purpose: quota_check' "$BASE/popscan/time")
echo "  $RES"
echo "$RES" | grep -q '"p"' && ok "p フィールドあり" || ng "p フィールドなし"

# =========================================================
# 3. /popscan/analytics
# =========================================================

step "/popscan/analytics 正常系 (save_succeeded)"
RES=$(curl -sS -X POST -H 'content-type: application/json' \
  -d '{"event":"save_succeeded"}' "$BASE/popscan/analytics")
echo "  $RES"
echo "$RES" | grep -q '"ok":true' && ok "analytics 200 ok" || ng "analytics 200 失敗"

step "/popscan/analytics error 系 (error_occurred + メタ)"
RES=$(curl -sS -X POST -H 'content-type: application/json' \
  -d '{"event":"error_occurred","error_code":"network.timeout","app_version":"1.0.0","build":"100","os_version":"18.4"}' \
  "$BASE/popscan/analytics")
echo "  $RES"
echo "$RES" | grep -q '"ok":true' && ok "analytics error_occurred ok" || ng "analytics error_occurred 失敗"

# JT-34: icloud.unavailable が allow-list に追加されたか
step "/popscan/analytics icloud.unavailable error_code (JT-34)"
RES=$(curl -sS -X POST -H 'content-type: application/json' \
  -d '{"event":"error_occurred","error_code":"icloud.unavailable","app_version":"1.0.0","build":"100","os_version":"18.4"}' \
  "$BASE/popscan/analytics")
echo "  $RES"
echo "$RES" | grep -q '"ok":true' && ok "analytics icloud.unavailable ok" || ng "analytics icloud.unavailable 失敗"

step "/popscan/analytics 不正 event (400 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' \
  -d '{"event":"hack_attempt"}' "$BASE/popscan/analytics")
assert_status "$S" "400" "不正 event reject"

step "/popscan/analytics 不正 error_code (400 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' \
  -d '{"event":"error_occurred","error_code":"x"}' "$BASE/popscan/analytics")
assert_status "$S" "400" "不正 error_code reject"

step "/popscan/analytics error_code 欠落 (400 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' \
  -d '{"event":"error_occurred"}' "$BASE/popscan/analytics")
assert_status "$S" "400" "error_occurred error_code 必須"

step "/popscan/analytics 成功系 + error_code 余剰 (400 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' \
  -d '{"event":"save_succeeded","error_code":"unknown"}' "$BASE/popscan/analytics")
assert_status "$S" "400" "非 error event error_code 禁止"

step "/popscan/analytics GET (405 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/popscan/analytics")
assert_status "$S" "405" "GET 拒否"

# =========================================================
# 4. /popscan/set-promo
# =========================================================

step "/popscan/set-promo true"
RES=$(curl -sS -X POST -u "$BASIC_AUTH" -H 'content-type: text/plain' --data 'true' "$BASE/popscan/set-promo")
echo "  $RES"
echo "$RES" | grep -q '"promo":true' && ok "promo:true" || ng "promo:true 期待"

step "/popscan/time quota_check で p=true 確認"
RES=$(curl -sS -H 'x-popscan-purpose: quota_check' "$BASE/popscan/time")
echo "  $RES"
echo "$RES" | grep -q '"p":true' && ok "p=true 確認" || ng "p=true 期待"

step "/popscan/set-promo false (元に戻す)"
RES=$(curl -sS -X POST -u "$BASIC_AUTH" --data 'false' "$BASE/popscan/set-promo")
echo "  $RES"
echo "$RES" | grep -q '"promo":false' && ok "promo:false" || ng "promo:false 期待"

step "/popscan/set-promo 認証なし (401 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -X POST --data 'true' "$BASE/popscan/set-promo")
assert_status "$S" "401" "認証拒否"

# =========================================================
# 5. /popscan/manage-promos と /popscan/redeem-promo
# =========================================================

step "/popscan/manage-promos POST 追加 ($CODE)"
RES=$(curl -sS -X POST -u "$BASIC_AUTH" -H 'content-type: application/json' \
  -d "{\"code\":\"$CODE\",\"expires\":\"$EXPIRES\",\"count\":2}" "$BASE/popscan/manage-promos")
echo "  $RES"
echo "$RES" | grep -q "\"code\":\"$CODE\"" && ok "$CODE 登録" || ng "$CODE 登録失敗"

step "/popscan/manage-promos GET で $CODE 取得"
RES=$(curl -sS -u "$BASIC_AUTH" "$BASE/popscan/manage-promos")
echo "  ($(echo "$RES" | wc -c | tr -d ' ') bytes)"
echo "$RES" | grep -q "\"code\":\"$CODE\"" && ok "$CODE 一覧に存在" || ng "$CODE 一覧に無し"

step "/popscan/redeem-promo $CODE (count 2 → 1)"
RES=$(curl -sS -X POST -H 'content-type: application/json' -d "{\"code\":\"$CODE\"}" "$BASE/popscan/redeem-promo")
echo "  $RES"
echo "$RES" | grep -q '"success":true' && ok "redeem 成功" || ng "redeem 失敗"

step "/popscan/redeem-promo $CODE (count 1 → 0)"
RES=$(curl -sS -X POST -H 'content-type: application/json' -d "{\"code\":\"$CODE\"}" "$BASE/popscan/redeem-promo")
echo "  $RES"
echo "$RES" | grep -q '"success":true' && ok "redeem 成功" || ng "redeem 失敗"

step "/popscan/redeem-promo $CODE (count 0 → 失敗)"
RES=$(curl -sS -X POST -H 'content-type: application/json' -d "{\"code\":\"$CODE\"}" "$BASE/popscan/redeem-promo")
echo "  $RES"
echo "$RES" | grep -q '"success":false' && ok "redeem 失敗 (期待通り)" || ng "redeem は失敗するはず"

step "/popscan/manage-promos DELETE $CODE"
RES=$(curl -sS -X DELETE -u "$BASIC_AUTH" -H 'content-type: application/json' \
  -d "{\"code\":\"$CODE\"}" "$BASE/popscan/manage-promos")
echo "  $RES"
echo "$RES" | grep -q "\"deleted\":\"$CODE\"" && ok "削除" || ng "削除失敗"

step "/popscan/manage-promos 認証なし (401 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -X GET "$BASE/popscan/manage-promos")
assert_status "$S" "401" "認証拒否"

# =========================================================
# 6. ルート / popscan/ ページ + 旧パス廃止確認
# =========================================================

step "/ ルート (200 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/")
assert_status "$S" "200" "ルート 200"

step "/popscan/ (200 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/popscan/")
assert_status "$S" "200" "/popscan/ 200"

step "/time 旧パス廃止 (404 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/time")
assert_status "$S" "404" "旧 /time 廃止"

step "/set-promo 旧パス廃止 (404 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -X POST --data 'true' "$BASE/set-promo")
assert_status "$S" "404" "旧 /set-promo 廃止"

step "/redeem-promo 旧パス廃止 (404 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -X POST -d '{"code":"X"}' "$BASE/redeem-promo")
assert_status "$S" "404" "旧 /redeem-promo 廃止"

step "/manage-promos 旧パス廃止 (404 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/manage-promos")
assert_status "$S" "404" "旧 /manage-promos 廃止"

step "/admin/ 旧パス廃止 (404 期待・middleware は通らずそのまま 404)"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/admin/")
assert_status "$S" "404" "旧 /admin/ 廃止"

# =========================================================
# 7. Filmator: /filmator/admin/ Basic 認証
# =========================================================

FCODE="FSMK$RANDOM"

step "/filmator/admin/ Basic Auth により 401 期待"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/filmator/admin/")
assert_status "$S" "401" "/filmator/admin/ 401"

step "/filmator/admin/ X-Robots-Tag noindex 確認"
H=$(curl -s -I "$BASE/filmator/admin/" | tr -d '\r')
echo "  $H" | grep -qi 'x-robots-tag.*noindex' && ok "noindex あり" || ng "noindex なし"

step "/filmator/admin/ WWW-Authenticate Basic ヘッダ確認 (realm=juno.tokyo Admin)"
echo "  $H" | grep -qi 'www-authenticate.*basic' && ok "Basic 認証要求あり" || ng "WWW-Authenticate なし"
echo "  $H" | grep -qi 'realm="juno.tokyo admin"' && ok "realm 共通化 OK" || ng "realm が juno.tokyo Admin でない"

step "/filmator/admin (trailing slash なし) Basic 401 期待"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/filmator/admin")
assert_status "$S" "401" "/filmator/admin 401"

step "/filmator/admin/ Basic 認証あり → 200 期待"
S=$(curl -s -o /dev/null -w '%{http_code}' -u "$BASIC_AUTH" "$BASE/filmator/admin/")
assert_status "$S" "200" "/filmator/admin/ 認証成功"

step "/filmator/admin/stats/ Basic 401 期待"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/filmator/admin/stats/")
assert_status "$S" "401" "/filmator/admin/stats/ 401"

step "/filmator/admin/stats/ Basic 認証あり → 200 期待"
S=$(curl -s -o /dev/null -w '%{http_code}' -u "$BASIC_AUTH" "$BASE/filmator/admin/stats/")
assert_status "$S" "200" "/filmator/admin/stats/ 認証成功"

step "/filmator/admin-stats 認証なし (401 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/filmator/admin-stats")
assert_status "$S" "401" "/filmator/admin-stats 401"

step "/filmator/admin-stats?days=7 認証あり → 200 + JSON 妥当"
RES=$(curl -sS -u "$BASIC_AUTH" "$BASE/filmator/admin-stats?days=7")
echo "  ($(echo "$RES" | wc -c | tr -d ' ') bytes)"
echo "$RES" | grep -q '"days"' && ok "days フィールドあり" || ng "days フィールド無し"
echo "$RES" | grep -q '"launch"' && ok "events.launch あり" || ng "events.launch 無し"
echo "$RES" | grep -q '"catalog_opened"' && ok "events.catalog_opened あり" || ng "events.catalog_opened 無し"
echo "$RES" | grep -q '"edit_committed"' && ok "events.edit_committed あり" || ng "events.edit_committed 無し"
echo "$RES" | grep -q '"export_succeeded"' && ok "events.export_succeeded あり" || ng "events.export_succeeded 無し"
echo "$RES" | grep -q '"errorsByCode"' && ok "errorsByCode あり" || ng "errorsByCode 無し"
echo "$RES" | grep -q '"exportPhotos"' && ok "exportPhotos あり" || ng "exportPhotos 無し"
echo "$RES" | grep -q '"exportSizeBuckets"' && ok "exportSizeBuckets あり" || ng "exportSizeBuckets 無し"

step "/filmator/admin-stats?days=999 → clamp 30 (200 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -u "$BASIC_AUTH" "$BASE/filmator/admin-stats?days=999")
assert_status "$S" "200" "/filmator/admin-stats clamp"

step "/filmator/admin-error-log 認証なし (401 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/filmator/admin-error-log")
assert_status "$S" "401" "/filmator/admin-error-log 401"

step "/filmator/admin-error-log?days=3 認証あり → 200 + JSON 妥当"
RES=$(curl -sS -u "$BASIC_AUTH" "$BASE/filmator/admin-error-log?days=3")
echo "  ($(echo "$RES" | wc -c | tr -d ' ') bytes)"
echo "$RES" | grep -q '"entries"' && ok "entries フィールドあり" || ng "entries フィールド無し"

# =========================================================
# 8. /filmator/analytics
# =========================================================

step "/filmator/analytics 正常系 (launch)"
RES=$(curl -sS -X POST -H 'content-type: application/json' \
  -d '{"event":"launch"}' "$BASE/filmator/analytics")
echo "  $RES"
echo "$RES" | grep -q '"ok":true' && ok "analytics launch ok" || ng "analytics launch 失敗"

step "/filmator/analytics catalog_opened"
RES=$(curl -sS -X POST -H 'content-type: application/json' \
  -d '{"event":"catalog_opened"}' "$BASE/filmator/analytics")
echo "  $RES"
echo "$RES" | grep -q '"ok":true' && ok "catalog_opened ok" || ng "catalog_opened 失敗"

step "/filmator/analytics edit_committed"
RES=$(curl -sS -X POST -H 'content-type: application/json' \
  -d '{"event":"edit_committed"}' "$BASE/filmator/analytics")
echo "  $RES"
echo "$RES" | grep -q '"ok":true' && ok "edit_committed ok" || ng "edit_committed 失敗"

step "/filmator/analytics export_succeeded (photos=24)"
RES=$(curl -sS -X POST -H 'content-type: application/json' \
  -d '{"event":"export_succeeded","photos":24}' "$BASE/filmator/analytics")
echo "  $RES"
echo "$RES" | grep -q '"ok":true' && ok "export_succeeded(24) ok" || ng "export_succeeded(24) 失敗"

step "/filmator/analytics export_succeeded photos 欠落 (400 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' \
  -d '{"event":"export_succeeded"}' "$BASE/filmator/analytics")
assert_status "$S" "400" "export_succeeded photos 必須"

step "/filmator/analytics export_succeeded photos 文字列 (400 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' \
  -d '{"event":"export_succeeded","photos":"abc"}' "$BASE/filmator/analytics")
assert_status "$S" "400" "photos 数値以外 reject"

step "/filmator/analytics export_succeeded photos 上限超え (200 でクランプ)"
RES=$(curl -sS -X POST -H 'content-type: application/json' \
  -d '{"event":"export_succeeded","photos":999999}' "$BASE/filmator/analytics")
echo "  $RES"
echo "$RES" | grep -q '"ok":true' && ok "photos 999999 クランプ ok" || ng "photos クランプ失敗"

step "/filmator/analytics launch + photos 余剰 (400 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' \
  -d '{"event":"launch","photos":5}' "$BASE/filmator/analytics")
assert_status "$S" "400" "非 export_succeeded で photos 禁止"

step "/filmator/analytics error 系 (error_occurred + メタ)"
RES=$(curl -sS -X POST -H 'content-type: application/json' \
  -d '{"event":"error_occurred","error_code":"export.write_failed","app_version":"1.0.0","build":"100","os_version":"14.5"}' \
  "$BASE/filmator/analytics")
echo "  $RES"
echo "$RES" | grep -q '"ok":true' && ok "error_occurred ok" || ng "error_occurred 失敗"

step "/filmator/analytics 不正 event (400 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' \
  -d '{"event":"hack_attempt"}' "$BASE/filmator/analytics")
assert_status "$S" "400" "不正 event reject"

step "/filmator/analytics PopScan 専用 event は reject (400 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' \
  -d '{"event":"save_succeeded"}' "$BASE/filmator/analytics")
assert_status "$S" "400" "save_succeeded reject"

step "/filmator/analytics 不正 error_code (400 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' \
  -d '{"event":"error_occurred","error_code":"camera.permission_denied"}' "$BASE/filmator/analytics")
assert_status "$S" "400" "PopScan 専用 error_code reject"

step "/filmator/analytics error_code 欠落 (400 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' \
  -d '{"event":"error_occurred"}' "$BASE/filmator/analytics")
assert_status "$S" "400" "error_occurred error_code 必須"

step "/filmator/analytics GET (405 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/filmator/analytics")
assert_status "$S" "405" "GET 拒否"

# =========================================================
# 9. /filmator/manage-promos と /filmator/redeem-promo
# =========================================================

step "/filmator/manage-promos POST 追加 ($FCODE)"
RES=$(curl -sS -X POST -u "$BASIC_AUTH" -H 'content-type: application/json' \
  -d "{\"code\":\"$FCODE\",\"expires\":\"$EXPIRES\",\"count\":2}" "$BASE/filmator/manage-promos")
echo "  $RES"
echo "$RES" | grep -q "\"code\":\"$FCODE\"" && ok "$FCODE 登録" || ng "$FCODE 登録失敗"

step "/filmator/manage-promos GET で $FCODE 取得"
RES=$(curl -sS -u "$BASIC_AUTH" "$BASE/filmator/manage-promos")
echo "  ($(echo "$RES" | wc -c | tr -d ' ') bytes)"
echo "$RES" | grep -q "\"code\":\"$FCODE\"" && ok "$FCODE 一覧に存在" || ng "$FCODE 一覧に無し"

step "/filmator/redeem-promo $FCODE (count 2 → 1)"
RES=$(curl -sS -X POST -H 'content-type: application/json' -d "{\"code\":\"$FCODE\"}" "$BASE/filmator/redeem-promo")
echo "  $RES"
echo "$RES" | grep -q '"success":true' && ok "redeem 成功" || ng "redeem 失敗"

step "/filmator/redeem-promo $FCODE (count 1 → 0)"
RES=$(curl -sS -X POST -H 'content-type: application/json' -d "{\"code\":\"$FCODE\"}" "$BASE/filmator/redeem-promo")
echo "  $RES"
echo "$RES" | grep -q '"success":true' && ok "redeem 成功" || ng "redeem 失敗"

step "/filmator/redeem-promo $FCODE (count 0 → 失敗)"
RES=$(curl -sS -X POST -H 'content-type: application/json' -d "{\"code\":\"$FCODE\"}" "$BASE/filmator/redeem-promo")
echo "  $RES"
echo "$RES" | grep -q '"success":false' && ok "redeem 失敗 (期待通り)" || ng "redeem は失敗するはず"

step "/filmator/manage-promos DELETE $FCODE"
RES=$(curl -sS -X DELETE -u "$BASIC_AUTH" -H 'content-type: application/json' \
  -d "{\"code\":\"$FCODE\"}" "$BASE/filmator/manage-promos")
echo "  $RES"
echo "$RES" | grep -q "\"deleted\":\"$FCODE\"" && ok "削除" || ng "削除失敗"

step "/filmator/manage-promos 認証なし (401 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -X GET "$BASE/filmator/manage-promos")
assert_status "$S" "401" "認証拒否"

# =========================================================
# 10. Filmator: 作らないエンドポイント (404 期待・docs/08 §2)
# =========================================================

step "/filmator/time は実装しない (404 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/filmator/time")
assert_status "$S" "404" "/filmator/time 未実装"

step "/filmator/set-promo は実装しない (404 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -X POST --data 'true' "$BASE/filmator/set-promo")
assert_status "$S" "404" "/filmator/set-promo 未実装"

step "/filmator/ (LP プレースホルダ・200 期待・M4 S2 で本実装)"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/filmator/")
# M4 S2 の LP 実装前は 404 を許容（admin だけが存在）
if [[ "$S" == "200" || "$S" == "404" ]]; then ok "/filmator/ status=$S (200=LP あり / 404=LP 未実装＝M4 S2 待ち)"; else ng "/filmator/ status=$S"; fi

echo ""
echo "═══════════════════════════════════════"
echo "  RESULT: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════"

[[ $FAIL -eq 0 ]]
