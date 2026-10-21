// 콘텐츠 자동 검사 — `npm run check` 또는 빌드 직전에 실행된다.
// 오류가 하나라도 있으면 실패하여 잘못된 콘텐츠가 배포되지 않게 한다.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { validateContent } from '../src/content/validate.ts'

const root = join(import.meta.dirname, '..', 'content')

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    console.error(`✖ ${path} 파일을 읽을 수 없습니다 (JSON 문법 오류일 수 있음): ${(e as Error).message}`)
    process.exit(1)
  }
}

const itemDir = join(root, 'items')
const items = readdirSync(itemDir)
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => readJson(join(itemDir, f)) as unknown[])

const issues = validateContent(readJson(join(root, 'categories.json')), items, readJson(join(root, 'roleplays.json')))
const errors = issues.filter((i) => i.level === 'error')
const warnings = issues.filter((i) => i.level === 'warning')

for (const w of warnings) console.warn(`⚠ [${w.where}] ${w.message}`)
for (const e of errors) console.error(`✖ [${e.where}] ${e.message}`)
console.log(`콘텐츠 검사: 항목 ${items.length}개 · 오류 ${errors.length}개 · 경고 ${warnings.length}개`)
if (errors.length > 0) process.exit(1)
