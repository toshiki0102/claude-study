# Phase 0 調査: 学習ノートサイト — 1本目のページを公開まで通す

**最終確認: 2026-09-12**

憲法 I（推測を断定で書かない）に従い、このファイルには**公式情報か実行結果で裏を取った事実だけ**を
書く。**選択そのものと却下した代替案は ADR が所有する**（`docs/adr/`）。ここは裏取りの記録。

## 確認した事実

### F-1. VitePress の安定版は 1.6.4。2.x はアルファ

`npm registry` の dist-tags を直接確認した（2026-09-12 実行）。

| tag | version | 公開日 | 依存 vite |
|---|---|---|---|
| `latest` | 1.6.4 | 2025-08-05 | ^5.4.14 |
| `next` | 2.0.0-alpha.20 | 2026-09-04 | ^8.2.1 |

→ **1.6.4 を使う。** 2.x はアルファであり、プラグイン群も追随していない（F-5）。

### F-2. Mermaid は VitePress の標準機能ではない

公式の Markdown 拡張一覧（<https://vitepress.dev/guide/markdown>）に Mermaid の記載は無い。
表・タスクリスト・コードハイライト・コンテナは標準だが、` ```mermaid ` フェンスの描画は含まれない。

→ 憲法「図は Mermaid」を満たすには**追加の仕組みが要る**（→ [ADR-0006](../../docs/adr/0006-mermaid-rendering.md)）。

### F-3. frontmatter は `useData()` から読める

<https://vitepress.dev/reference/runtime-api> — `useData()` は `frontmatter: Ref<PageData['frontmatter']>`
を返す。Markdown から生成された Vue コンポーネント内、およびテーマコンポーネント内で使える。

```vue
<script setup>
import { useData } from 'vitepress'
const { frontmatter } = useData()
</script>
```

→ **frontmatter に書いたクイズを、ページ末尾のコンポーネントから読める。**

### F-4. `doc-after` スロットで全ページ末尾に差し込める

<https://vitepress.dev/guide/extending-default-theme> — doc レイアウトのスロットに
`doc-top` / `doc-bottom` / `doc-before` / **`doc-after`** / `doc-footer-before` などがある。

```js
import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, { 'doc-after': () => h(Quiz) })
}
```

→ **各ページに `<Quiz />` を手で書かなくてよい。** 書き忘れが構造的に起きない。

### F-5. Mermaid プラグインの対応状況

`npm registry` を直接確認した（2026-09-12 実行）。

| パッケージ | 最新 | 公開日 | peerDependencies |
|---|---|---|---|
| `vitepress-plugin-mermaid` | 2.0.17 | 2024-09-24 | `mermaid: 10 \|\| 11`, `vitepress: ^1.0.0` |
| `mermaid` | 12.0.0 | 2026-09-10 | — |

→ プラグインは VitePress 1.x 向け。**mermaid は `^11` に固定する**（12 は peer の範囲外）。
プラグイン本体は約2年更新が無い。**これは受け入れたリスクであり、[ADR-0006](../../docs/adr/0006-mermaid-rendering.md) に記録した。**

### F-6. GitHub Pages の公式手順

<https://vitepress.dev/guide/deploy> — プロジェクトサイト（`https://<user>.github.io/<repo>/`）では
`base` の設定が必須。公式ワークフローは `actions/configure-pages` → `actions/upload-pages-artifact`
→ `actions/deploy-pages` の3段。リポジトリ設定で Pages の source を「GitHub Actions」にする**手作業が1回だけ要る**。

- このリポジトリは `toshiki0102/claude-study` → 公開 URL は `https://toshiki0102.github.io/claude-study/`、
  `base: '/claude-study/'`。
- **Pages はまだ有効化されていない**（`gh api repos/:owner/:repo/pages` が 404、2026-09-12 実行）。

### F-7. ローカル環境

`node -v` → v24.13.1 / `npm -v` → 11.8.0（2026-09-12 実行）。公式ワークフロー例の Node 24 と揃う。

## 未確認（断定しない）→ 実装で両方とも解消済み（経緯を残すため打ち消しで保存）

- ~~U-1: Vitest 5 と VitePress 1.6.4 の同居~~ → **解消（2026-09-12 に実測、T001）。**
  実際にインストールしたところ、vite は2系統で同居した（トップレベルに 8.3.0（vitest 5.0.0 用）、
  `vitepress/node_modules/` に 5.4.21（vitepress 内包））。この状態で `npm test`（vitest run）と
  `npm run docs:build`（vitepress build）が**どちらも exit 0**。対処は不要だった。
- ~~U-2: 1本目の題材「エージェントループ」の内部挙動~~ → **裏取り済み（2026-09-12、T011）。**
  想定に反して公式ドキュメントに正面からの解説があった。確認した事実と出典:
  - **ループの5段階**（受け取る → 評価して応答 → ツール実行 → 繰り返す → 結果を返す）。1周＝1ターン。
    **応答にツール呼び出しが含まれなくなったら終わる**。
    <https://code.claude.com/docs/en/agent-sdk/agent-loop>
  - **モデルは自分でコードを実行しない**。構造化された依頼（`tool_use`）を出し、アプリ側が実行して
    `tool_result` を返す。ループは `stop_reason == "tool_use"` の間だけ回り、`end_turn` などで抜ける。
    <https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works>
  - 補足: `docs.claude.com` は `platform.claude.com`（API）と `code.claude.com`（Claude Code / Agent SDK）へ
    リダイレクトされる（2026-09-12 に確認）。出典 URL はリダイレクト先で記録する。

## 決定は ADR が所有する

| 決定 | ADR |
|---|---|
| クイズのデータ設計（frontmatter・識別子・`quizId`） | [ADR-0004](../../docs/adr/0004-quiz-data-model.md) |
| ページ完了条件の機械検査（何を・何が・いつ） | [ADR-0005](../../docs/adr/0005-page-completion-check.md) |
| Mermaid の描画方法 | [ADR-0006](../../docs/adr/0006-mermaid-rendering.md) |
