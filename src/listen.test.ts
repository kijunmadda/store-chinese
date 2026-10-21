import { describe, expect, it } from 'vitest'
import { items } from './content'
import { buildPool, buildQuestion, pickSession } from './listen'
import { emptyState, today, type StudyState } from './store'

// 결과가 매번 같도록 고정된 난수
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32
    return seed / 2 ** 32
  }
}

const pool = buildPool(items, 'all')

describe('뜻 고르기 문제', () => {
  it('모든 문장에서: 보기 4개, 정답 1개, 오답은 서로 다른 상황에서 하나씩, 같은 상황 문장은 오답에 없음', () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const entry of pool) {
        const q = buildQuestion(entry, pool, items, emptyState(), seeded(seed))
        expect(q.type).toBe('meaning')
        expect(q.options).toHaveLength(4)
        expect(q.options.filter((o) => o.correct)).toHaveLength(1)
        expect(q.options.find((o) => o.correct)!.label).toBe(entry.meaning)
        const wrong = q.options.filter((o) => !o.correct).map((o) => pool.find((e) => e.meaning === o.label)!)
        const wrongItems = wrong.map((e) => e.item.id)
        expect(new Set(wrongItems).size).toBe(3)
        expect(wrongItems).not.toContain(entry.item.id)
        expect(new Set(q.options.map((o) => o.label)).size).toBe(4)
      }
    }
  })
})

describe('대답 고르기 문제', () => {
  it('한 번 맞힌 문장에서만 나오고, 오답 보기는 다른 카테고리의 답변', () => {
    let responseCount = 0
    for (let seed = 1; seed <= 30; seed++) {
      for (const entry of pool) {
        const state: StudyState = emptyState()
        state.progress[entry.id] = {
          seen: 1, box: 1, listen: { correct: 1, wrong: 0 }, speak: { again: 0, hard: 0, good: 0 }, markedForReview: false, usedInStore: 0,
        }
        const q = buildQuestion(entry, pool, items, state, seeded(seed))
        if (q.type !== 'response') continue
        responseCount++
        expect(q.options.filter((o) => o.correct)).toHaveLength(1)
        expect(q.options.find((o) => o.correct)!.key).toBe(entry.item.responses![0].id)
        for (const o of q.options.filter((o) => !o.correct)) {
          const owner = items.find((it) => it.responses?.some((r) => r.id === o.key))!
          expect(owner.category).not.toBe(entry.item.category)
        }
      }
    }
    expect(responseCount).toBeGreaterThan(0)
  })
})

describe('출제 순서', () => {
  it('한 회차에 같은 상황은 한 번만, 복습할 문장이 먼저, 최근 낸 문장은 뒤로', () => {
    const state = emptyState()
    const due = pool.find((e) => e.id === 'S02')!
    state.progress['S02'] = {
      seen: 1, box: 1, nextReviewAt: today(-1), listen: { correct: 0, wrong: 1 }, speak: { again: 0, hard: 0, good: 0 }, markedForReview: false, usedInStore: 0,
    }
    state.recentListen = pool.filter((e) => e.item.category === 'greeting').map((e) => e.id)
    for (let seed = 1; seed <= 20; seed++) {
      const picked = pickSession(pool, state, 5, seeded(seed))
      expect(picked).toHaveLength(5)
      expect(new Set(picked.map((e) => e.item.id)).size).toBe(5)
      expect(picked.map((e) => e.id)).toContain(due.id)
      expect(picked.some((e) => e.item.category === 'greeting')).toBe(false)
    }
  })
})
