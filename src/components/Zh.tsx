// 중국어 문장 + 병음. lang="zh-CN"을 지정해야 안드로이드·아이폰이 간체 중국어 글꼴로 그린다
// (지정하지 않으면 한국어 페이지라 한자를 한국식 글꼴로 표시할 수 있음).
export default function Zh({ chinese, pinyin, showPinyin, size = 'lg' }: {
  chinese: string
  pinyin: string
  showPinyin: boolean
  size?: 'lg' | 'md'
}) {
  return (
    <div className={`zh zh-${size}`}>
      <p className="zh-text" lang="zh-CN">{chinese}</p>
      {showPinyin && <p className="zh-pinyin" lang="zh-Latn-pinyin">{pinyin}</p>}
    </div>
  )
}
