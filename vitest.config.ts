import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // テストは T017 以降で増える。0件の間も `npm test` を CI の入口として使うため
    passWithNoTests: true,
  },
})
