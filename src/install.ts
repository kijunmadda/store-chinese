// 홈 화면 설치(PWA) 상태와 브라우저 구분
import { useSyncExternalStore } from 'react'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** 앱 시작 시 한 번 호출: 크롬·삼성 인터넷이 '설치 가능' 신호를 보내면 잡아 둔다 */
export function listenForInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    emit()
  })
}

export function useCanPromptInstall(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => deferred !== null,
  )
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null
  emit()
  return outcome === 'accepted'
}

/** 홈 화면 앱으로 실행 중인가 */
export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export type BrowserKind = 'ios-safari' | 'samsung' | 'android-chrome' | 'other'

export function browserKind(ua = navigator.userAgent): BrowserKind {
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios-safari'
  if (/SamsungBrowser/.test(ua)) return 'samsung'
  if (/Android/.test(ua)) return 'android-chrome'
  return 'other'
}

export const isMobile = (ua = navigator.userAgent) => /iPhone|iPad|iPod|Android/.test(ua)
