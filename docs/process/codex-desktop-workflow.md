# Codex Desktop 直接作業ワークフロー

このファイルは、ユーザーが Codex Desktop へ直接依頼し、Codex が主担当として調査・実装するセッションで使う。
Claude Code から `codex exec` / `codex review` で呼び出された場合は対象外であり、`docs/process/codex-collab.md`
に従う。

## 役割と責任

- Codex が調査・プラン・実装・テスト・説明・完了処理を一貫して担当する。
- Claude へプランレビューや実装後レビューを依頼しない。必要な批判的検証は Codex 自身の敵対的レビューで行う。
- プロダクト上の最終判断はユーザーが行う。要件が曖昧で合理的な仮定が危険な場合は、編集前に確認する。
- 共通の安全性・テスト・コミット・handoff 規則は `PROJECT.md` を優先する。

## 作業開始

1. `PROJECT.md`、`Handoff.md`、関連ドキュメント・コードを読む。
2. 依頼が「タスク相談」か実装依頼かを判定する。「タスク相談」は調査・検討までで止め、ユーザーが実装を明示する
   までコード編集・テスト・コミット・push を行わない。
3. `pwd`、`git status --short`、`git worktree list` で作業場所と既存変更を確認する。
4. コミットを伴う作業は Codex Desktop の **Worktree** スレッドを既定とする。Local スレッドで開始しており、
   まだ編集していない場合は Worktree へ handoff する。main へ戻す際も Codex アプリの Handoff を優先し、
   アプリ管理 worktree を手動で削除しない。ユーザーが Local 作業を明示した場合はその指示を優先する。
5. ユーザー・Claude・別セッションの未コミット変更は上書き・revert・巻き込みしない。

## 調査とプラン

- コードベースと既存テストを先に読み、既存パターンに沿った最小スコープを選ぶ。
- 不具合では、既存実装の意図や過去の仮説に引っ張られず、再現条件・根本原因・正しい修正範囲を独立に調査する。
- 改善要望では、UX 目標を最優先に複数案とトレードオフを比較する。実装難易度とメンテナンス性は比較材料とする。
- 非自明な変更は実装前に、変更対象・検証方法・非ゴールを含む短いプランをユーザーへ提示する。

## 実装と検証

- 変更は最小範囲に保ち、新しいロジックには対応する自動テスト・smoke ケースを追加する。
- 公開 URL（特に `/popscan/`）・`middleware.js` の Basic-auth ゲート・`vercel.json` の rewrites/headers を
  壊さない。admin / 内部ページに `noindex` を保つ。
- `api/` 配下の Vercel Functions は KV への意図しない書き込みが無いか確認する。
- 原則として次を実行する。

  ```bash
  bash scripts/smoke.sh                                  # PopScan バックエンド smoke test
  node scripts/test-admin-stats-aggregate.mjs            # admin stats 集計ロジック単体テスト
  node scripts/test-jst-datekey.mjs                      # JST 日付キー単体テスト
  ```

- ブラウザ挙動・admin UI・実 KV など自動テストで証明できない挙動は、利用可能なら Codex Desktop の Computer Use や
  Chrome MCP で **Vercel Preview デプロイ**を確認する。確認できない部分は、証明できていない事項としてユーザーへ
  明示し、ジュンの本番／Preview 確認を依頼する。
- モックテストを使う場合は、テストが証明することと証明しないことを明示する。

## 敵対的セルフレビュー

実装完了後・コミット前に、実装時の判断をいったん疑い、レビュー担当の立場で差分を確認する。

1. `git diff` と関連コードを読み直し、bug・regression・missing tests・security risk を優先して探す。
2. HTTP メソッド分岐・認可分岐・KV キー分岐・タイムゾーン境界・エラーパスは、主要な入力パターンを一つずつトレースする。
3. `middleware.js` を変更したら、Basic-auth が `/popscan/admin/*` と admin API に効いているか確認する。
4. `vercel.json` を変更したら、`/popscan/` の公開ルーティングと `X-Robots-Tag` が崩れていないか確認する。
5. KV 書き込みパス、admin パスワード露出、CORS / トークンの取り扱いに副作用がないか確認する。
6. 指摘を修正した場合は関連テストを再実行し、差分をもう一度確認する。

レビュー結果に問題がなかった場合も、残る手動確認事項と自動テストの限界をユーザーへ報告する。

## 完了処理

- 実装が一区切りしたらテスト結果とセルフレビュー結果を確認し、対象ファイルだけを明示的に stage して commit する。
  🔴 **`git add -A` / `git add .` / `git commit -a` は使わない**。
- 🔴 **worktree 稼働中の変更系 git は `git -C <絶対パス>` を使う**（cwd ドリフト事故防止）。
- Codex アプリ管理 Worktree で実装した場合は、アプリの Handoff で Local へ移し、状態と差分を確認してから
  `PROJECT.md` の規則に従って main へ反映・push する。ブランチを作成して作業した場合は main への fast-forward
  を基本とする。non-FF conflict 解消・force push などの destructive 操作はユーザー承認を得る。
- 🔴 **`git push origin main` は Vercel が即 Production にデプロイ**。確信のない変更を push しない。Preview で確認できる
  変更はまず Preview デプロイを踏んでから main へ。
- 自動テストで確認できない挙動は、ユーザー（ジュン）の実機／Preview 確認 OK になるまで完了扱いにしない。
- ユーザーが終了または handoff を明示した場合のみ、`docs/process/handoff-workflow.md` に従って handoff を行う。
