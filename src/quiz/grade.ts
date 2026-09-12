import { questionId } from './id'

/** 4択の設問（contracts/quiz-modules.md / data-model.md） */
export interface Question {
  q: string
  choices: string[]
  answer: number
}

/** questionId → 最新の正誤（FR-015: 履歴は持たない） */
export type Answers = Record<string, boolean>

/** 1問の採点。選んだ添字が answer と一致するか（FR-010）。 */
export function isCorrect(question: Question, chosenIndex: number): boolean {
  return chosenIndex === question.answer
}

/** 3問ぶんの結果から「何問正解か」を出す（FR-013）。未回答は数えない。 */
export function score(questions: Question[], answers: Answers): { correct: number; total: number } {
  const correct = questions.filter((q) => answers[questionId(q.q)] === true).length
  return { correct, total: questions.length }
}

/** 記録の無い設問（未回答のまま採点しようとしたときに示す）。 */
export function unanswered(questions: Question[], answers: Answers): Question[] {
  return questions.filter((q) => !(questionId(q.q) in answers))
}
