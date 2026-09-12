import { describe, expect, test } from 'vitest'
import { isCorrect, score, unanswered, type Question, type Answers } from '../../src/quiz/grade'
import { questionId } from '../../src/quiz/id'

// 契約: contracts/quiz-modules.md
const q1: Question = { q: '1問目の問題文', choices: ['ア', 'イ', 'ウ', 'エ'], answer: 0 }
const q2: Question = { q: '2問目の問題文', choices: ['ア', 'イ', 'ウ', 'エ'], answer: 2 }
const q3: Question = { q: '3問目の問題文', choices: ['ア', 'イ', 'ウ', 'エ'], answer: 3 }
const questions = [q1, q2, q3]

describe('isCorrect', () => {
  test('正解の選択肢を選ぶと true', () => {
    expect(isCorrect(q2, 2)).toBe(true)
  })

  test('不正解の選択肢を選ぶと false', () => {
    expect(isCorrect(q2, 0)).toBe(false)
  })
})

describe('score', () => {
  test('3問中2問正解なら {correct: 2, total: 3}（FR-013）', () => {
    const answers: Answers = {
      [questionId(q1.q)]: true,
      [questionId(q2.q)]: false,
      [questionId(q3.q)]: true,
    }
    expect(score(questions, answers)).toEqual({ correct: 2, total: 3 })
  })

  test('未回答は不正解ではなく「数えない」— total は設問数のまま', () => {
    const answers: Answers = { [questionId(q1.q)]: true }
    expect(score(questions, answers)).toEqual({ correct: 1, total: 3 })
  })

  test('関係ない設問の記録は数えない', () => {
    const answers: Answers = { deadbeef: true }
    expect(score(questions, answers)).toEqual({ correct: 0, total: 3 })
  })
})

describe('unanswered', () => {
  test('記録の無い設問だけを返す', () => {
    const answers: Answers = { [questionId(q2.q)]: false }
    expect(unanswered(questions, answers)).toEqual([q1, q3])
  })

  test('全問回答済みなら空配列', () => {
    const answers: Answers = {
      [questionId(q1.q)]: true,
      [questionId(q2.q)]: false,
      [questionId(q3.q)]: true,
    }
    expect(unanswered(questions, answers)).toEqual([])
  })
})
