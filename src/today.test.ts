import { describe, expect, it } from 'vitest'
import { emptyState, today, type SentenceProgress } from './store'
import { pickNewItems, planToday } from './today'

const prog = (p: Partial<SentenceProgress> = {}): SentenceProgress => ({
  seen: 1, box: 1, lastStudiedAt: '2026-10-01', listen: { correct: 0, wrong: 0 }, speak: { again: 0, hard: 0, good: 0 }, markedForReview: false, usedInStore: 0, ...p,
})

describe('오늘의 학습 구성', () => {
  it('처음 사용: 복습·말하기 없이 새 문장부터, 새 문장은 3개 (카테고리 순서)', () => {
    const plan = planToday(emptyState(), false)
    expect(plan.steps).toEqual(['new', 'listen', 'roleplay', 'recall'])
    expect(plan.newItems.map((it) => it.id)).toEqual(['G01', 'G02', 'G03'])
  })

  it('복습할 문장이 있으면 복습이 맨 앞, 최대 5개', () => {
    const s = emptyState()
    for (const id of ['S01', 'S02', 'S03', 'S04-A', 'S05-A', 'S06-A', 'S07']) s.progress[id] = prog({ nextReviewAt: today(-1) })
    const plan = planToday(s, false)
    expect(plan.steps[0]).toBe('review')
    expect(plan.reviewIds).toHaveLength(5)
    expect(plan.steps).toContain('speak')
  })

  it('짧게 하기는 복습 + 마무리만', () => {
    const s = emptyState()
    s.progress['S01'] = prog({ nextReviewAt: today(-1) })
    expect(planToday(s, true).steps).toEqual(['review', 'recall'])
  })

  it('이미 본 상황은 새 문장에서 제외', () => {
    const s = emptyState()
    s.progress['G01-A'] = prog()
    s.progress['G02-A'] = prog()
    expect(pickNewItems(s, 3).map((it) => it.id)).toEqual(['G03', 'G04', 'G05'])
  })
})
