import { describe, expect, it } from 'vitest'
import { isDue, schedule, type SentenceProgress } from './store'

const fresh = (): SentenceProgress => ({
  seen: 1, box: 0, listen: { correct: 0, wrong: 0 }, speak: { again: 0, hard: 0, good: 0 }, markedForReview: false, usedInStore: 0,
})

describe('간격 반복 일정', () => {
  const day = '2026-10-21'

  it('처음 평가: 몰랐음=오늘, 헷갈림=1일 뒤, 바로 떠오름=3일 뒤 (서로 달라야 함)', () => {
    const a = fresh(); schedule(a, 'again', day)
    const h = fresh(); schedule(h, 'hard', day)
    const g = fresh(); schedule(g, 'good', day)
    expect(a.nextReviewAt).toBe('2026-10-21')
    expect(h.nextReviewAt).toBe('2026-10-22')
    expect(g.nextReviewAt).toBe('2026-10-24')
  })

  it('같은 날 여러 번 맞혀도 단계는 한 번만 오름', () => {
    const p = fresh()
    schedule(p, 'good', day)
    schedule(p, 'good', day)
    schedule(p, 'good', day)
    expect(p.box).toBe(2)
    schedule(p, 'good', '2026-10-24')
    expect(p.box).toBe(3)
  })

  it('(다른 날마다) 계속 맞히면 간격이 3→7→14→30일로 늘고 30일에서 멈춤', () => {
    const p = fresh()
    const gaps: number[] = []
    for (let i = 0; i < 6; i++) {
      p.promotedAt = undefined
      schedule(p, 'good', day)
      gaps.push((new Date(p.nextReviewAt!).getTime() - new Date(day).getTime()) / 86400000)
    }
    expect(gaps).toEqual([3, 7, 14, 30, 30, 30])
  })

  it('잘 알던 문장도 몰랐음이면 상자 1로 돌아가고 바로 복습 대상', () => {
    const p = fresh()
    p.box = 5
    schedule(p, 'again', day)
    expect(p.box).toBe(1)
    expect(isDue(p, day)).toBe(true)
  })

  it('월말·연말을 넘어가도 날짜 계산이 맞음', () => {
    const p = fresh(); p.box = 3
    schedule(p, 'good', '2026-12-25')
    expect(p.nextReviewAt).toBe('2027-01-08')
  })
})
