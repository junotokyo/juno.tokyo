# juno.tokyo — セッション引き継ぎ

新規セッションを始める前に必ず本ファイルを Read し、直近の作業状態を把握する。
最新エントリが先頭・最大 5 件まで保持し、超えた分は `scripts/handoff_finalize.py` が
`docs/handoff/Handoff-YYYYMM.md` に自動アーカイブする。

書き方・運用ルールは `docs/process/handoff-workflow.md` を参照。

---

### [2026-06-27] Filmator JT-279 サーバ側＝ catalog.schema_unsupported 受信＋ severity 汎用化＋メール通知＋admin/stats 拡張

**完了したこと**

- **[JT-279](https://linear.app/junotokyo/issue/JT-279) サーバ側コード変更完了**（Filmator アプリ側 [JT-278](https://linear.app/junotokyo/issue/JT-278) の受信先・Done 認定は Jun の本番動作確認後）：
  - `api/_lib/filmator-event-codes.js`: `ALLOWED_ERROR_CODES` に `catalog.schema_unsupported` 追加。新規 export＝`SEVERITY_HIGH` / `ALLOWED_SEVERITIES` / `ERROR_CODE_SEVERITY`（サーバ map authoritative）/ `EXTENSION_FIELD_RULES`。
  - 新規 `api/_lib/filmator-validators.js`: `isCsvField`（path char + blacklist トークン拒否）/ `isIntInRange`。Adobe 由来 schema 名のみ通る content-free 防御。
  - 新規 `api/_lib/filmator-notify.js`: Resend メール送信 + KV `SET NX EX 86400` で 1 日 1 通 dedupe。`no_mailer` 時は slot claim せず即 return（env 設定後の同日に送信できる・Codex A Q1）。mailer throw 時は console.error に「手動 DEL するキー名」print（Codex A Q2 部分採用）。
  - `api/filmator-analytics.js`: 拡張フィールド validation（schema_unsupported 専用）+ severity counter + diag SADD（90 日 TTL）を pipeline で atomic（Codex A Q7）+ notify 発火。
  - `api/_lib/admin-aggregate.js`: 新規 pure 関数 `aggregateSeverity` / `aggregateDiagSets`。
  - `api/filmator-admin-stats.js`: severity / db_version / missing_tables / missing_columns 集計を response に追加。3 種 × days SMEMBERS を **pipeline で 1 round-trip**（Codex B P2＝366 日範囲で 1098 並列 REST 回避）。
  - `filmator/admin/stats/index.html` + `stats.js`: 「高 severity エラー」（KPI 3 枚＋線グラフ・KPI の最新日は `daily[0]`＝Codex B P3）と「LrC スキーマ診断」（db_version 範囲＋missing top 20 observation-days）の 2 セクション追加。ログテーブルに severity / db_version / missing 列追加。
- **テスト 64 件全 green**：
  - `scripts/test-filmator-analytics.mjs` 27 件（既存 + severity / validator / blacklist / integrity）
  - `scripts/test-filmator-analytics-handler.mjs` 13 件（新規・mock req/res で 400 validation paths）
  - `scripts/test-filmator-notify.mjs` 7 件（新規・dedupe / no_mailer / fail-closed / privacy 退行）
  - `scripts/test-admin-stats-aggregate.mjs` 17 件（既存 + aggregateSeverity / aggregateDiagSets）
- **Codex 投入実績**：A プランレビュー 1 回（Q1-Q12・採用 9 + 部分採用 2 + 保留 1 + 却下 0）＋ B 実装後レビュー 1 回（P2/P3 即採用）。Codex モード 通常維持（残 82%）。

**申し送り**

- 🔴 **Vercel 環境変数を Jun が設定する必要あり**（Production + Preview）：
  - `RESEND_API_KEY`（resend.com サインアップ → API Keys → Create。GitHub 連携で無料 100 通/日）
  - `FILMATOR_NOTIFY_TO=jokamoto@mac.com`（Resend サインアップ時のメールと一致させると初期から OK）
  - `FILMATOR_NOTIFY_FROM=onboarding@resend.dev`（DNS 検証なし初期運用・後日 `alerts@juno.tokyo` に切替可）
  - **未設定でも server は no_mailer skip で動く**（KV / admin/stats は正常・メールのみ送られない）
- 🔴 **本セッションで env 設定なしで push 済**＝Filmator アプリから `catalog.schema_unsupported` が届くと KV diag set + severity counter に積まれるが**メールは送られない**。Jun が env 設定したら、次に発生した high severity event で初めて 1 通届く（dedupe slot は no_mailer 時に claim していないため）。
- 🔴 **Resend recipient 制約**：初期は **アカウント登録メール宛にしか送れない**（無料枠）。サインアップ時 `jokamoto@mac.com` で登録すれば即運用 OK。万一失敗時：(a) Resend dashboard で recipient verify or (b) `juno.tokyo` ドメイン検証で `alerts@juno.tokyo` に切替（SPF/DKIM レコード追加）。
- 🔴 **Codex 保留（次セッション follow-up 候補）**：
  - Q2 「mailer failure 時に `/admin/stats` で可視化」＝今は console.error の手動 DEL print のみ。failure が頻発するなら admin UI に表示する別 JT を起票。
  - Q8 「`schemaUnsupportedRecent` 専用 short list」＝error_log 100 件枠を high severity が押し出す可能性。catalog.schema_unsupported は年数回想定で見送り。実運用で押し出しが見えたら別 JT。
- 🔴 **Filmator 側 dual-send 撤去は別 JT**：JT-278 が baseline `catalog.open_failed` 併送中。サーバが `catalog.schema_unsupported` を許可した今、Filmator アプリ側で baseline 併送を撤去できる（次セッション or 別 JT）。撤去前後も privacy / 集計の整合は維持（baseline は別カウントなので削除しても新コード集計は無影響）。
- ⚠️ **Filmator 側の処理は別セッションで実施**（本 commit はサーバ側のみ）：Filmator リポジトリで Linear JT-279 を Done、docs/06 を ✅、Handoff.md 追記、main FF + push。


### [2026-06-18] Filmator M4 S1 完了（命名統一・実機検証）

**完了したこと**

- M4 S1（Linear JT-246 オンライン基盤サーバ・JT-247 管理ページ）を本番反映＋実機検証まで完了。
  - 5 commits（`1f90171` feat → `f7dc394` Codex Q4 fix → `dc3b176` filmator: 接頭語 → `3e71669` popscan: 接頭語＋移行スクリプト → `bb81c28` smoke 修正）を `origin/main` へ FF push 済。
  - 当初は「Filmator 専用 Upstash DB（接頭語なし）」設計だったが、Vercel Marketplace Free 枠 1 DB 制約と判明し、
    途中で「既存 DB 共用＋ `filmator:` 接頭語分離」に方針変更。ジュンさん判断で PopScan 既存キーも `popscan:`
    接頭語に遡及付与（`scripts/migrate-junotokyo-prefix.mjs` で既存 71 件を `RENAME`）。
  - Upstash DB 名も `popscan-config` → **`junotokyo-shared-kv`** にリネーム（ラベル変更のみ・env 不変）。
- 動作確認結果：
  - smoke test 95/95 pass（PopScan 既存 + Filmator 新規 + Codex Q4 `/api/*` 直叩き保護 計 7）
  - 純関数テスト 25/25 pass
  - PopScan 実機アプリで scan/save → 本番サーバ → KV → admin stats グラフ反映の **フルパス E2E 確認**
  - Filmator admin stats で smoke 由来データが期待通り表示（`photos` クランプ 999999→100000・bucket 分類
    `11-50` / `201+` ・error_log）
- Codex セクション B 実装後レビュー実施：Q4（`/api/*` middleware 迂回）採用＋ PopScan 既存リスクも同時修正。
  Q1/Q3 は A 案移行で構造的に解消。Q2/Q6/Q7 は保留（下記申し送り）。

**申し送り**

- 🔴 **Upstash DB 名は `junotokyo-shared-kv`**。「JUNO Tokyo 内の複数アプリで共有する KV」を明示。
  将来 Blob/Postgres を追加するときも `junotokyo-<scope>-{blob,postgres}` で命名を揃えやすい。
  Vercel/Upstash UI のラベル変更だけ＝接続 URL/Token は不変、env 更新不要。
- 🔴 **KV キー命名規約**：全キーに `<app>:` 接頭語必須（PopScan = `popscan:`、Filmator = `filmator:`）。
  新アプリ追加時は同パターンで `<app>:` を付ける（接頭語なし＝直接 DB ルートに書き込みは禁止）。
  `_lib/admin-aggregate.js` は `stats:` キー前提の純関数なので、admin-stats 側で MGET 結果のキーから
  `<app>:` プレフィックスを strip してから渡す（`popscan-admin-stats.js` / `filmator-admin-stats.js` 同型）。
- 🔴 **`/api/<app>-{set-promo,manage-promos,admin-stats,admin-error-log}` の middleware matcher 必須**：
  Codex Q4 で発覚した認可バイパス。Vercel middleware は incoming request path で評価するので、rewrite 後の
  公開パスだけでなく rewrite 前の `/api/*` も matcher に列挙しないと直叩きで素通りする。新アプリで認証必須
  Function を追加するときは `/api/<app>-*` を matcher に列挙する。
- middleware realm は `"juno.tokyo Admin"` で PopScan/Filmator 共通化済み＝同一 user/pass でブラウザの
  Basic 認証 Authorization ヘッダを横断 replay 可能（`/popscan/admin/` ↔ `/filmator/admin/` で再ログイン不要）。
- **Codex セクション B 保留事項**（次セッション以降の検討候補）：
  - Q2 INCR/INCRBY/LPUSH の部分書き込み非 atomic（PopScan 同型・統計正確性を重視するなら pipeline/MULTI 化）
  - Q6 `days=30` 時の MGET 約 1095 キーの Upstash 制限（運用しながら実測）
  - Q7 `RATE_LIMIT_SCRIPT` のコメント「decrement」誤記・`parseInt('1abc')` 受け入れ等の軽微 cleanup
- **smoke の副作用（既知の罠）**：
  - `popscan:promo` を最後に `false` で書き戻すため、smoke 実行後に Promo Flag が OFF になる。
    プロモ期間中は実行後に手動で ON に戻す必要あり（本セッションでも発生＝復旧済）。
  - `popscan:stats:*` `filmator:stats:*` に smoke データが入って永続化する。
  - `popscan:error_log:*` `filmator:error_log:*` も汚れるが 7 日 TTL で自然消滅。
  - プロモ期間が 2026-06-19 で終了のため今回は smoke 改善は見送り。改善するなら「smoke 開始時に現在値を
    保存して、最後に書き戻す」「`?dry=1` のようなテストフラグで INCR/LPUSH をスキップする」の 2 案。
- ✅ **Filmator リポジトリ側 docs/08 を本セッション末で更新済**（ジュンさん指摘＝同一論理タスクの完了処理は
  同セッション内で完結すべき）：§3.6 / §5.2 / §7 / §8 を「`junotokyo-shared-kv` 共用＋`filmator:` 接頭語」設計に
  書き換え。Filmator リポジトリで commit + push 完了（Filmator 側 Handoff.md 最新エントリも参照）。
- ✅ **Linear JT-246 / JT-247 を本セッション末で Done 化済**（2026-06-18T06:10:20Z・`completedAt` 反映）。
- **worktree `unruffled-germain-be712a`** はチェックボックス起動（UI「ワークツリー」生成）なので
  `ExitWorktree` 不可。Bash フォールバックで削除（本 handoff の最後で実施）。

---

### [2026-06-18] Filmator M4 S1 — オンライン基盤サーバ＋管理ページ（JT-246／JT-247・実装完了・実機確認待ち）

設計：Filmator リポジトリ `docs/08-オンライン通信・テレメトリ・課金設計.md` §5。PopScan `/popscan/*`
基盤を **同型コピー**して `/filmator/*` 配下に自己完結化。

🔴 **docs/08 §0 からの方針逸脱**：当初は「Filmator 専用 Upstash DB（接頭語なしキー命名）」を予定していたが、
**Vercel Marketplace 経由の Upstash 統合は Free 枠で 1 DB 制約**（Marketplace 上で `Pay As You Go` $0.2/100K
commands 以上しか選択不能・Upstash 直接アカウントの「10 DB まで Free」とは別契約）と判明したため、
**既存 `popscan-config` DB 共用＋ `filmator:` プレフィックスでキー論理分離**に方針変更。PopScan キー命名と
完全に分離（衝突ゼロ）、Vercel 一元管理を維持、追加課金ゼロ。Filmator リポジトリ側 docs/08 §0 / §5.2 の
記述（接頭語なし / 別 DB）は本変更を受けて Filmator セッション側で次回更新。

**完了したこと（worktree `unruffled-germain-be712a` でコミット待ち）**

- **共有純関数の整理（`api/_lib/`）**
  - `kv.js`：PopScan 既存の `kv`（`KV_REST_API_URL`/`KV_REST_API_TOKEN`）を Filmator も共用する形に固定。
    （初版で導入した `filmatorKv` factory は方針変更で削除済み＝1 DB 共用＋キー接頭語で論理分離）
  - `photos-bucket.js`（新規）：`clampPhotos`（1..100000）／`bucketForPhotos`（1 / 2-10 / 11-50 / 51-200 / 201+）／
    `SIZE_BUCKETS` を export。
  - `filmator-event-codes.js`（新規）：`ALLOWED_EVENTS` / `ALLOWED_ERROR_CODES` / `ERROR_EVENTS`。
    分離理由＝analytics と admin-stats から共有しつつテストが `kv.js` を副作用ロードしないように切り出し。
- **Vercel Functions 5 本（`api/filmator-*.js`）**：PopScan からの移植。
  **全てのキーは `filmator:` プレフィックス**で命名（PopScan キーと衝突しない）。
  - `filmator-analytics.js`：event/error_code allow-list を Filmator 用に差し替え。`export_succeeded` で `photos`
    をクランプ → `filmator:stats:{date}:export_succeeded:photos` INCRBY ＋
    `filmator:stats:{date}:export_size:{bucket}` INCR を追加。`unexpected_photos`（非 export イベントで
    photos 付き）を 400 reject。
  - `filmator-redeem-promo.js`：PopScan からほぼそのまま。Redis EVAL（Lua）は `kv.eval` で atomic 検証＋ count decrement。
    キーは `filmator:promo-code:*` ／ `filmator:promo-redeem-rate:*`。
  - `filmator-manage-promos.js`：PopScan からほぼそのまま。`filmator:promo-code:*` キーの CRUD＋ SCAN 一覧。
  - `filmator-admin-stats.js`：`exportPhotos`（枚数合計）と `exportSizeBuckets`（bucket 別 daily/total）を集計に追加。
    `aggregateStats` 純関数は PopScan と共用（`stats:` キー前提）なので、MGET 結果を渡す前に
    `filmator:` プレフィックスを strip して扱う。
  - `filmator-admin-error-log.js`：PopScan からほぼそのまま。`filmator:error_log:{date}` を LRANGE。
- **`vercel.json`**：Filmator rewrites 5 本（`/filmator/analytics`・`/redeem-promo`・`/manage-promos`・`/admin-stats`・
  `/admin-error-log`）と `/filmator/admin*` の `X-Robots-Tag: noindex` ヘッダ、`/filmator → /filmator/` リダイレクトを追加。
  PopScan エントリは無変更。**`/filmator/time` と `/filmator/set-promo` は実装しない**（docs/08 §2）。
- **`middleware.js`**：matcher に Filmator 用 5 件を追加（set-promo は除外）。realm を `"PopScan Admin"` →
  **`"juno.tokyo Admin"`** に共通化。これで `/popscan/admin/` ↔ `/filmator/admin/` を同一 user/pass で
  ブラウザクレデンシャル自動 replay 可能。
- **管理ページ（`filmator/admin/`・`filmator/admin/stats/`）**：PopScan admin を流用。
  - Promo Flag セクション削除（`/filmator/set-promo` を作らないため）。
  - 配色を Filmator 寄り（ティール基調 #0d9488・背景 #f7faf9）に調整。LP のカラー（M4 S2 JT-259）確定後に再調整可。
  - stats ページに **「書き出し枚数 日次推移」「書き出しバッチサイズ分布（stacked bar）」**を追加。KPI に
    `edit_committed`・`catalog_opened`・「書き出し枚数 合計」を追加。
- **テスト**
  - `scripts/test-filmator-analytics.mjs`（新規・12 件 green）：clampPhotos・bucketForPhotos・SIZE_BUCKETS・
    ALLOWED_EVENTS/ERROR_CODES の集合契約。PopScan 専用 event/error_code が含まれていないことを negative test で担保。
  - 既存 `test-admin-stats-aggregate.mjs`（12 件）・`test-jst-datekey.mjs` も regression なし。
  - `scripts/smoke.sh` に Filmator 用ケース 25 件追加（Basic 認証・realm 共通化・X-Robots-Tag・analytics
    正常系/異常系・photos クランプ・PopScan 専用 event/code reject・promo redeem ライフサイクル・
    `/filmator/time` `/filmator/set-promo` が 404）。

**✅ Vercel env 追加作業：不要**

A 案（既存 `popscan-config` DB 共用＋接頭語分離）への方針変更により、Vercel ダッシュボードでの新規 Upstash
DB 作成・env 追加は不要。既存の `KV_REST_API_URL` / `KV_REST_API_TOKEN`（PopScan 用）を PopScan/Filmator
両方が使う＝命名衝突は `popscan:` / `filmator:` プレフィックスで論理分離。

**🔴 命名統一の総ざらい（本セッション内で追加実施）**

ジュンさん判断で「PopScan キーにも `popscan:` 接頭語を遡及付与」を本セッション内で完遂。アプリ追加で歪んでいく
状態を避けるための一括投資。

- PopScan サーバ 7 本のキー命名を全て `popscan:` プレフィックス付きに変更：
  - `promo` → `popscan:promo`（popscan-time.js / popscan-set-promo.js）
  - `stats:{date}:*` → `popscan:stats:{date}:*`（popscan-analytics.js / popscan-admin-stats.js）
  - `error_log:{date}` → `popscan:error_log:{date}`（popscan-analytics.js / popscan-admin-error-log.js）
  - `promo-code:{CODE}` → `popscan:promo-code:{CODE}`（popscan-redeem-promo.js / popscan-manage-promos.js）
  - `promo-redeem-rate:{code|global}` → `popscan:promo-redeem-rate:{code|global}`（popscan-redeem-promo.js）
- `popscan-admin-stats.js` は MGET 結果を `aggregateStats`（PopScan/Filmator 共用純関数・`stats:` キー前提）に
  渡す前に `popscan:` プレフィックスを strip するキーマッパを挟む（Filmator 側と同型）。
- 移行スクリプト `scripts/migrate-junotokyo-prefix.mjs` を追加：既存 KV の接頭語なしキーを SCAN で列挙し
  `RENAME` で `popscan:` 付きに移行。ドライラン既定・`--apply` で実行。`filmator:*` / `popscan:*`（既移行）は
  防御的に除外。`promo-redeem-rate:*` は TTL 60s で自動消滅するため対象外（コード切替直後の一時的計測リセットは許容）。
- PopScan アプリ側（iOS）は KV を直接叩かない（サーバ HTTP API のみ）＝**アプリのアップデート不要**。

**🔴 push 後の必須手順（ジュンさん作業）**

main へ push すると Vercel が新コード（`popscan:` 接頭語前提）を即 Production に反映する。push 直後に
以下を実行して既存 KV データを新キーに移行する。**push と移行スクリプトの間隔が長いほど不整合期間が伸びる**ので、
push 直後すぐに実行する。

```bash
# 1. Vercel Dashboard → juno-tokyo project → Storage → KV → .env.local Snippet から
#    KV_REST_API_URL と KV_REST_API_TOKEN をコピーして export

export KV_REST_API_URL='https://...upstash.io'
export KV_REST_API_TOKEN='...'

# 2. ドライラン（リネーム対象を一覧表示・実書き込みなし）
node scripts/migrate-junotokyo-prefix.mjs

# 3. 内容確認 OK なら本番実行
node scripts/migrate-junotokyo-prefix.mjs --apply

# 4. smoke test で全体確認
POPSCAN_BASIC_PASS=xxx ./scripts/smoke.sh https://juno.tokyo
```

不整合期間の影響：
- 期間中の PopScan アプリからの `launch` / `save_succeeded` 等の analytics → 新コードは `popscan:stats:*` に
  書き込み・旧キー `stats:*` には書かれない＝旧コード時代の集計値は移行スクリプトで救済
- 期間中の `/popscan/time` quota_check → 新コードは `popscan:promo` を読む・旧 `promo` は移行スクリプトで救済
- 本日分の analytics 計上漏れがあっても許容（ジュンさん確認済）

**任意：DB 名リネーム（Upstash 直接 UI）**

機能的には不要だが、長期視点で「PopScan 専用 DB」感を払拭したいなら：

1. Upstash Dashboard（Vercel Marketplace 経由でログイン）→ `popscan-config` DB の設定
2. Database name を `junotokyo-config` に変更（URL/Token は不変＝ Vercel 側 env 更新不要）

これは接続には影響しない単なるラベル変更。後日でも可。

**Codex セクション B 実装後レビューと採否（codex-collab.md B）**

`codex exec --profile juno-tokyo-review` で 1f90171 をレビュー。Q1〜Q7 で観点を絞り、結果：

| 指摘 | 採否 | 対応 |
|------|------|------|
| Q4 `/api/*` 直叩きが middleware 迂回（PopScan/Filmator 共通の認可バイパス） | **採用** | `middleware.js` matcher に `/api/popscan-{set-promo,manage-promos,admin-stats,admin-error-log}` と `/api/filmator-{manage-promos,admin-stats,admin-error-log}` を追加。`scripts/smoke.sh` に直叩き 401 検証 7 件追加。PopScan 既存リスクも同時修正＝本コミットの副次効果（既存 PopScan エンドポイントの認可を強化）。 |
| Q3 env 誤設定時の混線（`FILMATOR_KV_REST_API_URL` が誤って PopScan DB を指すと `promo-code:*` 衝突） | **解消（無効化）** | A 案で **意図的に同一 DB を共用**＋ `filmator:` 接頭語で論理分離する方針へ変更。Q3 が前提とした「別 DB env 誤設定」シナリオ自体が無くなった。`promo-code:*` 衝突は接頭語で防止。 |
| Q1 `kv.js` factory で `filmatorKv` env 未設定時の SDK throw 懸念 | **解消（無効化）** | A 案で `filmatorKv` factory を削除し既存 `kv` のみに統合。新規 env を追加しない＝懸念対象が消えた。 |
| Q2 INCR/INCRBY/bucket INCR の部分書き込み非 atomic | **保留** | PopScan 同型（`popscan-analytics.js` も同パターン）＝既存挙動踏襲。統計の若干不整合は許容。後日 pipeline 化候補。 |
| Q6 MGET 1095 keys（days=30）の Upstash 制限懸念 | **保留** | Preview smoke で `days=30` の実測で確認。 |
| Q7 `RATE_LIMIT_SCRIPT` コメント「decrement」誤記・`parseInt` の "1abc" 受け入れ等 | **保留** | 既存 PopScan からのコピー仕様。Critical でない。別タスク。 |
| Q5 rewrites/redirects 衝突・noindex が 401 でも付くか | 指摘なし（PopScan で実証済挙動） | — |

**残作業（次セッション）**

- ユーザー動作確認 → main FF + push
- Linear JT-246 / JT-247 を In Progress → Done（実機確認＝Preview の smoke test green を以て）
- **M4 S2 LP（JT-259 → JT-260 → JT-261）** へ：LP デザイン（ティール＆オレンジ・ダーク基調・PopScan 差別化）。
  LP カラー確定後、本 S で仮置きした admin の配色も合わせ込み可能（任意）。

**申し送り**

- 🔴 **`git push origin main` は Vercel が即 Production にデプロイ**。本 S は新規エンドポイント追加のみで
  PopScan 既存挙動には触らない設計だが、push 前に Preview で smoke test を回すのが安全。
- middleware realm を `"PopScan Admin"` → `"juno.tokyo Admin"` に変更。PopScan 管理ページの既存ブラウザ
  認証セッションは初回アクセスで再ログイン要求になる可能性（user/pass は同一なのでログインし直すだけ）。
- PopScan キーへの `popscan:` 接頭語遡及付与は本セッション内で完遂（移行スクリプト付き）。
  PopScan/Filmator 命名対称＝将来 nightowl 等の新アプリを追加するときも同じパターンで足せる。
- analytics クライアント側（Filmator アプリの `FilmatorAnalytics.swift`）は M4 S4（JT-249）で実装予定。
  本 S 完了時点では本番呼び出し側は無いので、smoke test の analytics ケースは「サーバが POST を受け付ける」
  ことだけを検証。実トラフィックは JT-249 配備後。
- promo コード手動発行は `/filmator/admin/` から実施（JT-248 のクライアント実装前でも検証可）。
- セッション開始時に `origin/main` が 1 commit 進んでいた（d649634 = 前回 Handoff 追記）。本 S 編集前に FF 取り込み済み。

---

### [2026-06-18] Claude Code 環境整備（初期セットアップ）

**完了したこと**
- Filmator プロジェクトの運用フレームワークを juno.tokyo 向けに移植した。
- 既存 `AGENTS.md` の事実情報（Vercel・DNS・Mail・Analytics 等）は `PROJECT.md` に移管し、
  `AGENTS.md` は Codex Desktop 直接作業 / Claude 委任 Codex CLI の動作モード判定エントリに再構成した。
- `CLAUDE.md` を新設（4 トリガー + `/handoff` ステップ 0 + セッション開始時 Read）。
- `docs/process/` に `handoff-workflow.md` / `plan-mode.md` / `codex-collab.md` /
  `codex-desktop-workflow.md` を配置。
- PreToolUse フックを配線：`scripts/hooks/worktree_path_guard.py`（worktree 外編集ブロック）と
  `scripts/hooks/git_safety_guard.py`（`git add -A` / `git commit -a` / worktree 稼働中の `-C` 無し変更系
  git ブロック）。`.claude/settings.json` に登録。
- `scripts/handoff_finalize.py` を Filmator から流用配置（プロジェクト名を juno.tokyo 化）。
- worktree 上で `0556daf chore: Claude Code 用の運用フレームワークを整備` をコミットし、
  `df75290..0556daf` を `origin/main` に FF push（Vercel 自動デプロイ済み・doc/設定のみで本番ロジックに影響なし）。

**申し送り**
- 🔴 **初回セットアップ時の事故**: `Write` の絶対パスを worktree でなく実体 main 側パスで指定してしまい、
  `filmator-lp` ブランチ作業中の作業ツリーにファイルが着地した。worktree path guard はフックなので
  **次セッションから有効化**される＝今回は構造的に防げなかった。リカバリは「実体 main から worktree へ
  ファイル移動 → `git checkout -- AGENTS.md` で実体側を restore」で完了。実体 main の `filmator-lp`
  作業（Codex 側 WIP と思われる）は無傷。
- 実体 main は `filmator-lp` ブランチに checkout 中で WIP あり（Codex 側で進行中の可能性）。誤って巻き込まないこと。
- 🔴 **`git push origin main` で Vercel が即 Production にデプロイされる**。Filmator と違ってここがクリティカル。
  確信のない変更を main に push しない。Preview で確認できる変更はまず Preview デプロイを踏む。
- `~/.codex/config.toml` に `juno-tokyo-review` / `juno-tokyo-edit` プロファイルを追記済み（既存 filmator-*
  / popscan-* と同形）。Claude が `codex exec` を呼ぶ際にこのプロファイル名を指定する。
- Linear タスク管理は本プロジェクトでは導入しない（Filmator にあった `docs/06-ロードマップ.md` /
  `roadmap-ops.md` / `codex_quota.py` 等の重い枠組みは流用していない）。タスクの源はユーザー指示と本 Handoff.md。
- フック変更はセッション再起動後に有効化される。**現セッションでは未適用**である点に注意。
- 既存の Codex 用 `AGENTS.md` は内容を `PROJECT.md` に再構成したので、Codex セッションも開始時に
  `PROJECT.md` を Read する想定（`AGENTS.md` 冒頭で明示）。
- canonical 実体パスは `~/Library/CloudStorage/Dropbox/Projects/Web/juno.tokyo`。Codex view alias
  `~/Library/CloudStorage/Dropbox/Codex/juno.tokyo` は symlink で同一実体を指す。
