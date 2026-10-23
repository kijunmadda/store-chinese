import { useState } from 'react'
import hangulJson from '../generated/hangul.json'
import SpeakButtons from './SpeakButtons'

const HANGUL = hangulJson as Record<string, string>

// 중국어 문장 + 병음 + 듣기 버튼 + (필요할 때만 펼치는) 한글 발음.
// lang="zh-CN"을 지정해야 안드로이드·아이폰이 간체 중국어 글꼴로 그린다
// (지정하지 않으면 한국어 페이지라 한자를 한국식 글꼴로 표시할 수 있음).
export default function Zh({ chinese, pinyin, showPinyin, id, rate, size = 'lg', speakable = true, hangul = true }: {
  chinese: string
  pinyin: string
  showPinyin: boolean
  /** 문장 ID — 미리 만든 음성 파일을 찾을 때 사용 */
  id?: string
  /** 재생 속도 직접 지정 */
  rate?: number
  size?: 'lg' | 'md'
  speakable?: boolean
  /** 한글 발음 보기 버튼 (문제 풀이 중에는 끔) */
  hangul?: boolean
}) {
  const [open, setOpen] = useState(false)
  const reading = hangul ? HANGUL[chinese] : undefined
  return (
    <div className={`zh zh-${size}`}>
      <p className="zh-text" lang="zh-CN">{chinese}</p>
      {showPinyin && <p className="zh-pinyin" lang="zh-Latn-pinyin">{pinyin}</p>}
      {reading && open && (
        <p className="zh-hangul">
          {reading}
          <small>참고용 · 숫자는 성조 · zh·ch·sh, f 같은 소리는 한글로 정확히 못 적어요 — 🔊로 확인하세요</small>
        </p>
      )}
      {(speakable || reading) && (
        <div className="zh-actions">
          {speakable && <SpeakButtons text={chinese} id={id} rate={rate} />}
          {reading && (
            <button type="button" className={`speak-btn hangul-btn ${open ? 'playing' : ''}`} aria-pressed={open} onClick={() => setOpen((o) => !o)}>
              가 <span>{open ? '한글 닫기' : '한글 발음'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
