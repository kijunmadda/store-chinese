// 화면·음성 관련 사용자 설정. 이 기기 브라우저에 저장한다(학습 기록이 아닌 편의 설정).
// 8단계에서 학습 기록과 함께 백업 대상에 포함한다.
import { useSyncExternalStore } from 'react'

export interface Prefs {
  showPinyin: boolean
  /** 기기 음성 재생 속도 (1 = 기본) */
  rate: number
  /** 사용자가 고른 기기 음성. 빈 값이면 자동 선택 */
  voiceURI: string
  /** 오늘의 학습에서 새로 배울 상황 수 */
  dailyNew: number
}

const KEY = 'prefs.v1'
const DEFAULTS: Prefs = { showPinyin: true, rate: 0.85, voiceURI: '', dailyNew: 3 }

function load(): Prefs {
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

export function getPrefs(): Prefs {
  return current
}

export function setPrefs(patch: Partial<Prefs>) {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* 저장 불가 — 이번 사용 중에만 유지 */
  }
  listeners.forEach((l) => l())
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}
