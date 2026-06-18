#!/usr/bin/env python3
"""PreToolUse ガード: Bash の git 事故（broad add・cwd ドリフト commit）を機械的に防ぐ。

背景（2026-06-12・JT-191 で再発）: worktree セッション中に Bash の cwd が `cd /tmp` 等でドリフトし、
`cd "$PWD" && git add -A && git commit` を**実体 main 上で実行**＝意図した worktree の変更でなく
main の churn だけをコミットする事故が起きた。`git add -A` が churn を巻き込むため wrong-dir でも
「成功」してしまい気づけなかった。メモリ（行動規律）だけでは守られなかったため、フックで強制する。

ガード内容:
  1. broad add 禁止（常時）: `git add -A` / `--all` / `-u` / 単独 `.` をブロック。
  2. commit -a 禁止（常時）: `git commit -a/-am/-Am`（全 tracked 自動ステージ）をブロック。
  3. 変更系 git は -C 必須（worktree 稼働中のみ）: `git commit/push/merge/rebase/reset` が
     `git -C <path>` で対象を明示していなければブロック＝ambient cwd 依存の実行を禁止。

入力: stdin に Claude Code の PreToolUse JSON（cwd / tool_name / tool_input.command）。
出力: 問題なし → exit 0 / 違反 → stderr にメッセージ＋ exit 2（ブロック）。
ロジックは check() に分離し、scripts/test_git_safety_guard.py で単体テストする。
"""
import json
import os
import re
import sys

WORKTREE_MARKER = "/.claude/worktrees/"
SEP = re.compile(r"&&|\|\||;|\n|\|")
MUTATING = "commit|push|merge|rebase|reset"


def _real(path):
    return os.path.realpath(os.path.expanduser(path))


def _repo_root(cwd_real):
    """cwd からリポジトリ root（実体 main）を求める。worktree 配下なら marker 前。なければ上方向に .git を探す。"""
    idx = cwd_real.find(WORKTREE_MARKER)
    if idx != -1:
        return cwd_real[:idx]
    d = cwd_real
    while d and d != "/":
        if os.path.exists(os.path.join(d, ".git")):
            return d
        d = os.path.dirname(d)
    return None


def _worktrees_exist(repo_root):
    """`<root>/.claude/worktrees/` に worktree ディレクトリが 1 つでもあれば True（worktree セッション進行中）。"""
    if not repo_root:
        return False
    wt = os.path.join(repo_root, ".claude", "worktrees")
    try:
        return any(os.path.isdir(os.path.join(wt, n)) for n in os.listdir(wt))
    except OSError:
        return False


def check(cwd, tool_name, tool_input, worktree_active=None):
    """違反していれば日本語メッセージ（str）を返す。問題なければ None。worktree_active はテスト注入用。"""
    if tool_name != "Bash":
        return None
    cmd = (tool_input or {}).get("command") or ""
    if "git" not in cmd:
        return None

    if worktree_active is None:
        worktree_active = _worktrees_exist(_repo_root(_real(cwd)))

    for seg in SEP.split(cmd):
        s = seg.strip()
        if not re.search(r"\bgit\b", s):
            continue

        # 1. broad add
        if re.search(r"\badd\b", s) and (
            re.search(r"(^|\s)(-A|--all|-u)(\s|$)", s) or re.search(r"\s\.(\s|$)", s)
        ):
            return (
                "[git-safety-guard] `git add -A` / `git add .` / `git add --all` / `git add -u` は禁止です。\n"
                "意図しない変更（xcstrings churn 等）を巻き込み、wrong-dir でも成功して誤りに気づけません。\n"
                "編集したファイルを明示 add してください（例: git -C <絶対パス> add path/to/File.swift）。"
            )

        # 2. commit -a（commit 直後の最初のフラグに a が含まれる）
        if re.search(r"\bcommit\s+-[A-Za-z]*a[A-Za-z]*(\s|$)", s):
            return (
                "[git-safety-guard] `git commit -a/-am/-Am`（全 tracked 自動ステージ）は禁止です。\n"
                "明示 add → commit に分けてください（git -C <絶対パス> add <paths>; git -C <絶対パス> commit -m ...）。"
            )

        # 3. 変更系 git は worktree 稼働中 -C 必須（cwd ドリフト commit 防止）
        if worktree_active:
            mut = re.search(r"\bgit\s+(?:-C\s+\S+\s+)?(" + MUTATING + r")\b", s)
            has_c = re.search(r"\bgit\s+-C\s+\S+\s+(" + MUTATING + r")\b", s)
            if mut and not has_c:
                return (
                    "[git-safety-guard] worktree 稼働中の変更系 git は `git -C <絶対パス>` で対象を明示してください。\n"
                    f"検出: `git {mut.group(1)}`（-C なし）。cwd ドリフトで wrong-dir 実行する事故を防ぎます。\n"
                    "例: git -C \"/abs/worktree\" commit -m ...  /  FF は git -C \"/abs/main\" merge --ff-only <branch>"
                )
    return None


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)  # 解析不能は fail-open（通す）
    msg = check(data.get("cwd", ""), data.get("tool_name", ""), data.get("tool_input"))
    if msg:
        print(msg, file=sys.stderr)
        sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
