#!/usr/bin/env python3
"""Handoff.md の機械的な確定処理を 1 コマンドにまとめるスクリプト。

`/handoff` ワークフローの「先頭挿入 → 5 件超アーカイブ回転 → commit → push」を
決定論的に実行する。Claude は新エントリ本文を書く / SPEC・Linear を更新するだけに専念し、
壊れやすいテキスト手術（最古エントリの正確な文面を探して削る・アーカイブ末尾追記・件数検証）
と git 逐次往復をこのスクリプトに委ねる。これにより handoff のモデル往復が大幅に減る。

成果物は手作業時と同一：
  - Handoff.md は「最新が先頭・最大 N 件（既定 5）」を保持
  - 溢れた最古エントリは `docs/handoff/Handoff-YYYYMM.md` へ末尾追記（時系列順・追記のみ）
  - Handoff.md 末尾の「過去の作業履歴（アーカイブ）」索引に当該月リンクを追加
  - **回転で書いたファイル（Handoff.md＋アーカイブ）と --add 指定分だけ**を明示 add → commit → push

安全側の staging（重要）：
  - `git add -A` は使わない。共有作業ツリー（実体パス main を複数セッションが共有）で並行
    セッションが編集中だと、その未コミット WIP を handoff コミットに巻き込んで push してしまう
    事故が起きたため（2026-06-06）。本スクリプトは rotate() が実際に書いたファイルと、呼び出し側が
    --add で明示宣言したファイルだけをステージする。
  - ステージしなかった作業ツリー変更は実行時に警告表示する＝「自分が更新した SPEC.md の入れ忘れ」と
    「並行 WIP の混入」の両方をその場で気づける。

設計上の約束：
  - rotate() は git 副作用を持たない純粋なファイル処理（test_handoff_finalize.py が単体検証）
  - アーカイブファイルは **末尾追記のみ**（全文書き換えしない＝巨大化しても安全・規約準拠）

使い方:
  python3 scripts/handoff_finalize.py --entry-file /tmp/entry.md --commit-msg "docs: handoff S9"
  python3 scripts/handoff_finalize.py --entry-file /tmp/entry.md --commit-msg "..." --no-push
  python3 scripts/handoff_finalize.py --entry-file /tmp/entry.md --dry-run   # 書き込まず差分概要のみ
  # このセッションで更新した doc は --add で明示（複数指定可）
  python3 scripts/handoff_finalize.py --entry-file /tmp/entry.md --commit-msg "..." \
      --add PROJECT.md --add docs/process/codex-collab.md
"""
from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys

ENTRY_RE = re.compile(r"^### \[(\d{4})-(\d{2})-(\d{2})\]", re.M)
FOOTER_MARKER = "## 過去の作業履歴"
ARCHIVE_DIR = os.path.join("docs", "handoff")


# ---------------------------------------------------------------------------
# パース / 再構築（純粋関数・git 非依存）
# ---------------------------------------------------------------------------

def parse_handoff(text: str):
    """Handoff.md 本文を (header, entries, footer) に分解する。

    header: 先頭から最初の `### [` 直前まで（タイトル＋注記＋区切り `---`）
    entries: `### [YYYY-MM-DD] ...` で始まる各エントリ（前後の余白・末尾セパレータ `---` を除去）
    footer: `## 過去の作業履歴...` 以降（無ければ空文字）
    """
    # footer を先に切り出す
    fi = text.find(FOOTER_MARKER)
    if fi == -1:
        body, footer = text, ""
    else:
        # FOOTER_MARKER の行頭まで遡る
        line_start = text.rfind("\n", 0, fi)
        body = text[: line_start + 1] if line_start != -1 else ""
        footer = text[fi:]

    # 最初のエントリ位置
    m = ENTRY_RE.search(body)
    if not m:
        return body.rstrip(), [], footer.strip()

    header = body[: m.start()].rstrip()
    entries_region = body[m.start():]

    # `### [` の行頭で分割
    starts = [mm.start() for mm in ENTRY_RE.finditer(entries_region)]
    entries = []
    for i, s in enumerate(starts):
        e = starts[i + 1] if i + 1 < len(starts) else len(entries_region)
        chunk = entries_region[s:e]
        entries.append(_strip_entry(chunk))
    return header, entries, footer.strip()


def _strip_entry(chunk: str) -> str:
    """エントリ末尾の区切り `---` と前後の空白を取り除く。"""
    lines = chunk.rstrip().split("\n")
    while lines and lines[-1].strip() in ("", "---"):
        lines.pop()
    return "\n".join(lines).strip()


def rebuild_handoff(header: str, entries: list[str], footer: str) -> str:
    """header / entries / footer を既存スタイル（`---` 区切り・最新先頭）で再結合する。"""
    parts = [header.rstrip(), ""]
    parts.append("\n\n---\n\n".join(entries))
    if footer.strip():
        parts.append("")
        parts.append(footer.strip())
    out = "\n".join(parts).rstrip() + "\n"
    return out


def entry_yyyymm(entry: str) -> str | None:
    m = ENTRY_RE.search(entry)
    if not m:
        return None
    return f"{m.group(1)}{m.group(2)}"


def month_label(yyyymm: str) -> str:
    """`202606` → `2026年6月`（月は先頭ゼロなし）。"""
    return f"{yyyymm[:4]}年{int(yyyymm[4:6])}月"


# ---------------------------------------------------------------------------
# 回転本体（ファイル IO あり・git なし）
# ---------------------------------------------------------------------------

def rotate(repo_root: str, entry_text: str, max_keep: int = 5):
    """新エントリを先頭挿入し、max_keep を超えた最古エントリをアーカイブへ移す。

    戻り値: {"archived": [(yyyymm, title_line), ...], "kept": int, "written": [repo相対パス, ...]}
    "written" は本処理が実際に書き換えたファイル（Handoff.md ＋回転時のアーカイブ）。
    git_commit_push がこれを明示ステージする（git add -A を避けるため）。
    アーカイブファイルは末尾追記のみ。索引リンクは Handoff.md footer に必要時追加。
    """
    entry_text = entry_text.strip()
    if not ENTRY_RE.search(entry_text):
        raise ValueError(
            "entry text must start with a `### [YYYY-MM-DD] ...` line"
        )

    handoff_path = os.path.join(repo_root, "Handoff.md")
    with open(handoff_path, encoding="utf-8") as f:
        text = f.read()

    header, entries, footer = parse_handoff(text)
    entries = [entry_text] + entries  # 最新を先頭へ

    archived = []
    written = ["Handoff.md"]  # 必ず書き換える本体
    while len(entries) > max_keep:
        oldest = entries.pop()  # 末尾＝最古
        yyyymm = entry_yyyymm(oldest)
        if not yyyymm:
            raise ValueError(f"cannot determine month for archived entry:\n{oldest[:80]}")
        _append_archive(repo_root, yyyymm, oldest)
        footer = _ensure_index_link(footer, yyyymm)
        title_line = oldest.splitlines()[0]
        archived.append((yyyymm, title_line))
        arch_rel = f"{ARCHIVE_DIR}/Handoff-{yyyymm}.md".replace(os.sep, "/")
        if arch_rel not in written:
            written.append(arch_rel)

    new_text = rebuild_handoff(header, entries, footer)
    with open(handoff_path, "w", encoding="utf-8") as f:
        f.write(new_text)

    return {"archived": archived, "kept": len(entries), "written": written}


def _append_archive(repo_root: str, yyyymm: str, entry: str) -> None:
    """月別アーカイブの末尾にエントリを追記する（無ければタイトル付きで新規作成）。"""
    arch_dir = os.path.join(repo_root, ARCHIVE_DIR)
    os.makedirs(arch_dir, exist_ok=True)
    path = os.path.join(arch_dir, f"Handoff-{yyyymm}.md")
    block = entry.strip() + "\n"
    if not os.path.exists(path):
        title = f"# juno.tokyo — セッション履歴 {month_label(yyyymm)}\n\n"
        with open(path, "w", encoding="utf-8") as f:
            f.write(title + block)
    else:
        with open(path, "a", encoding="utf-8") as f:
            f.write("\n" + block)


def _ensure_index_link(footer: str, yyyymm: str) -> str:
    """footer の索引に当該月リンクが無ければ追加する。"""
    rel = f"{ARCHIVE_DIR}/Handoff-{yyyymm}.md".replace(os.sep, "/")
    if rel in footer:
        return footer
    link = f"- [{month_label(yyyymm)}]({rel})"
    if not footer.strip():
        footer = "## 過去の作業履歴（アーカイブ）\n"
    return footer.rstrip() + "\n" + link + "\n"


# ---------------------------------------------------------------------------
# git
# ---------------------------------------------------------------------------

def _git(repo_root: str, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", "-C", repo_root, *args],
        capture_output=True, text=True,
    )


def has_origin(repo_root: str) -> bool:
    r = _git(repo_root, "remote")
    return "origin" in r.stdout.split()


def _unstaged_changes(repo_root: str, staged: list[str]) -> list[str]:
    """このコミットに含まれない作業ツリー変更（未ステージの modified / 未追跡）を列挙する。

    「自分が更新したのに --add し忘れた doc」と「並行セッションの未コミット WIP」の双方を
    handoff 実行時にその場で可視化するための警告材料。

    判定は porcelain の XY ステータス列で行う＝Y（作業ツリー側）が空でなければ未ステージ、
    `??` は未追跡。**`--add` 済みでステージされたファイル（Y が空）は決して列挙しない**。
    🔴 以前は `git status --porcelain` 出力（非 ASCII を 8 進エスケープする）を raw UTF-8 の
    `staged` リストと文字列比較していたため、日本語パス（例: `docs/06-ロードマップ.md`）が
    `--add` 済みでも永久に一致せず毎回「未コミット」と誤警告していた。`core.quotepath=false`
    で raw UTF-8 を得たうえで、名前一致ではなく XY で判定する（staged は MM 等の保険に使うだけ）。
    """
    staged_set = {p.strip().rstrip("/") for p in staged}
    r = _git(repo_root, "-c", "core.quotepath=false", "status", "--porcelain")
    out = []
    for line in r.stdout.splitlines():
        if len(line) < 4:
            continue
        x, y = line[0], line[1]
        path = line[3:]  # porcelain v1: 2 文字ステータス + 空白 + パス
        if " -> " in path:  # リネームは新パス側
            path = path.split(" -> ", 1)[1]
        path = path.strip().strip('"')
        if not path or path in staged_set:
            continue
        untracked = (x == "?" and y == "?")
        unstaged = (y != " ")  # 作業ツリーに未ステージ変更が残る＝このコミットに入らない
        if untracked or unstaged:
            out.append(path)
    return out


def git_commit_push(repo_root: str, msg: str, files: list[str], push: bool = True) -> list[str]:
    log = []
    # 明示ステージのみ（git add -A は使わない）。共有作業ツリーで並行セッションが編集中でも、
    # このセッションが意図したファイルだけをコミットし、他者の未コミット WIP を巻き込まない。
    if files:
        _git(repo_root, "add", "--", *files)
    leftover = _unstaged_changes(repo_root, files)
    if leftover:
        log.append(f"⚠️ handoff に含めない作業ツリー変更 {len(leftover)} 件（自分の更新なら --add で追加）:")
        for p in leftover:
            log.append(f"     {p}")
    c = _git(repo_root, "commit", "-m", msg)
    if c.returncode != 0:
        # nothing to commit など
        log.append(f"commit: {c.stdout.strip() or c.stderr.strip()}")
        return log
    log.append("commit: OK")
    if push:
        if not has_origin(repo_root):
            log.append("push: skipped (origin 未設定)")
        else:
            p = _git(repo_root, "push", "origin", "main")
            log.append("push: OK" if p.returncode == 0 else f"push: FAILED\n{p.stderr.strip()}")
    else:
        log.append("push: skipped (--no-push)")
    return log


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def repo_root_from_cwd() -> str:
    r = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True
    )
    if r.returncode != 0:
        sys.exit("not inside a git repository")
    return r.stdout.strip()


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Handoff.md の確定処理（回転＋commit＋push）")
    ap.add_argument("--entry-file", required=True, help="新エントリ本文の md ファイル")
    ap.add_argument("--repo", default=None, help="リポジトリルート（既定: git toplevel）")
    ap.add_argument("--commit-msg", default="docs: handoff セッション引き継ぎ更新")
    ap.add_argument("--max-keep", type=int, default=5)
    ap.add_argument("--no-push", action="store_true")
    ap.add_argument("--add", action="append", default=[], metavar="PATH",
                    help="handoff コミットに追加で含めるファイル（このセッションで更新した doc 等）。"
                         "複数指定可。git add -A を避けるため明示宣言が必要")
    ap.add_argument("--no-git", action="store_true", help="回転のみ（commit/push しない）")
    ap.add_argument("--dry-run", action="store_true", help="書き込まず回転の概要だけ表示")
    ap.add_argument("--keep-entry-file", action="store_true",
                    help="consume 後に entry-file を削除しない（既定は成功後に削除して残骸を残さない）")
    args = ap.parse_args(argv)

    repo = args.repo or repo_root_from_cwd()
    with open(args.entry_file, encoding="utf-8") as f:
        entry = f.read()

    if args.dry_run:
        handoff_path = os.path.join(repo, "Handoff.md")
        with open(handoff_path, encoding="utf-8") as f:
            text = f.read()
        header, entries, footer = parse_handoff(text)
        new_entries = [entry.strip()] + entries
        overflow = max(0, len(new_entries) - args.max_keep)
        print(f"[dry-run] 現在 {len(entries)} 件 → 挿入後 {len(new_entries)} 件")
        print(f"[dry-run] 保持 {min(len(new_entries), args.max_keep)} 件 / アーカイブ移動 {overflow} 件")
        for e in new_entries[len(new_entries) - overflow:]:
            ym = entry_yyyymm(e)
            print(f"[dry-run]   → {ARCHIVE_DIR}/Handoff-{ym}.md  «{e.splitlines()[0]}»")
        return 0

    info = rotate(repo, entry, max_keep=args.max_keep)
    print(f"Handoff.md: {info['kept']} 件保持・{len(info['archived'])} 件アーカイブ")
    for ym, title in info["archived"]:
        print(f"  archived → Handoff-{ym}.md  {title}")

    if not args.no_git:
        # 回転で書いたファイル＋ --add 明示分だけをステージ（重複除去・順序保持）
        files = list(dict.fromkeys(info["written"] + args.add))
        for line in git_commit_push(repo, args.commit_msg, files, push=not args.no_push):
            print(line)

    # entry-file は Handoff.md に取り込まれた時点で用済み。残骸を残さないよう既定で削除する
    # （次回 handoff の Write が既存ファイルと衝突して毎回手当てさせられる問題の解消）。
    if not args.keep_entry_file:
        try:
            os.remove(args.entry_file)
            print(f"entry-file removed: {args.entry_file}")
        except OSError:
            pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
