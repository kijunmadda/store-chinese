// 한 판(레슨) 구성 — "먼저 배우고 → 쉬운 문제부터 → 점점 어렵게" (2026-10-23 사용자 피드백 반영)
//
// 1) 학습: 오늘 배울 새 표현 카드를 먼저 모두 본다
// 2) 연습: 쉬운 유형 → 어려운 유형 순서로
//    ① 글자 채우기 · 한국어 보고 중국어 고르기 · 글자 보며 뜻 고르기  (글자가 보이는 쉬운 문제)
//    ② 듣고 맞추기 (들은 문장을 중국어 보기에서 고르기)
//    ③ 조각 배열
//    ④ 소리만 듣고 뜻·대답 고르기 (충분히 익힌 고객 문장만)
//    ⑤ 직접 말하기 (충분히 익힌 직원 문장만)
// 학습과학: 간격 반복(복습 포함) · 인출 연습 · 점진적 난이도(쉬운 인식 → 어려운 회상) · 틀린 문제는 판 끝에 다시
import tokensJson from './generated/tokens.json'
import { categories, items, sentences, type Sentence } from './content'
import type { ContentItem, StaffLine } from './content/types'
import { buildPool, buildQuestion, type ListenEntry, type Question } from './listen'
import { emptyState, isDue, today, type StudyState } from './store'
import { shuffle } from './util'

const TOKENS = tokensJson as Record<string, string[]>

export const LESSON_SIZE = 6

export type Exercise =
  | { kind: 'intro'; key: string; item: ContentItem }
  | { kind: 'fill'; key: string; id: string; sentence: Sentence; item: ContentItem; tokens: string[]; blank: number; options: string[] }
  | { kind: 'pick-zh'; key: string; id: string; line: StaffLine; item: ContentItem; options: StaffLine[] }
  | { kind: 'read'; key: string; id: string; question: Question }
  | { kind: 'match'; key: string; id: string; sentence: Sentence; item: ContentItem; options: Sentence[] }
  | { kind: 'build'; key: string; id: string; line: StaffLine; item: ContentItem; tiles: string[]; answer: string[] }
  | { kind: 'listen'; key: string; id: string; question: Question }
  | { kind: 'speak'; key: string; id: string; line: StaffLine; item: ContentItem }

export type GradedExercise = Exclude<Exercise, { kind: 'intro' }>
export type Kind = GradedExercise['kind']

/** 유형별 난이도 순위 — 판 안에서 이 순서로 낸다 */
export const RANK: Record<Kind, number> = { fill: 1, 'pick-zh': 1, read: 1, match: 2, build: 3, listen: 4, speak: 5 }

const itemOf = (id: string) => items.find((it) => it.id === sentences.get(id)?.itemId)
const norm = (s: string) => s.replace(/[^\p{Script=Han}A-Za-z]/gu, '')
const ALL_SENTENCES = new Set([...sentences.values()].map((s) => norm(s.chinese)))
const PARTICLES = new Set(['吗', '的', '了', '呢', '吧', '啊', '呀'])

const staffLines = () =>
  items.filter((it) => it.learningModes.includes('speak')).flatMap((it) => (it.responses ?? []).map((line) => ({ line, item: it })))

/** 단어 조각 문제가 가능한 문장: 직원 문장, 조각 3~9개 */
export const canBuild = (id: string) => {
  const t = TOKENS[id]
  return sentences.get(id)?.kind === 'staff' && !!t && t.length >= 3 && t.length <= 9
}

// ── 문제 만들기 ─────────────────────────────

/** 글자 채우기: 핵심 단어 하나를 빈칸으로. 오답 보기를 넣어도 다른 실제 문장이 되지 않게 한다(정답이 둘이 되는 것 방지) */
function fill(id: string, rand: () => number, key: string): GradedExercise | null {
  const s = sentences.get(id)
  const item = itemOf(id)
  const tokens = TOKENS[id]
  if (!s || !item || !tokens || tokens.length < 2) return null
  const keywords = new Set((item.keywords ?? []).map((k) => k.word))
  const candidates = tokens
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => /\p{Script=Han}/u.test(t) && !PARTICLES.has(t))
  if (candidates.length === 0) return null
  const preferred = candidates.filter(({ t }) => keywords.has(t))
  const pickFrom = preferred.length ? preferred : [...candidates].sort((a, b) => b.t.length - a.t.length).slice(0, 3)
  const { t: answer, i: blank } = pickFrom[Math.floor(rand() * pickFrom.length)]

  const makesOtherSentence = (w: string) => {
    const filled = tokens.map((t, i) => (i === blank ? w : t)).join('')
    return ALL_SENTENCES.has(filled)
  }
  // 오답 보기는 '다른 상황의 핵심 단어'(颜色·库存·护照 같은 내용어)에서 고른다.
  // 아무 단어나 쓰면 帮↔给처럼 문법적으로 말이 되는 오답이 섞여 정답이 둘처럼 보일 수 있어서.
  const otherKeywords = items.filter((it) => it.id !== item.id).flatMap((it) => (it.keywords ?? []).map((k) => k.word))
  const pool = shuffle(otherKeywords, rand).filter(
    (w, i, a) => a.indexOf(w) === i && w !== answer && !tokens.includes(w) && !keywords.has(w) && /^\p{Script=Han}+$/u.test(w) && !PARTICLES.has(w) && !makesOtherSentence(w),
  )
  const sameLen = pool.filter((w) => [...w].length === [...answer].length)
  const distractors = [...sameLen, ...pool.filter((w) => !sameLen.includes(w))].slice(0, 2)
  if (distractors.length < 2) return null
  return { kind: 'fill', key, id, sentence: s, item, tokens, blank, options: shuffle([answer, ...distractors], rand) }
}

/** 한국어를 보고 알맞은 중국어 고르기 — 오답은 다른 카테고리 문장 (같은 카테고리는 둘 다 맞을 수 있어서) */
function pickZh(id: string, rand: () => number, key: string): GradedExercise | null {
  const s = sentences.get(id)
  const item = itemOf(id)
  if (!s || s.kind !== 'staff' || !item) return null
  const others = shuffle(staffLines().filter((x) => x.item.category !== item.category), rand)
    .map((x) => x.line)
    .filter((l, i, a) => a.findIndex((y) => y.chinese === l.chinese) === i)
    .slice(0, 2)
  return { kind: 'pick-zh', key, id, line: s, item, options: shuffle([s, ...others], rand) }
}

/** 글자를 보며 뜻 고르기 (고객 문장 첫 단계) — 소리도 들을 수 있지만 글자가 처음부터 보인다 */
function read(id: string, pool: ListenEntry[], rand: () => number, key: string): GradedExercise | null {
  const entry = pool.find((e) => e.id === id)
  if (!entry) return null
  // 처음 단계이므로 항상 '뜻 고르기'로 (빈 기록을 넘겨 대답 고르기가 나오지 않게)
  return { kind: 'read', key, id, question: buildQuestion(entry, pool, items, emptyState(), rand) }
}

/** 듣고 맞추기: 들은 문장을 중국어 보기 3개에서 고르기 (같은 종류·다른 상황의 문장, 같은 카테고리 우선) */
function match(id: string, rand: () => number, key: string): GradedExercise | null {
  const s = sentences.get(id)
  const item = itemOf(id)
  if (!s || !item) return null
  const others = [...sentences.values()].filter((o) => o.kind === s.kind && o.itemId !== s.itemId && o.chinese !== s.chinese)
  const sameCat = shuffle(others.filter((o) => itemOf(o.id)?.category === item.category), rand)
  const rest = shuffle(others.filter((o) => itemOf(o.id)?.category !== item.category), rand)
  const picked: Sentence[] = []
  for (const o of [...sameCat, ...rest]) {
    if (picked.length >= 2) break
    if (picked.some((p) => p.itemId === o.itemId)) continue
    picked.push(o)
  }
  if (picked.length < 2) return null
  return { kind: 'match', key, id, sentence: s, item, options: shuffle([s, ...picked], rand) }
}

function build(id: string, rand: () => number, key: string): GradedExercise | null {
  const s = sentences.get(id)
  const item = itemOf(id)
  if (!s || s.kind !== 'staff' || !item || !canBuild(id)) return null
  const answer = TOKENS[id]
  // 헷갈리게 할 조각 2개: 다른 문장에서, 정답에 없는 것
  const extra = shuffle(Object.entries(TOKENS).filter(([k]) => k !== id).flatMap(([, t]) => t), rand)
    .filter((t, i, a) => !answer.includes(t) && a.indexOf(t) === i && /\p{Script=Han}/u.test(t))
    .slice(0, 2)
  return { kind: 'build', key, id, line: s, item, answer, tiles: shuffle([...answer, ...extra], rand) }
}

function listen(id: string, pool: ListenEntry[], state: StudyState, rand: () => number, key: string): GradedExercise | null {
  const entry = pool.find((e) => e.id === id)
  if (!entry) return null
  return { kind: 'listen', key, id, question: buildQuestion(entry, pool, items, state, rand) }
}

function speak(id: string, key: string): GradedExercise | null {
  const s = sentences.get(id)
  const item = itemOf(id)
  if (!s || s.kind !== 'staff' || !item) return null
  return { kind: 'speak', key, id, line: s, item }
}

/** 지정한 유형으로 문제 만들기 (다시 풀기에 사용) */
function make(kind: Kind, id: string, state: StudyState, pool: ListenEntry[], rand: () => number, key: string): GradedExercise | null {
  switch (kind) {
    case 'fill': return fill(id, rand, key)
    case 'pick-zh': return pickZh(id, rand, key)
    case 'read': return read(id, pool, rand, key)
    case 'match': return match(id, rand, key)
    case 'build': return build(id, rand, key)
    case 'listen': return listen(id, pool, state, rand, key)
    case 'speak': return speak(id, key)
  }
}

/** 첫 번째로 만들어지는 유형을 쓴다 (예: 조각이 너무 많으면 조각 배열 대신 다음 후보) */
function firstOf(kinds: Kind[], id: string, state: StudyState, pool: ListenEntry[], rand: () => number, key: string) {
  for (const k of kinds) {
    const ex = make(k, id, state, pool, rand, key)
    if (ex) return ex
  }
  return null
}

/**
 * 문장 하나의 익숙한 정도(상자 단계)에 맞는 문제
 * - 고객 문장: 0 글자 보며 뜻 고르기·글자 채우기 → 1~2 듣고 맞추기 → 3+ 소리만 듣고 고르기
 * - 직원 문장: 0 글자 채우기·중국어 고르기 → 1~2 듣고 맞추기·조각 배열 → 3 조각 배열·말하기 → 4+ 말하기
 * 직접 말하기는 '이미 익힌 문장'(상자 3 이상)에만 나온다.
 */
export function exerciseFor(id: string, state: StudyState, pool: ListenEntry[], rand: () => number, key = id, boxOverride?: number): GradedExercise | null {
  const s = sentences.get(id)
  if (!s) return null
  const p = state.progress[id]
  const box = boxOverride ?? (p && p.seen > 0 ? p.box : 0)
  const coin = rand() < 0.5
  if (s.kind === 'customer') {
    if (box === 0) return firstOf(coin ? ['read', 'fill'] : ['fill', 'read'], id, state, pool, rand, key)
    if (box <= 2) return firstOf(['match', 'read'], id, state, pool, rand, key)
    return firstOf(['listen', 'match'], id, state, pool, rand, key)
  }
  if (box === 0) return firstOf(coin ? ['fill', 'pick-zh'] : ['pick-zh', 'fill'], id, state, pool, rand, key)
  if (box <= 2) return firstOf(coin ? ['match', 'build', 'fill'] : ['build', 'match', 'fill'], id, state, pool, rand, key)
  if (box === 3) return firstOf(rand() < 0.6 ? ['build', 'speak'] : ['speak', 'build'], id, state, pool, rand, key)
  return firstOf(rand() < 0.7 ? ['speak', 'build'] : ['build', 'speak'], id, state, pool, rand, key)
}

/**
 * 문제 결과 → 복습 평가. 글자가 보이는 쉬운 문제(①)는 맞혀도 단계를 크게 올리지 않는다(헷갈림 취급 → 상자 1).
 * 듣고 맞추기·조각 배열·소리만 듣기를 맞혀야 단계가 오른다. 단계는 하루에 한 번만 오른다(store.schedule).
 */
export function ratingFor(kind: Kind, correct: boolean): 'again' | 'hard' | 'good' {
  if (!correct) return 'again'
  return RANK[kind] === 1 ? 'hard' : 'good'
}

// ── 한 판 구성 ─────────────────────────────

const idsOf = (it: ContentItem) => [...(it.customer ? [it.id] : []), ...(it.responses ?? []).map((r) => r.id)]
const seen = (state: StudyState, id: string) => (state.progress[id]?.seen ?? 0) > 0

/** 아직 안 배운 상황 (카테고리 순서 → 같은 카테고리 안에서는 순서대로) */
function freshItems(state: StudyState): ContentItem[] {
  const order = (it: ContentItem) => categories.find((c) => c.id === it.category)?.order ?? 99
  return items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => it.learningModes.includes('study') && !idsOf(it).some((id) => seen(state, id)))
    .sort((a, b) => order(a.it) - order(b.it) || a.i - b.i)
    .map(({ it }) => it)
}

export interface LessonPlan {
  exercises: Exercise[]
  newItems: ContentItem[]
}

export function buildLesson(state: StudyState, rand = Math.random, size = LESSON_SIZE): LessonPlan {
  const pool = buildPool(items, 'all')
  const todayKey = today()

  // 복습할 때가 된 문장 — 최대 3개
  const due = shuffle(Object.keys(state.progress).filter((id) => sentences.has(id) && seen(state, id) && isDue(state.progress[id], todayKey)), rand)
  const reviewIds = due.slice(0, 3)

  // 새 상황 — 배운 게 거의 없으면 3개, 복습이 많으면 1개, 아니면 2개
  const learnedCount = Object.keys(state.progress).filter((id) => seen(state, id)).length
  const newCount = learnedCount === 0 ? 3 : reviewIds.length >= 3 ? 1 : 2
  const newItems = freshItems(state).slice(0, newCount)
  const newIds = newItems.flatMap(idsOf)

  // 이미 배운 문장 (오래 안 본 것 우선)
  const used = new Set([...reviewIds, ...newIds])
  const practiceIds = shuffle(
    Object.keys(state.progress)
      .filter((id) => sentences.has(id) && seen(state, id) && !used.has(id))
      .sort((a, b) => (state.progress[a].lastStudiedAt ?? '').localeCompare(state.progress[b].lastStudiedAt ?? ''))
      .slice(0, 12),
    rand,
  )

  // 문제 후보를 우선순위대로 모은다:
  // 새 문장 첫 단계(쉬움) → 복습 → 새 문장 한 단계 위(같은 판 안에서 점점 어렵게) → 이미 배운 문장
  const candidates: (() => GradedExercise | null)[] = [
    ...newIds.map((id) => () => exerciseFor(id, state, pool, rand, `${id}-1`, 0)),
    ...reviewIds.map((id) => () => exerciseFor(id, state, pool, rand)),
    ...shuffle(newIds, rand).map((id) => () => exerciseFor(id, state, pool, rand, `${id}-2`, 1)),
    ...practiceIds.map((id) => () => exerciseFor(id, state, pool, rand)),
  ]
  const graded: GradedExercise[] = []
  for (const c of candidates) {
    if (graded.length >= size) break
    const ex = c()
    if (ex) graded.push(ex)
  }

  // 1) 학습: 새 표현 카드 먼저 / 2) 연습: 쉬운 유형 → 어려운 유형 (같은 난이도 안에서는 섞음)
  const intros: Exercise[] = newItems.map((it) => ({ kind: 'intro', key: `intro-${it.id}`, item: it }))
  const ordered = shuffle(graded, rand).sort((a, b) => RANK[a.kind] - RANK[b.kind])
  return { exercises: dedupeKeys([...intros, ...ordered]), newItems }
}

function dedupeKeys(list: Exercise[]): Exercise[] {
  const seenKeys = new Map<string, number>()
  return list.map((e) => {
    const n = seenKeys.get(e.key) ?? 0
    seenKeys.set(e.key, n + 1)
    return n === 0 ? e : { ...e, key: `${e.key}#${n}` }
  })
}

/** 틀린 문제를 판 끝에 한 번 더 — 같은 문장, 같은 유형으로 새로 만든다 */
export function retryOf(ex: GradedExercise, state: StudyState, rand = Math.random): GradedExercise | null {
  return make(ex.kind, ex.id, state, buildPool(items, 'all'), rand, `${ex.key}-retry`)
}
