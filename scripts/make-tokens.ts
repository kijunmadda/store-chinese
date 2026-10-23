// '단어 조각 배열' 문제용 조각 만들기 — 빌드할 때 자동 실행 (npm run tokens)
// 콘텐츠 병음은 단어 단위로 띄어 써 있다 (Wǒ bāng nǐ quèrèn yíxià kùcún).
// 병음 단어 하나에 해당하는 한자들을 묶어 조각으로 만든다: 我 / 帮 / 你 / 确认 / 一下 / 库存
// 결과: src/generated/tokens.json  { "S02-A": ["我","帮","你","确认","一下","库存","请","稍","等"] }
// 같은 맞추기로 음절을 나눠 한글 발음도 만든다 → src/generated/hangul.json  { "你好": "니³ 하오³" }
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pinyin } from 'pinyin-pro'
import { pinyinToHangul } from '../src/hangul.ts'
import { applyPinyinOverrides } from './pinyin-overrides.ts'

applyPinyinOverrides()

interface Line { id: string; chinese: string; pinyin: string }
interface Item { customer?: Line; variants?: Line[]; responses?: Line[]; alternatives?: Line[]; keywords?: { word: string; pinyin: string }[] }
interface ToneWord { word: string; syllables: string[] }
const root = join(import.meta.dirname, '..')
const items: Item[] = readdirSync(join(root, 'content', 'items'))
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(readFileSync(join(root, 'content', 'items', f), 'utf8')))

const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-zü]/g, '')

/** 병음 단어 경계에 맞춰 한자를 묶는다. 맞춰지지 않으면 null (그 문장은 조각 문제를 내지 않음)
 *  tokens: 단어 조각 / syllables: 단어별 음절(성조 포함) */
export function align(chinese: string, py: string): { tokens: string[]; syllables: string[][] } | null {
  const chars = [...chinese].filter((c) => /[\p{Script=Han}A-Za-z]/u.test(c))
  const charPy = pinyin(chars.join(''), { type: 'array', toneType: 'none' }).map(plain)
  if (charPy.length !== chars.length) return null
  const words = py.normalize('NFC').split(/[\s,.!?;:…"'’]+/).filter((w) => plain(w))
  const tokens: string[] = []
  const syllables: string[][] = []
  let i = 0
  for (const word of words) {
    const w = plain(word)
    const letters = [...word].filter((c) => plain(c))
    let acc = ''
    let tok = ''
    const syls: string[] = []
    while (i < chars.length && acc.length < w.length) {
      syls.push(letters.slice(acc.length, acc.length + charPy[i].length).join(''))
      acc += charPy[i]
      tok += chars[i]
      i++
      // 儿화처럼 앞 글자와 한 음절로 합쳐진 글자(병음이 비어 있음)는 같은 조각에 붙인다
      while (i < chars.length && charPy[i] === '') tok += chars[i++]
    }
    if (acc !== w) return null
    tokens.push(tok)
    syllables.push(syls)
  }
  return i === chars.length ? { tokens, syllables } : null
}

const out: Record<string, string[]> = {}
const failed: string[] = []
for (const it of items)
  for (const r of it.responses ?? []) {
    const t = align(r.chinese, r.pinyin)?.tokens
    if (t) out[r.id] = t
    else failed.push(`${r.id} ${r.chinese}`)
  }

mkdirSync(join(root, 'src', 'generated'), { recursive: true })
writeFileSync(join(root, 'src', 'generated', 'tokens.json'), JSON.stringify(out, null, 1) + '\n')
// 한글 발음: 모든 문장·변형·답변·대체 표현·핵심 단어
const hangul: Record<string, string> = {}
const noHangul: string[] = []
for (const it of items) {
  const lines = [it.customer, ...(it.variants ?? []), ...(it.responses ?? []), ...(it.alternatives ?? []), ...(it.keywords ?? []).map((k) => ({ chinese: k.word, pinyin: k.pinyin }))]
  for (const l of lines) {
    if (!l) continue
    const a = align(l.chinese, l.pinyin)
    const h = a && pinyinToHangul(a.syllables)
    if (h) hangul[l.chinese] = h
    else noHangul.push(l.chinese)
  }
}
// 발음·성조 훈련 단어도 (단어 하나 = 음절 목록)
const tones = JSON.parse(readFileSync(join(root, 'content', 'tones.json'), 'utf8')) as Record<string, unknown>
const toneWords = [...(tones.basics as ToneWord[]), ...(tones.words as ToneWord[]), ...(tones.pairs as { a: ToneWord; b: ToneWord }[]).flatMap((p) => [p.a, p.b])]
for (const w of toneWords) {
  const h = pinyinToHangul([w.syllables])
  if (h) hangul[w.word] = h
  else noHangul.push(w.word)
}
writeFileSync(join(root, 'src', 'generated', 'hangul.json'), JSON.stringify(hangul, null, 1) + '\n')
console.log(`한글 발음: ${Object.keys(hangul).length}개${noHangul.length ? ` · 만들지 못함: ${noHangul.join(', ')}` : ''}`)
console.log(`단어 조각: ${Object.keys(out).length}개 문장${failed.length ? ` · 맞추지 못함 ${failed.length}개: ${failed.join(', ')}` : ''}`)
