import { describe, expect, it } from 'vitest'
import { items } from './content'
import { buildSpeakPool, pickSpeakSession } from './speaking'
import { emptyState, today, type SentenceProgress } from './store'

const prog = (p: Partial<SentenceProgress>): SentenceProgress => ({
  seen: 1, box: 0, listen: { correct: 0, wrong: 0 }, speak: { again: 0, hard: 0, good: 0 }, markedForReview: false, usedInStore: 0, ...p,
})

describe('말하기 출제 순서', () => {
  const pool = buildSpeakPool(items)

  it('직원 답변만 출제', () => {
    expect(pool.length).toBeGreaterThan(0)
    expect(pool.every((e) => e.id.includes('-A'))).toBe(true)
  })

  it('복습할 문장 → 본 적 있는 문장 → 처음 보는 문장 순, 잘 아는 문장은 마지막', () => {
    const state = emptyState()
    state.progress['S01-A'] = prog({ box: 1, nextReviewAt: today(-1) }) // 복습할 때
    state.progress['P01-A'] = prog({ markedForReview: true, box: 3, nextReviewAt: today(10) }) // 직접 추가
    state.progress['G01-A'] = prog({ box: 0 }) // 본 적만 있음
    for (const e of pool) if (!state.progress[e.id] && e.id !== 'G02-A') state.progress[e.id] = prog({ box: 5, nextReviewAt: today(30) })
    const picked = pickSpeakSession(pool, state, 4).map((e) => e.id)
    expect(picked).toEqual(expect.arrayContaining(['S01-A', 'P01-A', 'G01-A', 'G02-A']))
  })
})
