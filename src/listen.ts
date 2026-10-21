// 고객 질문 듣기 훈련 — 문제 출제 규칙 (화면과 분리)
import type { ContentItem, Difficulty, StaffLine } from './content/types'
import { isDue, type StudyState } from './store'

export interface ListenEntry {
  /** 문장 ID (고객 질문 S01 또는 변형 S01-V1) */
  id: string
  item: ContentItem
  chinese: string
  pinyin: string
  meaning: string
}

export type QuestionType = 'meaning' | 'response'

export interface Option {
  key: string
  /** 뜻 고르기: 한국어 / 답변 고르기: 중국어 */
  label: string
  sub?: string
  correct: boolean
}

export interface Question {
  entry: ListenEntry
  type: QuestionType
  options: Option[]
  answer: StaffLine | undefined
}

export function buildPool(items: ContentItem[], difficulty: Difficulty | 'all'): ListenEntry[] {
  return items
    .filter((it) => it.customer && it.learningModes.includes('listen'))
    .filter((it) => difficulty === 'all' || it.difficulty === difficulty)
    .flatMap((it) => [
      { id: it.id, item: it, ...it.customer! },
      ...(it.variants ?? []).map((v) => ({ id: v.id, item: it, chinese: v.chinese, pinyin: v.pinyin, meaning: v.meaning })),
    ])
}

function shuffle<T>(list: T[], rand = Math.random): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * 이번 회차 문제 고르기
 * 1순위: 복습할 때가 된 문장(틀렸던 것 포함) / 2순위: 아직 안 들어 본 문장 / 3순위: 나머지
 * 최근에 낸 문장은 뒤로 미뤄 같은 문제가 자주 반복되지 않게 한다.
 * 같은 상황(항목)의 변형 표현은 한 회차에 하나만 낸다.
 */
export function pickSession(pool: ListenEntry[], state: StudyState, count: number, rand = Math.random): ListenEntry[] {
  const recent = new Set(state.recentListen)
  const tier = (e: ListenEntry) => {
    const p = state.progress[e.id]
    const base = isDue(p) ? 0 : !p || p.listen.correct + p.listen.wrong === 0 ? 1 : 2
    return base + (recent.has(e.id) ? 3 : 0)
  }
  const ordered = shuffle(pool, rand).sort((a, b) => tier(a) - tier(b))
  const picked: ListenEntry[] = []
  const usedItems = new Set<string>()
  for (const e of ordered) {
    if (picked.length >= count) break
    if (usedItems.has(e.item.id)) continue
    picked.push(e)
    usedItems.add(e.item.id)
  }
  return shuffle(picked, rand)
}

/**
 * 문제 만들기
 * - 뜻 고르기: 정답 1 + 다른 상황의 고객 질문 뜻 3 (같은 카테고리 우선, 같은 상황의 변형은 뜻이 같으므로 제외)
 * - 답변 고르기: 그 문장을 한 번 이상 맞힌 뒤에 나온다(점진적 난이도). 오답 보기는 '다른 카테고리'의
 *   직원 답변에서 고른다 — 같은 카테고리 답변(예: 我帮你查一下 / 我帮你看一下)은 둘 다 맞을 수 있어서.
 */
export function buildQuestion(entry: ListenEntry, pool: ListenEntry[], allItems: ContentItem[], state: StudyState, rand = Math.random): Question {
  const answer = entry.item.responses?.[0]
  const knownWell = (state.progress[entry.id]?.listen.correct ?? 0) >= 1
  const type: QuestionType = answer && knownWell && rand() < 0.5 ? 'response' : 'meaning'

  if (type === 'response' && answer) {
    const wrong = shuffle(
      allItems.filter((it) => it.category !== entry.item.category && it.responses?.length).map((it) => it.responses![0]),
      rand,
    ).slice(0, 2)
    const options: Option[] = [
      { key: answer.id, label: answer.chinese, sub: answer.pinyin, correct: true },
      ...wrong.map((r) => ({ key: r.id, label: r.chinese, sub: r.pinyin, correct: false })),
    ]
    return { entry, type, options: shuffle(options, rand), answer }
  }

  const others = pool.filter((e) => e.item.id !== entry.item.id && e.meaning !== entry.meaning)
  const sameCategory = shuffle(others.filter((e) => e.item.category === entry.item.category), rand)
  const otherCategory = shuffle(others.filter((e) => e.item.category !== entry.item.category), rand)
  // 오답 보기는 '상황(항목)마다 하나씩'만 — 같은 상황의 변형 표현 여러 개가 보기로 나오면
  // 비슷한 뜻끼리 묶여 정답이 드러나기 때문
  const candidates = [
    ...(entry.item.distractors ?? []).map((text) => ({ text, itemId: `own:${text}` })),
    ...[...sameCategory, ...otherCategory].map((e) => ({ text: e.meaning, itemId: e.item.id })),
  ]
  const labels = new Set<string>([entry.meaning])
  const usedItems = new Set<string>()
  const distractors: string[] = []
  for (const c of candidates) {
    if (distractors.length >= 3) break
    if (labels.has(c.text) || usedItems.has(c.itemId)) continue
    labels.add(c.text)
    usedItems.add(c.itemId)
    distractors.push(c.text)
  }
  const options: Option[] = [
    { key: 'answer', label: entry.meaning, correct: true },
    ...distractors.map((d, i) => ({ key: `d${i}`, label: d, correct: false })),
  ]
  return { entry, type, options: shuffle(options, rand), answer }
}
