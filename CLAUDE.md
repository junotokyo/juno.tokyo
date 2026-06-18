@./PROJECT.md

# Language Preference

Think in English, interact with the user in Japanese.

# juno.tokyo — Claude Code 用ルール

このファイルは Claude Code 固有の運用ルールです。プロジェクト共通のルール（ディレクトリ・デプロイ・テスト・
コミット・worktree・Handoff 役割・厳守事項など）は `PROJECT.md` を参照してください（冒頭で import 済み）。

---

## 安全の不変条件: 自分の推論をユーザーの指示にしない

自分が推論・提案した結論を、ユーザーの指示と混同しない。**通常の自律的な実装（ユーザーの意図を汲んで
動くこと）はこれまで通りで、縛らない。** 効かせるのは **不可逆・破壊的な操作**（ファイル移動/削除・
force push・リポジトリ構成変更・本番影響のある push・DNS / Mail / Vercel project 設定変更・外部送信 等）の
直前だけ — その操作の出所が「ユーザーの実際の言葉」か「自分の以前の推論・提案」かを一点確認し、
自分の推論しか無い／直前のユーザー発言と矛盾するなら、**提案**として扱い実行前に確認する
（記憶や「そう言われた気がする」で進めない）。

🔴 **本プロジェクト固有の補足**: `git push origin main` は **Vercel が即 Production にデプロイする**＝
本番影響のある操作。worktree → main の **fast-forward** push は reversible・low-risk として自走可だが、
これは「テスト済み・コミット済み・ユーザーが内容を見た上で push 指示している」前提。確信のない変更を
push してはいけない（Preview デプロイで先に確認する）。

---

## 最優先: 4 トリガーでサブファイルを Read（省略不可）

**CLAUDE.md は意図的に不完全である。** 実際のワークフロー・チェックリスト・実行手順はサブファイルにのみ
記載されている。CLAUDE.md だけで「workflow を知っている」と判断すると、必ず訓練データの古い記憶で
穴埋めしてしまい、現行ルールに違反する。

以下 4 つのトリガーに該当する状況では、**訓練データではなく**必ず該当サブファイルを Read し、その内容に従うこと。

### Trigger 1: ユーザーが handoff 関連の発言をした

**トリガー語**（直近メッセージに以下のいずれかが含まれる）:
- `/handoff`
- 「セッションを終わる」「セッション終了」「終わって」
- 「handoff して」「引き継ぎして」
- 「最後まで実行して」「全部やって終わって」

**実行順**:
1. 下記「`/handoff` ステップ 0 開始確認」を判定（Read 不要、CLAUDE.md 内で完結）
2. ステップ 0 通過後、**最初の tool call として** `Read("docs/process/handoff-workflow.md")` を実行
3. handoff-workflow.md の指示に従ってワークフローを進める

**❌ 間違った行動**: ステップ 0 通過後、いきなり `Handoff.md` を見に行く
**✅ 正しい行動**: ステップ 0 通過後、まず `docs/process/handoff-workflow.md` を Read し、**その指示の中で**改めて `Handoff.md` を読む

### Trigger 2: `codex` コマンドを実行する直前

**トリガー**: `codex exec` / `codex review` 等、任意の `codex` サブコマンドを Bash で実行しようとしている
（プランレビュー / 実装後レビュー / コード修正代行 / 独立調査のいずれの目的でも対象）

**実行順**:
1. **`codex` 実行 Bash の前に必ず** `Read("docs/process/codex-collab.md")` を実行
2. codex-collab.md の内容（必須オプション・宣言文・stdin 形式・採否分類等）に従って codex を実行

**❌ 間違った行動**: 訓練データの記憶で `codex exec ...` / `codex review ...` をいきなり実行
**✅ 正しい行動**: 先に `docs/process/codex-collab.md` を Read してから codex を呼ぶ

### Trigger 3: プランモードがアクティブ

**トリガー**: `Plan mode is active` のシステムリマインダーが見えている / プランモード Phase 1 に入った / `EnterPlanMode` 直後

**実行順**:
1. **Phase 1 の最初の tool call として** `Read("docs/process/plan-mode.md")` を実行
2. **次の tool call として** `Read("Handoff.md")` を実行
3. plan-mode.md の自己レビュー指針に従ってプランを組み立てる

**❌ 間違った行動**: plan-mode.md を Read した後、`Handoff.md` をスキップしてタスク具体化に直行する
**✅ 正しい行動**: plan-mode.md → Handoff.md の順で必ず Read してからタスク具体化に入る

### Trigger 4: 既存実装の不具合報告 / 改善要望に着手する（Codex 主導調査が既定）

実装した Claude は実装時の mental model に引っ張られ、不具合・改善時にその枠から抜けにくい（anchoring bias）。
実装文脈ゼロの Codex に独立 framing を取らせ、Claude は客観材料を得た上で責任判断する。

**トリガー語**（**既存機能**に対する不具合・改善。新機能の新規プランニングは対象外＝従来通り Claude 主導）:
- 不具合系: 「バグ」「不具合」「動かない」「落ちる」「〜が変」「おかしい」、本番／Preview 検証での回帰・期待と異なる挙動の報告
- 改善要望系: 「改善して」「〜を良くして」「使いにくい」「〜してほしい（既存機能への要望）」

**実行順**（「セッション開始時 共通 Read」の**後に**）:
1. **`Read("docs/process/codex-collab.md")`** — フェーズ分担マップ + セクション F を把握
2. **不具合か改善要望かを判定**:
   - 不具合 → **F-1**: 解・スコープを渡さず Codex に独立原因調査（cold-start 可）
   - 改善要望 → **F-2**: Claude が意図 / 制約 / 非ゴール / UX 目標を先に枠付け → その枠で Codex が選択肢を独立調査
3. **Codex 調査結果を Claude がレビュー** → 採用 / 却下 / 保留を責任判断（**F-3**: Codex 診断への反対は「前提を疑うトリガー」、Claude 優位タイブレーク禁止）
4. 収束しなければ **F-4 フォーマット**（技術難易度・工数 / メンテナンス性 / UX / その他、**UX 最優先**）でユーザーに上げる
5. 以降は通常フロー（プラン → セクション A → ExitPlanMode → 実装 → セクション B → commit → main FF）

**❌ 間違った行動**: 不具合報告・改善要望を受けて Claude が自分で原因調査・改善案検討に直行する（実装者 anchoring のまま迷走）
**✅ 正しい行動**: codex-collab.md セクション F に従い、Claude 自身の調査より先に Codex 独立調査を挟む

---

これら 4 トリガーに該当しない通常タスク（typo 修正・コードレビュー・通常実装等）ではサブファイルを Read しなくてよい。

---

## セッション開始時（共通・スキップ禁止）

> あらゆるセッション開始時に適用する。Trigger 3（プランモード）に該当する場合は、Trigger 3 の plan-mode.md Read を**先に**行ったあと、本セクションの Read を**続けて**行う。

1. **`Handoff.md` を Read する** — 直近の作業状態を把握する
2. ユーザーが指定したタスク内容を把握する（Linear は本プロジェクトでは使っていない＝ユーザーの指示と
   `Handoff.md` が情報源）

**重要**: ユーザーが具体的タスクを指定したときも、本セクションの Read を**スキップしてはならない**。
具体的指定は「開始時 Read をスキップして良い」という意味ではない。探索・実装の**前に** 1 を済ませる。

3. 🔴 **コミットを伴うと判断したら `EnterWorktree` で worktree に入る（手動 `git worktree add` は使わない）**。
   - **タイミング**: 1 の Read の後・**最初の write／`codex` 呼び出し／プラン具体化より前**に呼ぶ。`EnterWorktree` は pwd ごと
     worktree に移すので、以降の全編集が**構造的に隔離**される（手動 `git worktree add` は pwd が main のまま残り、
     `cd` 実体パスのコマンドが main に漏れる）。
   - 🔴 **既に worktree 内で起動している場合**（`pwd` が `.claude/worktrees/` 配下＝UI「ワークツリー」チェックボックス ON で harness が起動時生成）は、**もう隔離済みなので `EnterWorktree` を呼ばない**（二重に入らない）。この worktree は `ExitWorktree` で消せないため、後始末は handoff の Bash フォールバック（`docs/process/handoff-workflow.md` ステップ5）。
   - 既存 worktree に入り直すときは `EnterWorktree(path: <既存パス>)`。読み取り専用の調査・相談セッション（コミットしない）は実体パス main のままでよい（迷ったら worktree 側へ）。
   - 詳細・例外・FF 戻しは `PROJECT.md`「worktree 方針」。

> worktree の後始末は**各セッションの `/handoff` で自分の worktree を消す**（main へ FF/push した後）＝`ExitWorktree(action: "remove")`。**チェックボックス起動（UI「ワークツリー」ON）の worktree は `ExitWorktree` が効かない**ので Bash フォールバックで消す（`docs/process/handoff-workflow.md` ステップ5）。

---

## `/handoff` ステップ 0: 開始確認（Trigger 1 のゲート判定、Read 不要）

handoff workflow を**1 行でも実行する前に**、以下 2 点を必ず確認する。省略不可。**auto mode・自走実行モードでも例外なし**。

**0-1. ユーザーから明示的な handoff 指示があったか**

直近のユーザー発言に Trigger 1 のトリガー語のいずれかが含まれている必要がある。含まれていない場合
（実装完了の流れで自走している / Todo の最後に書いてあるだけ等）は、**handoff workflow を開始せず**、
以下を発言してユーザーの確認を待つ：

> 実装は一段落しました。動作確認後、セッションを終了して良い場合は「handoff」と指示してください。

ユーザーの動作確認 → 明示的な終了承認 → 初めてステップ 0-2 に進む。

**0-2. 現在の作業ディレクトリを確認**

```bash
pwd
git worktree list
```

判定：
- `pwd` が `.claude/worktrees/<name>/` 配下 = worktree 内で作業している
- それ以外 = 実体パス `~/Library/CloudStorage/Dropbox/Projects/Web/juno.tokyo/` で作業（他の worktree には触らない）

セッション中の編集が「想定していた作業ベース」と一致しているか `git status` で再確認する。乖離があれば報告してから進める。

**ステップ 0 通過後 → `Read("docs/process/handoff-workflow.md")` を最初の tool call として実行し、その指示に従う。**
