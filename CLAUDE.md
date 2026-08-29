# CLAUDE.md

Claude Code（claude.ai/code）がこのリポジトリで作業するときの指針。

## What this is

**Claude Code とエージェントの仕組みを学ぶための、自分用の学習ノートサイト。**
VitePress で書き、GitHub Pages で公開する。2本柱 —「使い方」と「仕組み」。

**読者は自分。ただし読み返して分かること。** 文章を長く読むのが辛いという前提で作る:

- **図が主役、文章は図の補足**（Mermaid）
- **1ページ1概念**、スクロール3画面まで
- 各ページ冒頭に**要点カード3行**
- 各ページ末に**4択クイズ3問**（成績はブラウザに保存し、間違えた問題を再出題）

**正確さの規律**: Claude Code は更新が速く、AI の知識も古くなる。**推測を断定で書かない。**
各ページに「いつ時点の情報か」を書き、怪しい箇所は公式ドキュメントで裏取りする。

## ドキュメント責務（SSOT — どこが「正」か）

事実は **1ファイルにだけ** 書き、他はリンクする。**変更時は所有者ファイルだけを直す。**

| トピック | 所有者（ここが正） | 他ファイル |
|---|---|---|
| 原則・規約・憲法 | `.specify/memory/constitution.md` | 参照のみ |
| ブランチ運用・Issue 運用・セットアップ | `CONTRIBUTING.md` | 1行＋リンク |
| やること（書くページ・機能・バグ） | **GitHub Issues** | 1行＋リンク |
| 個別判断の**背景・理由・却下した代替案** | `docs/adr/` | 参照のみ |
| コマンド（dev/build/test） | `CLAUDE.md`（下記 Commands 節） | 1行＋リンク |
| サイトの中身（説明そのもの） | `docs/` 配下の各ページ | — |

## Commands

<!-- VitePress 導入後に埋める -->

## タスク管理（やることの置き場）

**やること（書くページ・直したい説明・機能）は GitHub Issues が正。**

- **ラベルはブランチ名・コミット接頭辞と同じ語彙**（`feat` `fix` `ci` `docs` `chore` `test`
  `refactor`）。**Issue のラベルがそのまま切るべきブランチの `<type>` になる。**
- **起票は確認を挟む。** 会話中に「あとでやる」が出たら、タイトルと本文の案を提示して承認を
  得てから `gh issue create` する（勝手に作らない）。テンプレートは
  `.github/ISSUE_TEMPLATE/task.md`。**対話できない場所からは `--title` と `--body` が必須。**
- **PR 本文に `Closes #N` を書く。**

## ADR（意思決定記録）

**選択肢を比べて1つを選んだとき**は `docs/adr/` に ADR を1本書く。運用ルールと書式は
[`docs/adr/README.md`](./docs/adr/README.md) が正。

- **決定済みの ADR は書き換えない。** 判断が変わったら新しい ADR を書き、相互リンクする。
- **`.specify/` と `.claude/skills/` を変更するときは必ず ADR を書く。** 上流から再生成される
  領域で、理由を残さないとアップグレードで黙って元に戻る。`.githooks/pre-push` が検知して
  push を止める。

## AI 開発フローの分担（Spec Kit × superpowers）

**上流（何を作るか）は Spec Kit、下流（どう進めるか）は superpowers。**

| 工程 | 所有者 |
|---|---|
| 規範 | Spec Kit（`.specify/memory/constitution.md`） |
| 要件の引き出し | superpowers（`brainstorming`） |
| 仕様の文書化・曖昧さの解消 | Spec Kit（`/speckit-specify` `-clarify` `-analyze`） |
| 実装計画 | Spec Kit（`/speckit-tasks`） |
| 実装中の規律・完了判定 | superpowers |
| ブランチ統合 | `CONTRIBUTING.md` |

**設計文書は `docs/superpowers/` に書かない。** 合意内容を要約して `/speckit-specify` に渡す。
`writing-plans` は呼ばない。

**使わないスキル**: `writing-plans` / `subagent-driven-development` / `executing-plans` /
`using-git-worktrees` / `finishing-a-development-branch`（いずれも `CONTRIBUTING.md` か
Spec Kit が同じ役割を持つ）。

## Conventions / gotchas

- **ブランチ運用とガードレールは [`CONTRIBUTING.md`](./CONTRIBUTING.md) が正**
  （GitHub Flow。`type/説明` → PR → Squash merge。`main` へ直接 push しない）。
- クローン後1回だけ: `git config core.hooksPath .githooks`（忘れるとフックが効かない）。
