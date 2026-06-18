# juno.tokyo — セッション引き継ぎ

新規セッションを始める前に必ず本ファイルを Read し、直近の作業状態を把握する。
最新エントリが先頭・最大 5 件まで保持し、超えた分は `scripts/handoff_finalize.py` が
`docs/handoff/Handoff-YYYYMM.md` に自動アーカイブする。

書き方・運用ルールは `docs/process/handoff-workflow.md` を参照。

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
