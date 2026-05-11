#!/usr/bin/env bash
# Vercel デプロイ後の smoke test
# 使い方:
#   POPSCAN_ADMIN_TOKEN=xxx ./scripts/smoke.sh https://juno.tokyo
#   POPSCAN_ADMIN_TOKEN=xxx ./scripts/smoke.sh https://juno-tokyo-xxx.vercel.app

set -eu

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <BASE_URL>" >&2
  exit 1
fi

BASE="${1%/}"
TOKEN="${POPSCAN_ADMIN_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  echo "POPSCAN_ADMIN_TOKEN が未設定" >&2
  exit 1
fi

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

step "/time (通常)"
RES=$(curl -sS "$BASE/time")
echo "  $RES"
echo "$RES" | grep -q '"iso8601"' && ok "iso8601 あり" || ng "iso8601 なし"
echo "$RES" | grep -q '"unix"'    && ok "unix あり"    || ng "unix なし"
echo "$RES" | grep -q '"p"'       && ng "p フィールドが付いている (本来は無し)" || ok "p フィールド無し"

step "/time (quota_check)"
RES=$(curl -sS -H 'x-popscan-purpose: quota_check' "$BASE/time")
echo "  $RES"
echo "$RES" | grep -q '"p"' && ok "p フィールドあり" || ng "p フィールドなし"

step "/set-promo true"
RES=$(curl -sS -X POST -H "x-admin-token: $TOKEN" -H 'content-type: text/plain' --data 'true' "$BASE/set-promo")
echo "  $RES"
echo "$RES" | grep -q '"promo":true' && ok "promo:true" || ng "promo:true 期待"

step "/time quota_check で p=true 確認"
RES=$(curl -sS -H 'x-popscan-purpose: quota_check' "$BASE/time")
echo "  $RES"
echo "$RES" | grep -q '"p":true' && ok "p=true 確認" || ng "p=true 期待"

step "/set-promo false (元に戻す)"
RES=$(curl -sS -X POST -H "x-admin-token: $TOKEN" --data 'false' "$BASE/set-promo")
echo "  $RES"
echo "$RES" | grep -q '"promo":false' && ok "promo:false" || ng "promo:false 期待"

step "/manage-promos POST 追加 ($CODE)"
RES=$(curl -sS -X POST -H "x-admin-token: $TOKEN" -H 'content-type: application/json' \
  -d "{\"code\":\"$CODE\",\"expires\":\"$EXPIRES\",\"count\":2}" "$BASE/manage-promos")
echo "  $RES"
echo "$RES" | grep -q "\"code\":\"$CODE\"" && ok "$CODE 登録" || ng "$CODE 登録失敗"

step "/manage-promos GET で $CODE 取得"
RES=$(curl -sS -H "x-admin-token: $TOKEN" "$BASE/manage-promos")
echo "  ($(echo "$RES" | wc -c | tr -d ' ') bytes)"
echo "$RES" | grep -q "\"code\":\"$CODE\"" && ok "$CODE 一覧に存在" || ng "$CODE 一覧に無し"

step "/redeem-promo $CODE (count 2 → 1)"
RES=$(curl -sS -X POST -H 'content-type: application/json' -d "{\"code\":\"$CODE\"}" "$BASE/redeem-promo")
echo "  $RES"
echo "$RES" | grep -q '"success":true' && ok "redeem 成功" || ng "redeem 失敗"

step "/redeem-promo $CODE (count 1 → 0)"
RES=$(curl -sS -X POST -H 'content-type: application/json' -d "{\"code\":\"$CODE\"}" "$BASE/redeem-promo")
echo "  $RES"
echo "$RES" | grep -q '"success":true' && ok "redeem 成功" || ng "redeem 失敗"

step "/redeem-promo $CODE (count 0 → 失敗)"
RES=$(curl -sS -X POST -H 'content-type: application/json' -d "{\"code\":\"$CODE\"}" "$BASE/redeem-promo")
echo "  $RES"
echo "$RES" | grep -q '"success":false' && ok "redeem 失敗 (期待通り)" || ng "redeem は失敗するはず"

step "/manage-promos DELETE $CODE"
RES=$(curl -sS -X DELETE -H "x-admin-token: $TOKEN" -H 'content-type: application/json' \
  -d "{\"code\":\"$CODE\"}" "$BASE/manage-promos")
echo "  $RES"
echo "$RES" | grep -q "\"deleted\":\"$CODE\"" && ok "削除" || ng "削除失敗"

step "/set-promo 認証なし (401 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -X POST --data 'true' "$BASE/set-promo")
assert_status "$S" "401" "認証拒否"

step "/manage-promos 認証なし (401 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' -X GET "$BASE/manage-promos")
assert_status "$S" "401" "認証拒否"

step "/ ルート (200 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/")
assert_status "$S" "200" "ルート 200"

step "/popscan/ (200 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/popscan/")
assert_status "$S" "200" "/popscan/ 200"

step "/admin/ (200 期待)"
S=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/admin/")
assert_status "$S" "200" "/admin/ 200"

step "/admin/ X-Robots-Tag noindex 確認"
H=$(curl -s -I "$BASE/admin/" | tr -d '\r')
echo "  $H" | grep -qi 'x-robots-tag.*noindex' && ok "noindex あり" || ng "noindex なし"

echo ""
echo "═══════════════════════════════════════"
echo "  RESULT: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════"

[[ $FAIL -eq 0 ]]
