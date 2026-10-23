// '단어 조각 배열' 문제용 조각 만들기 — 빌드할 때 자동 실행 (npm run tokens)
// 콘텐츠 병음은 단어 단위로 띄어 써 있다 (Wǒ bāng nǐ quèrèn yíxià kùcún).
// 병음 단어 하나에 해당하는 한자들을 묶어 조각으로 만든다: 我 / 帮 / 你 / 确认 / 一下 / 库存
// 결과: src/generated/tokens.json  { "S02-A": ["我","帮","你","确认","一下","库存","请","稍","等"] }
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pinyin } from 'pinyin-pro'
import { applyPinyinOverrides } from './pinyin-overrides.ts'

applyPinyinOverrides()

interface Line { id: string; chinese: string; pinyin: string }
const root = join(import.meta.dirname, '..')
const items: { responses?: Line[] }[] = readdirSync(join(root, 'content', 'items'))
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(readFileSync(join(root, 'content', 'items', f), 'utf8')))

const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-zü]/g, '')

/** 병음 단어 경계에 맞춰 한자를 묶는다. 맞춰지지 않으면 null (그 문장은 조각 문제를 내지 않음) */
export function tokenize(chinese: string, py: string): string[] | null {
  const chars = [...chinese].filter((c) => /[\p{Script=Han}A-Za-z]/u.test(c))
  const charPy = pinyin(chars.join(''), { type: 'array', toneType: 'none' }).map(plain)
  if (charPy.length !== chars.length) return null
  const words = py.split(/[\s,.!?;:…"'’]+/).map(plain).filter(Boolean)
  const tokens: string[] = []
  let i = 0
  for (const w of words) {
    let acc = ''
    let tok = ''
    while (i < chars.length && acc.length < w.length) {
      acc += charPy[i]
      tok += chars[i]
      i++
      // 儿화처럼 앞 글자와 한 음절로 합쳐진 글자(병음이 비어 있음)는 같은 조각에 붙인다
      while (i < chars.length && charPy[i] === '') tok += chars[i++]
    }
    if (acc !== w) return null
    tokens.push(tok)
  }
  return i === chars.length ? tokens : null
}

const out: Record<string, string[]> = {}
const failed: string[] = []
for (const it of items)
  for (const r of it.responses ?? []) {
    const t = tokenize(r.chinese, r.pinyin)
    if (t) out[r.id] = t
    else failed.push(`${r.id} ${r.chinese}`)
  }

mkdirSync(join(root, 'src', 'generated'), { recursive: true })
writeFileSync(join(root, 'src', 'generated', 'tokens.json'), JSON.stringify(out, null, 1) + '\n')
console.log(`단어 조각: ${Object.keys(out).length}개 문장${failed.length ? ` · 맞추지 못함 ${failed.length}개: ${failed.join(', ')}` : ''}`)
