import { describe, expect, test } from 'vitest'
import { checkPage, checkSite, type PageInput } from '../../src/check/page'

// 契約: contracts/page-check.md / contracts/page-frontmatter.md
// 規則それぞれに「落ちる例」と「通る例」の両方を置く。

/** 完了条件をすべて満たすページ */
function validPage(path = 'docs/guide/agent-loop.md'): PageInput {
  return {
    path,
    frontmatter: {
      title: 'エージェントループ',
      quizId: 'agent-loop',
      lastVerified: '2026-09-12',
      quiz: [
        { q: '1問目', choices: ['ア', 'イ', 'ウ', 'エ'], answer: 0 },
        { q: '2問目', choices: ['ア', 'イ', 'ウ', 'エ'], answer: 2 },
        { q: '3問目', choices: ['ア', 'イ', 'ウ', 'エ'], answer: 3 },
      ],
    },
    body: '本文。出典は [公式](https://code.claude.com/docs/) を参照。',
  }
}

function rules(input: PageInput): string[] {
  return checkPage(input).map((v) => v.rule)
}

describe('checkPage: 通る例', () => {
  test('完了条件を満たすページは違反0件', () => {
    expect(checkPage(validPage())).toEqual([])
  })

  test('quizExempt: true のページは検査しない', () => {
    expect(checkPage({ path: 'docs/index.md', frontmatter: { quizExempt: true }, body: 'リンク無し' })).toEqual([])
  })
})

describe('checkPage: frontmatter の規則', () => {
  test('title が無いと落ちる', () => {
    const p = validPage()
    delete (p.frontmatter as Record<string, unknown>).title
    expect(rules(p)).toContain('title')
  })

  test('quizId が無い・形式違反で落ちる', () => {
    const p = validPage()
    ;(p.frontmatter as Record<string, unknown>).quizId = 'Agent Loop!'
    expect(rules(p)).toContain('quiz-id')
    delete (p.frontmatter as Record<string, unknown>).quizId
    expect(rules(p)).toContain('quiz-id')
  })

  test('lastVerified が無い・YYYY-MM-DD でない・実在しない日付で落ちる', () => {
    const p = validPage()
    ;(p.frontmatter as Record<string, unknown>).lastVerified = '2026/09/12'
    expect(rules(p)).toContain('last-verified')
    ;(p.frontmatter as Record<string, unknown>).lastVerified = '2026-13-99'
    expect(rules(p)).toContain('last-verified')
    delete (p.frontmatter as Record<string, unknown>).lastVerified
    expect(rules(p)).toContain('last-verified')
  })

  test('frontmatter がオブジェクトでなくても例外を投げず違反として返す', () => {
    expect(() => checkPage({ path: 'x.md', frontmatter: null, body: '' })).not.toThrow()
    expect(checkPage({ path: 'x.md', frontmatter: null, body: '' }).length).toBeGreaterThan(0)
  })
})

describe('checkPage: クイズの規則', () => {
  test('クイズが2問しかないと落ちる（メッセージに問数が入る）', () => {
    const p = validPage()
    ;(p.frontmatter as { quiz: unknown[] }).quiz.pop()
    const v = checkPage(p).find((x) => x.rule === 'quiz-count')
    expect(v).toBeDefined()
    expect(v!.message).toContain('2')
  })

  test('quiz が無いと quiz-count で落ちる', () => {
    const p = validPage()
    delete (p.frontmatter as Record<string, unknown>).quiz
    expect(rules(p)).toContain('quiz-count')
  })

  test('choices が3件だと落ちる', () => {
    const p = validPage()
    ;(p.frontmatter as { quiz: { choices: string[] }[] }).quiz[1]!.choices.pop()
    expect(rules(p)).toContain('choices-count')
  })

  test('answer が範囲外（4）だと落ちる', () => {
    const p = validPage()
    ;(p.frontmatter as { quiz: { answer: number }[] }).quiz[2]!.answer = 4
    expect(rules(p)).toContain('answer-range')
  })

  test('q が空だと落ちる', () => {
    const p = validPage()
    ;(p.frontmatter as { quiz: { q: string }[] }).quiz[0]!.q = '  '
    expect(rules(p)).toContain('question-text')
  })

  test('同じ問題文がページ内に2つあると落ちる', () => {
    const p = validPage()
    ;(p.frontmatter as { quiz: { q: string }[] }).quiz[1]!.q = '1問目'
    expect(rules(p)).toContain('question-duplicate')
  })
})

describe('checkPage: 本文の規則', () => {
  test('外部リンクが1本も無いと落ちる（FR-007）', () => {
    const p = validPage()
    p.body = '出典の無い本文。'
    expect(rules(p)).toContain('source-link')
  })
})

describe('checkPage: 違反は全部まとめて返す', () => {
  test('複数の違反が同時にあれば全部返る（1件目で止めない）', () => {
    const p: PageInput = { path: 'docs/guide/broken.md', frontmatter: {}, body: 'リンク無し' }
    const r = rules(p)
    expect(r).toContain('title')
    expect(r).toContain('quiz-id')
    expect(r).toContain('last-verified')
    expect(r).toContain('quiz-count')
    expect(r).toContain('source-link')
  })
})

describe('checkSite: 横断の規則', () => {
  test('quizId が2ページで重複すると落ちる', () => {
    const a = validPage('docs/guide/a.md')
    const b = validPage('docs/guide/b.md')
    const v = checkSite([a, b]).filter((x) => x.rule === 'quiz-id-duplicate')
    expect(v.length).toBeGreaterThan(0)
    expect(v[0]!.message).toContain('agent-loop')
  })

  test('quizId が全ページで一意なら違反なし', () => {
    const a = validPage('docs/guide/a.md')
    const b = validPage('docs/guide/b.md')
    ;(b.frontmatter as Record<string, unknown>).quizId = 'other-page'
    expect(checkSite([a, b])).toEqual([])
  })

  test('目次（quizExempt）の .md リンク先が存在しないと落ちる（FR-021）', () => {
    const index: PageInput = {
      path: 'docs/index.md',
      frontmatter: { quizExempt: true },
      body: '- [ある](./guide/a.md)\n- [無い](./guide/ghost.md)',
    }
    const v = checkSite([index, validPage('docs/guide/a.md')]).filter((x) => x.rule === 'orphan-link')
    expect(v.length).toBe(1)
    expect(v[0]!.message).toContain('ghost')
  })
})
