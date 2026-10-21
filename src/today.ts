// '오늘의 학습' 구성 규칙 (설계서 4장: 복습 먼저 → 새 문장 → 듣기 → 말하기 → 역할극 → 마무리 회상)
import { categories, items, roleplays } from './content'
import type { ContentItem } from './content/types'
import { buildPool, pickSession, type ListenEntry } from './listen'
import { buildSpeakPool, type SpeakEntry } from './speaking'
import { computeStats } from './stats'
import { today, type StudyState } from './store'
import { shuffle } from './util'

export const NEW_PER_DAY = 3
export const LIMITS = { review: 5, listen: 4, speak: 3 }

export type StepKey = 'review' | 'new' | 'listen' | 'speak' | 'roleplay' | 'recall'

export const STEP_LABEL: Record<StepKey, string> = {
  review: '복습',
  new: '새 문장',
  listen: '듣기',
  speak: '말하기',
  roleplay: '역할극',
  recall: '마무리',
}

export interface TodayPlan {
  steps: StepKey[]
  reviewIds: string[]
  newItems: ContentItem[]
  listen: ListenEntry[]
  speak: SpeakEntry[]
  roleplayId: string | null
}

const idsOf = (it: ContentItem) => [...(it.customer ? [it.id] : []), ...(it.responses ?? []).map((r) => r.id)]
const catOrder = (it: ContentItem) => categories.find((c) => c.id === it.category)?.order ?? 99

/** 아직 한 번도 안 본 상황을 카테고리 순서대로. 다 봤으면 가장 오래전에 본 상황부터. */
export function pickNewItems(state: StudyState, count: number): ContentItem[] {
  const studyItems = items.filter((it) => it.learningModes.includes('study'))
  const seen = (it: ContentItem) => idsOf(it).some((id) => (state.progress[id]?.seen ?? 0) > 0)
  const fresh = studyItems.filter((it) => !seen(it)).sort((a, b) => catOrder(a) - catOrder(b))
  if (fresh.length >= count) return fresh.slice(0, count)
  const last = (it: ContentItem) => idsOf(it).map((id) => state.progress[id]?.lastStudiedAt ?? '').sort().at(-1) ?? ''
  const old = studyItems.filter(seen).sort((a, b) => last(a).localeCompare(last(b)))
  return [...fresh, ...old].slice(0, count)
}

export function planToday(state: StudyState, short: boolean, rand = Math.random): TodayPlan {
  const reviewIds = shuffle(computeStats(state, today()).dueIds, rand).slice(0, LIMITS.review)
  const newItems = pickNewItems(state, NEW_PER_DAY)
  const newIds = new Set(newItems.map((it) => it.id))

  // 듣기: 오늘 배운 상황의 고객 문장을 우선 섞어 넣는다
  const pool = buildPool(items, 'all')
  const fromNew = shuffle(pool.filter((e) => newIds.has(e.item.id)), rand).filter((e, i, a) => a.findIndex((x) => x.item.id === e.item.id) === i)
  const rest = pickSession(pool.filter((e) => !newIds.has(e.item.id)), state, LIMITS.listen, rand)
  const listen = [...fromNew, ...rest].slice(0, LIMITS.listen)

  // 말하기: 이미 배운 문장 중심 (오늘 새 문장은 마지막 '마무리 회상'에서 떠올린다)
  const speakPool = buildSpeakPool(items).filter((e) => !newIds.has(e.item.id) && (state.progress[e.id]?.seen ?? 0) > 0)
  const speak = shuffle(speakPool, rand).slice(0, LIMITS.speak)

  const studyDays = Object.values(state.days).filter((d) => d.steps.length > 0).length
  const roleplayId = roleplays.length ? roleplays[studyDays % roleplays.length].id : null

  const steps: StepKey[] = short
    ? ['review', 'recall']
    : ['review', 'new', 'listen', 'speak', 'roleplay', 'recall']
  return {
    steps: steps.filter((s) => {
      if (s === 'review') return reviewIds.length > 0
      if (s === 'new') return newItems.length > 0
      if (s === 'listen') return listen.length > 0
      if (s === 'speak') return speak.length > 0
      if (s === 'roleplay') return !!roleplayId
      return true
    }),
    reviewIds,
    newItems,
    listen,
    speak,
    roleplayId,
  }
}

/** 마무리 회상 대상: 오늘 새로 본 상황의 직원 답변 (짧게 하기에서는 최근 학습 문장) */
export function recallEntries(plan: TodayPlan, state: StudyState): SpeakEntry[] {
  const pool = buildSpeakPool(items)
  const fromNew = pool.filter((e) => plan.newItems.some((it) => it.id === e.item.id))
  if (plan.steps.includes('new') && fromNew.length) return fromNew
  return pool
    .filter((e) => state.progress[e.id]?.lastStudiedAt)
    .sort((a, b) => (state.progress[b.id].lastStudiedAt ?? '').localeCompare(state.progress[a.id].lastStudiedAt ?? ''))
    .slice(0, NEW_PER_DAY)
}
