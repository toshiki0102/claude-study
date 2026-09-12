# Implementation Plan: 学習ノートサイト — 1本目のページを公開まで通す

**Branch**: `feat/impl-plan` | **Date**: 2026-09-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-learning-site-first-page/spec.md` / Issue #8

> **spec の参照番号について**: Issue #8 の本文は設問の識別を「FR-021」と書いているが、
> spec.md では **FR-019** が設問の同一性、FR-021 は目次の要件である。本計画は **FR-019** を参照する。

## Summary

**VitePress で作った静的サイトに、frontmatter でクイズを持つ解説ページを1本置き、
完了条件を満たさなければ公開されない仕組みごと GitHub Pages に出す。**

- クイズ3問は**ページ frontmatter** に書き、ページ末尾に自動で差し込まれる `Quiz.vue` が描画する
- 設問は**問題文のハッシュ**で、ページは手書きの **`quizId`** で識別し、成績は `localStorage` に持つ
- 採点・識別子・保存/復元は**素の TS モジュール**に切り出し、Vitest で単体テストを書く（憲法 IV）
- 「クイズ3問・最終確認日・出典リンク」の検査も **Vitest のテスト**として書き、
  **GitHub Actions が公開前に走らせる**。落ちたら公開しない

```mermaid
flowchart TD
  subgraph 書く
    MD["docs/guide/agent-loop.md<br/>frontmatter: quizId / lastVerified / quiz×3<br/>本文: 要点3行 → Mermaid 図 → 説明 → 出典"]
  end
  subgraph ビルド・公開
    MD --> CHK{"npm test<br/>完了条件の検査"}
    CHK -->|赤| STOP["公開しない"]
    CHK -->|緑| BUILD["VitePress build<br/>base: /claude-study/"] --> PAGES["GitHub Pages"]
  end
  subgraph 読む
    PAGES --> READER["読者（＝自分）"]
    READER --> QUIZ["Quiz.vue<br/>doc-after スロットに自動挿入"]
    QUIZ --> LOGIC["src/quiz/*.ts<br/>id / grade / storage"]
    LOGIC <--> LS[("localStorage<br/>端末内のみ")]
  end
```

決定の背景は ADR が所有する（[0004](../../docs/adr/0004-quiz-data-model.md) / [0005](../../docs/adr/0005-page-completion-check.md) / [0006](../../docs/adr/0006-mermaid-rendering.md)）。
裏取りした事実は [research.md](./research.md)。

## Technical Context

**Language/Version**: TypeScript / Node.js 24 系（ローカル確認: v24.13.1, npm 11.8.0 / 2026-09-12）

**Primary Dependencies**:

| パッケージ | 範囲 | 根拠 |
|---|---|---|
| `vitepress` | `^1.6.4` | 安定版。2.x はアルファ（[research.md](./research.md) F-1） |
| `vitepress-plugin-mermaid` | `^2.0.17` | VitePress 1.x 向け（[ADR-0006](../../docs/adr/0006-mermaid-rendering.md)） |
| `mermaid` | `^11` | プラグインの peer が `10 \|\| 11`。**12 は入れない** |
| `vitest` | `^5` | 単体テストと完了条件の検査 |
| `js-yaml` ほか frontmatter パーサ | 検査側でのみ使用 | 検査が VitePress を読み込まずに済むようにする |

**Storage**: ブラウザの `localStorage` のみ。キー `claude-study:quiz:v1`。サーバー・DB・アカウントを持たない（憲法）

**Testing**: Vitest。対象は素の TS モジュール（`src/quiz/*`, `src/check/*`）。Vue コンポーネントは薄く保ち、単体テストの対象にしない

**Target Platform**: 静的サイト。GitHub Pages（プロジェクトサイト、`base: '/claude-study/'`、公開 URL `https://toshiki0102.github.io/claude-study/`）

**Project Type**: 静的サイト＋その中で動く小さなクライアント側ロジック

**Performance Goals**: 明示しない。読者1人・ページ数本の規模で、性能が問題になる余地が無い（spec の Assumptions）

**Constraints**: 外部送信0件（SC-006）／`localStorage` が使えなくても回答と採点が動く（SC-005）／公開までに手作業を挟まない（SC-008。ただし Pages の初回有効化だけは手作業）

**Scale/Scope**: 1本目のページ1枚＋目次。将来ページが増える前提で、成績はページ横断で集計できる形にだけしておく（FR-018。集計機能は作らない）

**未確認（断定しない）**: Vitest 5（peer `vite ^6||^7||^8`）と VitePress 1.6.4（`vite@^5` を内包）の同居。
影響は無いと見込むが確認していない → [research.md](./research.md) U-1。**実装の最初のタスクで確かめる。**

## Constitution Check

*GATE: Phase 0 の前に通過必須。Phase 1 の設計後に再確認する。*

| 原則 | ゲート | Phase 0 | Phase 1 再確認 |
|---|---|---|---|
| **I. 推測を断定で書かない** | 技術的事実は公式ドキュメントか実行結果で裏を取り、出典と最終確認日を残す。未確認は「未確認」と書く | ✅ [research.md](./research.md) に出典つきで記録。未確認は U-1 / U-2 として分離 | ✅ 設計文書はすべて `最終確認: 2026-09-12` を持つ |
| **II. 図が主役・1ページ1概念** | 解説ページは Mermaid 図を持つ。本文3画面以内 | ✅ Mermaid の描画手段を確保（[ADR-0006](../../docs/adr/0006-mermaid-rendering.md)） | ⚠️ **機械検査しない**と決めた（[ADR-0005](../../docs/adr/0005-page-completion-check.md)）。→ Complexity Tracking |
| **III. 完了条件はクイズ3問** | 3問ないページを公開しない。本文だけで答えられる | ✅ frontmatter に3問（[ADR-0004](../../docs/adr/0004-quiz-data-model.md)） | ✅ 検査が3問を強制（[contracts/page-check.md](./contracts/page-check.md)）。「本文だけで答えられる」は人が守る |
| **IV. コードにはテストを書く** | ロジックに Red → Green のテスト。緑でなければマージしない | ✅ ロジックを素の TS に分離する方針 | ✅ [contracts/quiz-modules.md](./contracts/quiz-modules.md) にテスト要件を明記。`tasks.md` でテストを実装より前に並べる |

**判定: 通過（1点だけ意図的な逸脱あり → Complexity Tracking）。**

## Project Structure

### Documentation (this feature)

```text
specs/001-learning-site-first-page/
├── spec.md              # 何を作るか（#4 / PR #7）
├── plan.md              # このファイル
├── research.md          # Phase 0: 裏取りした事実
├── data-model.md        # Phase 1: ページ・設問・成績記録
├── quickstart.md        # Phase 1: 動作確認ガイド（S-1〜S-8）
├── contracts/
│   ├── page-frontmatter.md   # ページを書く側の契約
│   ├── page-check.md         # 完了条件の検査の契約
│   └── quiz-modules.md       # TS モジュールの契約
├── checklists/
│   └── requirements.md       # 仕様の品質チェック（16/16 済み）
└── tasks.md             # Phase 2: /speckit-tasks が作る（このコマンドでは作らない）
```

### Source Code (repository root)

```text
docs/                            # VitePress のルート（＝サイトの中身）
├── .vitepress/
│   ├── config.ts                # withMermaid() / base: '/claude-study/' / 目次
│   └── theme/
│       ├── index.ts             # doc-after スロットに Quiz を差し込む
│       └── Quiz.vue             # 表示と入力だけの薄い層
├── index.md                     # 目次（2本柱の枠。未着手はリンクしない）
├── guide/                       # 「使い方」
│   └── agent-loop.md            # 1本目のページ
├── internals/                   # 「仕組み」（1本目では空）
└── adr/                         # 既存（サイトには出さない）

src/
├── quiz/
│   ├── id.ts                    # questionId(): 問題文のハッシュ
│   ├── grade.ts                 # 採点・再出題の選別
│   └── storage.ts               # localStorage の読み書き（例外を投げない）
└── check/
    └── page.ts                  # checkPage() / checkSite()

tests/
├── quiz/                        # id / grade / storage の単体テスト
└── pages.test.ts                # 完了条件の検査（docs/**/*.md を全部かける）

.github/workflows/
└── deploy.yml                   # npm test → build → GitHub Pages
```

**Structure Decision**:

- **`docs/` をサイトのルートにする。** VitePress 公式のデプロイ手順（`docs/.vitepress/dist`）に
  そのまま乗るため。既存の `docs/adr/` はサイトには出さない（VitePress の対象から除外する）。
- **ロジックを `src/` に出し、`docs/.vitepress/theme/` から相対 import する。**
  テストが VitePress を読み込まずに済み、`vite` のバージョン差（[research.md](./research.md) U-1）の影響を受けにくい。
- **ディレクトリ名は英字**（`guide` / `internals`）。**表示名は日本語**（「使い方」「仕組み」）を
  `config.ts` の目次で与える。URL に日本語が入るとリンクの共有時に percent-encode されて読めなくなるため。
- **`tests/` をリポジトリ直下に置く。** 検査テストが `docs/` 全体を走査する立場なので、`docs/` の内側に置かない。

## Complexity Tracking

> Constitution Check で正当化が必要な逸脱のみ記載

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| **憲法 II の「本文はスクロール3画面以内」を機械検査しない**（人の目視に委ねる）。spec の FR-023 は3項目のみを検査対象としており矛盾はしないが、憲法 II を仕組みで守らない点は逸脱にあたる | 機械に「3画面」は測れない。画面の高さは端末ごとに違い、Mermaid 図の描画後の高さはビルド時に分からない | **文字数の上限**で代理する案を却下した。図が多く文章の短いページ（＝憲法 II が理想とする形）を落とし、図の無い長文を通す。**憲法が守りたいものと逆を向いた指標は、守っている気分だけを作る**。詳細は [ADR-0005](../../docs/adr/0005-page-completion-check.md) |

## 次の工程

`/speckit-tasks` で `tasks.md` を生成する。**憲法 IV に従い、テストを書くタスクを実装タスクより前に並べる。**
最初のタスクは [research.md](./research.md) U-1（Vitest と VitePress の同居）の確認とする。
