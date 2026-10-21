import { describe, expect, it } from 'vitest'
import { computeStats } from './stats'
import { emptyState, schedule, type SentenceProgress } from './store'

const prog = (p: Partial<SentenceProgress> = {}): SentenceProgress => ({
  seen: 1, box: 0, listen: { correct: 0, wrong: 0 }, speak: { again: 0, hard: 0, good: 0 }, markedForReview: false, usedInStore: 0, ...p,
})

describe('학습 통계', () => {
  it('틀렸다가 나중에 맞힌 문장은 "틀린 문장" 목록에서 빠짐', () => {
    const s = emptyState()
    const p = prog({ listen: { correct: 0, wrong: 1 } })
    schedule(p, 'again', '2026-10-21')
    s.progress['S01'] = p
    expect(computeStats(s, '2026-10-21').wrongListenIds).toEqual(['S01'])
    p.listen.correct = 1
    schedule(p, 'good', '2026-10-21')
    expect(computeStats(s, '2026-10-21').wrongListenIds).toEqual([])
  })

  it('진행률과 학습일 계산', () => {
    const s = emptyState()
    s.progress['S01'] = prog()
    s.progress['S01-A'] = prog()
    s.days['2026-10-20'] = { steps: ['study'], completed: false }
    s.days['2026-10-21'] = { steps: [], completed: false }
    const st = computeStats(s, '2026-10-21')
    expect(st.learned).toBe(2)
    expect(st.studyDays).toBe(1)
    expect(st.total).toBeGreaterThan(50)
    expect(st.byCategory.find((c) => c.id === 'stock')!.learned).toBe(2)
  })
})
