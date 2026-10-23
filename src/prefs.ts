// 화면·음성 관련 사용자 설정. 이 기기 브라우저에 저장한다(학습 기록이 아닌 편의 설정).
// 8단계에서 학습 기록과 함께 백업 대상에 포함한다.
import { useSyncExternalStore } from 'react'
import { LANG_ID } from './langs'

export interface Prefs {
  showPinyin: boolean
  /** 기기 음성 재생 속도 (1 = 기본) */
  rate: number
  /** 사용자가 고른 기기 음성. 빈 값이면 자동 선택 */
  voiceURI: string
  /** 오늘의 학습에서 새로 배울 상황 수 */
  dailyNew: number
  /** 하루 목표 판 수 */
  dailyGoal: number
}

const KEY = 'prefs.v1'
const DEFAULTS: Prefs = { showPinyin: true, rate: 0.85, voiceURI: '', dailyNew: 3, dailyGoal: 2 }

/** 저장되는 설정 — 영어 목소리는 따로 기억한다 */
export interface Stored extends Prefs {
  voiceURIEn?: string
}

function load(): Stored {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
    // 3단계에서 따로 저장하던 병음 설정을 옮겨 온다
    const oldPinyin = localStorage.getItem('pref.showPinyin')
    if (oldPinyin !== null) return { ...DEFAULTS, showPinyin: oldPinyin === '1' }
  } catch {
    /* 저장소를 쓸 수 없는 환경 — 기본값 사용 */
  }
  return DEFAULTS
}
let current = load()
const listeners = new Set<() => void>()

// 언어별로 다른 설정: 목소리는 언어마다 따로 고르고, 병음은 중국어에만 있다.
// 화면에는 지금 언어에 맞춘 값을 보여 준다 (voiceURI = 지금 언어의 목소리).
const viewOf = (p: Stored): Prefs => (LANG_ID === 'en' ? { ...p, showPinyin: false, voiceURI: p.voiceURIEn ?? '' } : p)
let view = viewOf(current)

export function getPrefs(): Prefs {
  return view
}

export function setPrefs(patch: Partial<Prefs>) {
  const { voiceURI, ...rest } = patch
  current = { ...current, ...rest }
  if (voiceURI !== undefined) current = LANG_ID === 'en' ? { ...current, voiceURIEn: voiceURI } : { ...current, voiceURI }
  view = viewOf(current)
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* 저장 불가 — 이번 사용 중에만 유지 */
  }
  listeners.forEach((l) => l())
}

/** 백업용: 언어별 값을 모두 담은 원래 설정 */
export function getStoredPrefs(): Stored {
  return current
}

/** 백업 복원: 언어별 값을 모두 담은 설정을 그대로 덮어쓴다 */
export function restorePrefs(patch: Partial<Stored>) {
  current = { ...current, ...patch }
  view = viewOf(current)
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* 저장 불가 */
  }
  listeners.forEach((l) => l())
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => view,
  )
}
