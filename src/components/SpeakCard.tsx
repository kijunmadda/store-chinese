import { useState } from 'react'
import type { ContentItem, StaffLine } from '../content/types'
import { usePrefs } from '../prefs'
import type { Rating } from '../store'
import Zh from './Zh'

const RATINGS: { value: Rating; label: string; hint: string }[] = [
  { value: 'again', label: '몰랐음', hint: '오늘 다시' },
  { value: 'hard', label: '헷갈림', hint: '내일 다시' },
  { value: 'good', label: '바로 떠오름', hint: '며칠 뒤' },
]

/** 직접 말하기: 한국어를 보고 말해 본 뒤 정답 확인 → 쉐도잉 → 자기 평가 */
export default function SpeakCard({ entry, onRated }: { entry: { item: ContentItem; line: StaffLine }; onRated: (r: Rating) => void }) {
  const { showPinyin } = usePrefs()
  const [revealed, setRevealed] = useState(false)
  const [hideText, setHideText] = useState(false)
  const { item, line } = entry

  return (
    <article className="card study-card">
      <p className="scenario">
        <span className="label">상황</span> {item.scenario}
        {item.policyDependent && <span className="badge">🔒 매장 규정 확인</span>}
      </p>

      {item.customer && (
        <section className="block">
          <h2 className="block-title">🎧 고객</h2>
          <Zh id={item.id} chinese={item.customer.chinese} pinyin={item.customer.pinyin} showPinyin={showPinyin} size="md" />
          <p className="meaning sm">{item.customer.meaning}</p>
        </section>
      )}

      <section className="block staff">
        <h2 className="block-title">🗣 중국어로 말해 보세요</h2>
        <p className="prompt-ko">{line.korean}</p>
        {!revealed ? (
          <button type="button" className="reveal" onClick={() => setRevealed(true)}>
            소리 내어 말해 본 뒤 정답 보기
          </button>
        ) : (
          <>
            {hideText ? (
              <p className="hidden-text">글자를 가렸어요 — 🔊 듣고 그대로 따라 말해 보세요</p>
            ) : null}
            <div className={hideText ? 'masked' : ''}>
              <Zh id={line.id} chinese={line.chinese} pinyin={line.pinyin} showPinyin={showPinyin} />
            </div>
            {line.note && <p className="caution">⚠ {line.note}</p>}
            <ol className="shadow-steps">
              <li className={hideText ? 'done' : ''}>🔊 듣고 글자를 보며 따라 말하기</li>
              <li>
                <button type="button" className="text-link inline" onClick={() => setHideText((h) => !h)}>
                  {hideText ? '글자 다시 보기' : '글자 가리고 한 번 더 말하기'}
                </button>
              </li>
            </ol>
          </>
        )}
      </section>

      {revealed && (
        <section className="block">
          <h2 className="block-title">얼마나 잘 떠올랐나요?</h2>
          <div className="ratings">
            {RATINGS.map((r) => (
              <button key={r.value} type="button" className={`rating ${r.value}`} onClick={() => onRated(r.value)}>
                <strong>{r.label}</strong>
                <small>{r.hint}</small>
              </button>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
