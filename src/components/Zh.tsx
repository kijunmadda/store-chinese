import SpeakButtons from './SpeakButtons'

// 중국어 문장 + 병음 + 듣기 버튼. lang="zh-CN"을 지정해야 안드로이드·아이폰이 간체 중국어 글꼴로 그린다
// (지정하지 않으면 한국어 페이지라 한자를 한국식 글꼴로 표시할 수 있음).
export default function Zh({ chinese, pinyin, showPinyin, id, rate, size = 'lg', speakable = true }: {
  chinese: string
  pinyin: string
  showPinyin: boolean
  /** 문장 ID — 미리 만든 음성 파일을 찾을 때 사용 */
  id?: string
  /** 재생 속도 직접 지정 */
  rate?: number
  size?: 'lg' | 'md'
  speakable?: boolean
}) {
  return (
    <div className={`zh zh-${size}`}>
      <p className="zh-text" lang="zh-CN">{chinese}</p>
      {showPinyin && <p className="zh-pinyin" lang="zh-Latn-pinyin">{pinyin}</p>}
      {speakable && <SpeakButtons text={chinese} id={id} rate={rate} />}
    </div>
  )
}
