import { describe, expect, it } from 'vitest'
import { backupFileName, daysSinceBackup, makeBackup, parseBackup } from './backup'
import { emptyState } from './store'

const prefs = { showPinyin: true, rate: 0.85, voiceURI: '', dailyNew: 3 }

describe('백업 파일', () => {
  const state = emptyState()
  state.progress['S01'] = { seen: 3, box: 2, nextReviewAt: '2026-10-24', listen: { correct: 2, wrong: 1 }, speak: { again: 0, hard: 0, good: 0 }, markedForReview: false, usedInStore: 0 }
  state.days['2026-10-21'] = { steps: ['listen'], completed: true }

  it('내보낸 파일을 그대로 다시 읽으면 내용이 같음', () => {
    const json = JSON.stringify(makeBackup(state, prefs, new Date('2026-10-21T10:00:00Z')))
    const r = parseBackup(json)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.backup.progress).toEqual(state.progress)
    expect(r.backup.days).toEqual(state.days)
    expect(r.backup.prefs).toEqual(prefs)
    expect(r.summary).toEqual({ exportedAt: '2026-10-21T10:00:00.000Z', sentences: 1, days: 1 })
  })

  it.each([
    ['JSON이 아님', 'hello', 'JSON 파일 형식이 아니에요'],
    ['다른 앱 파일', '{"app":"other","schemaVersion":1}', '이 앱의 백업 파일이 아니에요'],
    ['버전 없음', '{"app":"dept-store-chinese"}', '버전 정보가 없어요'],
    ['미래 버전', '{"app":"dept-store-chinese","schemaVersion":9,"progress":{},"days":{}}', '더 새로운 버전'],
    ['기록 손상', '{"app":"dept-store-chinese","schemaVersion":1,"progress":[],"days":{}}', '손상'],
    ['문장 기록 손상', '{"app":"dept-store-chinese","schemaVersion":1,"progress":{"S01":{"seen":"x"}},"days":{}}', 'S01'],
  ])('잘못된 파일 거부: %s', (_, text, message) => {
    const r = parseBackup(text)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain(message)
  })

  it('파일 이름과 경과일', () => {
    expect(backupFileName(new Date(2026, 9, 21))).toBe('매장중국어_백업_2026-10-21.json')
    expect(daysSinceBackup(null)).toBeNull()
    expect(daysSinceBackup('2026-10-14T09:00:00Z', new Date('2026-10-21T10:00:00Z'))).toBe(7)
  })
})
