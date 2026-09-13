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

  // 図の線と枠のトーン（ライト用。ダークはプラグインが dark テーマを強制する）。
  // 箱の役割色は各ページの classDef が持つ（ADR-0008）。
  mermaid: {
    theme: 'base',
    themeVariables: {
      lineColor: '#475569',
      primaryBorderColor: '#94a3b8',
      clusterBkg: '#f8fafc',
      clusterBorder: '#cbd5e1',
      fontFamily: 'inherit',
    },
  },

  themeConfig: {
    // 2本柱の枠（FR-021）。未着手のページはリンクしない。
    sidebar: [
      {
        text: '使い方',
        items: [
          { text: 'エージェントループ', link: '/guide/agent-loop' },
          { text: 'CLAUDE.md とメモリ', link: '/guide/claude-md-memory' },
          { text: 'パーミッションモード', link: '/guide/permission-modes' },
          { text: 'スキル', link: '/guide/skills' },
          { text: 'セッションと再開', link: '/guide/sessions' },
          { text: 'プランモード', link: '/guide/plan-mode' },
          { text: 'ワークツリー', link: '/guide/worktrees' },
          { text: '拡張思考と effort', link: '/guide/thinking-effort' },
          { text: 'チェックポイント（巻き戻し）', link: '/guide/checkpointing' },
          { text: '非対話モード（claude -p）', link: '/guide/headless' },
          { text: 'ルール（.claude/rules/）', link: '/guide/rules' },
        ],
      },
      {
        text: '仕組み',
        items: [
          { text: 'コンテキストウィンドウ', link: '/internals/context-window' },
          { text: 'サブエージェント', link: '/internals/subagents' },
          { text: 'プロンプトキャッシュ', link: '/internals/prompt-caching' },
          { text: 'フック', link: '/internals/hooks' },
          { text: 'MCP', link: '/internals/mcp' },
          { text: '圧縮の中身', link: '/internals/compaction' },
          { text: 'ツール定義の形', link: '/internals/tool-definitions' },
          { text: '設定の階層', link: '/internals/settings-layers' },
          { text: 'サンドボックス', link: '/internals/sandboxing' },
          { text: 'コストの内訳', link: '/internals/costs' },
        ],
      },
    ],
    outline: { label: 'このページ' },
    docFooter: { prev: '前のページ', next: '次のページ' },
  },
})
