# AGENTS.md — Codex 共通エントリ（juno.tokyo）

このリポジトリの共通運用ルール・プロジェクト情報（リポジトリ／デプロイ／DNS／Mail／Analytics 等の事実情報を含む）の
マスターは **`PROJECT.md`** に集約されている。**作業開始前に必ず `PROJECT.md` を読むこと**
（Codex は `@import` 構文を解釈しないため、自動では読み込まれない）。

本ファイルは、ユーザーが Codex Desktop へ直接依頼するセッションと、Claude Code が Codex CLI を呼び出す
委任セッションの両方に適用する。最初に下記の動作モードを判定し、該当するルールに従うこと。

---

## このプロジェクトは何か

`juno.tokyo` ドメインの Web サイト（PopScan / Filmator / Press の LP）と、`api/` 配下の **Vercel Serverless Functions**
（PopScan の promo フラグ・analytics・promo-code redeem・admin stats / error log）＋ **Upstash Redis (KV)**。
公開サイトは静的 HTML/CSS/JS で、push すると Vercel が自動デプロイする。

詳細は `PROJECT.md`（プロジェクト概要・ディレクトリ構成・デプロイ・DNS / Mail・Analytics）。

## 厳守事項

- **DNS / Mail レコードを破壊しない**（onamae.com の MX / SPF / DKIM / DMARC は Web ホスティング移行と独立）。
- **`/popscan/` の公開 URL を維持する**。
- 公開 LP は静的を維持し、バックエンドロジックは `api/` 配下の Vercel Functions に集約する。
- admin / 内部ページに Vercel Web Analytics スクリプトを入れない（noindex の LP メトリック汚染防止）。
- ユーザー（ジュン）への応答は日本語。

## 依頼種別の判定（タスク相談）

- ユーザーが **「タスク相談」** と書いた場合、それは「課題・要望を調査し、実装方針を検討し、必要ならタスク化する」
  という意味であり、**実装許可ではない**。
- タスク相談では、コード編集・テスト・コミット・push を行わない。実装が妥当に見えても、
  ユーザーが「実装して」「修正して」「進めて」など明示するまで相談モードを維持する。
- 相談か実装か判別できない場合は、ファイルを変更する前に「相談のみか、実装まで進めてよいか」を確認する。

## 動作モード

### 1. Codex 直接作業モード

ユーザーが Codex Desktop で直接依頼しているセッションに適用する。

- Codex が主担当として、調査・プラン作成・ファイル編集・テスト・ユーザーへの説明を一貫して行う。
- 実装後は Claude にレビューを依頼せず、Codex 自身が独立した敵対的レビューを行う。
- `git commit` / main への fast-forward / `git push` / `Handoff.md` は、ユーザー指示と `PROJECT.md`
  の共通ルールに従って Codex が実行してよい。
- 詳細な進め方は **`docs/process/codex-desktop-workflow.md`** を作業開始時に読むこと。

### 2. Claude 委任 Codex CLI モード

Claude Code が `codex exec` / `codex review` で呼び出したセッション、またはプロンプトに Claude からの委任と
明記されているセッションに適用する。

- reviewer / verifier が基本。実装は Claude から明示依頼があった限定範囲だけ行う。
- レビューは bug・regression・missing tests・security risk を優先し、file:line 単位で根拠を示す。
- 採否と最終実装責任は Claude。`git commit` / `push` / `Handoff.md` 更新は Codex 側で行わない。
- 不具合・改善要望では、実装した Claude の anchoring を避けるため、独立した立場で根本原因・選択肢・
  トレードオフを提示する。UX を最優先し、開発難易度とメンテナンス性を比較材料として添える。
- 詳細は **`docs/process/codex-collab.md`** に従う。

モードを判別できない場合はファイルを変更せず、呼び出し元またはユーザーへ確認する。

## 作業ディレクトリ

- このリポジトリは git worktree を使う。Claude 管理・Codex 管理どちらの worktree でも、実体パスと
  worktree パスを混ぜない。
- 直接作業モードでは Codex Desktop の Worktree スレッドを優先する。委任モードでは呼び出し側が `--cd` で
  指定した作業ディレクトリを維持する。
- 未確認なら `pwd` と `git worktree list` を最初に実行。
- canonical な実体パスは `~/Library/CloudStorage/Dropbox/Projects/Web/juno.tokyo`。
  `~/Library/CloudStorage/Dropbox/Codex/juno.tokyo` は同一実体への symlink alias（どちらを編集しても同じ）。

## やってよいこと / やってはいけないこと

- 変更は最小範囲。ユーザーや Claude の未コミット変更を上書き・revert しない。
- 直接作業モードでは `PROJECT.md` の完了・コミット規則に従う。委任モードでは `git commit` / `git push` /
  `Handoff.md` 更新を行わない。
- 🔴 **`git add -A` / `git add .` / `git commit -a` を使わない**。編集したファイルを明示 add する。
- 🔴 **worktree 稼働中の変更系 git は `git -C <絶対パス>` を使う**（cwd ドリフト事故防止）。
- `AGENTS.override.md` は使わない。

## 主要コマンド

- 公開サイトはビルドステップなし（静的配信）。`api/` は Vercel Serverless Functions として動作。
- 主要なテスト・運用コマンド:

  ```bash
  bash scripts/smoke.sh                                  # PopScan バックエンド smoke test
  node scripts/test-admin-stats-aggregate.mjs            # admin stats 集計ロジック単体テスト
  node scripts/test-jst-datekey.mjs                      # JST 日付キー単体テスト
  ```

- 本番への影響を伴う動作確認は **Vercel Preview デプロイ**を使う（main push は自動で Production に反映される
  ため、確信のない変更を main に push しない）。
- `vercel.json` / `middleware.js` を変更したら、Preview で実際に admin 領域・rewrite・headers が壊れていないか
  確認する。

## レビュー時の優先観点

1. **テスト設計の不足** — 新ロジック対応テストの有無、エッジケース漏れ、モックで隠れる実挙動の明示
2. **本番影響の見落とし** — push＝Vercel auto deploy という連鎖、admin Basic-auth の意図しない解除、
   middleware の rewrite/header 副作用、KV の意図しないキー上書き
3. **セキュリティ** — admin API・KV トークンの露出経路、Basic-auth の bypass、CORS / X-Robots-Tag の崩れ
4. **DNS / Mail への副作用** — 該当しないはずだが、変更が onamae.com 側のレコードに干渉していないか
5. **抜け・矛盾・前提の誤り**、検証手段が不十分な箇所

詳細は `PROJECT.md` のテストルール・モックルール・コミットルールを参照すること。
