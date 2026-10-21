// 발음·성조 훈련 — 데이터 처리와 문제 만들기 (화면과 분리)
import tonesJson from '../content/tones.json'
import { shuffle } from './util'

export interface ToneWord {
  word: string
  syllables: string[]
  meaning: string
}

export interface TonePair {
  kind: 'tone' | 'confusable'
  note: string
  a: ToneWord
  b: ToneWord
}

export const toneData = tonesJson as { basics: ToneWord[]; words: ToneWord[]; pairs: TonePair[] }

const MARKS: Record<string, number> = {}
for (const [tone, chars] of [
  [1, 'āēīōūǖĀĒĪŌŪǕ'],
  [2, 'áéíóúǘÁÉÍÓÚǗ'],
  [3, 'ǎěǐǒǔǚǍĚǏǑǓǙ'],
  [4, 'àèìòùǜÀÈÌÒÙǛ'],
] as const)
  for (const c of chars) MARKS[c] = tone

/** 병음 음절의 성조 (성조 기호 없음 = 0 경성) */
export function toneOf(syllable: string): number {
  for (const c of syllable) if (MARKS[c]) return MARKS[c]
  return 0
}

export const tonesOf = (w: ToneWord) => w.syllables.map(toneOf)

/** 실제로 들리는 성조: 3성 + 3성 → 앞 음절은 2성처럼 */
export function spokenTones(tones: number[]): number[] {
  const out = [...tones]
  for (let i = 0; i < out.length - 1; i++) if (tones[i] === 3 && tones[i + 1] === 3) out[i] = 2
  return out
}

export const toneLabel = (tones: number[]) => tones.map((t) => (t === 0 ? '경' : String(t))).join('-')
export const pinyinOf = (w: ToneWord) => w.syllables.join('')

/** 성조 표시 없는 병음 (글자로 보기 힌트용) */
export function stripTones(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC').replace(/v/g, 'ü')
}

export interface ToneQuestion {
  word: ToneWord
  answer: string
  options: string[]
}

/**
 * 성조 듣기 문제: 들리는 그대로의 성조 조합을 고른다.
 * 3성 연속 단어는 '적힌 성조'와 '들리는 성조'가 달라 혼란스러우므로 듣기 문제에서는 제외하고 규칙 카드에서 따로 배운다.
 */
export function buildToneQuestion(rand = Math.random): ToneQuestion {
  const candidates = toneData.words.filter((w) => {
    const t = tonesOf(w)
    return !t.some((x, i) => x === 3 && t[i + 1] === 3)
  })
  const word = candidates[Math.floor(rand() * candidates.length)]
  const answer = toneLabel(tonesOf(word))
  const [first, second] = tonesOf(word)
  // 오답: 한 음절만 바꾼 조합 위주 (진짜로 귀를 기울여야 구별되도록)
  const near = new Set<string>()
  for (const t of [1, 2, 3, 4]) {
    if (t !== first) near.add(toneLabel([t, second]))
    if (t !== second && second !== 0) near.add(toneLabel([first, t]))
  }
  near.delete(answer)
  // 3-3은 실제로 2-3으로 들리므로 '들리는 성조' 보기로는 낼 수 없음
  near.delete('3-3')
  const options = shuffle([answer, ...shuffle([...near], rand).slice(0, 3)], rand)
  return { word, answer, options }
}

// ── 가격 (한국 원화) 읽기 ───────────────────────
const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
const DIGIT_PY = ['líng', 'yī', 'èr', 'sān', 'sì', 'wǔ', 'liù', 'qī', 'bā', 'jiǔ']
const UNITS = ['', '十', '百', '千']
const UNIT_PY = ['', 'shí', 'bǎi', 'qiān']

interface Syl {
  zh: string
  py: string
}

/** 0~9999 읽기. leading=true면 맨 앞 묶음 (十二 → 十二, 两千 등) */
function readGroup(n: number, leading: boolean): Syl[] {
  const out: Syl[] = []
  const digits = String(n).padStart(4, '0').split('').map(Number)
  let pendingZero = false
  digits.forEach((d, i) => {
    const unit = 3 - i
    if (d === 0) {
      if (out.length > 0 || !leading) pendingZero = out.length > 0 || pendingZero
      return
    }
    if (pendingZero) out.push({ zh: '零', py: 'líng' })
    pendingZero = false
    const isFirst = out.length === 0
    if (d === 1 && unit === 1 && isFirst && leading) {
      // 10~19는 맨 앞에서 '一十'가 아니라 '十'
      out.push({ zh: '十', py: 'shí' })
      return
    }
    if (d === 2 && isFirst && leading && unit >= 2) out.push({ zh: '两', py: 'liǎng' })
    else out.push({ zh: DIGITS[d], py: DIGIT_PY[d] })
    if (unit > 0) out.push({ zh: UNITS[unit], py: UNIT_PY[unit] })
  })
  return out
}

/** 一의 성조 변화: 4성 앞 → 2성(yí), 1·2·3성 앞 → 4성(yì), 맨 끝·숫자 단독은 1성 */
function applyYiSandhi(syls: Syl[]): Syl[] {
  return syls.map((s, i) => {
    if (s.zh !== '一') return s
    const next = syls[i + 1]
    if (!next) return s
    return { ...s, py: toneOf(next.py) === 4 ? 'yí' : 'yì' }
  })
}

/** 원화 금액 → 중국어 (1억 미만). 예: 3,500,000 → 三百五十万韩元 */
export function wonToChinese(amount: number): { chinese: string; pinyin: string } {
  if (!Number.isInteger(amount) || amount <= 0 || amount >= 100_000_000) throw new Error(`지원하지 않는 금액: ${amount}`)
  const wan = Math.floor(amount / 10000)
  const rest = amount % 10000
  let syls: Syl[] = []
  if (wan > 0) {
    // 2만 → 两万 (단독 2일 때만), 22만 → 二十二万
    syls = wan === 2 ? [{ zh: '两', py: 'liǎng' }] : readGroup(wan, true)
    syls.push({ zh: '万', py: 'wàn' })
    if (rest > 0) {
      if (rest < 1000) syls.push({ zh: '零', py: 'líng' })
      syls.push(...readGroup(rest, false))
    }
  } else {
    syls = readGroup(rest, true)
  }
  syls = applyYiSandhi(syls)
  return {
    chinese: syls.map((s) => s.zh).join('') + '韩元',
    pinyin: syls.map((s) => s.py).join(' ') + ' hányuán',
  }
}

/** 한국식 표기: 3,500,000 → 350만 원 */
export function wonToKorean(amount: number): string {
  const man = Math.floor(amount / 10000)
  const rest = amount % 10000
  if (man === 0) return `${rest.toLocaleString('ko-KR')}원`
  return rest === 0 ? `${man.toLocaleString('ko-KR')}만 원` : `${man.toLocaleString('ko-KR')}만 ${rest.toLocaleString('ko-KR')}원`
}

export interface PriceQuestion {
  amount: number
  chinese: string
  pinyin: string
  options: number[]
}

/** 명품 매장 가격대(5만~900만 원)의 금액과, 헷갈리기 쉬운 오답(자리 바꿈·10배 차이·숫자 하나 바꿈) */
export function buildPriceQuestion(rand = Math.random): PriceQuestion {
  const r = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))
  const kind = rand()
  const amount =
    kind < 0.6 ? r(10, 900) * 10000 // 10만~900만, 만 원 단위
    : kind < 0.85 ? r(5, 99) * 10000 + r(1, 9) * 1000 // 5만 1천 등
    : r(100, 999) * 10000 + r(1, 9) * 1000

  const man = Math.floor(amount / 10000)
  const candidates = new Set<number>()
  const swapped = Number(String(man).split('').reverse().join(''))
  if (swapped !== man && swapped > 0) candidates.add(swapped * 10000 + (amount % 10000))
  if (man * 10 < 10000) candidates.add(amount * 10)
  if (man >= 10) candidates.add(Math.round(amount / 10 / 1000) * 1000)
  const digits = String(man).split('')
  for (let i = 0; i < 6 && candidates.size < 6; i++) {
    const d = [...digits]
    const pos = Math.floor(rand() * d.length)
    d[pos] = String((Number(d[pos]) + r(1, 8)) % 10)
    const v = Number(d.join(''))
    if (v > 0) candidates.add(v * 10000 + (amount % 10000))
  }
  candidates.delete(amount)
  const options = shuffle([amount, ...shuffle([...candidates].filter((v) => v > 0 && v < 100_000_000), rand).slice(0, 3)], rand)
  return { amount, ...wonToChinese(amount), options }
}
