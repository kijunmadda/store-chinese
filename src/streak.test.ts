import { describe, expect, it } from 'vitest'
import type { DayLog } from './store'
import { computeStreak } from './streak'

const log = (...days: string[]): Record<string, DayLog> =>
  Object.fromEntries(days.map((d) => [d, { steps: ['lesson'], completed: true, lessons: 1 }]))

describe('연속 학습일', () => {
  it('처음에는 0', () => {
    expect(computeStreak({}, '2026-10-23')).toEqual({ count: 0, today: false, atRisk: false })
  })
  it('사흘 연속 (오늘 포함)', () => {
    expect(computeStreak(log('2026-10-21', '2026-10-22', '2026-10-23'), '2026-10-23').count).toBe(3)
  })
  it('오늘 아직 안 했어도 어제까지의 연속은 유지', () => {
    const s = computeStreak(log('2026-10-21', '2026-10-22'), '2026-10-23')
    expect(s).toEqual({ count: 2, today: false, atRisk: false })
  })
  it('하루 빠진 건 봐줌 (숫자는 학습한 날만)', () => {
    expect(computeStreak(log('2026-10-20', '2026-10-21', '2026-10-23'), '2026-10-23').count).toBe(3)
  })
  it('어제 빠졌고 오늘 아직이면 "위험" 표시', () => {
    expect(computeStreak(log('2026-10-20', '2026-10-21'), '2026-10-23')).toEqual({ count: 2, today: false, atRisk: true })
  })
  it('이틀 연속 빠지면 끊김', () => {
    expect(computeStreak(log('2026-10-18', '2026-10-19', '2026-10-22', '2026-10-23'), '2026-10-23').count).toBe(2)
  })
  it('월이 바뀌어도 계산', () => {
    expect(computeStreak(log('2026-10-31', '2026-11-01'), '2026-11-01').count).toBe(2)
  })
})
