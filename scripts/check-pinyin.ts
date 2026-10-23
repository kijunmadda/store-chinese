// 기계 검사: 한자를 병음 라이브러리(pinyin-pro)로 변환해 콘텐츠의 병음과 대조한다.
// 사람·AI 검토를 대신하지 않는다. 의심스러운 곳을 표시해 검토자가 집중해서 보게 하는 용도.
// 사용: npm run check:pinyin
//
// 판정
//  ✖ 철자 다름  — 성조를 빼도 철자가 다름 (다음자 오독·오타 가능성 높음)
//  ⚠ 성조 다름  — 철자는 같고 성조가 다름 (다음자이거나 표기 실수)
//  (우리 쪽이 경성으로 적은 음절은 정상으로 본다 — 라이브러리는 경성을 대부분 원래 성조로 적기 때문)
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pinyin } from 'pinyin-pro'
import { applyPinyinOverrides } from './pinyin-overrides.ts'

applyPinyinOverrides()

interface Line { id?: string; chinese: string; pinyin: string }
interface Item { id: string; verificationStatus: string; customer?: Line; variants?: Line[]; responses?: Line[]; alternatives?: Line[]; keywords?: { word: string; pinyin: string }[] }

const root = join(import.meta.dirname, '..', 'content', 'items')
const items: Item[] = readdirSync(root).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(readFileSync(join(root, f), 'utf8')))

const TONE: Record<string, number> = {}
;['āēīōūǖ', 'áéíóúǘ', 'ǎěǐǒǔǚ', 'àèìòùǜ'].forEach((set, i) => [...set].forEach((c) => (TONE[c] = i + 1)))
const BASE: Record<string, string> = {}
;['āáǎà', 'ēéěè', 'īíǐì', 'ōóǒò', 'ūúǔù', 'ǖǘǚǜ'].forEach((set, i) => [...set].forEach((c) => (BASE[c] = 'aeiouü'[i])))

const norm = (s: string) => [...s.toLowerCase()].filter((c) => /[a-zü]/.test(c) || TONE[c]).join('')
const strip = (s: string) => [...s].map((c) => BASE[c] ?? c).join('')
const toneOf = (syl: string) => [...syl].map((c) => TONE[c]).find(Boolean) ?? 0

let errors = 0
let warnings = 0
let checked = 0

function check(where: string, chinese: string, ours: string) {
  checked++
  const hanOnly = chinese.replace(/[^\p{Script=Han}A-Za-z]/gu, '')
  const theirs = pinyin(hanOnly, { toneType: 'symbol', type: 'array' }).map((s) => s.toLowerCase())
  const o = norm(ours)
  if (strip(o) !== strip(theirs.join(''))) {
    errors++
    console.log(`✖ 철자 다름 [${where}] ${chinese}\n    콘텐츠: ${ours}\n    라이브러리: ${theirs.join(' ')}`)
    return
  }
  // 철자가 같으므로 라이브러리 음절 길이대로 잘라 성조 비교
  let pos = 0
  const diffs: string[] = []
  theirs.forEach((syl, i) => {
    const mine = o.slice(pos, pos + syl.length)
    pos += syl.length
    const tm = toneOf(mine)
    const tt = toneOf(syl)
    if (tm !== 0 && tm !== tt) diffs.push(`${[...hanOnly][i]}: 콘텐츠 ${mine} / 라이브러리 ${syl}`)
  })
  if (diffs.length) {
    warnings++
    console.log(`⚠ 성조 다름 [${where}] ${chinese}  (${ours})\n    ${diffs.join('\n    ')}`)
  }
}

for (const it of items) {
  const tag = `${it.id}${it.verificationStatus === 'verified' ? '' : ' 초안'}`
  if (it.customer) check(`${tag}`, it.customer.chinese, it.customer.pinyin)
  for (const v of it.variants ?? []) check(`${v.id}`, v.chinese, v.pinyin)
  for (const r of it.responses ?? []) check(`${r.id}`, r.chinese, r.pinyin)
  for (const a of it.alternatives ?? []) check(`${it.id} 대체`, a.chinese, a.pinyin)
  for (const k of it.keywords ?? []) check(`${it.id} 단어`, k.word, k.pinyin)
}

console.log(`\n병음 기계 검사: ${checked}개 확인 · 철자 다름 ${errors} · 성조 다름 ${warnings}`)
