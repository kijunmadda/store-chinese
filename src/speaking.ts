// 말하기 연습 — 출제 규칙 (화면과 분리)
import type { ContentItem, StaffLine } from './content/types'
import { isDue, type StudyState } from './store'
import { shuffle } from './util'

export interface SpeakEntry {
  /** 직원 답변 ID (S01-A) */
  id: string
  item: ContentItem
  line: StaffLine
}

export function buildSpeakPool(items: ContentItem[]): SpeakEntry[] {
  return items
    .filter((it) => it.learningModes.includes('speak'))
    .flatMap((it) => (it.responses ?? []).map((line) => ({ id: line.id, item: it, line })))
}

/**
 * 이번 회차 문장 고르기
 * 1순위: 복습할 때가 된 문장 / 2순위: 본 적은 있지만 아직 말하기 평가를 안 한 문장
 * 3순위: 처음 보는 문장 / 4순위: 이미 잘 아는 문장(오래전에 본 것부터)
 * 떠올리기는 한 번이라도 본 문장에서 하는 것이 효과적이라 '본 적 있는 문장'을 처음 보는 문장보다 앞에 둔다.
 */
export function pickSpeakSession(pool: SpeakEntry[], state: StudyState, count: number, rand = Math.random): SpeakEntry[] {
  const tier = (e: SpeakEntry) => {
    const p = state.progress[e.id]
    if (isDue(p)) return 0
    if (p && p.box === 0) return 1
    if (!p) return 2
    return 3
  }
  const last = (e: SpeakEntry) => state.progress[e.id]?.lastStudiedAt ?? ''
  const ordered = shuffle(pool, rand).sort((a, b) => tier(a) - tier(b) || (tier(a) === 3 ? last(a).localeCompare(last(b)) : 0))
  return shuffle(ordered.slice(0, count), rand)
}
