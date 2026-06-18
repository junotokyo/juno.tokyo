# juno.tokyo — プロジェクト共通ルール

このファイルは Claude Code と Codex（Desktop / CLI）が共有するプロジェクト運営ルールのマスターです。
ツール固有のルールは `CLAUDE.md`（Claude Code 用）と `AGENTS.md`（Codex 用）にあります。

> このプロセス資産は PopScan / Filmator で成熟させた運用フレームワークを、juno.tokyo
> （Web LP + Vercel Functions）向けに汎用化して自己完結コピーしたもの。各プロジェクトとは
> 独立に進化させる（共有はしない）。

---

## プロジェクト概要

このリポジトリは `juno.tokyo` ドメインの Web サイトを管理する。

- **公開トップ**: `https://juno.tokyo`（ルート `index.html` は `/popscan/` へリダイレクトする最小ページ）
- **主要 LP**: `https://juno.tokyo/popscan/`、`https://juno.tokyo/filmator/`、`https://juno.tokyo/press/`
- **公開サイトは静的 HTML/CSS/JS**。バックエンドは `api/` 配下の **Vercel Serverless Functions**
  （promo フラグ・analytics・promo-code redeem・admin stats / error log）＋ **Upstash Redis (KV)**。
- WordPress や常駐サーバを足さない。新規バックエンド需要も Vercel Functions + KV に揃える。

詳細な事実情報（リポジトリ・デプロイ・DNS・Mail・Analytics）は本ファイル下部のセクションに集約してある。

### 厳守事項（プロダクト固有）

- **DNS / Mail レコードを破壊しない**。特に `onamae.com` の MX / SPF / DKIM / DMARC は Web ホスティング
  移行とは独立。`dig` で現状確認してから変更する（本ファイル「DNS And Domains」「Mail」参照）。
- **`/popscan/` の公開 URL を維持する**（onamae.com → Netlify → Vercel 移行を経ても保ってきた契約）。
- 公開 LP は静的を維持。バックエンドロジックは必ず `api/` 配下の Vercel Functions へ。
- **admin / 内部ページ（`/popscan/admin/` 等）に Web Analytics スクリプトを入れない**（noindex／LP メトリック汚染防止）。
- `.DS_Store` をコミットしない（`.gitignore` で除外済み）。
- ユーザー（ジュン）への応答は日本語（コード・固有名詞は英語可）。

### 依頼種別の判定（タスク相談）

ユーザーが **「タスク相談」** と書いた場合、それは「課題や要望に対して、調査・検討・タスク化を行う」
という意味であり、実装許可ではない。相談モードではコード編集・テスト・コミット・push を行わない。

- 実装が小さく見える場合や、原因がほぼ確実に見える場合でも、ユーザーの明示的な実装許可なしに変更しない。
- 相談か実装か曖昧な場合は、ファイル変更前に「相談のみか、実装まで進めてよいか」を確認する。
- ユーザーが「実装して」「修正して」「main に入れて push して」など明示した場合のみ、通常の実装フローに移る。

---

## ディレクトリ構成

```
~/Library/CloudStorage/Dropbox/Projects/Web/juno.tokyo/   ← プロジェクトルート（実体パス）
├── PROJECT.md            ← このファイル（共通ルール）
├── CLAUDE.md             ← Claude Code 用エントリ（PROJECT.md を import）
├── AGENTS.md             ← Codex 共通エントリ（Desktop / CLI）
├── Handoff.md            ← セッション引き継ぎログ
├── docs/
│   ├── process/          ← 運用プロセス資産（トリガー時に Read）
│   │   ├── codex-collab.md          ← Claude 委任 Codex CLI の協業ルール
│   │   ├── codex-desktop-workflow.md ← Codex Desktop 直接作業ルール
│   │   ├── handoff-workflow.md
│   │   └── plan-mode.md
│   └── handoff/          ← Handoff.md の月別アーカイブ（YYYYMM）
├── index.html
├── robots.txt
├── middleware.js         ← Basic-auth ゲート（/popscan/admin/* と admin API）
├── vercel.json           ← /popscan/* → /api/popscan-* rewrites, headers
├── package.json
├── api/                  ← Vercel Serverless Functions
│   ├── popscan-time.js
│   ├── popscan-analytics.js
│   ├── popscan-set-promo.js
│   ├── popscan-redeem-promo.js
│   ├── popscan-manage-promos.js
│   ├── popscan-admin-stats.js
│   ├── popscan-admin-error-log.js
│   └── _lib/             ← kv.js / date.js / admin-aggregate.js
├── scripts/              ← ビルド/テスト/運用ヘルパ
│   ├── hooks/            ← PreToolUse フック（worktree path guard / git safety guard）
│   ├── handoff_finalize.py
│   ├── smoke.sh
│   ├── test-admin-stats-aggregate.mjs
│   ├── test-jst-datekey.mjs
│   └── generate-popscan-appstore-assets.mjs
├── popscan/              ← PopScan LP 一式
├── filmator/             ← Filmator LP 一式
└── press/                ← プレスリリース
```

**worktree 方針（Filmator から踏襲・2026 年改定）**: 🔴 **コミットを伴うセッションは原則として自分の worktree で作業する**。
「今並行しているか」を毎回判断しないで済むようにし、共有 main の並行編集事故を**原理的に**無くすため。

- 🔴 **やり方＝セッションごと worktree に「入る」（pwd を移す）**。手動 `git worktree add` はディレクトリを作るだけで
  **作業ディレクトリ（pwd）は実体パス main のまま**残る罠がある。**Claude Code は `EnterWorktree` ツールで入る**
  （pwd ごと worktree に移る＝以降の全編集が構造的に隔離・既存 worktree には `path:` で入れる）。**Codex Desktop は
  新規スレッドの Worktree モード、または Local から Worktree への handoff を使う**。Claude 委任の Codex CLI セッションは
  `--cd` で呼び出し元の worktree ルートを指す。
- **例外（main 直で可）**: コミットしない読み取り専用の調査・相談セッションは実体パス main のままでよい。判断に
  迷ったら worktree を作る側に倒す。
- **戻し・後始末**: worktree → main は **fast-forward** が基本（reversible・low-risk＝ユーザー確認なし自走可）。
  non-FF conflict 解消・force push 等の destructive 操作はユーザー承認必須。**Claude 管理 worktree** は handoff の
  最後に main へ FF/push したら `ExitWorktree(action: "remove")` で消す。**Codex アプリ管理 worktree** はアプリの
  Handoff で Local へ安全に移し、アプリのアーカイブ・自動クリーンアップに任せる（手動で削除しない）。
- **doc 競合を減らす補助**: Handoff.md は**小さく・遅く（handoff 時）・できれば単一セッションが書く**。

**パスの注意**:

- **作業ベース**は `git worktree list` で判定。worktree 配下なら worktree パスを、そうでなければ実体パスを使う。
- 実体パス（worktree 外）: `~/Library/CloudStorage/Dropbox/Projects/Web/juno.tokyo/`
  - **Codex view symlink alias**: `~/Library/CloudStorage/Dropbox/Codex/juno.tokyo` も同じ実体を指す。
  - `~/Dropbox/...` はシンボリックリンク経由表記。Read/Edit が認識しないケースを避けるため、編集時は実体パス
    （`~/Library/CloudStorage/Dropbox/...`）を使う。
- **worktree 内で作業しているのに実体パスを編集するのは誤り**。セッション開始時に必ず判定する。
  - 🔴 **自動ガード**: PreToolUse フック `scripts/hooks/worktree_path_guard.py` が、worktree 内セッションで
    Edit/Write/NotebookEdit の編集先が worktree の外（実体パス main / 別 worktree）を指したら exit 2 でブロックする。
    配線は `.claude/settings.json`。**フック変更はセッション再起動後に有効化される**点に留意。
  - 🔴 **git 事故ガード**: `scripts/hooks/git_safety_guard.py` が Bash の `git add -A` / `git commit -a` /
    worktree 稼働中の `-C` 無し変更系 git をブロックする。

---

## デプロイ & 開発フロー

Vercel が GitHub リポジトリを import し、`main` への push で自動デプロイされる。

- Framework preset: なし（静的 + `api/` の Vercel Functions）
- Build command: なし
- 出力: リポジトリ root を静的配信、`api/*.js` が Serverless Function として実行
- Routing: `vercel.json` rewrites `/popscan/<name>` → `/api/popscan-<name>`
- 更新ワークフロー:

```bash
cd ~/Library/CloudStorage/Dropbox/Projects/Web/juno.tokyo
# 編集したファイルだけを明示 add
git add path/to/changed-file
git commit -m "Update site: <要約>"
git push origin main   # → Vercel auto-deploys main
```

### KV / environment variables（Vercel dashboard）

- `KV_REST_API_URL` / `KV_REST_API_TOKEN` / `KV_REST_API_READ_ONLY_TOKEN`
  — Upstash for Redis Marketplace 統合で自動注入される。
- `ADMIN_BASIC_PASS` — Basic-auth パスワード（ユーザは固定で `admin`）。`/popscan/admin/*` と admin API
  （`set-promo` / `manage-promos` / `admin-stats` / `admin-error-log`）に対し `middleware.js` で強制。

PopScan バックエンド契約（エンドポイント・KV キー・エラーコード許容リスト・smoke test）の真実の源は
**PopScan リポジトリ**側 `SPEC.md` の「Vercel Functions + KV（promo制御）」節。

---

## テスト

- **smoke test**: `bash scripts/smoke.sh`（PopScan バックエンド一式の動作確認）
- **単体テスト**（`api/_lib` のロジック）:
  ```bash
  node scripts/test-admin-stats-aggregate.mjs
  node scripts/test-jst-datekey.mjs
  ```
- **本番への影響を伴う動作確認**は、Vercel の **Preview デプロイ**で行う（Production を直接踏まない）。

### テストのルール

機能追加・変更を行ったら、対応する単体テストもしくは smoke test ケースを追加する。
「既存テストが通った」は「新実装が正しい」の確認にならない。

- 正常系を必ず 1 件以上。境界値・エッジケース（タイムゾーン境界・空 KV・上限値等）も可能な範囲でカバー。
- 外部依存（Upstash KV・Vercel Edge）はロジック部分を切り出してテスト可能にする。

### モック/外部依存を使うときの必須ルール

外部 API・KV をモックしてテストする場合、**そのテストはロジックの正しさを証明するだけで、実 API の
動作を証明しない**。テストを書いたら「このテストが証明すること／証明しないこと（手動確認が必要な部分）」を
コメントで明示する。「テスト通過＝実装完了」とユーザーに報告してはならない。

---

## コミット・テストの品質ルール

> **適用範囲**: 本セクションは Claude Code、または Codex Desktop が直接実装を主導するセッションのルール。
> Claude 委任の Codex CLI セッション（`codex exec` / `codex review` 経由）では `git commit` / `git push` /
> `Handoff.md` 更新を Codex 側で行わない（`AGENTS.md` の規定を優先）。

機能の実装・変更が完了したら、ユーザーに戻す前にテストが通っていることを確認の上コミットする。
コミットなしでセッションを終了してはならない（`/handoff` 実行を忘れずに）。

- コミットメッセージは作業内容を端的に（例: `feat(popscan): admin stats に JST 日付キー追加`）。
- テスト・`Handoff.md` の更新もコミットに含める。
- 独立した複数機能は機能ごとに分けてコミットしてよい。
- 🔴 **`git add -A` / `git add .` / `git commit -a` を使わない**（並行セッションの未コミット WIP を巻き込み、
  `git safety guard` フックでもブロックされる）。編集したファイルを明示 add する。
- 🔴 **worktree 稼働中の変更系 git は `git -C <絶対パス>` を使う**（cwd ドリフトで wrong-dir 実行する事故を防ぐ）。

### 実装完了 ≠ セッション完了

テスト PASS は「実装が機能している」根拠だが「セッション完了」ではない。

- 実装が一区切りしたらコミットしてユーザーの**動作確認を待つ**。
- 自動テストで検証できない部分（Preview デプロイでの実挙動・ブラウザでの見え方・実 KV の状態等）は、ユーザーが
  手動確認して「OK」と承認するまで進まない。
- ユーザーが「終了して良い」「handoff して」と明示するまで `/handoff` workflow には進まない
  （**auto mode でも例外なし**。`CLAUDE.md` の `/handoff` ステップ 0 参照）。

### 🔴 worktree で実装したら main FF + push まで「実装作業の一部」

worktree（Claude 管理 / Codex 管理）で commit したコードは、実体パスの main に FF merge ＋ `git push origin main`
まで完了させて初めて「実装作業完了」とする。worktree commit しただけでは Vercel デプロイが走らず、ユーザーが
本番／Preview で動作確認するときに反映されない。

- worktree → main の **fast-forward** マージは reversible・low-risk なのでユーザー確認なし自走可。
- destructive な操作（non-FF conflict merge・force push 等）はユーザー承認必須。
- ドキュメントのみ変更時や「main に反映しないで」と指示された場合は省略可。

> **リモート**: `origin` = `junotokyo/juno.tokyo`（GitHub）、`main` が `origin/main` を追跡。
> push すれば Vercel が自動デプロイする＝**push＝本番反映**である点を常に意識する。

---

## Handoff.md の役割

`Handoff.md` はセッション引き継ぎログ。直近 5 件を保持し、それ以前は `docs/handoff/Handoff-YYYYMM.md` に
アーカイブする。書き方・運用は `docs/process/handoff-workflow.md` を参照。

本プロジェクトは小規模・静的サイト中心のため、Filmator の `SPEC.md` に相当する重い仕様ドキュメントは
持たない。PopScan バックエンド契約は PopScan リポジトリ側 `SPEC.md` を真実の源とする。
公開 LP の構造は HTML/CSS が真実の源で十分。

---

## Claude 委任 Codex CLI プロファイル

Codex 協業（`docs/process/codex-collab.md`）用に `~/.codex/config.toml` に以下を定義する：

- `juno-tokyo-review`（read-only / approval never） — プランレビュー・実装後レビュー・独立調査用
- `juno-tokyo-edit`（workspace-write / approval on-request） — コード代行用（ユーザー承認時のみ）

未設定なら下記を `~/.codex/config.toml` の末尾に追記する（既存の filmator-* / popscan-* と同形）：

```toml
[profiles.juno-tokyo-review]
sandbox_mode = "read-only"
approval_policy = "never"
model_reasoning_effort = "medium"

[profiles.juno-tokyo-edit]
sandbox_mode = "workspace-write"
approval_policy = "on-request"
```

---

## リポジトリ・ホスティング詳細

- **GitHub repository**: `junotokyo/juno.tokyo`
- **Local path（canonical）**: `~/Library/CloudStorage/Dropbox/Projects/Web/juno.tokyo`
- **Local path（Codex view symlink alias）**: `~/Library/CloudStorage/Dropbox/Codex/juno.tokyo`
  — 上記 canonical へのシンボリックリンク。どちらを編集しても同じファイルを指す。
- **Default branch**: `main`
- **Hosting**: **Vercel**（2026-05-11 に Netlify から移行）
- **Vercel project**: `juno-tokyo`（`.vercel/project.json` に project / org ID）

### DNS And Domains

DNS は onamae.com Navi で `dnsv.jp` ネームサーバ管理（Netlify → Vercel 移行でも変更なし）:

- `01.dnsv.jp` / `02.dnsv.jp` / `03.dnsv.jp` / `04.dnsv.jp`

重要な Web レコード（2026-05-19 検証時点・現在は Vercel を指している）:

```text
juno.tokyo       A      216.198.79.1
www.juno.tokyo   CNAME  637499c2ab6665de.vercel-dns-017.com
```

`www.juno.tokyo` は primary `juno.tokyo` へリダイレクト（Vercel で設定）。再検証は
`dig +short juno.tokyo A` / `dig +short www.juno.tokyo CNAME` で行う（本ファイルのキャッシュ値を盲信しない）。

### Mail

`code@juno.tokyo` 宛のメールは onamae.com mail infrastructure で処理しており、Web ホスティングとは独立
（Netlify → Vercel 移行の影響なし）。

重要な mail 関連レコード:

```text
juno.tokyo                  MX   mail89.onamae.ne.jp priority 10
juno.tokyo                  TXT  v=spf1 include:_spf.onamae.ne.jp ~all
mail.juno.tokyo             A    160.251.71.112
ml-cp.juno.tokyo            A    160.251.71.112
_dmarc.juno.tokyo           TXT  v=DMARC1; p=reject
default._domainkey.juno.tokyo TXT  DKIM record from onamae.com mail
```

🔴 ホスティング変更時に **mail DNS レコードを消さない**こと。

### 歴史的経緯

- PopScan LP は最初 onamae.com Rental Server の `public_html/juno.tokyo/popscan` に手動アップロードされていた。
- onamae.com Rental Server のコンパネが古かったので、2026-05-01 に GitHub + Netlify へ移行（旧 `popscan` フォルダは
  Rental Server から削除済み）。
- **2026-05-11 に Netlify から Vercel へ移行**（同一ドメインで Serverless Functions + Upstash Redis KV を持つため）。
  DNS A/CNAME を Vercel に repoint、mail DNS は onamae.com 側に残置。
- 旧 `netlify/` 配下が残っている可能性あり（`.DS_Store` だけの孤児）。使われていない。

### Future Direction

- サイトは Vercel 上で「静的ページ + 軽量 Vercel Functions」を維持。
- もし将来 dynamic photo CMS や Web アプリを作る場合は `photos.juno.tokyo` 等のサブドメインに分離
  （重い Next.js アプリは独立 Vercel project にする）。
- 公開 LP は静的を保ち、新規バックエンドは Vercel Functions + KV を経由させる。

### Analytics（Vercel Web Analytics）

Vercel Web Analytics は `juno-tokyo` プロジェクトで有効。トラッキングは HTML ページ単位でスクリプトタグの opt-in:

```html
<script defer src="/_vercel/insights/script.js"></script>
```

- **公開**ページの `<head>` にだけ追加する。
- admin / 内部ページ（`/popscan/admin/`、`/popscan/admin/stats/` 等）には**追加しない**（noindex 扱いで LP メトリックを汚すため）。
- 静的マルチページサイトはこのスクリプトタグだけで十分（フルページ遷移は Vercel CDN が記録）。
- 将来 SPA / フレームワークアプリを同じ Vercel project 配下に置く場合は、**そのアプリだけ** `@vercel/analytics`
  npm パッケージ + フレームワークコンポーネント（`<Analytics/>`）に切り替える（client-side ルート遷移も計測される。
  同 project 内で両アプローチ併用は OK＝同じダッシュボードに集約される）。
- Hobby tier 無料枠: 2,500 events / month。トラフィック増時はダッシュボードで監視する。
