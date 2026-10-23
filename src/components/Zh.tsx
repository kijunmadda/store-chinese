import { useState } from 'react'
import hangulJson from '../generated/hangul.json'
import { L } from '../langs'
import SpeakButtons from './SpeakButtons'

const HANGUL = hangulJson as Record<string, string>

// 학습 문장 + 병음 + 듣기 버튼 + (필요할 때만 펼치는) 한글 발음.
// 중국어: lang="zh-CN"을 지정해야 안드로이드·아이폰이 간체 중국어 글꼴로 그린다
// (지정하지 않으면 한국어 페이지라 한자를 한국식 글꼴로 표시할 수 있음).
// 영어: 병음 칸(pinyin)에 콘텐츠의 한글 발음이 들어 있다 (src/content/english.ts).
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
  const reading = hangul ? (L.hasPinyin ? HANGUL[chinese] : pinyin || undefined) : undefined
  return (
    <div className={`zh zh-${size} zh-${L.id}`}>
      <p className="zh-text" lang={L.tag}>{chinese}</p>
      {showPinyin && L.hasPinyin && <p className="zh-pinyin" lang="zh-Latn-pinyin">{pinyin}</p>}
      {reading && open && (
        <p className="zh-hangul">
          {reading}
          <small>{L.hangulNote}</small>
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
