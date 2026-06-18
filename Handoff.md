# juno.tokyo — セッション引き継ぎ

新規セッションを始める前に必ず本ファイルを Read し、直近の作業状態を把握する。
最新エントリが先頭・最大 5 件まで保持し、超えた分は `scripts/handoff_finalize.py` が
`docs/handoff/Handoff-YYYYMM.md` に自動アーカイブする。

書き方・運用ルールは `docs/process/handoff-workflow.md` を参照。

---

### [2026-06-18] Filmator M4 S1 — オンライン基盤サーバ＋管理ページ（JT-246／JT-247・実装完了・実機確認待ち）

設計：Filmator リポジトリ `docs/08-オンライン通信・テレメトリ・課金設計.md` §5。PopScan `/popscan/*`
基盤を **同型コピー**して `/filmator/*` 配下に自己完結化。

**完了したこと（worktree `unruffled-germain-be712a` でコミット待ち）**

- **共有純関数の整理（`api/_lib/`）**
  - `kv.js`：単一 DB 前提だったのを factory 化。既存 `kv`（PopScan＝`KV_REST_API_URL`/`KV_REST_API_TOKEN`）に加え
    `filmatorKv`（`FILMATOR_KV_REST_API_URL`/`FILMATOR_KV_REST_API_TOKEN`）を追加。後方互換維持。
  - `photos-bucket.js`（新規）：`clampPhotos`（1..100000）／`bucketForPhotos`（1 / 2-10 / 11-50 / 51-200 / 201+）／
    `SIZE_BUCKETS` を export。
  - `filmator-event-codes.js`（新規）：`ALLOWED_EVENTS` / `ALLOWED_ERROR_CODES` / `ERROR_EVENTS`。
    分離理由＝analytics と admin-stats から共有しつつテストが `kv.js` を副作用ロードしないように切り出し。
- **Vercel Functions 5 本（`api/filmator-*.js`）**：PopScan からの移植。
  - `filmator-analytics.js`：event/error_code allow-list を Filmator 用に差し替え。`export_succeeded` で `photos`
    をクランプ → `stats:{date}:export_succeeded:photos` INCRBY ＋ `stats:{date}:export_size:{bucket}` INCR を追加。
    `unexpected_photos`（非 export イベントで photos 付き）を 400 reject。
  - `filmator-redeem-promo.js`：PopScan からほぼそのまま。Redis EVAL（Lua）は `kv.eval` で atomic 検証＋ count decrement。
  - `filmator-manage-promos.js`：PopScan からほぼそのまま。`promo-code:*` キーの CRUD＋ SCAN 一覧。
  - `filmator-admin-stats.js`：`exportPhotos`（枚数合計）と `exportSizeBuckets`（bucket 別 daily/total）を集計に追加。
  - `filmator-admin-error-log.js`：PopScan からほぼそのまま。`error_log:{date}` を LRANGE。
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

**🔴 ユーザーマター：Vercel ダッシュボードで Filmator 専用 Upstash DB の作成＋ env 注入**

実装側は env 名 `FILMATOR_KV_REST_API_URL` / `FILMATOR_KV_REST_API_TOKEN` を前提に組み済み。次の手順で
Vercel 側を整える（main へ push する前に済ませると Preview デプロイ直後に smoke test が通る）：

1. Vercel Dashboard → `juno-tokyo` プロジェクト → **Storage** タブ
2. **Create Database** → Marketplace → **Upstash for Redis** を選択
3. Plan: **Free**（フリープラン枠は 10 DB まで無料／2 つ目も無料・docs/08 §0）
4. Region: 東京（`ap-northeast-1`）推奨（PopScan と同じ）
5. Name: **`filmator-config`**（PopScan の `popscan-config` と並ぶ命名）
6. プロジェクト紐付け: `juno-tokyo`・**Production / Preview / Development の全環境**
7. **Environment Variable Prefix（重要）**: `FILMATOR` を指定 → `FILMATOR_KV_REST_API_URL`・
   `FILMATOR_KV_REST_API_TOKEN`・`FILMATOR_KV_REST_API_READ_ONLY_TOKEN` が注入される
   - もし UI で prefix を聞かれない（古い統合 UI など）場合は、追加後に Settings → Environment Variables
     で `KV_REST_API_URL` 等を手動で `FILMATOR_KV_REST_API_URL` 等にリネーム（既存 PopScan 用を上書きしない）
8. Vercel Dashboard で `FILMATOR_KV_REST_API_URL` / `FILMATOR_KV_REST_API_TOKEN` が見えていることを確認

完了後、main に push（or 一旦 Preview デプロイ）→ `POPSCAN_BASIC_PASS=xxx ./scripts/smoke.sh https://juno-tokyo-xxx.vercel.app`
を実行して、追加した Filmator ケースが全 green か確認する想定。

**Codex セクション B 実装後レビューと採否（codex-collab.md B）**

`codex exec --profile juno-tokyo-review` で 1f90171 をレビュー。Q1〜Q7 で観点を絞り、結果：

| 指摘 | 採否 | 対応 |
|------|------|------|
| Q4 `/api/*` 直叩きが middleware 迂回（PopScan/Filmator 共通の認可バイパス） | **採用** | `middleware.js` matcher に `/api/popscan-{set-promo,manage-promos,admin-stats,admin-error-log}` と `/api/filmator-{manage-promos,admin-stats,admin-error-log}` を追加。`scripts/smoke.sh` に直叩き 401 検証 7 件追加。PopScan 既存リスクも同時修正＝本コミットの副次効果（既存 PopScan エンドポイントの認可を強化）。 |
| Q3 env 誤設定時の混線（`FILMATOR_KV_REST_API_URL` が誤って PopScan DB を指すと `promo-code:*` 衝突） | **採用** | Handoff の Vercel 設定手順で「prefix `FILMATOR` を必ず指定」を強調済み。コード変更不要。Preview smoke で実 DB 分離確認は必須。 |
| Q1 `kv.js` factory で `filmatorKv` env 未設定時の SDK throw 懸念 | **却下** | ローカルテスト（`test-filmator-analytics.mjs` 実行時に `[Upstash Redis] 'url' is missing` 警告のみで pass）で SDK は constructor で throw しないことを実証済。 |
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
