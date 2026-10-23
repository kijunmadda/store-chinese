// 병음 → 한글 발음 (보조용). 실제 소리에 가깝게, 성조는 숫자(1~4, 경성 없음)로 붙인다.
// 한글로는 성조와 일부 소리(zh/z/j, ü, -n/-ng)를 정확히 나타낼 수 없으므로 '참고용'으로만 보여 준다.
// scripts/make-tokens.ts가 빌드할 때 이 함수로 모든 문장의 한글 발음을 미리 만든다.

const TONE: Record<string, number> = {}
;['āēīōūǖ', 'áéíóúǘ', 'ǎěǐǒǔǚ', 'àèìòùǜ'].forEach((set, i) => [...set].forEach((c) => (TONE[c] = i + 1)))

export function splitTone(syllable: string): { plain: string; tone: number } {
  let tone = 0
  const plain = [...syllable.normalize('NFC')]
    .map((c) => {
      if (TONE[c]) tone = TONE[c]
      // 성조 기호(ˉ ˊ ˇ ˋ)만 지우고 ü의 점(¨)은 남긴다
      return c.normalize('NFD').replace(/[̀́̄̌]/g, '').normalize('NFC')
    })
    .join('')
    .toLowerCase()
    .replace(/v/g, 'ü')
  return { plain, tone }
}

// 첫소리 (중국어 b·d·g·z는 힘을 빼고 내는 소리라 된소리에 가깝게. 단 경성 음절은 예사소리 — 아래 LAX)
// x는 ㅅ (ㅆ은 실제보다 세게 들림 — 2026-10-23 교차검증 GPT·딥시크 의견)
const INITIAL: Record<string, string> = {
  b: 'ㅃ', p: 'ㅍ', m: 'ㅁ', f: 'ㅍ', d: 'ㄸ', t: 'ㅌ', n: 'ㄴ', l: 'ㄹ',
  g: 'ㄲ', k: 'ㅋ', h: 'ㅎ', j: 'ㅈ', q: 'ㅊ', x: 'ㅅ',
  zh: 'ㅈ', ch: 'ㅊ', sh: 'ㅅ', r: 'ㄹ', z: 'ㅉ', c: 'ㅊ', s: 'ㅆ',
}

// 첫소리가 있을 때의 모음 부분 (ㅇ으로 시작하는 한글로 적고, 첫 글자의 ㅇ을 첫소리로 바꾼다)
const FINAL: Record<string, string> = {
  a: '아', o: '오', e: '어', ai: '아이', ei: '에이', ao: '아오', ou: '오우',
  an: '안', en: '언', ang: '앙', eng: '엉', ong: '옹', er: '얼',
  i: '이', ia: '이아', ie: '이에', iao: '이아오', iu: '이우', ian: '이엔', in: '인', iang: '이앙', ing: '잉', iong: '이옹',
  u: '우', ua: '우아', uo: '우어', uai: '우아이', ui: '우이', uan: '우안', un: '운', uang: '우앙',
  ü: '위', üe: '위에', üan: '위엔', ün: '윈',
}

// u- 계열(ua·uo·uai·uan·uang)은 한 음절로 합쳐 적는다 (国 꿔, 欢 환, 说 숴, 刷 솨, 穿 촨, 多 뚸)
// — 2026-10-23 교차검증: 제미나이·GPT 공통 의견 (두 음절로 나누면 리듬이 어긋남)
const U_MERGED: Record<string, string> = { ua: '와', uo: '워', uai: '와이', uan: '완', uang: '왕' }

// 첫소리 없이 y·w로 시작하는 음절
const STANDALONE: Record<string, string> = {
  a: '아', o: '오', e: '어', ai: '아이', ei: '에이', ao: '아오', ou: '오우', an: '안', en: '언', ang: '앙', eng: '엉', er: '얼',
  yi: '이', ya: '야', ye: '예', yao: '야오', you: '요우', yan: '옌', yin: '인', yang: '양', ying: '잉', yong: '용',
  wu: '우', wa: '와', wo: '워', wai: '와이', wei: '웨이', wan: '완', wen: '원', wang: '왕', weng: '웡',
  yu: '위', yue: '위에', yuan: '위엔', yun: '윈',
}

// sh는 혀를 마는 느낌을 살려 샤·셔·슈·쉬처럼 적는다 (2026-10-23 사용자 결정, 제미나이 제안)
const SH_FINAL: Record<string, string> = {
  a: '야', e: '여', i: '위', u: '유', ai: '야이', ei: '예이', ao: '야오', ou: '요우',
  an: '얀', en: '연', ang: '양', eng: '영',
  ua: '유아', uo: '유어', uai: '유아이', ui: '유이', uan: '유안', un: '윤', uang: '유앙',
}

const INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's']

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'

/** 한글 첫 글자의 첫소리(ㅇ)를 바꾼다: 이엔 + ㅈ → 지엔 */
function withInitial(hangul: string, cho: string): string {
  const code = hangul.charCodeAt(0) - 0xac00
  const vowelAndFinal = code % (21 * 28)
  return String.fromCharCode(0xac00 + CHO.indexOf(cho) * 21 * 28 + vowelAndFinal) + hangul.slice(1)
}

/** 마지막 글자에 받침 ㄹ을 붙인다 (받침이 이미 있으면 '얼'을 덧붙임) */
function addRieul(hangul: string): string {
  const last = hangul.charCodeAt(hangul.length - 1) - 0xac00
  if (last % 28 !== 0) return hangul + '얼'
  return hangul.slice(0, -1) + String.fromCharCode(0xac00 + last + 8)
}

/** 병음 한 음절 → 한글. 알 수 없는 음절이면 null */
export function syllableToHangul(plain: string, tone = 1): string | null {
  if (STANDALONE[plain]) return STANDALONE[plain]
  // 儿화: 哪儿 nǎr → 날, 一点儿 yìdiǎnr → 디엔+ㄹ
  if (plain.length > 2 && plain.endsWith('r') && plain !== 'er') {
    const base = syllableToHangul(plain.slice(0, -1), tone)
    return base ? addRieul(base) : null
  }
  const ini = INITIALS.find((i) => plain.startsWith(i))
  if (!ini) return null
  let fin = plain.slice(ini.length)
  if (ini === 'sh') return SH_FINAL[fin] ? withInitial(SH_FINAL[fin], initialFor(ini, tone)) : null
  // z·c·s / zh·ch·r 뒤의 i는 '으'
  if (fin === 'i' && ['z', 'c', 's', 'zh', 'ch', 'r'].includes(ini)) return withInitial('으', initialFor(ini, tone))
  // j·q·x 뒤의 u는 ü
  if (['j', 'q', 'x'].includes(ini) && fin.startsWith('u')) fin = 'ü' + fin.slice(1)
  // x + ü는 ㅆ(쒸): sh의 '쉬'(是)와 구별하기 위해
  if (ini === 'x' && fin.startsWith('ü')) return withInitial(FINAL[fin], 'ㅆ')
  if (U_MERGED[fin]) return withInitial(U_MERGED[fin], initialFor(ini, tone))
  const f = FINAL[fin]
  return f ? withInitial(f, initialFor(ini, tone)) : null
}

// 경성(약하게 내는 소리)은 된소리 대신 예사소리: 的 더, 子 즈 — 2026-10-23 교차검증 3개 AI 공통 의견
const LAX: Record<string, string> = { ㅃ: 'ㅂ', ㄸ: 'ㄷ', ㄲ: 'ㄱ', ㅉ: 'ㅈ', ㅆ: 'ㅅ' }
function initialFor(ini: string, tone: number): string {
  const c = INITIAL[ini]
  return tone === 0 ? (LAX[c] ?? c) : c
}

const SUP = ['', '¹', '²', '³', '⁴']

/**
 * 병음 문장 → 한글 발음. 음절 경계가 필요하므로 음절 목록을 받는다 (빌드 단계에서 한자 수에 맞춰 나눠 줌).
 * words: 단어별 음절 목록, 예) [["Nǐ"], ["hǎo"]] → "니³ 하오³"
 */
export function pinyinToHangul(words: string[][]): string | null {
  // 3성 + 3성 → 앞은 실제로 읽는 2성으로 표시 (2026-10-23 사용자 결정: 니² 하오³)
  const flat = words.flat().map((syl) => (/^[A-Za-z]$/.test(syl) ? -1 : splitTone(syl).tone))
  const spoken = flat.map((t, i) => (t === 3 && flat[i + 1] === 3 ? 2 : t))
  let k = 0
  const out: string[] = []
  for (const word of words) {
    let w = ''
    for (const syl of word) {
      const toneShown = spoken[k++]
      if (/^[A-Za-z]$/.test(syl)) {
        w += syl.toUpperCase() // S·M·L 같은 알파벳
        continue
      }
      const { plain, tone } = splitTone(syl)
      const h = syllableToHangul(plain, tone)
      if (!h) return null
      w += h + SUP[toneShown]
    }
    out.push(w)
  }
  return out.join(' ')
}
