// 홈·복습 화면에 보여 줄 학습 통계 계산
import { categories, items, sentences } from './content'
import { isDue, type StudyState } from './store'

export interface Stats {
  studyDays: number
  learned: number
  total: number
  percent: number
  dueIds: string[]
  wrongListenIds: string[]
  hardSpeakIds: string[]
  markedIds: string[]
  byCategory: { id: string; name: string; learned: number; total: number }[]
  todaySteps: string[]
}

/** 콘텐츠에서 '학습한 문장'으로 셀 대상: 고객 질문·변형·직원 답변 */
const allIds = [...sentences.keys()]

export function computeStats(state: StudyState, todayKey: string): Stats {
  const seen = (id: string) => (state.progress[id]?.seen ?? 0) > 0
  const learned = allIds.filter(seen).length
  const byCategory = categories
    .map((c) => {
      const ids = allIds.filter((id) => sentences.get(id)!.itemId && items.find((it) => it.id === sentences.get(id)!.itemId)?.category === c.id)
      return { id: c.id, name: c.name, learned: ids.filter(seen).length, total: ids.length }
    })
    .filter((c) => c.total > 0)

  const existing = allIds.filter((id) => state.progress[id])
  return {
    studyDays: Object.values(state.days).filter((d) => d.steps.length > 0).length,
    learned,
    total: allIds.length,
    percent: allIds.length ? Math.round((learned / allIds.length) * 100) : 0,
    dueIds: existing.filter((id) => isDue(state.progress[id], todayKey)),
    // 마지막 결과가 오답인 문장만 (나중에 맞히면 목록에서 빠짐)
    wrongListenIds: existing.filter((id) => state.progress[id].listen.wrong > 0 && state.progress[id].lastRating === 'again'),
    hardSpeakIds: existing.filter((id) => ['again', 'hard'].includes(state.progress[id].lastRating ?? '') && id.includes('-A')),
    markedIds: existing.filter((id) => state.progress[id].markedForReview),
    byCategory,
    todaySteps: state.days[todayKey]?.steps ?? [],
  }
}

/** 문장 ID → 문장 학습 화면 주소 */
export function studyLink(sentenceId: string): string {
  const s = sentences.get(sentenceId)
  if (!s) return '/collection'
  const item = items.find((it) => it.id === s.itemId)!
  const list = items.filter((it) => it.category === item.category && it.learningModes.includes('study'))
  return `/study/sentences/${item.category}?i=${list.indexOf(item)}&mode=learn`
}
