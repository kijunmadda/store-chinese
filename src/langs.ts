// 학습 언어 (중국어 / 영어). 홈 화면 위쪽에서 바꾼다.
// 언어마다 콘텐츠·학습 기록이 따로이므로, 바꾸면 앱을 새로 불러온다 (화면 곳곳의 상태를 한 번에 맞추기 위해).
export type LangId = 'zh' | 'en'

export interface LangInfo {
  id: LangId
  /** 화면 표시용 이름 — "중국어로 말해 보세요"처럼 쓴다 */
  name: string
  /** 글자 표시·음성에 쓰는 언어 태그 (중국어는 간체 글꼴로 그리기 위해 필요) */
  tag: string
  /** 병음 표시가 있는 언어인지 */
  hasPinyin: boolean
  /** 단어 조각을 이어 붙일 때 사이에 넣는 글자 (중국어는 띄어쓰기 없음) */
  joiner: string
  /** 기기 음성 고르기 */
  isVoice: (lang: string) => boolean
  isPreferredVoice: (lang: string) => boolean
  testSentence: string
  /** 한글 발음 아래 안내 */
  hangulNote: string
}

export const LANGS: Record<LangId, LangInfo> = {
  zh: {
    id: 'zh',
    name: '중국어',
    tag: 'zh-CN',
    hasPinyin: true,
    joiner: '',
    isVoice: (l) => /^zh([-_]|$)/i.test(l) || /^cmn/i.test(l),
    // 중국 본토(zh-CN) 음성을 먼저, 대만·홍콩 음성은 뒤로
    isPreferredVoice: (l) => /^zh[-_](CN|Hans)/i.test(l) || /^cmn/i.test(l),
    testSentence: '我帮你确认一下库存，请稍等。',
    hangulNote: '참고용 · 숫자는 실제로 읽는 성조 · zh·ch·sh, f 같은 소리는 한글로 정확히 못 적어요 — 🔊로 확인하세요',
  },
  en: {
    id: 'en',
    name: '영어',
    tag: 'en-US',
    hasPinyin: false,
    joiner: ' ',
    isVoice: (l) => /^en([-_]|$)/i.test(l),
    // 미국 영어 음성을 먼저
    isPreferredVoice: (l) => /^en[-_]US/i.test(l),
    testSentence: 'Let me check the stock for you. One moment, please.',
    hangulNote: '참고용 · 실제로 들리는 소리에 가깝게 적었어요 · r·l, f·p, v·b, th 같은 소리는 한글로 정확히 못 적어요 — 🔊로 확인하세요',
  },
}

const KEY = 'lang.v1'

function load(): LangId {
  try {
    return localStorage.getItem(KEY) === 'en' ? 'en' : 'zh'
  } catch {
    return 'zh'
  }
}

export const LANG_ID: LangId = load()
export const L: LangInfo = LANGS[LANG_ID]

/** 언어를 바꾸고 홈 화면부터 다시 연다 */
export function switchLang(id: LangId) {
  if (id === LANG_ID) return
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* 저장 불가 — 이번에만 적용되지 않음 */
    return
  }
  location.hash = '#/'
  location.reload()
}
