import { describe, expect, it } from 'vitest'
import tokens from './generated/tokens.json'
import { sentences } from './content'
import { buildLesson, canBuild, exerciseFor, ratingFor, retryOf, type GradedExercise } from './lesson'
import { buildPool } from './listen'
import { items } from './content'
import { emptyState, today, type SentenceProgress } from './store'

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32
    return seed / 2 ** 32
  }
}
const prog = (p: Partial<SentenceProgress> = {}): SentenceProgress => ({
  seen: 1, box: 1, lastStudiedAt: '2026-10-01', listen: { correct: 0, wrong: 0 }, speak: { again: 0, hard: 0, good: 0 }, markedForReview: false, usedInStore: 0, ...p,
})
const graded = (list: { kind: string }[]) => list.filter((e) => e.kind !== 'intro') as GradedExercise[]

describe('단어 조각', () => {
  it('모든 직원 문장의 조각을 이어 붙이면 원래 문장(문장부호 제외)과 같음', () => {
    for (const [id, t] of Object.entries(tokens as Record<string, string[]>)) {
      const s = sentences.get(id)
      if (!s) continue
      expect(t.join('')).toBe(s.chinese.replace(/[^\p{Script=Han}A-Za-z]/gu, ''))
    }
  })
  it('조각 문제: 정답 조각 + 헷갈리는 조각 2개, 헷갈리는 조각은 정답에 없음', () => {
    const state = emptyState()
    const pool = buildPool(items, 'all')
    let count = 0
    for (let s = 1; s <= 40; s++)
      for (const [id] of Object.entries(tokens)) {
        if (!canBuild(id)) continue
        const ex = exerciseFor(id, state, pool, seeded(s))
        if (ex?.kind !== 'build') continue
        count++
        expect(ex.tiles.length).toBe(ex.answer.length + 2)
        const extra = [...ex.tiles]
        for (const a of ex.answer) extra.splice(extra.indexOf(a), 1)
        for (const e of extra) expect(ex.answer).not.toContain(e)
      }
    expect(count).toBeGreaterThan(50)
  })
})

describe('문제 유형 단계', () => {
  const pool = buildPool(items, 'all')
  it('고객 문장은 듣기 문제', () => {
    expect(exerciseFor('S01', emptyState(), pool, seeded(1))?.kind).toBe('listen')
  })
  it('직원 문장: 처음엔 고르기·조각, 잘 알면 직접 말하기', () => {
    const kinds = (box: number) => {
      const st = emptyState()
      st.progress['S02-A'] = prog({ box })
      return new Set(Array.from({ length: 40 }, (_, s) => exerciseFor("S02-A", st, pool, () => (s + 0.5) / 40)?.kind))
    }
    expect([...kinds(0)].sort()).toEqual(['build', 'pick-zh'])
    expect([...kinds(2)].sort()).toEqual(['build', 'pick-zh'])
    expect([...kinds(3)].sort()).toEqual(['build', 'speak'])
    expect(kinds(5).has('speak')).toBe(true)
    expect(kinds(5).has('pick-zh')).toBe(false)
  })
  it('소개를 본 적 없는 문장은 상자 단계가 높아도 말하기 금지', () => {
    const st = emptyState()
    st.progress['S02-A'] = prog({ box: 5, seen: 0 })
    for (let s = 0; s < 40; s++) expect(exerciseFor('S02-A', st, pool, () => (s + 0.5) / 40)?.kind).not.toBe('speak')
  })
  it('보기 고르기는 맞혀도 단계를 올리지 않음', () => {
    expect(ratingFor('pick-zh', true)).toBe('hard')
    expect(ratingFor('build', true)).toBe('good')
    expect(ratingFor('build', false)).toBe('again')
  })
  it('한국어 보고 중국어 고르기: 오답은 다른 카테고리', () => {
    for (let s = 1; s <= 20; s++) {
      const st = emptyState()
      const ex = exerciseFor('P01-A', st, pool, () => 0.9) // 0.9 → 조각 대신 고르기
      expect(ex?.kind).toBe('pick-zh')
      if (ex?.kind !== 'pick-zh') return
      expect(ex.options).toHaveLength(3)
      expect(ex.options.filter((o) => o.id === 'P01-A')).toHaveLength(1)
      for (const o of ex.options.filter((o) => o.id !== 'P01-A')) expect(sentences.get(o.id)!.itemId.startsWith('P')).toBe(false)
    }
  })
})

describe('한 판 구성', () => {
  it('처음 사용: 새 문장 소개로 시작, 각 소개 뒤에 그 문장 문제', () => {
    const { exercises, newItems } = buildLesson(emptyState(), seeded(3))
    expect(newItems.map((it) => it.id)).toEqual(['G01', 'G02', 'G03'])
    expect(graded(exercises)).toHaveLength(6)
    expect(exercises[0].kind).toBe('intro')
    exercises.forEach((e, i) => {
      if (e.kind !== 'intro') return
      const next = exercises[i + 1] as GradedExercise
      expect(sentences.get(next.id)!.itemId).toBe(e.item.id)
    })
  })
  it('복습할 문장이 있으면 맨 앞에 복습, 문제는 6개, 새 상황은 1개', () => {
    const st = emptyState()
    for (const id of ['S01', 'S02-A', 'P01-A', 'G05']) st.progress[id] = prog({ nextReviewAt: today(-1) })
    for (const id of ['G01-A', 'G02-A', 'G03-A', 'G04-A', 'S03', 'S04-A', 'P02-A', 'P03-A']) st.progress[id] = prog({ box: 2, nextReviewAt: today(5) })
    for (let s = 1; s <= 20; s++) {
      const { exercises, newItems } = buildLesson(st, seeded(s))
      expect(exercises[0].kind).not.toBe('intro')
      expect(['S01', 'S02-A', 'P01-A', 'G05']).toContain((exercises[0] as GradedExercise).id)
      expect(graded(exercises)).toHaveLength(6)
      expect(newItems).toHaveLength(1)
      expect(new Set(exercises.map((e) => e.key)).size).toBe(exercises.length)
    }
  })
  it('틀린 문제 다시 풀기는 같은 문장, 같은 유형', () => {
    const st = emptyState()
    const ex = exerciseFor('S02-A', st, buildPool(items, 'all'), seeded(2))!
    const again = retryOf(ex, st, seeded(5))!
    expect(again.id).toBe(ex.id)
    expect(again.kind).toBe(ex.kind)
    expect(again.key).not.toBe(ex.key)
  })
})
