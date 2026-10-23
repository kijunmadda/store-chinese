// 영어 모드에서 문제 만들기 검사 — 초안(draft)도 보이게 해서 영어 문장 전체로 확인한다
import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  const store: Record<string, string> = { 'lang.v1': 'en', 'dev.drafts': '1' }
  ;(globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => (store[k] = v),
    removeItem: (k: string) => delete store[k],
  }
})

const { sentences, items } = await import('./content')
const { englishTokens, exerciseFor, canBuild, buildLesson } = await import('./lesson')
const { buildPool } = await import('./listen')
const { emptyState } = await import('./store')

const spread = (n: number, total = 40) => () => (n + 0.5) / total
const pool = buildPool(items, 'all')

describe('영어 모드', () => {
  it('영어 콘텐츠를 불러옴', () => {
    expect(items.length).toBeGreaterThan(80)
    expect(sentences.get('G01-A')?.chinese).toBe('Hello, welcome!')
  })

  it('단어 조각: 띄어쓰기로 나누고 앞뒤 문장부호만 뗀다', () => {
    expect(englishTokens("Sure, I'll wrap it for you.")).toEqual(['Sure', "I'll", 'wrap', 'it', 'for', 'you'])
    expect(englishTokens('This one is 3,500,000 won.')).toEqual(['This', 'one', 'is', '3,500,000', 'won'])
  })

  it('빈칸 채우기: 정답 하나 + 다른 오답 2개, 오답은 문장에 없는 낱말', () => {
    let count = 0
    for (let s = 0; s < 20; s++)
      for (const id of sentences.keys()) {
        const ex = exerciseFor(id, emptyState(), pool, spread(s, 20), id, 0)
        if (ex?.kind !== 'fill') continue
        count++
        const answer = ex.tokens[ex.blank]
        expect(ex.options).toContain(answer)
        expect(new Set(ex.options.map((o) => o.toLowerCase())).size).toBe(3)
        for (const o of ex.options) if (o !== answer) expect(ex.tokens.map((t) => t.toLowerCase())).not.toContain(o.toLowerCase())
      }
    expect(count).toBeGreaterThan(20)
  })

  it('조각 배열: 정답 조각이 모두 있고, 헷갈리는 조각은 정답과 겹치지 않음', () => {
    let count = 0
    for (let s = 0; s < 20; s++)
      for (const id of sentences.keys()) {
        if (!canBuild(id)) continue
        const ex = exerciseFor(id, emptyState(), pool, spread(s, 20), id, 2)
        if (ex?.kind !== 'build') continue
        count++
        const extra = [...ex.tiles]
        for (const t of ex.answer) extra.splice(extra.indexOf(t), 1)
        expect(extra).toHaveLength(2)
        for (const t of extra) expect(ex.answer.map((a) => a.toLowerCase())).not.toContain(t.toLowerCase())
      }
    expect(count).toBeGreaterThan(20)
  })

  it('처음 한 판이 만들어짐', () => {
    const plan = buildLesson(emptyState(), spread(3))
    expect(plan.newItems.length).toBe(3)
    expect(plan.exercises.filter((e) => e.kind !== 'intro').length).toBe(6)
  })
})
