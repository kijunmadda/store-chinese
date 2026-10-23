import { useRef, useState } from 'react'
import { backupFileName, daysSinceBackup, downloadFile, exportFile, makeBackup, parseBackup, type ParseResult } from '../backup'
import { getStoredPrefs, restorePrefs } from '../prefs'
import { allStates, canUndo, emptyState, record, useStudyState } from '../store'

type Msg = { kind: 'ok' | 'error'; text: string } | null

export default function BackupSection() {
  const state = useStudyState()
  const fileInput = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<Msg>(null)
  const [preview, setPreview] = useState<Extract<ParseResult, { ok: true }> | null>(null)
  const [undoable, setUndoable] = useState(canUndo())
  const since = daysSinceBackup(state.lastBackupAt)

  const doExport = async (mode: 'share' | 'download') => {
    setMsg(null)
    const name = backupFileName()
    try {
      // 두 언어 기록을 함께 담는다 (중국어 기록이 없으면 빈 기록)
      const { zh, en } = await allStates()
      const json = JSON.stringify(makeBackup(zh ?? emptyState(), getStoredPrefs(), new Date(), en), null, 2)
      const result = mode === 'download' ? (downloadFile(json, name), 'downloaded') : await exportFile(json, name)
      if (result === 'cancelled') return
      record.backedUp()
      setMsg({
        kind: 'ok',
        text: result === 'shared' ? '백업 파일을 보냈어요. 저장한 곳(파일 앱·카카오톡 등)을 기억해 두세요.' : `백업 파일을 내려받았어요: ${name} (다운로드 폴더)`,
      })
    } catch (e) {
      console.error(e)
      setMsg({ kind: 'error', text: '백업 파일을 만들지 못했어요. 다른 방법(파일로 내려받기)을 시도해 주세요.' })
    }
  }

  const onFile = async (file: File | undefined) => {
    setMsg(null)
    setPreview(null)
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return setMsg({ kind: 'error', text: '파일이 너무 커요. 이 앱의 백업 파일이 맞는지 확인해 주세요.' })
    const result = parseBackup(await file.text())
    if (!result.ok) return setMsg({ kind: 'error', text: result.error })
    setPreview(result)
  }

  const confirmRestore = async () => {
    if (!preview) return
    const { english, ...zh } = preview.backup
    await record.restoreLangs({ zh, en: english })
    if (preview.backup.prefs) restorePrefs(preview.backup.prefs)
    setPreview(null)
    setUndoable(true)
    setMsg({ kind: 'ok', text: '백업을 불러왔어요.' })
  }

  return (
    <section className="card settings-group" aria-labelledby="backup-title">
      <h2 id="backup-title">학습 기록 백업</h2>
      <p className="note">
        학습 기록은 이 휴대폰 브라우저에만 저장돼요. 브라우저 데이터를 지우거나 휴대폰을 바꾸면 사라지니 가끔 백업해 주세요.
        <br />
        {since === null ? '아직 백업한 적이 없어요.' : since === 0 ? '오늘 백업했어요.' : `마지막 백업: ${since}일 전`}
      </p>

      <button type="button" className="btn-secondary strong" onClick={() => doExport('share')}>
        📤 백업 보내기 (파일 앱·카카오톡 등)
      </button>
      <button type="button" className="btn-secondary" onClick={() => doExport('download')}>
        ⬇ 파일로 내려받기
      </button>

      <div className="field">
        <span>백업 불러오기</span>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json,text/plain"
          className="visually-hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <button type="button" className="btn-secondary" onClick={() => fileInput.current?.click()}>
          📥 백업 파일 고르기
        </button>
      </div>

      {preview && (
        <div className="card confirm" role="alertdialog" aria-label="불러오기 확인">
          <strong>이 백업을 불러올까요?</strong>
          <p className="note">
            백업 날짜: {preview.summary.exportedAt ? new Date(preview.summary.exportedAt).toLocaleString('ko-KR') : '알 수 없음'}
            <br />
            중국어: 학습한 문장 {preview.summary.sentences}개 · 학습한 날 {preview.summary.days}일
            {preview.summary.englishSentences !== undefined && (
              <>
                <br />
                영어: 학습한 문장 {preview.summary.englishSentences}개
              </>
            )}
          </p>
          <p className="caution">⚠ 지금 이 휴대폰의 학습 기록은 백업 내용으로 바뀌어요.</p>
          <div className="pager">
            <button type="button" className="btn-secondary" onClick={() => setPreview(null)}>취소</button>
            <button type="button" className="btn-secondary strong" onClick={confirmRestore}>불러오기</button>
          </div>
        </div>
      )}

      {msg && <p className={msg.kind === 'ok' ? 'feedback right' : 'caution'} role="status">{msg.text}</p>}

      {undoable && (
        <button
          type="button"
          className="text-link"
          onClick={() => {
            record.undoRestore()
            setUndoable(false)
            setMsg({ kind: 'ok', text: '불러오기 전 상태로 되돌렸어요.' })
          }}
        >
          ↩ 방금 불러오기(또는 초기화) 되돌리기
        </button>
      )}
    </section>
  )
}
