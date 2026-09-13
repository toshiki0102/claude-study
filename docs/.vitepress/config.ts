import { withMermaid } from 'vitepress-plugin-mermaid'

// 技術構成は憲法「技術と公開の制約」が所有:
// VitePress / Mermaid / GitHub Pages / 日本語。Mermaid の描画方法は ADR-0006。
export default withMermaid({
  lang: 'ja',
  title: 'claude-study',
  description: 'Claude Code とエージェントの仕組みを学ぶための、自分用の学習ノート',

  // プロジェクトサイト（https://toshiki0102.github.io/claude-study/）のため必須
  base: '/claude-study/',

  // docs/adr/ は開発の意思決定記録であり、サイトの読み物ではない
  srcExclude: ['adr/**'],

  themeConfig: {
    // 2本柱の枠（FR-021）。未着手のページはリンクしない。
    sidebar: [
      { text: '使い方', items: [{ text: 'エージェントループ', link: '/guide/agent-loop' }] },
      { text: '仕組み', items: [{ text: 'コンテキストウィンドウ', link: '/internals/context-window' }] },
    ],
    outline: { label: 'このページ' },
    docFooter: { prev: '前のページ', next: '次のページ' },
  },
})
