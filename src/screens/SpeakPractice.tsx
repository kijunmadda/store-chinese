import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import BackHeader from '../components/BackHeader'
import Zh from '../components/Zh'
import { items } from '../content'
import { usePrefs } from '../prefs'
import { buildSpeakPool, pickSpeakSession, type SpeakEntry } from '../speaking'
import { getState, isDue, record, useStudyState, type Rating } from '../store'

const SESSION_SIZE = 5
const RATINGS: { value: Rating; label: string; hint: string }[] = [
  { value: 'again', label: '몰랐음', hint: '오늘 다시' },
  { value: 'hard', label: '헷갈림', hint: '내일 다시' },
  { value: 'good', label: '바로 떠오름', hint: '며칠 뒤' },
]

export default function SpeakPractice() {
  const pool = useMemo(() => buildSpeakPool(items), [])
  const state = useStudyState()
  const [session, setSession] = useState<SpeakEntry[] | null>(null)
  const [index, setIndex] = useState(0)
  const [ratings, setRatings] = useState<Rating[]>([])
  const dueCount = pool.filter((e) => isDue(state.progress[e.id])).length

  const start = () => {
    setSession(pickSpeakSession(pool, getState(), SESSION_SIZE))
    setIndex(0)
    setRatings([])
  }

  if (!session)
    return (
      <>
        <BackHeader title="말하기 연습" />
        <section className="card intro">
          <p>
            한국어를 보고 <strong>중국어로 직접 말해 본 뒤</strong> 정답을 확인하세요. 소리 내어 말할수록 오래 기억에 남아요.
          </p>
          <p className="note">스스로 평가한 결과에 따라 다음 복습 날짜가 정해져요.</p>
        </section>
        <p className="note">
          문장 {pool.length}개{dueCount > 0 && ` · 복습할 문장 ${dueCount}개 먼저 출제`}
        </p>
        <button type="button" className="btn-primary compact" onClick={start} disabled={pool.length === 0}>
          {Math.min(SESSION_SIZE, pool.length)}문장 시작
        </button>
      </>
    )

  if (index >= session.length) {
    const count = (r: Rating) => ratings.filter((x) => x === r).length
    return (
      <>
        <BackHeader title="말하기 결과" />
        <section className="card result">
          <p className="score">{count('good')} / {ratings.length}</p>
          <p>바로 떠오른 문장</p>
          <p className="note">헷갈림 {count('hard')} · 몰랐음 {count('again')} — 이 문장들은 곧 다시 나와요.</p>
        </section>
        <div className="pager">
          <Link to="/" className="btn-secondary">홈으로</Link>
          <button type="button" className="btn-secondary strong" onClick={start}>한 번 더</button>
        </div>
      </>
    )
  }

  return (
    <>
      <BackHeader title="말하기 연습" />
      <div className="progress" aria-label={`${session.length}문장 중 ${index + 1}번째`}>
        <div className="progress-track">
          <div className="progress-bar" style={{ width: `${((index + 1) / session.length) * 100}%` }} />
        </div>
        <span>{index + 1} / {session.length}</span>
      </div>
      <SpeakCard
        key={session[index].id}
        entry={session[index]}
        onRated={(r) => {
          record.spoke(session[index].id, r)
          setRatings((x) => [...x, r])
          setIndex((i) => i + 1)
          window.scrollTo(0, 0)
        }}
      />
    </>
  )
}

export function SpeakCard({ entry, onRated }: { entry: SpeakEntry; onRated: (r: Rating) => void }) {
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
