<script setup lang="ts">
// 表示と入力だけの薄い層（憲法 IV / plan.md）。判定・集計はすべて src/quiz/ が持つ。
import { computed, reactive } from 'vue'
import { useData } from 'vitepress'
import { questionId } from '../../../src/quiz/id'
import { isCorrect, score, unanswered, type Answers, type Question } from '../../../src/quiz/grade'

const { frontmatter } = useData()

const questions = computed<Question[]>(() =>
  frontmatter.value.quizExempt ? [] : (frontmatter.value.quiz ?? []),
)

// 選んだ添字。1問につき1回で確定（FR-011）— 一度入れたら書き換えない。
const chosen = reactive<Record<string, number>>({})

const answers = computed<Answers>(() => {
  const a: Answers = {}
  for (const q of questions.value) {
    const id = questionId(q.q)
    if (id in chosen) a[id] = isCorrect(q, chosen[id]!)
  }
  return a
})

const remaining = computed(() => unanswered(questions.value, answers.value))
const result = computed(() => score(questions.value, answers.value))
const allAnswered = computed(() => questions.value.length > 0 && remaining.value.length === 0)

function answeredIndex(q: Question): number | undefined {
  return chosen[questionId(q.q)]
}

function select(q: Question, index: number): void {
  const id = questionId(q.q)
  if (id in chosen) return // 正誤が出た後は選び直せない（FR-011）
  chosen[id] = index
}
</script>

<template>
  <section v-if="questions.length > 0" class="quiz" aria-label="理解度クイズ">
    <hr />
    <h2>クイズ（3問）</h2>
    <p class="quiz-note">1問につき1回で確定。選び直しはできない。</p>

    <div v-for="(q, qi) in questions" :key="questionId(q.q)" class="quiz-question">
      <p class="quiz-q"><strong>Q{{ qi + 1 }}.</strong> {{ q.q }}</p>
      <ul class="quiz-choices">
        <li v-for="(choice, ci) in q.choices" :key="ci">
          <button
            type="button"
            class="quiz-choice"
            :class="{
              chosen: answeredIndex(q) === ci,
              correct: answeredIndex(q) !== undefined && ci === q.answer,
              wrong: answeredIndex(q) === ci && ci !== q.answer,
            }"
            :disabled="answeredIndex(q) !== undefined"
            @click="select(q, ci)"
          >
            {{ choice }}
          </button>
        </li>
      </ul>
      <p v-if="answeredIndex(q) !== undefined" class="quiz-feedback">
        <template v-if="isCorrect(q, answeredIndex(q)!)">⭕ 正解</template>
        <template v-else>❌ 不正解 — 正解は「{{ q.choices[q.answer] }}」</template>
      </p>
    </div>

    <p v-if="allAnswered" class="quiz-score">
      <strong>{{ result.total }}問中 {{ result.correct }}問正解</strong>
    </p>
    <p v-else class="quiz-remaining">残り {{ remaining.length }} 問</p>
  </section>
</template>

<style scoped>
.quiz-note {
  font-size: 0.85em;
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
.quiz-remaining {
  color: var(--vp-c-text-2);
  font-size: 0.9em;
}
</style>
