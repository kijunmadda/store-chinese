// 학습 기록 저장소.
// - 이 기기 브라우저의 IndexedDB에 저장한다 (서버 없음).
// - 기록 전체를 하나의 묶음으로 메모리에 두고, 바뀔 때마다 통째로 저장한다 (문장 수백 개 규모라 충분히 가볍다).
// - IndexedDB를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 메모리에만 두고 경고를 띄운다.
import { useSyncExternalStore } from 'react'

export type Rating = 'again' | 'hard' | 'good'

export interface SentenceProgress {
  /** 본 횟수 (학습·듣기·말하기 합계) */
  seen: number
  lastStudiedAt?: string
  /** 간격 반복 상자 1~5 (0 = 아직 평가 없음) */
  box: number
  /** 다음 복습 날짜 (YYYY-MM-DD) */
  nextReviewAt?: string
  lastRating?: Rating
  /** 마지막으로 단계가 오른 날 — 단계는 하루에 한 번만 오른다 */
  promotedAt?: string
  listen: { correct: number; wrong: number }
  speak: { again: number; hard: number; good: number }
  /** 사용자가 직접 '복습에 추가'를 누른 문장 */
  markedForReview: boolean
  usedInStore: number
}

export interface DayLog {
  steps: string[]
  completed: boolean
  /** 이날 끝낸 학습 판 수 */
  lessons?: number
}

export interface StudyState {
  app: 'dept-store-chinese'
  schemaVersion: 1
  progress: Record<string, SentenceProgress>
  days: Record<string, DayLog>
  /** 듣기 문제에서 최근 낸 문장 (같은 문제 반복 방지) */
  recentListen: string[]
  lastBackupAt: string | null
}

/** 간격 반복: 상자 번호별 다음 복습까지 날짜 수 (근거: 설계서 4장) */
export const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30]

export const emptyState = (): StudyState => ({
  app: 'dept-store-chinese',
  schemaVersion: 1,
  progress: {},
  days: {},
  recentListen: [],
  lastBackupAt: null,
})

const blankProgress = (): SentenceProgress => ({
  seen: 0,
  box: 0,
  listen: { correct: 0, wrong: 0 },
  speak: { again: 0, hard: 0, good: 0 },
  markedForReview: false,
  usedInStore: 0,
})

/** 기기 시간대 기준 날짜 (한국 시간) */
export function today(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── IndexedDB ────────────────────────────────
const DB_NAME = 'store-chinese'
const STORE = 'kv'
const KEY = 'state'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB 미지원'))
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('IndexedDB 차단됨'))
  })
}

let db: IDBDatabase | null = null
let state: StudyState = emptyState()
let status: 'loading' | 'ready' | 'memory-only' = 'loading'
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export async function initStore() {
  try {
    db = await openDb()
    const saved = await new Promise<unknown>((resolve, reject) => {
      const req = db!.transaction(STORE).objectStore(STORE).get(KEY)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    if (saved && typeof saved === 'object') state = { ...emptyState(), ...(saved as StudyState) }
    status = 'ready'
    // 브라우저가 저장 공간 정리 시 이 사이트 데이터를 지우지 않도록 요청 (허용 여부는 브라우저가 결정)
    navigator.storage?.persist?.().catch(() => {})
  } catch (e) {
    console.error('학습 기록 저장소를 열 수 없습니다', e)
    status = 'memory-only'
  }
  emit()
}

let saveTimer: ReturnType<typeof setTimeout> | undefined
function persist() {
  if (!db) return
  clearTimeout(saveTimer)
  // 연속 기록을 한 번에 묶어 저장
  saveTimer = setTimeout(() => {
    try {
      const tx = db!.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(state, KEY)
      tx.onerror = () => {
        console.error('학습 기록 저장 실패', tx.error)
        status = 'memory-only'
        emit()
      }
    } catch (e) {
      console.error('학습 기록 저장 실패', e)
      status = 'memory-only'
      emit()
    }
  }, 300)
}

function update(mutator: (draft: StudyState) => void) {
  const next: StudyState = structuredClone(state)
  mutator(next)
  state = next
  emit()
  persist()
}

function touch(draft: StudyState, id: string): SentenceProgress {
  const p = (draft.progress[id] ??= blankProgress())
  p.seen += 1
  p.lastStudiedAt = today()
  return p
}

/**
 * 간격 반복 일정
 * - 몰랐음: 상자 1, 오늘 바로 다시 복습 대상
 * - 헷갈림: 상자 유지(최소 1), 1일 뒤
 * - 바로 떠오름: 상자 한 단계 올림(처음이어도 최소 2 → 3일 뒤), 상자별 간격만큼 뒤
 */
export function schedule(p: SentenceProgress, rating: Rating, on = today()) {
  const base = new Date(`${on}T00:00:00`)
  const after = (days: number) => {
    const d = new Date(base)
    d.setDate(d.getDate() + days)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  if (rating === 'again') {
    p.box = 1
    p.nextReviewAt = on
  } else if (rating === 'hard') {
    p.box = Math.max(1, p.box)
    p.nextReviewAt = after(1)
  } else {
    // 같은 날 여러 번 맞혀도 단계는 한 번만 오른다 (다른 날 다시 떠올려야 기억이 단단해짐)
    if (p.promotedAt !== on) {
      p.box = Math.min(5, Math.max(2, p.box + 1))
      p.promotedAt = on
    }
    p.nextReviewAt = after(INTERVAL_DAYS[p.box])
  }
  p.lastRating = rating
}

function logStep(draft: StudyState, step: string) {
  const d = (draft.days[today()] ??= { steps: [], completed: false })
  if (!d.steps.includes(step)) d.steps.push(step)
}

// ── 기록 함수 ─────────────────────────────
export const record = {
  /** 문장 학습 화면에서 문장을 봄 */
  studied(id: string) {
    update((s) => {
      touch(s, id)
      logStep(s, 'study')
    })
  },
  /** 듣기 문제 결과 — 틀리면 자동으로 복습 대상 */
  /** rating: 쉬운 문제(글자 보며 고르기 등)는 'hard'로 넘겨 단계를 크게 올리지 않는다 */
  listened(id: string, correct: boolean, rating: Rating = correct ? 'good' : 'again') {
    update((s) => {
      const p = touch(s, id)
      if (correct) p.listen.correct += 1
      else p.listen.wrong += 1
      schedule(p, rating)
      s.recentListen = [id, ...s.recentListen.filter((x) => x !== id)].slice(0, 12)
      logStep(s, 'listen')
    })
  },
  /** 말하기 자기 평가: 몰랐음 / 헷갈림 / 바로 떠오름 */
  spoke(id: string, rating: Rating) {
    update((s) => {
      const p = touch(s, id)
      p.speak[rating] += 1
      schedule(p, rating)
      logStep(s, 'speak')
    })
  },
  /** '복습에 추가' 켜기/끄기 — 한 상황의 문장들을 함께 지정 */
  setReview(ids: string[], on: boolean) {
    update((s) => {
      for (const id of ids) (s.progress[id] ??= blankProgress()).markedForReview = on
    })
  },
  /** 복습을 마치면 '직접 추가' 표시를 내린다 (이후에는 간격 반복 일정이 관리) */
  clearReviewMark(id: string) {
    update((s) => {
      const p = s.progress[id]
      if (p) p.markedForReview = false
    })
  },
  /** 매장에서 실제로 써 본 문장 — 실전 사용은 기억을 강화하므로 다음 복습을 한 단계 미룬다 */
  usedInStore(id: string) {
    update((s) => {
      const p = touch(s, id)
      p.usedInStore += 1
      if (p.box > 0) schedule(p, 'good')
    })
  },
  step(step: string) {
    update((s) => logStep(s, step))
  },
  /** 한 판(레슨)을 끝까지 마침. 하루 목표 판 수를 채우면 그날은 완료 */
  lessonDone(goal: number) {
    update((s) => {
      logStep(s, 'lesson')
      const d = s.days[today()]
      d.lessons = (d.lessons ?? 0) + 1
      if (d.lessons >= goal) d.completed = true
    })
  },
  /** 오늘의 학습을 끝까지 마침 */
  completeDay() {
    update((s) => {
      logStep(s, 'today')
      s.days[today()].completed = true
    })
  },
  /** 백업 파일로 통째로 교체. 바로 전 상태는 되돌리기용으로 보관한다. */
  restore(next: StudyState) {
    undoSnapshot = structuredClone(state)
    update((s) => {
      const { app, schemaVersion, progress, days, recentListen, lastBackupAt } = next
      Object.assign(s, emptyState(), { app, schemaVersion, progress, days, recentListen, lastBackupAt })
    })
  },
  /** 직전 복원 되돌리기 (이번에 앱을 연 동안만 가능) */
  undoRestore(): boolean {
    if (!undoSnapshot) return false
    const prev = undoSnapshot
    undoSnapshot = null
    update((s) => Object.assign(s, prev))
    return true
  },
  backedUp() {
    update((s) => {
      s.lastBackupAt = new Date().toISOString()
    })
  },
  resetAll() {
    undoSnapshot = structuredClone(state)
    update((s) => Object.assign(s, emptyState()))
  },
}

let undoSnapshot: StudyState | null = null
export const canUndo = () => undoSnapshot !== null

// ── 조회 ──────────────────────────────────
export function getState() {
  return state
}

export function useStudyState(): StudyState {
  return useSyncExternalStore(subscribe, () => state)
}

export function useStoreStatus() {
  return useSyncExternalStore(subscribe, () => status)
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** 복습이 필요한 문장인가: 틀렸거나 / 헷갈렸거나 / 직접 추가했거나 / 복습 날짜가 지남 */
export function isDue(p: SentenceProgress | undefined, on = today()): boolean {
  if (!p) return false
  if (p.markedForReview) return true
  return !!p.nextReviewAt && p.nextReviewAt <= on
}
