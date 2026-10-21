import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import BackHeader from '../components/BackHeader'
import SpeakButtons from '../components/SpeakButtons'
import Zh from '../components/Zh'
import { items } from '../content'
import type { Difficulty } from '../content/types'
import { buildPool, buildQuestion, pickSession, type Question } from '../listen'
import { usePrefs } from '../prefs'
import { getState, isDue, record, useStudyState } from '../store'

const SESSION_SIZE = 5
const LEVELS: { value: Difficulty | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'beginner', label: '초급' },
  { value: 'intermediate', label: '중급' },
]

interface Result {
  question: Question
  correct: boolean
}

export default function ListenTraining() {
  const [level, setLevel] = useState<Difficulty | 'all'>('all')
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<Result[]>([])
  const state = useStudyState()

  const pool = useMemo(() => buildPool(items, level), [level])
  const dueCount = pool.filter((e) => isDue(state.progress[e.id])).length

  const start = () => {
    const s = getState()
    const picked = pickSession(pool, s, SESSION_SIZE)
    setQuestions(picked.map((e) => buildQuestion(e, pool, items, s)))
    setIndex(0)
    setResults([])
  }

  // ── 시작 화면 ──
  if (!questions)
    return (
      <>
        <BackHeader title="고객 질문 듣기" />
        <section className="card intro">
          <p>
            고객의 중국어를 <strong>먼저 듣고</strong> 뜻을 고르세요. 정답을 맞히면 다음에는 <strong>알맞은 대답 고르기</strong>도 나와요.
          </p>
          <p className="note">틀린 문장은 자동으로 복습 목록에 들어가요.</p>
        </section>
        <div className="field">
          <span>난이도</span>
          <div className="segmented three" role="radiogroup" aria-label="난이도">
            {LEVELS.map((l) => (
              <button key={l.value} type="button" role="radio" aria-checked={level === l.value} aria-selected={level === l.value} onClick={() => setLevel(l.value)}>
                {l.label}
              </button>
            ))}
          </div>
          <small className="note">
            문장 {pool.length}개{dueCount > 0 && ` · 복습할 문장 ${dueCount}개 먼저 출제`}
          </small>
        </div>
        <button type="button" className="btn-primary compact" onClick={start} disabled={pool.length === 0}>
          {Math.min(SESSION_SIZE, new Set(pool.map((e) => e.item.id)).size)}문제 시작
        </button>
      </>
    )

  // ── 결과 화면 ──
  if (index >= questions.length) {
    const score = results.filter((r) => r.correct).length
    const wrong = results.filter((r) => !r.correct)
    return (
      <>
        <BackHeader title="듣기 결과" />
        <section className="card result">
          <p className="score">
            {score} / {results.length}
          </p>
          <p>{score === results.length ? '모두 맞혔어요! 👏' : '틀린 문장은 복습 목록에 넣어 두었어요.'}</p>
        </section>
        {wrong.length > 0 && (
          <section className="card">
            <strong>다시 볼 문장</strong>
            {wrong.map((r) => (
              <div key={r.question.entry.id} className="variant">
                <Zh id={r.question.entry.id} chinese={r.question.entry.chinese} pinyin={r.question.entry.pinyin} showPinyin size="md" />
                <p className="meaning sm">{r.question.entry.meaning}</p>
              </div>
            ))}
          </section>
        )}
        <div className="pager">
          <Link to="/" className="btn-secondary">홈으로</Link>
          <button type="button" className="btn-secondary strong" onClick={start}>한 번 더</button>
        </div>
      </>
    )
  }

  const q = questions[index]
  return (
    <>
      <BackHeader title="고객 질문 듣기" />
      <div className="progress" aria-label={`${questions.length}문제 중 ${index + 1}번째`}>
        <div className="progress-track">
          <div className="progress-bar" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
        </div>
        <span>{index + 1} / {questions.length}</span>
      </div>
      <QuestionCard
        key={`${index}-${q.entry.id}`}
        question={q}
        onAnswered={(correct) => {
          record.listened(q.entry.id, correct)
          setResults((r) => [...r, { question: q, correct }])
        }}
        onNext={() => {
          setIndex((i) => i + 1)
          window.scrollTo(0, 0)
        }}
        isLast={index === questions.length - 1}
      />
    </>
  )
}

function QuestionCard({ question, onAnswered, onNext, isLast }: {
  question: Question
  onAnswered: (correct: boolean) => void
  onNext: () => void
  isLast: boolean
}) {
  const { showPinyin } = usePrefs()
  const [chosen, setChosen] = useState<string | null>(null)
  const [showText, setShowText] = useState(false)
  const { entry, type, options, answer } = question
  const answered = chosen !== null
  const correct = answered && options.find((o) => o.key === chosen)?.correct

  const choose = (key: string) => {
    if (answered) return
    setChosen(key)
    onAnswered(!!options.find((o) => o.key === key)?.correct)
  }

  return (
    <article className="card study-card">
      <p className="scenario">
        <span className="label">{type === 'meaning' ? '뜻 고르기' : '대답 고르기'}</span>
        {type === 'meaning' ? '고객의 말을 듣고 뜻을 고르세요' : '고객의 말에 알맞은 대답을 고르세요'}
      </p>

      <section className="block">
        <h2 className="block-title">🎧 고객이 말해요</h2>
        {/* 듣기 훈련: 처음에는 글자를 숨기고 소리부터 */}
        {answered || showText ? (
          <Zh id={entry.id} chinese={entry.chinese} pinyin={entry.pinyin} showPinyin={showPinyin || answered} />
        ) : (
          <>
            <SpeakButtons text={entry.chinese} id={entry.id} />
            <button type="button" className="text-link" onClick={() => setShowText(true)}>
              소리가 안 나요 · 글자로 보기
            </button>
          </>
        )}
      </section>

      <div className="options" role="group" aria-label="보기">
        {options.map((o) => {
          const state = !answered ? '' : o.correct ? 'right' : o.key === chosen ? 'wrong' : 'dim'
          return (
            <button key={o.key} type="button" className={`option ${state}`} onClick={() => choose(o.key)} disabled={answered}>
              {type === 'response' ? (
                <>
                  <span lang="zh-CN" className="option-zh">{o.label}</span>
                  {(answered || showPinyin) && <small>{o.sub}</small>}
                </>
              ) : (
                o.label
              )}
            </button>
          )
        })}
      </div>

      {answered && (
        <>
          <p className={`feedback ${correct ? 'right' : 'wrong'}`} role="status">
            {correct ? '정답이에요!' : '아쉬워요. 복습 목록에 넣어 둘게요.'}
          </p>
          <p className="meaning">{entry.meaning}</p>

          {entry.item.keywords && entry.item.keywords.length > 0 && (
            <dl className="keywords">
              {entry.item.keywords.map((k) => (
                <div key={k.word}>
                  <dt lang="zh-CN">{k.word}</dt>
                  <dd>
                    <span className="kw-pinyin">{k.pinyin}</span> {k.meaning}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {answer && (
            <section className="block staff">
              <h2 className="block-title">🗣 이렇게 답해요 — 소리 내어 따라 말해 보세요</h2>
              <p className="meaning">{answer.korean}</p>
              <Zh id={answer.id} chinese={answer.chinese} pinyin={answer.pinyin} showPinyin />
            </section>
          )}

          <button type="button" className="btn-secondary strong" onClick={onNext}>
            {isLast ? '결과 보기' : '다음 문제 ›'}
          </button>
        </>
      )}
    </article>
  )
}
