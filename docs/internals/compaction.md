---
title: 圧縮の中身
quizId: compaction
lastVerified: 2026-09-13
quiz:
  - q: 圧縮の要約に「原文のまま」は残らないものはどれか
    choices:
      - 目的と依頼の意図
      - ツール出力の全文（ファイルの中身・コマンドの出力）
      - 触ったファイルの一覧
      - 残っている作業
    answer: 1
  - q: 圧縮のあと、ディスクから読み直されるものはどれか
    choices:
      - 会話の全履歴
      - すべてのスキルの本文
      - プロジェクト直下の CLAUDE.md・自動メモリ・直近に変更した最大5ファイル
      - 途中の推論
    answer: 2
  - q: 要約に何を残すかを指定する方法はどれか
    choices:
      - "/compact に指示を添える。または CLAUDE.md に要約の指示を書く"
      - 設定ファイルの effortLevel を上げる
      - "/clear を先に実行する"
      - 指定はできない
    answer: 0
---

# 圧縮の中身（compaction）

::: tip 要点
1. 圧縮＝**会話履歴を1つの構造化された要約に置き換える**こと。残るのは目的・重要な概念・触ったファイル・エラーと直し方・残作業・今の作業。**ツール出力の原文と途中の推論は消える**
2. 要約のほかに**ディスクから読み直されるもの**がある。システムプロンプト、プロジェクト直下の CLAUDE.md、自動メモリ、プランモードの計画、直近に変更した最大5ファイルとそれに効くルール、呼んだスキルの本文（上限つき）。**スキルの一覧は戻らない**
3. 自動で走るのは上限に近づいたとき。**先に手で走らせて何を残すか指示できる**（`/compact 指示`、CLAUDE.md の要約指示、`/rewind` の部分要約）
:::

```mermaid
flowchart LR
  subgraph B["圧縮前の文脈"]
    direction TB
    F1["固定部分<br/>システムプロンプト / CLAUDE.md / メモリ"]
    H["会話履歴<br/>プロンプト・応答・tool_result の原文"]
  end
  K["圧縮"]
  subgraph A["圧縮後の文脈"]
    direction TB
    F2["固定部分（読み直し）"]
    S["構造化された要約<br/>目的・概念・ファイル・エラー・残作業"]
    R["直近に変更した最大5ファイル<br/>＋呼んだスキル（上限つき）"]
  end
  B --> K --> A
  H -. "原文と途中の推論は消える" .-> K
  classDef fixed fill:#e2e8f0,stroke:#475569,color:#0f172a
  classDef accum fill:#fef3c7,stroke:#b45309,color:#451a03
  classDef result fill:#d1fae5,stroke:#047857,color:#064e3b
  classDef edge fill:#ffe4e6,stroke:#be123c,color:#4c0519
  class F1,F2 fixed
  class H accum
  class S,R result
  class K edge
```

## 要約に何が残り、何が消えるか

圧縮は会話履歴を**1つの要約**に置き換える。要約が残すのは、依頼と意図、重要な技術的概念、
調べた・変えたファイル（重要なコード片つき）、エラーとその直し方、残っている作業、今やっている作業。
**消えるのは原文**。ツール出力の全文（読んだファイルの中身、コマンドの出力）と途中の推論は無くなる。
Claude は「そういう作業をした」ことは参照できるが、正確な内容は持っていない。

## 読み直されるもの

| もの | 圧縮後 |
|---|---|
| システムプロンプト | そのまま効く |
| プロジェクト直下の CLAUDE.md、パス指定の無いルール | ディスクから読み直し |
| 自動メモリ | ディスクから読み直し |
| プランモードで書いた計画 | ディスクから読み直し |
| 直近に読んだ・変えたファイル | **最大5つ**、新しいものから読み直し。それに効くルールと下層の CLAUDE.md も |
| 呼んだスキルの本文 | 読み直し。ただし1スキルと合計に上限があり、古いものから落ちる |
| スキルの一覧（説明1行ずつ） | **戻らない**。呼んだものだけ |
| フックが以前足した文脈 | 会話と一緒に要約される |

だから「ずっと守るルール」は[CLAUDE.md](../guide/claude-md-memory.md)、長い手順は[スキル](../guide/skills.md)の**先頭**に書く。
スキルの本文は先頭から残るので、大事な指示ほど上に置く。

## 自動と手動

自動圧縮は上限に近づいたときに走り、手動の `/compact` と同じ手順。しきい値はモデルと設定で変わる。
先に動くほうが、何を残すかを決められる。

- `/compact 認証バグの修正に集中して` のように**指示を添えて**走らせる。自動の推測より狙って残せる
- CLAUDE.md に「要約するときは必ず残すもの」の節を書いておくと、自動圧縮でもそれが使われる
- `/rewind` で1点を選び「ここから要約」「ここまで要約」。会話の一部だけ畳む
- `/autocompact` で、どれだけ埋まったら自動で走るかを変える
- 無関係な作業に移るなら `/clear`。要約すら要らない

## 自分で確かめる

- `/context` で今どれだけ埋まっているか。圧縮後に何が戻ったかもここで分かる
- 圧縮の直前には PreCompact [フック](./hooks.md)が走る。全文を残したければここで転記を退避する
- 圧縮しても[転記ファイル](../guide/sessions.md)は消えない。消えるのは文脈のほう

---

最終確認: **2026-09-13**

出典:

- [Explore the context window — Claude Code](https://code.claude.com/docs/en/context-window)（「What survives compaction」の表、要約が残すもの・消えるもの、`/compact` の指示、`/rewind` の部分要約、`/autocompact`）
- [How the agent loop works — Agent SDK](https://code.claude.com/docs/en/agent-sdk/agent-loop)（「Automatic compaction」節。CLAUDE.md の要約指示、PreCompact フック）
