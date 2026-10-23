import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SpeakButtons from '../components/SpeakButtons'
import SpeakCard from '../components/SpeakCard'
import Zh from '../components/Zh'
import type { StaffLine } from '../content/types'
import { buildLesson, retryOf, type Exercise, type GradedExercise } from '../lesson'
import { getPrefs, usePrefs } from '../prefs'
import { stopSpeech } from '../speech'
import { computeStreak, todayLessons } from '../streak'
import { getState, record, today, useStudyState, type Rating } from '../store'
import { StudyCard } from './SentenceStudy'

interface Feedback {
  correct: boolean
  /** 보여 줄 정답 문장 */
  answer?: { id?: string; chinese: string; pinyin: string; meaning: string }
}

/** 한 판(레슨) — 위에 진행 막대, 가운데 문제, 아래 정답/오답 알림 */
export default function Lesson() {
  const navigate = useNavigate()
  const [plan] = useState(() => buildLesson(getState()))
  const [queue, setQueue] = useState<Exercise[]>(plan.exercises)
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [stats, setStats] = useState({ right: 0, total: 0 })
  const retried = useRef(new Set<string>())

  const gradedTotal = queue.filter((e) => e.kind !== 'intro').length
  const gradedDone = queue.slice(0, index).filter((e) => e.kind !== 'intro').length
  const done = index >= queue.length
  const ex = queue[index]

  const next = () => {
    stopSpeech()
    setFeedback(null)
    setIndex((i) => i + 1)
    window.scrollTo(0, 0)
  }

  /** 채점된 문제의 결과 기록 + 틀리면 판 끝에 한 번 더 */
  const answered = (g: GradedExercise, correct: boolean, fb?: Feedback['answer'], showBar = true) => {
    if (g.kind === 'listen') record.listened(g.id, correct)
    else if (g.kind !== 'speak') record.spoke(g.id, correct ? 'good' : 'again')
    setStats((s) => ({ right: s.right + (correct ? 1 : 0), total: s.total + 1 }))
    if (!correct && !g.key.endsWith('-retry') && !retried.current.has(g.key)) {
      retried.current.add(g.key)
      const again = retryOf(g, getState())
      if (again) setQueue((q) => [...q, again])
    }
    if (showBar) setFeedback({ correct, answer: fb })
    else next()
  }

  if (queue.length === 0)
    return (
      <div className="card empty">
        <p>지금은 낼 문제가 없어요.</p>
        <Link to="/" className="link">홈으로</Link>
      </div>
    )

  if (done) return <Finished right={stats.right} total={stats.total} newCount={plan.newItems.length} />

  return (
    <div className="lesson">
      <header className="lesson-top">
        <button
          type="button"
          className="close"
          aria-label="그만하기"
          onClick={() => {
            if (gradedDone === 0 || window.confirm('지금 그만두면 이번 판은 완료로 치지 않아요. 그만할까요?\n(지금까지 푼 문제는 기록돼요)')) navigate('/')
          }}
        >
          ✕
        </button>
        <div className="progress-track grow">
          <div className="progress-bar" style={{ width: `${(gradedDone / Math.max(gradedTotal, 1)) * 100}%` }} />
        </div>
      </header>

      <div className="lesson-body" key={ex.key}>
        {ex.kind === 'intro' && <Intro ex={ex} onNext={next} />}
        {ex.kind === 'listen' && <ListenEx ex={ex} answered={answered} locked={!!feedback} />}
        {ex.kind === 'pick-zh' && <PickZhEx ex={ex} answered={answered} locked={!!feedback} />}
        {ex.kind === 'build' && <BuildEx ex={ex} answered={answered} locked={!!feedback} />}
        {ex.kind === 'speak' && (
          <>
            <p className="ex-label">중국어로 말해 보세요</p>
            <SpeakCard
              entry={ex}
              onRated={(r: Rating) => {
                record.spoke(ex.id, r)
                answered(ex, r !== 'again', undefined, false)
              }}
            />
          </>
        )}
      </div>

      {feedback && <FeedbackBar fb={feedback} onNext={next} />}
    </div>
  )
}

type Answered = (g: GradedExercise, correct: boolean, fb?: Feedback['answer'], showBar?: boolean) => void

function Intro({ ex, onNext }: { ex: Extract<Exercise, { kind: 'intro' }>; onNext: () => void }) {
  const { showPinyin } = usePrefs()
  useEffect(() => {
    const ids = [...(ex.item.customer ? [ex.item.id] : []), ...(ex.item.responses ?? []).map((r) => r.id)]
    ids.forEach((id) => record.studied(id))
  }, [ex.item])
  return (
    <>
      <p className="ex-label new">✨ 새 표현</p>
      <StudyCard item={ex.item} mode="learn" showPinyin={showPinyin} />
      <div className="lesson-footer">
        <button type="button" className="btn-primary compact" onClick={onNext}>알겠어요</button>
      </div>
    </>
  )
}

function ListenEx({ ex, answered, locked }: { ex: Extract<Exercise, { kind: 'listen' }>; answered: Answered; locked: boolean }) {
  const { showPinyin } = usePrefs()
  const { entry, type, options, answer } = ex.question
  const [chosen, setChosen] = useState<string | null>(null)
  const [showText, setShowText] = useState(false)
  const choose = (key: string) => {
    if (locked || chosen) return
    setChosen(key)
    const correct = !!options.find((o) => o.key === key)?.correct
    answered(ex, correct, type === 'response' && answer
      ? { id: answer.id, chinese: answer.chinese, pinyin: answer.pinyin, meaning: answer.korean }
      : { id: entry.id, chinese: entry.chinese, pinyin: entry.pinyin, meaning: entry.meaning })
  }
  return (
    <>
      <p className="ex-label">{type === 'meaning' ? '고객의 말을 듣고 뜻을 고르세요' : '고객의 말에 알맞은 대답을 고르세요'}</p>
      <div className="listen-box">
        <SpeakButtons text={entry.chinese} id={entry.id} />
        {showText || chosen ? (
          <Zh chinese={entry.chinese} pinyin={entry.pinyin} showPinyin={showPinyin || !!chosen} speakable={false} />
        ) : (
          <button type="button" className="text-link" onClick={() => setShowText(true)}>소리가 안 나요 · 글자로 보기</button>
        )}
      </div>
      <div className="options">
        {options.map((o) => (
          <button key={o.key} type="button" className={`option ${optState(chosen, o.key, o.correct)}`} disabled={!!chosen} onClick={() => choose(o.key)}>
            {type === 'response' ? (
              <>
                <span lang="zh-CN" className="option-zh">{o.label}</span>
                {(showPinyin || chosen) && <small>{o.sub}</small>}
              </>
            ) : (
              o.label
            )}
          </button>
        ))}
      </div>
    </>
  )
}

function PickZhEx({ ex, answered, locked }: { ex: Extract<Exercise, { kind: 'pick-zh' }>; answered: Answered; locked: boolean }) {
  const { showPinyin } = usePrefs()
  const [chosen, setChosen] = useState<string | null>(null)
  const choose = (o: StaffLine) => {
    if (locked || chosen) return
    setChosen(o.id)
    answered(ex, o.id === ex.line.id, { id: ex.line.id, chinese: ex.line.chinese, pinyin: ex.line.pinyin, meaning: ex.line.korean })
  }
  return (
    <>
      <p className="ex-label">중국어로 뭐라고 할까요?</p>
      <p className="scenario"><span className="label">상황</span> {ex.item.scenario}</p>
      <p className="prompt-ko">{ex.line.korean}</p>
      <div className="options">
        {ex.options.map((o) => (
          <button key={o.id} type="button" className={`option ${optState(chosen, o.id, o.id === ex.line.id)}`} disabled={!!chosen} onClick={() => choose(o)}>
            <span lang="zh-CN" className="option-zh">{o.chinese}</span>
            {showPinyin && <small>{o.pinyin}</small>}
          </button>
        ))}
      </div>
    </>
  )
}

function BuildEx({ ex, answered, locked }: { ex: Extract<Exercise, { kind: 'build' }>; answered: Answered; locked: boolean }) {
  // 조각마다 고유 번호 (같은 글자 조각이 두 번 나올 수 있으므로)
  const tiles = useMemo(() => ex.tiles.map((t, i) => ({ t, i })), [ex.tiles])
  const [picked, setPicked] = useState<number[]>([])
  const [checked, setChecked] = useState<boolean | null>(null)
  const check = () => {
    const ok = picked.map((i) => tiles[i].t).join('') === ex.answer.join('')
    setChecked(ok)
    answered(ex, ok, { id: ex.line.id, chinese: ex.line.chinese, pinyin: ex.line.pinyin, meaning: ex.line.korean })
  }
  const frozen = locked || checked !== null
  return (
    <>
      <p className="ex-label">조각을 순서대로 눌러 문장을 만드세요</p>
      <p className="prompt-ko">{ex.line.korean}</p>
      <div className={`build-answer ${checked === true ? 'right' : checked === false ? 'wrong' : ''}`} aria-label="만든 문장">
        {picked.length === 0 && <span className="build-hint">여기에 조각이 놓여요</span>}
        {picked.map((i) => (
          <button key={i} type="button" className="tile" lang="zh-CN" disabled={frozen} onClick={() => setPicked((p) => p.filter((x) => x !== i))}>
            {tiles[i].t}
          </button>
        ))}
      </div>
      <div className="build-bank" aria-label="조각">
        {tiles.map(({ t, i }) => (
          <button key={i} type="button" className={`tile ${picked.includes(i) ? 'used' : ''}`} lang="zh-CN" disabled={frozen || picked.includes(i)} onClick={() => setPicked((p) => [...p, i])}>
            {t}
          </button>
        ))}
      </div>
      {!frozen && (
        <div className="lesson-footer">
          <button type="button" className="btn-primary compact" disabled={picked.length === 0} onClick={check}>확인</button>
        </div>
      )}
    </>
  )
}

function optState(chosen: string | null, key: string, correct: boolean) {
  if (chosen === null) return ''
  if (correct) return 'right'
  return key === chosen ? 'wrong' : 'dim'
}

function FeedbackBar({ fb, onNext }: { fb: Feedback; onNext: () => void }) {
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => btn.current?.focus(), [])
  return (
    <div className={`feedback-bar ${fb.correct ? 'right' : 'wrong'}`} role="status">
      <strong>{fb.correct ? '정답이에요! 👏' : '아쉬워요 — 정답은'}</strong>
      {fb.answer && (
        <div className="feedback-answer">
          <Zh id={fb.answer.id} chinese={fb.answer.chinese} pinyin={fb.answer.pinyin} showPinyin size="md" />
          <p className="meaning sm">{fb.answer.meaning}</p>
        </div>
      )}
      {!fb.correct && <p className="note">이 문장은 판 끝에 한 번 더 나와요.</p>}
      <button ref={btn} type="button" className="btn-primary compact" onClick={onNext}>계속</button>
    </div>
  )
}

function Finished({ right, total, newCount }: { right: number; total: number; newCount: number }) {
  const state = useStudyState()
  const goal = getPrefs().dailyGoal
  const savedRef = useRef(false)
  useEffect(() => {
    if (savedRef.current) return
    savedRef.current = true
    record.lessonDone(goal)
  }, [goal])
  const streak = computeStreak(state.days, today())
  const lessons = todayLessons(state.days, today())
  return (
    <div className="lesson-done">
      <p className="done-emoji">🎉</p>
      <h1>한 판 완료!</h1>
      <div className="card stats">
        <div><strong>🔥 {streak.count}</strong><span>연속 학습일</span></div>
        <div><strong>{total ? Math.round((right / total) * 100) : 100}%</strong><span>정답률</span></div>
        <div><strong>{Math.min(lessons, goal)}/{goal}</strong><span>오늘 목표</span></div>
      </div>
      {newCount > 0 && <p className="note">새 표현 {newCount}개를 배웠어요. 오늘 매장에서 한 번 써 보세요!</p>}
      {lessons >= goal && <p className="feedback right">오늘 목표 달성! 내일도 만나요.</p>}
      <div className="pager">
        <Link to="/" className="btn-secondary">홈으로</Link>
        <Link to="/lesson?again=1" reloadDocument={false} className="btn-secondary strong" onClick={() => window.scrollTo(0, 0)}>
          한 판 더
        </Link>
      </div>
    </div>
  )
}
