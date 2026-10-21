import BackHeader from '../components/BackHeader'
import Zh from '../components/Zh'
import { items } from '../content'

// 실제 응대 중 막혔을 때 바로 꺼내 보는 화면 — 큰 글씨, 한 화면에 모두 보이게
export default function Rescue() {
  const lines = items.filter((i) => i.learningModes.includes('rescue')).flatMap((i) => i.responses ?? [])
  return (
    <>
      <BackHeader title="위기 탈출 카드" />
      <p className="note">못 알아들었을 때 이 문장들로 대화를 이어가세요.</p>
      {lines.map((r) => (
        <article key={r.id} className="card rescue-line">
          <p className="meaning">{r.korean}</p>
          <Zh chinese={r.chinese} pinyin={r.pinyin} showPinyin />
        </article>
      ))}
    </>
  )
}
