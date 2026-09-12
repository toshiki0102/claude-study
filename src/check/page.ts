import { questionId } from '../quiz/id'

/** 純関数の入口（contracts/page-check.md）。ファイル読み込みは呼び出し側の責務。 */
export interface PageInput {
  path: string // リポジトリからの相対パス
  frontmatter: unknown // パース済み YAML。信用せず、ここで検証する
  body: string // frontmatter を除いた本文
}

export interface Violation {
  path: string
  rule: string
  message: string // 日本語。何を直せばよいかが分かる文
}

interface Fm {
  quizExempt?: unknown
  title?: unknown
  quizId?: unknown
  lastVerified?: unknown
  quiz?: unknown
}

function fmOf(input: PageInput): Fm {
  return typeof input.frontmatter === 'object' && input.frontmatter !== null
    ? (input.frontmatter as Fm)
    : {}
}

function isExempt(input: PageInput): boolean {
  return fmOf(input).quizExempt === true
}

function realDate(s: string): boolean {
  const d = new Date(s + 'T00:00:00Z')
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

/** ページ単体の完了条件（FR-023 ほか）。違反は1件目で止めず全部集める。 */
export function checkPage(input: PageInput): Violation[] {
  if (isExempt(input)) return []
  const fm = fmOf(input)
  const v: Violation[] = []
  const add = (rule: string, message: string) => v.push({ path: input.path, rule, message })

  if (typeof fm.title !== 'string' || fm.title.trim() === '') {
    add('title', 'title がありません')
  }

  if (typeof fm.quizId !== 'string' || !/^[a-z0-9-]+$/.test(fm.quizId)) {
    add('quiz-id', 'quizId がありません（英小文字・数字・ハイフンのみ。成績のキーになるので必須）')
  }

  if (typeof fm.lastVerified !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fm.lastVerified) || !realDate(fm.lastVerified)) {
    add('last-verified', 'lastVerified が YYYY-MM-DD 形式ではありません（最終確認日・FR-006）')
  }

  if (!Array.isArray(fm.quiz) || fm.quiz.length !== 3) {
    const n = Array.isArray(fm.quiz) ? fm.quiz.length : 0
    add('quiz-count', `クイズが ${n} 問しかありません（3問必要・憲法 III）`)
  }

  if (Array.isArray(fm.quiz)) {
    const texts = new Set<string>()
    fm.quiz.forEach((raw, i) => {
      const nth = `${i + 1}問目`
      const q = typeof raw === 'object' && raw !== null ? (raw as { q?: unknown; choices?: unknown; answer?: unknown }) : {}
      if (typeof q.q !== 'string' || q.q.trim() === '') {
        add('question-text', `${nth}の q（問題文）が空です`)
      } else {
        const id = questionId(q.q)
        if (texts.has(id)) add('question-duplicate', `${nth}の問題文がページ内で重複しています`)
        texts.add(id)
      }
      if (!Array.isArray(q.choices) || q.choices.length !== 4) {
        const n = Array.isArray(q.choices) ? q.choices.length : 0
        add('choices-count', `${nth}の choices が ${n} 件です（4件必要）`)
      } else if (q.choices.some((c) => typeof c !== 'string' || c.trim() === '')) {
        add('choice-empty', `${nth}の choices に空の選択肢があります`)
      }
      if (typeof q.answer !== 'number' || !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) {
        add('answer-range', `${nth}の answer が ${String(q.answer)} です（0〜3 の整数）`)
      }
    })
  }

  if (!/https?:\/\//.test(input.body)) {
    add('source-link', '本文に外部リンクがありません（出典・FR-007）')
  }

  return v
}

/** サイト横断の規則。quizId の重複・questionId の衝突・目次のリンク切れ。 */
export function checkSite(inputs: PageInput[]): Violation[] {
  const v: Violation[] = []

  // quizId の重複（成績が混ざるため）
  const byQuizId = new Map<string, string[]>()
  for (const p of inputs) {
    if (isExempt(p)) continue
    const id = fmOf(p).quizId
    if (typeof id === 'string') byQuizId.set(id, [...(byQuizId.get(id) ?? []), p.path])
  }
  for (const [id, paths] of byQuizId) {
    if (paths.length > 1) {
      for (const path of paths) {
        v.push({ path, rule: 'quiz-id-duplicate', message: `quizId "${id}" が ${paths.join(' と ')} で重複しています` })
      }
    }
  }

  // 同一ページ内の questionId 衝突（実質起きないが、起きたら成績が混ざる）
  for (const p of inputs) {
    if (isExempt(p)) continue
    const quiz = fmOf(p).quiz
    if (!Array.isArray(quiz)) continue
    const seen = new Map<string, string>()
    for (const raw of quiz) {
      const q = typeof raw === 'object' && raw !== null ? (raw as { q?: unknown }).q : undefined
      if (typeof q !== 'string' || q.trim() === '') continue
      const id = questionId(q)
      const prev = seen.get(id)
      if (prev !== undefined && prev !== q) {
        v.push({ path: p.path, rule: 'question-id-collision', message: `別の問題文からハッシュ "${id}" が衝突しました。どちらかの問題文を変えてください` })
      }
      seen.set(id, q)
    }
  }

  // 目次（quizExempt ページ）の .md リンク切れ（FR-021: 未着手をリンクしない）
  const known = new Set(inputs.map((p) => p.path.replace(/\\/g, '/')))
  for (const p of inputs) {
    if (!isExempt(p)) continue
    const dir = p.path.replace(/\\/g, '/').split('/').slice(0, -1)
    for (const m of p.body.matchAll(/\]\(([^)]+\.md)(?:#[^)]*)?\)/g)) {
      const target = m[1]!
      if (/^https?:\/\//.test(target)) continue
      const parts = [...dir]
      for (const seg of target.split('/')) {
        if (seg === '.' || seg === '') continue
        else if (seg === '..') parts.pop()
        else parts.push(seg)
      }
      const resolved = parts.join('/')
      if (!known.has(resolved)) {
        v.push({ path: p.path, rule: 'orphan-link', message: `目次のリンク先 ${target} が存在しません（未着手のページはリンクしない・FR-021）` })
      }
    }
  }

  return v
}
