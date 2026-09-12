import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { load as parseYaml } from 'js-yaml'
import { expect, test } from 'vitest'
import { checkPage, checkSite, type PageInput, type Violation } from '../src/check/page'

// 公開されるページの完了条件を機械的に検査する（FR-023 / SC-002 / SC-009 / ADR-0005）。
// この検査は GitHub Actions で公開前に走り、赤なら公開されない（.github/workflows/deploy.yml）。

const DOCS = join(__dirname, '..', 'docs')

// サイトに出ないものは検査しない。'adr' は docs/.vitepress/config.ts の srcExclude と揃えること。
const EXCLUDE_DIRS = new Set(['.vitepress', 'adr'])

function collectMarkdown(dir: string): string[] {
  const files: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (!EXCLUDE_DIRS.has(name)) files.push(...collectMarkdown(full))
    } else if (name.endsWith('.md')) {
      files.push(full)
    }
  }
  return files
}

function toPageInput(file: string): PageInput {
  const raw = readFileSync(file, 'utf8')
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(raw)
  return {
    path: relative(join(__dirname, '..'), file).replace(/\\/g, '/'),
    frontmatter: m ? parseYaml(m[1]!) : {},
    body: m ? raw.slice(m[0].length) : raw,
  }
}

function format(violations: Violation[]): string {
  const byPath = new Map<string, Violation[]>()
  for (const v of violations) byPath.set(v.path, [...(byPath.get(v.path) ?? []), v])
  const lines: string[] = []
  for (const [path, vs] of byPath) {
    lines.push(`✗ ${path}`)
    for (const v of vs) lines.push(`    ${v.rule.padEnd(22)}${v.message}`)
  }
  lines.push('', `${byPath.size}ページで ${violations.length} 件の違反。公開しません。`)
  return lines.join('\n')
}

test('公開されるすべてのページが完了条件を満たす（クイズ3問・最終確認日・出典）', () => {
  const inputs = collectMarkdown(DOCS).map(toPageInput)
  expect(inputs.length).toBeGreaterThan(0) // 走査そのものが壊れていないこと
  const violations = [...inputs.flatMap(checkPage), ...checkSite(inputs)]
  if (violations.length > 0) {
    expect.fail('\n' + format(violations))
  }
})
