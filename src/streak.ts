// 연속 학습일 🔥 — 한 판이라도 한 날을 '학습한 날'로 센다.
// 하루 빠지는 건 봐준다(연속 유지, 숫자는 늘지 않음). 이틀 연속 빠지면 다시 0부터.
import type { DayLog } from './store'

function shift(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const studied = (days: Record<string, DayLog>, day: string) => (days[day]?.lessons ?? 0) > 0

export interface Streak {
  /** 연속 학습일 수 */
  count: number
  /** 오늘 이미 했는지 */
  today: boolean
  /** 어제를 빠뜨려 오늘 안 하면 끊기는 상태 */
  atRisk: boolean
}

export function computeStreak(days: Record<string, DayLog>, todayKey: string): Streak {
  const doneToday = studied(days, todayKey)
  let count = 0
  let missed = 0
  // 오늘 아직 안 했으면 어제부터 센다 (오늘 하루가 남아 있으므로)
  let day = doneToday ? todayKey : shift(todayKey, -1)
  for (let guard = 0; guard < 3650; guard++) {
    if (studied(days, day)) {
      count++
      missed = 0
    } else {
      missed++
      if (missed >= 2) break
    }
    day = shift(day, -1)
  }
  const yesterdayMissed = !studied(days, shift(todayKey, -1))
  return { count, today: doneToday, atRisk: !doneToday && count > 0 && yesterdayMissed }
}

export function todayLessons(days: Record<string, DayLog>, todayKey: string): number {
  return days[todayKey]?.lessons ?? 0
}
