import type { Answers } from './grade'

/** 保存キー（data-model.md）。全ページぶんを1キーにまとめる。 */
export const STORAGE_KEY = 'claude-study:quiz:v1'

/** テスト時に差し替えるための最小の口。localStorage はこの形を満たす。 */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

interface StoredProgress {
  version: 1
  pages: Record<string, Answers>
}

const EMPTY: StoredProgress = { version: 1, pages: {} }

/** 読めない・壊れている・版が違う → 空として扱う（data-model.md の Edge Cases）。 */
function readAll(store: KeyValueStore | null): StoredProgress {
  if (store === null) return EMPTY
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (raw === null) return EMPTY
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as { version?: unknown }).version !== 1 ||
      typeof (parsed as { pages?: unknown }).pages !== 'object' ||
      (parsed as { pages?: unknown }).pages === null
    ) {
      return EMPTY
    }
    return parsed as StoredProgress
  } catch {
    return EMPTY
  }
}

/** そのページの成績を復元する（FR-016）。失敗はすべて「未回答」に倒す。例外を投げない。 */
export function loadAnswers(store: KeyValueStore | null, quizId: string): Answers {
  return { ...(readAll(store).pages[quizId] ?? {}) }
}

/**
 * 最新の正誤を保存する（FR-015: 履歴は持たない・上書き）。
 * 保存できない環境では黙って何もしない（FR-020）。例外を投げない。
 */
export function saveAnswer(
  store: KeyValueStore | null,
  quizId: string,
  questionId: string,
  correct: boolean,
): void {
  if (store === null) return
  try {
    const all = readAll(store)
    const next: StoredProgress = {
      version: 1,
      pages: { ...all.pages, [quizId]: { ...(all.pages[quizId] ?? {}), [questionId]: correct } },
    }
    store.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // 保存の失敗でページを止めない（SC-005）
  }
}
