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
import { customPinyin, pinyin } from 'pinyin-pro'

// 라이브러리가 문맥을 몰라 틀리게 읽는 것으로 판정된 표현 (2026-10-21 판정, 근거 포함)
customPinyin({
  怎么背: 'zěn me bēi', // 背: 메다 = bēi (bèi는 '등')
  单肩背: 'dān jiān bēi',
  上班背: 'shàng bān bēi',
  背: 'bēi', // 단독 글자 背·数는 이 앱에서 동사로만 씀 — 명사 뜻(등·숫자)이 콘텐츠에 추가되면 이 두 줄을 지울 것
  数一下: 'shǔ yí xià', // 数: 세다(동사) = shǔ (shù는 '숫자')
  数: 'shǔ',
  类似: 'lèi sì', // 사전 표준음 lèisì
  哪儿: 'nǎr', // 儿화: 한 음절로 표기
  小一号: 'xiǎo yí hào', // '한 사이즈'(수량) → 一 변조. 라이브러리는 서수(1번)로 읽음
  大一号: 'dà yí hào',
  一号: 'yí hào',
})

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
