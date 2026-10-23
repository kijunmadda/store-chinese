import { describe, expect, it } from 'vitest'
import tokens from './generated/tokens.json'
import { items, sentences } from './content'
import { buildLesson, canBuild, exerciseFor, RANK, ratingFor, retryOf, type GradedExercise } from './lesson'
import { buildPool } from './listen'
import { emptyState, today, type SentenceProgress } from './store'

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32
    return seed / 2 ** 32
  }
}
const spread = (n: number, total = 40) => () => (n + 0.5) / total
const prog = (p: Partial<SentenceProgress> = {}): SentenceProgress => ({
  seen: 1, box: 1, lastStudiedAt: '2026-10-01', listen: { correct: 0, wrong: 0 }, speak: { again: 0, hard: 0, good: 0 }, markedForReview: false, usedInStore: 0, ...p,
})
const graded = (list: { kind: string }[]) => list.filter((e) => e.kind !== 'intro') as GradedExercise[]
const pool = buildPool(items, 'all')
const kindsAt = (id: string, box: number) => {
  const st = emptyState()
  st.progress[id] = prog({ box })
  return new Set(Array.from({ length: 40 }, (_, s) => exerciseFor(id, st, pool, spread(s))?.kind))
}

describe('단어 조각', () => {
  it('모든 문장의 조각을 이어 붙이면 원래 문장(문장부호 제외)과 같음', () => {
    for (const [id, t] of Object.entries(tokens as Record<string, string[]>)) {
      const s = sentences.get(id)
      if (!s) continue
      expect(t.join('')).toBe(s.chinese.replace(/[^\p{Script=Han}A-Za-z]/gu, ''))
    }
  })
  it('조각 배열은 직원 문장만, 헷갈리는 조각 2개는 정답에 없음', () => {
    expect(canBuild('S01')).toBe(false)
    let count = 0
    for (let s = 0; s < 40; s++)
      for (const id of Object.keys(tokens)) {
        if (!canBuild(id)) continue
        const ex = exerciseFor(id, emptyState(), pool, spread(s), id, 2)
        if (ex?.kind !== 'build') continue
        count++
        expect(ex.tiles.length).toBe(ex.answer.length + 2)
        const extra = [...ex.tiles]
        for (const a of ex.answer) extra.splice(extra.indexOf(a), 1)
        for (const e of extra) expect(ex.answer).not.toContain(e)
      }
    expect(count).toBeGreaterThan(30)
  })
})

describe('글자 채우기', () => {
  it('모든 문장에서: 보기 3개, 정답 1개, 오답을 넣으면 다른 실제 문장이 되지 않음, 빈칸은 조사가 아님', () => {
    const all = new Set([...sentences.values()].map((s) => s.chinese.replace(/[^\p{Script=Han}A-Za-z]/gu, '')))
    let count = 0
    for (let s = 1; s <= 10; s++)
      for (const id of sentences.keys()) {
        const ex = exerciseFor(id, emptyState(), pool, () => 0.1, id, 0) // 0.1 → 글자 채우기 우선
        if (ex?.kind !== 'fill') continue
        count++
        const answer = ex.tokens[ex.blank]
        expect(ex.options).toHaveLength(3)
        expect(ex.options.filter((o) => o === answer)).toHaveLength(1)
        expect(['吗', '的', '了', '呢', '吧']).not.toContain(answer)
        for (const o of ex.options.filter((o) => o !== answer)) {
          const filled = ex.tokens.map((t, i) => (i === ex.blank ? o : t)).join('')
          expect(all.has(filled)).toBe(false)
        }
      }
    expect(count).toBeGreaterThan(100)
  })
})

describe('익숙한 정도에 따른 단계 (쉬운 것 → 어려운 것)', () => {
  it('고객 문장: 처음엔 글자 보이는 문제, 다음엔 듣고 맞추기, 익숙해지면 소리만 듣기', () => {
    expect([...kindsAt('S01', 0)].sort()).toEqual(['fill', 'read'])
    expect(kindsAt('S01', 1)).toEqual(new Set(['match']))
    expect(kindsAt('S01', 4)).toEqual(new Set(['listen']))
  })
  it('직원 문장: 처음엔 채우기·고르기, 다음엔 듣고 맞추기·조각, 익힌 뒤에만 말하기', () => {
    expect([...kindsAt('S02-A', 0)].sort()).toEqual(['fill', 'pick-zh'])
    expect([...kindsAt('S02-A', 1)].sort()).toEqual(['build', 'match'])
    expect(kindsAt('S02-A', 2).has('speak')).toBe(false)
    expect([...kindsAt('S02-A', 3)].sort()).toEqual(['build', 'speak'])
  })
  it('소개를 본 적 없는 문장은 상자 단계가 높아도 쉬운 문제부터', () => {
    const st = emptyState()
    st.progress['S02-A'] = prog({ box: 5, seen: 0 })
    for (let s = 0; s < 40; s++) expect(RANK[exerciseFor('S02-A', st, pool, spread(s))!.kind]).toBe(1)
  })
  it('글자가 보이는 쉬운 문제는 맞혀도 단계를 크게 올리지 않음', () => {
    expect(ratingFor('fill', true)).toBe('hard')
    expect(ratingFor('read', true)).toBe('hard')
    expect(ratingFor('pick-zh', true)).toBe('hard')
    expect(ratingFor('match', true)).toBe('good')
    expect(ratingFor('build', true)).toBe('good')
    expect(ratingFor('build', false)).toBe('again')
  })
})

describe('한 판 구성', () => {
  it('처음 사용: 새 표현 3개를 먼저 배우고, 문제 6개는 쉬운 것부터, 말하기·소리만 듣기는 없음', () => {
    for (let s = 1; s <= 20; s++) {
      const { exercises, newItems } = buildLesson(emptyState(), seeded(s))
      expect(newItems.map((it) => it.id)).toEqual(['G01', 'G02', 'G03'])
      expect(exercises.slice(0, 3).every((e) => e.kind === 'intro')).toBe(true)
      const g = graded(exercises)
      expect(g).toHaveLength(6)
      const ranks = g.map((e) => RANK[e.kind])
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
      expect(g.some((e) => e.kind === 'speak' || e.kind === 'listen')).toBe(false)
    }
  })
  it('복습할 문장이 있으면 함께 나오고, 문제는 6개, 쉬운 것 → 어려운 것 순서', () => {
    const st = emptyState()
    for (const id of ['S01', 'S02-A', 'P01-A']) st.progress[id] = prog({ box: 3, nextReviewAt: today(-1) })
    for (const id of ['G01-A', 'G02-A', 'G03-A', 'G04-A', 'S03', 'S04-A']) st.progress[id] = prog({ box: 2, nextReviewAt: today(5) })
    for (let s = 1; s <= 20; s++) {
      const { exercises, newItems } = buildLesson(st, seeded(s))
      const g = graded(exercises)
      expect(g).toHaveLength(6)
      expect(newItems).toHaveLength(1)
      expect(g.map((e) => e.id)).toEqual(expect.arrayContaining(['S01', 'S02-A', 'P01-A']))
      const ranks = g.map((e) => RANK[e.kind])
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
      expect(new Set(exercises.map((e) => e.key)).size).toBe(exercises.length)
    }
  })
  it('틀린 문제 다시 풀기는 같은 문장, 같은 유형', () => {
    const st = emptyState()
    for (const kindBox of [0, 1, 2]) {
      const ex = exerciseFor('S02-A', st, pool, seeded(2), 'S02-A', kindBox)!
      const again = retryOf(ex, st, seeded(5))!
      expect(again.id).toBe(ex.id)
      expect(again.kind).toBe(ex.kind)
      expect(again.key).not.toBe(ex.key)
    }
  })
})
