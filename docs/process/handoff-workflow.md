# /handoff ワークフロー詳細

`/handoff` 関連作業に入る前に必ず本ファイルを Read してから進める。前提＝`CLAUDE.md` の `/handoff` ステップ 0
（開始確認 0-1 / 0-2）を通過済み（未通過なら本ファイルに進まない）。

## 高速化の原則（毎回・省略不可）

成果物（エントリ／アーカイブ回転／commit／push／worktree 後始末）は削らず、過程の往復だけ削る。

- **① 黙って実行し、最後に 1 回だけ報告する** — ステップ間で逐次報告しない。完了後に commit ハッシュ・アーカイブ移動の有無・push 結果・worktree 後始末をまとめて要約する。
- **② 機械的処理は `scripts/handoff_finalize.py` に委ねる** — 先頭挿入・アーカイブ回転・commit・push。手作業のテキスト手術・git 逐次往復をしない。
- **③ 既読の `Handoff.md` を再 Read しない** — 変更が無い限り。context 圧縮で失われた時のみ読み直す。

## ワークフロー

1. **Handoff.md を把握**（③: 既読かつ未圧縮ならスキップ）。既存エントリは触らない。

2. **新エントリ 1 件だけを `/tmp/juno-tokyo-handoff-entry.md` に `Write`** — 下記形式:

   ```markdown
   ### [YYYY-MM-DD] <セッションのタイトル>

   **完了したこと**
   - （ファイル名・関数名など具体的に）

   **申し送り**
   - （なぜそうなっているか・罠・注意点）
   ```

3. **必要に応じて関連 doc を更新** — `PROJECT.md` / `AGENTS.md` / `docs/process/*` などに反映漏れがあれば
   このタイミングで直す（小さく、必要なものだけ）。

4. **確定スクリプトで回転 → commit → push**:

   **実体パス main（既定）**:
   ```bash
   python3 scripts/handoff_finalize.py \
     --entry-file /tmp/juno-tokyo-handoff-entry.md \
     --commit-msg "docs: handoff <セッション要約>"
     # 当セッションで更新した doc があれば --add <path> で明示（複数可）
   ```
   リモート未設定なら push は自動スキップ。成功後、一時ファイルは自動削除（残すなら `--keep-entry-file`）。

   **worktree 内**（`pwd` が `.claude/worktrees/` 配下）:
   ```bash
   # 1) worktree ブランチに回転＋commit（push しない）
   python3 scripts/handoff_finalize.py --entry-file /tmp/juno-tokyo-handoff-entry.md \
     --commit-msg "docs: handoff <セッション要約>" --no-push
     # 必要なら --add で追加 doc を明示
   # 2) 実体パス main へ FF マージして push
   BRANCH=$(git branch --show-current)
   git -C ~/Library/CloudStorage/Dropbox/Projects/Web/juno.tokyo merge "$BRANCH"
   git -C ~/Library/CloudStorage/Dropbox/Projects/Web/juno.tokyo push origin main
   ```
   マージ後、main の Handoff.md が正しく更新されたか確認する。
   🔴 **`git push origin main` で Vercel が自動デプロイされる**ことを意識する。コード変更を含む handoff push
   なら、push 後に Vercel ダッシュボードもしくは本番 URL で軽くデプロイ成功を確認する。

   🔴 **`git add -A` を使わない**（並行セッションの未コミット WIP を巻き込んで push してしまうため）。ステップ 3 で
   編集した doc は 1 つずつ `--add <path>` で列挙する。列挙漏れはスクリプトが「未ステージ/未追跡」として警告に出すので
   `--add` し直す（`--add` 済み・日本語パスは警告に出ない）。

   🔴 **worktree 後始末（必ず main へ FF/push した後に行う）**：まず `ExitWorktree(action: "remove")` を試す
   （cwd を実体パス main へ戻してから削除するので削除後の再投稿で `getcwd` エラーにならない・未マージ/未コミットが残ると remove 拒否＝FF 漏れの検知になる）。
   - ⚠️ **`ExitWorktree` が `No-op`（"no active EnterWorktree session"）を返したら**、その worktree は
     `EnterWorktree` 経由でなく **UI「ワークツリー」チェックボックス（harness が起動時に生成）**で作られたもの＝
     `ExitWorktree` のスコープ外。**Bash でフォールバック削除**する：
     (1) `cd <実体 main>`（cwd を worktree の外へ出す・**先に必ず**＝`getcwd` エラー回避）
     → (2) `git -C <実体 main> worktree remove <worktree パス>`
     → (3) `git -C <実体 main> branch -d <ブランチ>`（FF 済みなら clean に消える）。

   > スクリプトが失敗・使用不可の時のみ、末尾「手動フォールバック」へ。

5. **完了報告（① まとめて 1 回）**。

## マージ・push は handoff 専用ではない

worktree → main の FF マージと push は reversible・low-risk＝ユーザー確認なし自走可。handoff 時は必須だが、それ以外でも必要なら `/handoff` を待たず実行してよい。destructive な操作（non-FF conflict merge・force push 等）はユーザー承認必須。

⚠️ ただし **`git push origin main` は Vercel auto deploy を引き起こす**。コードを含む変更を push する場合は、
ユーザーが内容を見て承認しているか・Preview で確認済みか・テストが通っているかを必ず確認する。

## アーカイブルール（スクリプトが自動処理）

- `Handoff.md` は最新が先頭・最大 5 件。6 件以上で最古を月別アーカイブへ移す。
- アーカイブは `docs/handoff/Handoff-YYYYMM.md`（末尾追記・全文書換しない）。当月ファイルが無ければタイトル
  `# juno.tokyo — セッション履歴 YYYY年M月` 付きで新規作成。
- `Handoff.md` 末尾「過去の作業履歴（アーカイブ）」索引に当該月リンクが無ければ追加。

## 注意点

- `CLAUDE.md` / `PROJECT.md` / `AGENTS.md` には handoff の流れで手を加えない（必要な恒久ルール更新は通常コミットで）。
- 「申し送り」は**なぜそうなっているか・どんな罠があるか**を重点に書く（コード変更内容は git log にあるので書かない）。

## 手動フォールバック（スクリプトが使えない時のみ）

1. 新エントリを `Handoff.md` 先頭（最初の `### [` の前）に挿入する。既存エントリは消さない。
2. 6 件以上なら最古を Bash の `>>` で `docs/handoff/Handoff-YYYYMM.md` 末尾に追記する（Read で開かない・全文書換しない）。
   当月ファイルが無ければタイトル行＋空行を作ってから追記。索引リンクが無ければ追加。
3. `git add Handoff.md <更新した doc...> && git commit -m "..." && git push origin main`（worktree 内なら commit 後に main へ FF）。
   `git add -A` は使わない。
