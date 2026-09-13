---
title: claude-study
quizExempt: true
---

# claude-study

**Claude Code とエージェントの仕組みを学ぶための、自分用の学習ノート。**
図が主役・1ページ1概念・各ページ末に4択クイズ3問。

## 使い方

- [エージェントループ](./guide/agent-loop.md) — モデルが判断し、ツールを実行し、結果を戻して繰り返す
- [CLAUDE.md とメモリ](./guide/claude-md-memory.md) — 何をどこに書けば次のセッションと圧縮のあとも残るか
- [パーミッションモード](./guide/permission-modes.md) — 聞かずにやってよい範囲はどう決まるか。ルールが先、モードは後
- [スキル](./guide/skills.md) — 必要なときだけ読まれる手順書。CLAUDE.md との使い分け
- [セッションと再開](./guide/sessions.md) — 会話はどこに保存され、再開で何が戻り何が戻らないか
- [プランモード](./guide/plan-mode.md) — 読んで計画を書くまで。承認して初めて編集に移る

## 仕組み

- [コンテキストウィンドウ](./internals/context-window.md) — 何が溜まり、上限に近づくと圧縮で何が消えるか
- [サブエージェント](./internals/subagents.md) — 別のコンテキストで回し、親には最終メッセージだけが戻る
- [プロンプトキャッシュ](./internals/prompt-caching.md) — 先頭が同じ部分は計算し直さない。何が壊すか、なぜ長いセッションが安いか
- [フック](./internals/hooks.md) — ループの決まった時点でアプリが走らせる処理。文脈の外で動き、モデルの判断に関係なく走る
- [MCP](./internals/mcp.md) — 外部のツールを「ツール定義」として差し込む規格。起動時は名前だけ、スキーマは必要なときだけ
