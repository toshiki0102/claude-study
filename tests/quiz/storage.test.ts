import { describe, expect, test } from 'vitest'
import { loadAnswers, saveAnswer, STORAGE_KEY, type KeyValueStore } from '../../src/quiz/storage'

// 契約: contracts/quiz-modules.md / data-model.md「壊れた記録・古い形式の扱い」
// 例外を投げない・壊れていたら空・保存できないなら黙って何もしない（FR-020）

/** 素朴なインメモリ実装。localStorage と同じ形。 */
function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => (key in data ? data[key]! : null),
    setItem: (key, value) => {
      data[key] = value
    },
  }
}

const broken: KeyValueStore = {
  getItem: () => {
    throw new Error('storage denied')
  },
  setItem: () => {
    throw new Error('storage denied')
  },
}

describe('loadAnswers', () => {
  test('キーが無ければ空を返す', () => {
    expect(loadAnswers(memoryStore(), 'agent-loop')).toEqual({})
  })

  test('保存済みの成績を quizId ごとに返す（FR-016 / FR-018）', () => {
    const store = memoryStore({
      [STORAGE_KEY]: JSON.stringify({
        version: 1,
        pages: { 'agent-loop': { a3f9c2d1: true, '7b1e0455': false }, other: { deadbeef: true } },
      }),
    })
    expect(loadAnswers(store, 'agent-loop')).toEqual({ a3f9c2d1: true, '7b1e0455': false })
  })

  test('JSON として読めない記録は無視して空を返し、例外を投げない', () => {
    const store = memoryStore({ [STORAGE_KEY]: '{壊れている' })
    expect(loadAnswers(store, 'agent-loop')).toEqual({})
  })

  test('version が 1 でない記録は無視して空を返す', () => {
    const store = memoryStore({ [STORAGE_KEY]: JSON.stringify({ version: 2, pages: { 'agent-loop': { x: true } } }) })
    expect(loadAnswers(store, 'agent-loop')).toEqual({})
  })

  test('store が null でも空を返し、例外を投げない（FR-020）', () => {
    expect(loadAnswers(null, 'agent-loop')).toEqual({})
  })

  test('getItem が例外を投げる store でも空を返す（FR-020）', () => {
    expect(loadAnswers(broken, 'agent-loop')).toEqual({})
  })
})

describe('saveAnswer', () => {
  test('保存して loadAnswers で読み戻せる', () => {
    const store = memoryStore()
    saveAnswer(store, 'agent-loop', 'a3f9c2d1', false)
    saveAnswer(store, 'agent-loop', '7b1e0455', true)
    expect(loadAnswers(store, 'agent-loop')).toEqual({ a3f9c2d1: false, '7b1e0455': true })
  })

  test('同じ設問への保存は上書きされ、最新の正誤だけが残る（FR-015）', () => {
    const store = memoryStore()
    saveAnswer(store, 'agent-loop', 'a3f9c2d1', false)
    saveAnswer(store, 'agent-loop', 'a3f9c2d1', true)
    expect(loadAnswers(store, 'agent-loop')).toEqual({ a3f9c2d1: true })
  })

  test('別ページの記録を壊さない', () => {
    const store = memoryStore({
      [STORAGE_KEY]: JSON.stringify({ version: 1, pages: { other: { deadbeef: true } } }),
    })
    saveAnswer(store, 'agent-loop', 'a3f9c2d1', true)
    expect(loadAnswers(store, 'other')).toEqual({ deadbeef: true })
  })

  test('store が null なら黙って何もしない（FR-020）', () => {
    expect(() => saveAnswer(null, 'agent-loop', 'a3f9c2d1', true)).not.toThrow()
  })

  test('setItem が例外を投げる store でも落ちない（FR-020）', () => {
    expect(() => saveAnswer(broken, 'agent-loop', 'a3f9c2d1', true)).not.toThrow()
  })
})
