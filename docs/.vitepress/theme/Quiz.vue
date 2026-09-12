<script setup lang="ts">
// 表示と入力だけの薄い層（憲法 IV / plan.md）。判定・集計・保存はすべて src/quiz/ が持つ。
import { computed, onMounted, reactive, ref } from 'vue'
import { useData } from 'vitepress'
import { questionId } from '../../../src/quiz/id'
import {
  isCorrect,
  questionsToRetry,
  score,
  type Answers,
  type Question,
} from '../../../src/quiz/grade'
import { loadAnswers, saveAnswer, type KeyValueStore } from '../../../src/quiz/storage'

const { frontmatter } = useData()

const questions = computed<Question[]>(() =>
  frontmatter.value.quizExempt ? [] : (frontmatter.value.quiz ?? []),
)
const quizId = computed<string>(() => frontmatter.value.quizId ?? '')

// localStorage に触れない環境（SSR・プライベートウィンドウ等）は null で表す（FR-020）
function resolveStore(): KeyValueStore | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}
const store = resolveStore()

// 保存済みの成績（questionId → 正誤）。SSR と初回描画を一致させるため onMounted で復元する
const saved = ref<Answers>({})
onMounted(() => {
  saved.value = loadAnswers(store, quizId.value)
})

// このセッションで選んだ添字（ボタンの強調表示に使う）。1問につき1回で確定（FR-011）
const chosen = reactive<Record<string, number>>({})

// 「間違えた問題だけもう一度」の対象。null = 通常表示
const retryIds = ref<Set<string> | null>(null)

const visibleQuestions = computed<Question[]>(() => {
  const retry = retryIds.value
  if (retry === null) return questions.value
  return questions.value.filter((q) => retry.has(questionId(q.q)))
})

type QuestionState = 'open' | 'answered-now' | 'answered-before'

function stateOf(q: Question): QuestionState {
  const id = questionId(q.q)
  if (id in chosen) return 'answered-now'
  if (retryIds.value?.has(id)) return 'open' // 再挑戦中は前回の記録を無視して出題し直す
  return id in saved.value ? 'answered-before' : 'open'
}

function select(q: Question, index: number): void {
  if (stateOf(q) !== 'open') return // 正誤が出た後は選び直せない（FR-011）
  const id = questionId(q.q)
  chosen[id] = index
  const correct = isCorrect(q, index)
  saved.value = { ...saved.value, [id]: correct } // 最新の正誤で上書き（FR-015）
  saveAnswer(store, quizId.value, id, correct) // 保存できない環境では黙って何もしない
}

const allRecorded = computed(
  () => questions.value.length > 0 && questions.value.every((q) => stateOf(q) !== 'open'),
)
const result = computed(() => score(questions.value, saved.value))
const retryTargets = computed(() => questionsToRetry(questions.value, saved.value))
const remaining = computed(() => visibleQuestions.value.filter((q) => stateOf(q) === 'open').length)

// 全問正解のときは導線を出さない（FR-017 / US3-4）
const showRetry = computed(() => allRecorded.value && retryTargets.value.length > 0)

function startRetry(): void {
  const ids = new Set(retryTargets.value.map((q) => questionId(q.q)))
  for (const id of ids) delete chosen[id] // もう一度選べるようにする
  retryIds.value = ids
}

function showAll(): void {
  retryIds.value = null
}
</script>

<template>
  <section v-if="questions.length > 0" class="quiz" aria-label="理解度クイズ">
    <hr />
    <h2>クイズ（{{ questions.length }}問）</h2>
    <p class="quiz-note">
      1問につき1回で確定。やり直しは「間違えた問題だけもう一度」から。成績はこのブラウザにだけ保存される。
    </p>
    <p v-if="retryIds !== null" class="quiz-retry-note">
      間違えた問題だけを再出題中（{{ visibleQuestions.length }}問）
      <button type="button" class="quiz-link" @click="showAll">全問を表示</button>
    </p>

    <div v-for="q in visibleQuestions" :key="questionId(q.q)" class="quiz-question">
      <p class="quiz-q">
        <strong>Q{{ questions.indexOf(q) + 1 }}.</strong> {{ q.q }}
      </p>
      <ul class="quiz-choices">
        <li v-for="(choice, ci) in q.choices" :key="ci">
          <button
            type="button"
            class="quiz-choice"
            :class="{
              correct: stateOf(q) === 'answered-now' && ci === q.answer,
              wrong: stateOf(q) === 'answered-now' && chosen[questionId(q.q)] === ci && ci !== q.answer,
            }"
            :disabled="stateOf(q) !== 'open'"
            @click="select(q, ci)"
          >
            {{ choice }}
          </button>
        </li>
      </ul>
      <p v-if="stateOf(q) === 'answered-now'" class="quiz-feedback">
        <template v-if="saved[questionId(q.q)]">⭕ 正解</template>
        <template v-else>❌ 不正解 — 正解は「{{ q.choices[q.answer] }}」</template>
      </p>
      <p v-else-if="stateOf(q) === 'answered-before'" class="quiz-feedback quiz-feedback-before">
        <template v-if="saved[questionId(q.q)]">⭕ 正解（前回の記録）</template>
        <template v-else>❌ 不正解（前回の記録）</template>
      </p>
    </div>

    <p v-if="allRecorded" class="quiz-score">
      <strong>{{ result.total }}問中 {{ result.correct }}問正解</strong>
    </p>
    <p v-else class="quiz-remaining">残り {{ remaining }} 問</p>

    <button v-if="showRetry" type="button" class="quiz-retry" @click="startRetry">
      間違えた問題だけもう一度（{{ retryTargets.length }}問）
    </button>
  </section>
</template>

<style scoped>
.quiz-note {
  font-size: 0.85em;
  color: var(--vp-c-text-2);
}
.quiz-retry-note {
  font-size: 0.9em;
  color: var(--vp-c-text-2);
}
.quiz-question {
  margin: 20px 0;
}
.quiz-choices {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
}
.quiz-choices li {
  margin: 6px 0;
}
.quiz-choice {
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  cursor: pointer;
}
.quiz-choice:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
}
.quiz-choice:disabled {
  cursor: default;
  opacity: 0.75;
}
.quiz-choice.correct {
  border-color: var(--vp-c-green-1);
  background: var(--vp-c-green-soft);
  opacity: 1;
}
.quiz-choice.wrong {
  border-color: var(--vp-c-red-1);
  background: var(--vp-c-red-soft);
  opacity: 1;
}
.quiz-feedback,
.quiz-score {
  margin-top: 8px;
}
.quiz-feedback-before {
  color: var(--vp-c-text-2);
}
.quiz-remaining {
  color: var(--vp-c-text-2);
  font-size: 0.9em;
}
.quiz-retry {
  margin-top: 8px;
  padding: 8px 16px;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 8px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-text-1);
  cursor: pointer;
}
.quiz-link {
  border: none;
  background: none;
  color: var(--vp-c-brand-1);
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  margin-left: 8px;
}
</style>
