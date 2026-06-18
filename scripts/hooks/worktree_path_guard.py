#!/usr/bin/env python3
"""PreToolUse ガード: worktree セッションで実体パス/別 worktree を編集する事故を防ぐ。

背景: `EnterWorktree` で worktree に入った後、Edit/Write を「実体パスの絶対パス」で
呼ぶと、変更が worktree ではなく実体パス main の作業ツリーに着地してしまう
（PROJECT.md「worktree 内で作業しているのに実体パスを編集するのは誤り」の罠）。
このフックは cwd が worktree 配下のとき、編集先が worktree の外を指していたら
exit 2 でツール呼び出しをブロックし、正しい編集先を提示する。

入力: stdin に Claude Code の PreToolUse JSON（cwd / tool_name / tool_input）。
出力: 問題なし → exit 0 / 違反 → stderr にメッセージ＋ exit 2（ブロック）。

ロジックは check() に分離し、scripts/test_worktree_path_guard.py で単体テストする。
"""
import json
import os
import sys

WORKTREE_MARKER = "/.claude/worktrees/"
TARGET_TOOLS = ("Edit", "Write", "NotebookEdit")


def _real(path):
    return os.path.realpath(os.path.expanduser(path))


def check(cwd, tool_name, tool_input):
    """違反していれば日本語メッセージ（str）を返す。問題なければ None を返す。"""
    if tool_name not in TARGET_TOOLS:
        return None
    tool_input = tool_input or {}
    target = tool_input.get("file_path") or tool_input.get("notebook_path")
    if not target:
        return None

    cwd_real = _real(cwd)
    marker_idx = cwd_real.find(WORKTREE_MARKER)
    if marker_idx == -1:
        return None  # worktree セッションでない → 無制限（実体パス編集が正しい）

    main_root = cwd_real[:marker_idx]
    wt_name = cwd_real[marker_idx + len(WORKTREE_MARKER):].split("/", 1)[0]
    wt_root = main_root + WORKTREE_MARKER + wt_name

    if not os.path.isabs(target):
        return None  # 相対パスは cwd(=worktree) 基準で解決される → 安全

    target_real = _real(target)

    # 現在の worktree 配下 → OK
    if target_real == wt_root or target_real.startswith(wt_root + os.sep):
        return None
    # リポジトリ外（/tmp・~/.claude のメモリ等） → OK
    if not (target_real == main_root or target_real.startswith(main_root + os.sep)):
        return None

    # ここに到達 = 実体パス main 直 or 別 worktree を指している → ブロック
    rel = os.path.relpath(target_real, main_root)
    return (
        "[worktree-path-guard] このセッションは worktree 内で作業中です。\n"
        f"  worktree : {wt_root}\n"
        f"  編集先   : {target_real}\n"
        "  → 編集先が worktree の外（実体パス main か別 worktree）を指しています。\n"
        "     このまま編集すると変更が worktree ではなく main に着地します。\n"
        "  対処: 同じファイルを worktree 側の絶対パスで編集してください:\n"
        f"        {os.path.join(wt_root, rel)}"
    )


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)  # 入力を解釈できないときはツールを止めない（フォールバック）
    message = check(
        data.get("cwd") or os.getcwd(),
        data.get("tool_name", ""),
        data.get("tool_input") or {},
    )
    if message:
        print(message, file=sys.stderr)
        sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
