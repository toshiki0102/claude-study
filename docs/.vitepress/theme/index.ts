// doc-after スロットに Quiz を差し込む（research.md F-4 / tasks T022）。
// 各ページに手で書かせない — 書き忘れが構造的に起きないようにするため。
// クイズを持たないページ（quizExempt / quiz 無し）では Quiz 自身が何も描画しない。
import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import Quiz from './Quiz.vue'

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, { 'doc-after': () => h(Quiz) }),
}
