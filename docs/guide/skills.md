---
title: スキル
quizId: skills
lastVerified: 2026-09-13
quiz:
  - q: セッション起動時、スキルについてコンテキストに入るものは何か
    choices:
      - すべてのスキルの本文
      - 各スキルの1行の説明（description）だけ。本文は呼ばれたときに入る
      - 何も入らない
      - 最後に使ったスキルの本文だけ
    answer: 1
  - q: deploy や commit のように副作用のある手順をスキルにするとき、付けるべき設定はどれか
    choices:
      - "user-invocable: false（Claude だけが呼べる）"
      - "disable-model-invocation: true（自分だけが呼べる）"
      - "context: fork"
      - paths を空にする
    answer: 1
  - q: CLAUDE.md とスキルの使い分けとして正しいのはどれか
    choices:
      - 毎回守る事実や規約は CLAUDE.md、手順やチェックリストはスキル
      - 長いものは CLAUDE.md、短いものはスキル
      - 個人用は CLAUDE.md、チーム用はスキル
      - 違いはない。どちらも毎回全文が読まれる
    answer: 0
---

# スキル（skills）

::: tip 要点
1. スキル＝**必要なときだけ読まれる手順書**。`SKILL.md` 1枚で、起動時に入るのは1行の `description` だけ。本文は呼ばれたときに入る
2. 呼び方は2つ。自分が `/name` で呼ぶか、Claude が説明文を見て自分で呼ぶか。**副作用のある手順（deploy・commit）は `disable-model-invocation: true` で自分だけが呼べる**ようにする
3. 使い分け: **毎回守る事実 → CLAUDE.md、手順になったもの → スキル**。CLAUDE.md の一節が「手順」に育ったらスキルに切り出す
:::

```mermaid
flowchart LR
  subgraph S["起動時に入るもの"]
    direction TB
    C[CLAUDE.md 全文]
    D1["スキル A の説明（1行）"]
    D2["スキル B の説明（1行）"]
    D3["スキル C<br/>disable-model-invocation<br/>（何も入らない）"]
  end
  D1 -- "/a と打つ、または<br/>Claude が説明を見て呼ぶ" --> B["スキル A の本文が<br/>会話に1メッセージとして入る"]
  D3 -. "/c と打ったときだけ" .-> B
  B --> K["圧縮"]
  K -- "最近呼んだものから<br/>上限つきで戻る" --> R[本文を再注入]
  classDef fixed fill:#e2e8f0,stroke:#475569,color:#0f172a
  classDef accum fill:#fef3c7,stroke:#b45309,color:#451a03
  classDef result fill:#d1fae5,stroke:#047857,color:#064e3b
  classDef edge fill:#ffe4e6,stroke:#be123c,color:#4c0519
  class C,D1,D2,D3 fixed
  class B accum
  class R result
  class K edge
```

## 何がいつ読まれるか

| もの | いつ入るか | 大きさ |
|---|---|---|
| [CLAUDE.md](./claude-md-memory.md) | 毎リクエスト | 全文 |
| ルール（`.claude/rules/`、`paths` 付き） | 該当するファイルを読んだとき | 全文 |
| スキルの説明 | 起動時 | 1行ずつ |
| **スキルの本文** | **呼ばれたとき** | 全文。会話に1メッセージとして入り、以後のターンでも残る |
| スキルの補助ファイル | 本文からリンクされて読まれたとき | 必要な分だけ |

呼ばれた本文は残り続けるので、**1行ごとに毎ターン費用がかかる**。短く書く。
[圧縮](../internals/context-window.md)のあとは、最近呼んだスキルから順に、上限つきで本文が戻る。
古いものは落ちる。

## 誰が呼ぶか

| 設定 | 自分が呼ぶ | Claude が呼ぶ | 説明が起動時に入る |
|---|---|---|---|
| 既定 | できる | できる | 入る |
| `disable-model-invocation: true` | できる | **できない** | 入らない |
| `user-invocable: false` | できない | できる | 入る |

deploy・commit・push のように**やり直しにくい手順は、自分だけが呼べる**設定にする。
説明も起動時に入らないので、呼ぶまでコンテキストを一切使わない。

## 使い分け

| 置き場 | 向いているもの |
|---|---|
| CLAUDE.md | 毎回守る事実。ビルドコマンド、規約、「必ず X する」 |
| スキル | 手順。チェックリスト、複数ステップの作業、呼ぶまで要らない参照資料 |

公式の判断基準は2つ。**同じ手順を何度もチャットに貼っている**、または
**CLAUDE.md の一節が「事実」でなく「手順」に育った**。どちらかならスキルに切り出す。

## 自分で確かめる

- 置き場: `~/.claude/skills/<name>/SKILL.md` は全プロジェクト、`.claude/skills/<name>/SKILL.md` はこのリポジトリだけ。同名なら個人用が勝つ
- `/` と打つと呼べるスキルの一覧が出る。引数は本文の `$ARGUMENTS` に入る
- このリポジトリの `.claude/skills/` には Spec Kit の手順（`/speckit-specify` など）が入っている。仕様を書く手順だから、CLAUDE.md でなくスキル

---

最終確認: **2026-09-13**

出典:

- [Extend Claude with skills — Claude Code](https://code.claude.com/docs/en/skills)（置き場と優先順、起動時は説明だけ、呼ばれた本文は残る、誰が呼ぶかの設定、CLAUDE.md との使い分け、圧縮後の再注入）
- [Explore the context window — Claude Code](https://code.claude.com/docs/en/context-window)（スキル説明の読み込みと、圧縮後に呼んだスキルだけが戻ること）
