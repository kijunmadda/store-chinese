import { useState } from 'react'

// 화면 표시 취향(병음 보기 등)을 이 기기에 기억한다. 학습 기록이 아니라 편의 설정이므로
// localStorage를 쓰고, 막혀 있으면(사생활 보호 모드 등) 기억만 안 될 뿐 정상 동작한다.
export function useStoredToggle(key: string, initial: boolean): [boolean, () => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved === null ? initial : saved === '1'
    } catch {
      return initial
    }
  })
  const toggle = () =>
    setValue((v) => {
      try {
        localStorage.setItem(key, v ? '0' : '1')
      } catch {
        /* 저장 불가 환경 — 무시 */
      }
      return !v
    })
  return [value, toggle]
}
