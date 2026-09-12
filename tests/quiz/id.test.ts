import { describe, expect, test } from 'vitest'
import { questionId } from '../../src/quiz/id'

// 契約: contracts/quiz-modules.md
// 問題文のテキストだけから算出。NFC → trim → 連続空白を1つに → FNV-1a 32bit → 8桁16進小文字。
describe('questionId', () => {
  test('同じ問題文からは同じ識別子が出る', () => {
    const q = 'ツールの実行結果は、次にどこへ渡るか'
    expect(questionId(q)).toBe(questionId(q))
  })

  test('8桁の16進小文字を返す', () => {
    expect(questionId('エージェントループとは何か')).toMatch(/^[0-9a-f]{8}$/)
  })

  test('前後の空白の違いは同じ識別子になる', () => {
    expect(questionId('  問題文です  ')).toBe(questionId('問題文です'))
  })

  test('内側の連続空白は1つに畳まれ、同じ識別子になる', () => {
    expect(questionId('agent   loop とは')).toBe(questionId('agent loop とは'))
  })

  test('Unicode の合成差（NFC/NFD）は同じ識別子になる', () => {
    // 「ガ」: 合成済み U+30AC と、カ + 濁点 U+30AB U+3099
    expect(questionId('ガ')).toBe(questionId('ガ'))
  })

  test('1文字違えば別の識別子になる', () => {
    expect(questionId('問題文です')).not.toBe(questionId('問題文だす'))
  })
})
