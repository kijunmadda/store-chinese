// 콘텐츠 자동 검사 — `npm run check` 또는 빌드 직전에 실행된다.
// 오류가 하나라도 있으면 실패하여 잘못된 콘텐츠가 배포되지 않게 한다.
// 중국어(content/items/)와 영어(content/en/items/)를 모두 검사한다.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fromEnglish } from '../src/content/english.ts'
import { validateContent, type Issue } from '../src/content/validate.ts'

const root = join(import.meta.dirname, '..', 'content')

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    console.error(`✖ ${path} 파일을 읽을 수 없습니다 (JSON 문법 오류일 수 있음): ${(e as Error).message}`)
    process.exit(1)
  }
}

const readItems = (dir: string) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .flatMap((f) => readJson(join(dir, f)) as unknown[])
    : []

const categories = readJson(join(root, 'categories.json'))
const roleplays = readJson(join(root, 'roleplays.json')) as { steps: unknown }[]

let failed = false
function report(label: string, count: number, issues: Issue[]) {
  const errors = issues.filter((i) => i.level === 'error')
  const warnings = issues.filter((i) => i.level === 'warning')
  // 검토 대기(초안) 항목은 한 줄로 묶어서 알린다
  const pending = warnings.filter((w) => w.message.startsWith('검토 상태가'))
  for (const w of warnings) if (!pending.includes(w)) console.warn(`⚠ ${label} [${w.where}] ${w.message}`)
  if (pending.length) console.warn(`⚠ ${label} 검토 대기(앱에 안 보임) ${pending.length}개: ${pending.map((w) => w.where).join(', ')}`)
  for (const e of errors) console.error(`✖ ${label} [${e.where}] ${e.message}`)
  console.log(`${label} 콘텐츠 검사: 항목 ${count}개 · 오류 ${errors.length}개 · 경고 ${warnings.length}개`)
  if (errors.length > 0) failed = true
}

const zh = readItems(join(root, 'items'))
report('중국어', zh.length, validateContent(categories, zh, roleplays))

// 영어: 상황 ID는 중국어와 같다. 역할극은 쓰는 문장이 영어에 모두 있는 것만 검사한다 (앱과 같은 기준)
const en = fromEnglish(readItems(join(root, 'en', 'items'))) as { id: string; variants?: { id: string }[]; responses?: { id: string }[] }[]
if (en.length > 0) {
  const ids = new Set(en.flatMap((it) => [it.id, ...(it.variants ?? []).map((v) => v.id), ...(it.responses ?? []).map((r) => r.id)]))
  const refs = (steps: unknown): string[] =>
    (steps as { ref?: string; choices?: string[]; accept?: string[]; branches?: { steps: unknown }[] }[]).flatMap((s) => [
      ...(s.ref ? [s.ref] : []), ...(s.choices ?? []), ...(s.accept ?? []), ...(s.branches ?? []).flatMap((b) => refs(b.steps)),
    ])
  report('영어', en.length, validateContent(categories, en, roleplays.filter((rp) => refs(rp.steps).every((id) => ids.has(id))), 'en'))
  // 중국어에 없는 상황 ID는 실수일 가능성이 높다
  const zhIds = new Set((zh as { id: string }[]).map((it) => it.id))
  for (const it of en) if (!zhIds.has(it.id)) console.warn(`⚠ 영어 [${it.id}] 중국어에 없는 상황 ID입니다`)
}

if (failed) process.exit(1)
