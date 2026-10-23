// 한 판(레슨) 구성 — 듀오링고식으로 여러 유형을 섞어 짧게.
// 학습과학: 복습 먼저(간격 반복) · 새 문장은 소개 직후 바로 한 번 떠올리기(인출) · 유형 섞기(interleaving)
// · 익숙해질수록 어려운 유형(점진적 난이도: 고르기 → 조각 배열 → 직접 말하기) · 틀린 문제는 판 끝에 다시.
import tokensJson from './generated/tokens.json'
import { categories, items, sentences } from './content'
import type { ContentItem, StaffLine } from './content/types'
import { buildPool, buildQuestion, type ListenEntry, type Question } from './listen'
import { isDue, today, type StudyState } from './store'
import { shuffle } from './util'

const TOKENS = tokensJson as Record<string, string[]>

export const LESSON_SIZE = 6

export type Exercise =
  | { kind: 'intro'; key: string; item: ContentItem }
  | { kind: 'listen'; key: string; id: string; question: Question }
  | { kind: 'pick-zh'; key: string; id: string; line: StaffLine; item: ContentItem; options: StaffLine[] }
  | { kind: 'build'; key: string; id: string; line: StaffLine; item: ContentItem; tiles: string[]; answer: string[] }
  | { kind: 'speak'; key: string; id: string; line: StaffLine; item: ContentItem }

export type GradedExercise = Exclude<Exercise, { kind: 'intro' }>

const itemOf = (id: string) => items.find((it) => it.id === sentences.get(id)?.itemId)

const staffLines = () =>
  items.filter((it) => it.learningModes.includes('speak')).flatMap((it) => (it.responses ?? []).map((line) => ({ line, item: it })))

/** 단어 조각 문제가 가능한 문장: 조각 3~9개 */
export const canBuild = (id: string) => {
  const t = TOKENS[id]
  return !!t && t.length >= 3 && t.length <= 9
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

function speak(id: string, key: string): GradedExercise | null {
  const s = sentences.get(id)
  const item = itemOf(id)
  if (!s || s.kind !== 'staff' || !item) return null
  return { kind: 'speak', key, id, line: s, item }
}

function listen(id: string, pool: ListenEntry[], state: StudyState, rand: () => number, key: string): GradedExercise | null {
  const entry = pool.find((e) => e.id === id)
  if (!entry) return null
  return { kind: 'listen', key, id, question: buildQuestion(entry, pool, items, state, rand) }
}

/** 문장 하나의 익숙한 정도에 맞는 문제 만들기 */
export function exerciseFor(id: string, state: StudyState, pool: ListenEntry[], rand: () => number, key = id): GradedExercise | null {
  const s = sentences.get(id)
  if (!s) return null
  if (s.kind === 'customer') return listen(id, pool, state, rand, key)
  const p = state.progress[id]
  // 소개를 본 적 없는 문장은 가장 쉬운 단계부터
  const box = p && p.seen > 0 ? p.box : 0
  // 직접 말하기는 '이미 익힌 문장'에만: 조각 배열을 서로 다른 날 두 번 이상 맞혀 상자 3 이상이 된 문장
  if (box <= 2) return (rand() < 0.5 ? build(id, rand, key) : null) ?? pickZh(id, rand, key)
  if (box === 3) return (rand() < 0.6 ? build(id, rand, key) : null) ?? speak(id, key)
  return (rand() < 0.7 ? speak(id, key) : null) ?? build(id, rand, key) ?? speak(id, key)
}

/**
 * 문제 결과 → 복습 평가. 보기 고르기는 쉬운 문제라 맞혀도 단계를 올리지 않는다(헷갈림 취급).
 * 조각 배열을 맞혀야 단계가 오르고, 그래야 나중에 직접 말하기가 나온다.
 */
export function ratingFor(kind: GradedExercise['kind'], correct: boolean): 'again' | 'hard' | 'good' {
  if (!correct) return 'again'
  return kind === 'pick-zh' ? 'hard' : 'good'
}

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

  // 1) 복습할 때가 된 문장 — 최대 3개
  const due = shuffle(Object.keys(state.progress).filter((id) => sentences.has(id) && isDue(state.progress[id], todayKey)), rand)
  const reviewIds = due.slice(0, 3)

  // 2) 새 상황 — 복습이 많으면 1개, 아니면 2개
  const newItems = freshItems(state).slice(0, reviewIds.length >= 3 ? 1 : 2)
  const newIds = newItems.flatMap(idsOf)

  // 3) 나머지는 이미 배운 문장에서 무작위 (오래 안 본 것 우선)
  const used = new Set([...reviewIds, ...newIds])
  const practiced = Object.keys(state.progress)
    .filter((id) => sentences.has(id) && seen(state, id) && !used.has(id))
    .sort((a, b) => (state.progress[a].lastStudiedAt ?? '').localeCompare(state.progress[b].lastStudiedAt ?? ''))
  const practiceIds = shuffle(practiced.slice(0, 12), rand)

  // 새 문장: 소개 카드 → (다른 문제 하나 사이에 두고) 바로 그 문장 문제
  const newExercises: Exercise[] = []
  for (const it of newItems) {
    newExercises.push({ kind: 'intro', key: `intro-${it.id}`, item: it })
    const target = it.customer ? it.id : it.responses?.[0]?.id
    const ex = target ? exerciseFor(target, { ...state, progress: { ...state.progress, [target]: { ...(state.progress[target] ?? { seen: 1, box: 0, listen: { correct: 0, wrong: 0 }, speak: { again: 0, hard: 0, good: 0 }, markedForReview: false, usedInStore: 0 }), box: 0 } } }, pool, rand) : null
    if (ex) newExercises.push(ex)
  }

  const graded: Exercise[] = []
  for (const id of [...reviewIds, ...practiceIds]) {
    if (graded.length + newExercises.filter((e) => e.kind !== 'intro').length >= size) break
    const ex = exerciseFor(id, state, pool, rand)
    if (ex) graded.push(ex)
  }

  // 순서: 복습 1개로 시작 → 새 문장 소개와 문제 → 나머지 섞어서
  const [first, ...rest] = graded
  const exercises: Exercise[] = [...(first ? [first] : []), ...newExercises, ...shuffle(rest, rand)]

  // 아주 처음이라 배운 문장이 없으면 새 문장으로만 채운다
  if (exercises.filter((e) => e.kind !== 'intro').length < size && newItems.length < 3) {
    const more = freshItems(state).filter((it) => !newItems.includes(it)).slice(0, 3 - newItems.length)
    for (const it of more) {
      exercises.push({ kind: 'intro', key: `intro-${it.id}`, item: it })
      const target = it.customer ? it.id : it.responses?.[0]?.id
      const ex = target ? exerciseFor(target, state, pool, rand) : null
      if (ex) exercises.push(ex)
      newItems.push(it)
    }
  }

  // 그래도 6문제가 안 되면(처음 며칠) 오늘 배운 새 문장을 판 뒤쪽에서 한 번 더 — 시간 간격을 둔 재인출
  const gradedCount = () => exercises.filter((e) => e.kind !== 'intro').length
  const again = newItems.flatMap(idsOf)
  for (let round = 0; round < 2 && gradedCount() < size; round++)
    for (const id of shuffle(again, rand)) {
      if (gradedCount() >= size) break
      const ex = exerciseFor(id, state, pool, rand, `${id}-again${round}`)
      if (ex) exercises.push(ex)
    }

  return { exercises: dedupeKeys(exercises), newItems }
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
  const key = `${ex.key}-retry`
  if (ex.kind === 'listen') return listen(ex.id, buildPool(items, 'all'), state, rand, key)
  if (ex.kind === 'pick-zh') return pickZh(ex.id, rand, key)
  if (ex.kind === 'build') return build(ex.id, rand, key)
  return speak(ex.id, key)
}
