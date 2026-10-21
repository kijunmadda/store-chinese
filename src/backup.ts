// 학습 기록 백업 파일(JSON) 만들기·검사하기
import type { Prefs } from './prefs'
import { emptyState, type StudyState } from './store'

export const BACKUP_APP = 'dept-store-chinese'

export interface BackupFile extends StudyState {
  exportedAt: string
  prefs?: Partial<Prefs>
}

export function makeBackup(state: StudyState, prefs: Prefs, now = new Date()): BackupFile {
  return { ...state, exportedAt: now.toISOString(), prefs }
}

export function backupFileName(now = new Date()): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return `매장중국어_백업_${d}.json`
}

export type ParseResult =
  | { ok: true; backup: BackupFile; summary: { exportedAt: string; sentences: number; days: number } }
  | { ok: false; error: string }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** 백업 파일 내용 검사. 다른 앱의 파일·손상된 파일·미래 버전 파일을 걸러낸다. */
export function parseBackup(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'JSON 파일 형식이 아니에요. 이 앱에서 내보낸 백업 파일을 골라 주세요.' }
  }
  if (!isObj(data) || data.app !== BACKUP_APP) return { ok: false, error: '이 앱의 백업 파일이 아니에요.' }
  if (typeof data.schemaVersion !== 'number') return { ok: false, error: '백업 파일 버전 정보가 없어요. 파일이 손상되었을 수 있어요.' }
  if (data.schemaVersion > 1) return { ok: false, error: '더 새로운 버전의 앱에서 만든 백업이에요. 앱을 새로고침한 뒤 다시 시도해 주세요.' }
  if (!isObj(data.progress) || !isObj(data.days)) return { ok: false, error: '학습 기록 부분이 손상되었어요.' }

  for (const [id, p] of Object.entries(data.progress)) {
    if (!isObj(p) || typeof p.seen !== 'number' || typeof p.box !== 'number' || !isObj(p.listen) || !isObj(p.speak))
      return { ok: false, error: `문장 기록(${id})이 손상되었어요.` }
  }

  const base = emptyState()
  const backup: BackupFile = {
    ...base,
    progress: data.progress as StudyState['progress'],
    days: data.days as StudyState['days'],
    recentListen: Array.isArray(data.recentListen) ? (data.recentListen as string[]).filter((x) => typeof x === 'string') : [],
    lastBackupAt: typeof data.lastBackupAt === 'string' ? data.lastBackupAt : null,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    prefs: isObj(data.prefs) ? (data.prefs as Partial<Prefs>) : undefined,
  }
  return {
    ok: true,
    backup,
    summary: {
      exportedAt: backup.exportedAt,
      sentences: Object.values(backup.progress).filter((p) => p.seen > 0).length,
      days: Object.values(backup.days).filter((d) => d.steps.length > 0).length,
    },
  }
}

/** 마지막 백업 후 지난 날 수 (백업한 적 없으면 null) */
export function daysSinceBackup(lastBackupAt: string | null, now = new Date()): number | null {
  if (!lastBackupAt) return null
  return Math.floor((now.getTime() - new Date(lastBackupAt).getTime()) / 86400000)
}

/**
 * 파일 내보내기: 공유 메뉴(파일 앱·카카오톡·메모 등)를 우선, 안 되면 다운로드.
 * 반환값: 'shared' | 'downloaded' | 'cancelled'
 */
export async function exportFile(json: string, fileName: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([json], fileName, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: '매장 중국어 학습 백업' })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
      // 공유 실패 → 다운로드로 대신
    }
  }
  downloadFile(json, fileName)
  return 'downloaded'
}

export function downloadFile(json: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
