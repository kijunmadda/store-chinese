import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import BackHeader from '../components/BackHeader'
import { items } from '../content'
import { buildPool, buildQuestion } from '../listen'
import { getPrefs, usePrefs } from '../prefs'
import { getState, record, type Rating } from '../store'
import { planToday, recallEntries, STEP_LABEL, type StepKey, type TodayPlan } from '../today'
import { QuestionCard } from './ListenTraining'
import { buildReviewTasks } from './ReviewSession'
import { RoleplayRun } from './RoleplayPlayer'
import { SpeakCard } from './SpeakPractice'
import { StudyActions, StudyCard } from './SentenceStudy'

export default function TodayFlow() {
  const [plan, setPlan] = useState<TodayPlan | null>(null)
  const [stepIndex, setStepIndex] = useState(0)

  if (!plan)
    return (
      <>
        <BackHeader title="오늘의 학습" />
        <section className="card intro">
          <p>복습으로 기억을 깨운 뒤 새 문장을 배우고, 듣기·말하기·역할극으로 바로 써 봐요. 마지막에 오늘 배운 문장을 한 번 더 떠올리면 끝!</p>
          <p className="note">어느 단계든 건너뛸 수 있어요.</p>
        </section>
        <button type="button" className="btn-primary compact" onClick={() => setPlan(planToday(getState(), false, Math.random, getPrefs().dailyNew))}>
          전체 학습 (약 10분)
        </button>
        <button type="button" className="btn-secondary" onClick={() => setPlan(planToday(getState(), true))}>
          ⏱ 짧게 하기 (약 2분 · 복습 + 마무리)
        </button>
      </>
    )

  const done = stepIndex >= plan.steps.length
  const step = plan.steps[stepIndex]
  const nextStep = () => {
    record.step(step)
    setStepIndex((i) => i + 1)
    window.scrollTo(0, 0)
  }

  return (
    <>
      <BackHeader title="오늘의 학습" />
      <ol className="flow-steps" aria-label="진행 단계">
        {plan.steps.map((s, i) => (
          <li key={s} className={i < stepIndex ? 'done' : i === stepIndex ? 'current' : ''}>
            {STEP_LABEL[s]}
          </li>
        ))}
      </ol>

      {done ? (
        <Finished />
      ) : (
        <>
          <StepRunner key={step} step={step} plan={plan} onDone={nextStep} />
          {step !== 'roleplay' && (
            <button type="button" className="text-link" onClick={nextStep}>
              이 단계 건너뛰기 ›
            </button>
          )}
        </>
      )}
    </>
  )
}

function Finished() {
  useEffect(() => {
    record.completeDay()
  }, [])
  return (
    <>
      <section className="card result">
        <p className="score">🎉</p>
        <p>오늘의 학습을 마쳤어요!</p>
        <p className="note">내일도 5분만 해요. 오늘 배운 문장을 매장에서 한 번 써 보세요.</p>
      </section>
      <Link to="/" className="btn-secondary strong">홈으로</Link>
    </>
  )
}

/** 단계별 진행 — 각 단계 안에서 여러 카드를 차례로 보여 주고 다 끝나면 onDone */
function StepRunner({ step, plan, onDone }: { step: StepKey; plan: TodayPlan; onDone: () => void }) {
  const { showPinyin } = usePrefs()
  const [i, setI] = useState(0)
  const advance = (total: number) => {
    if (i + 1 >= total) onDone()
    else {
      setI(i + 1)
      window.scrollTo(0, 0)
    }
  }

  const reviewTasks = useMemo(() => (step === 'review' ? buildReviewTasks(plan.reviewIds) : []), [step, plan])
  const listenQs = useMemo(() => {
    if (step !== 'listen') return []
    const pool = buildPool(items, 'all')
    return plan.listen.map((e) => buildQuestion(e, pool, items, getState()))
  }, [step, plan])
  const recall = useMemo(() => (step === 'recall' ? recallEntries(plan, getState()) : []), [step, plan])

  const counter = (total: number) => <p className="flow-sub">{STEP_LABEL[step]} {Math.min(i + 1, total)} / {total}</p>

  if (step === 'review') {
    const t = reviewTasks[i]
    if (!t) return <EmptyStep onDone={onDone} text="복습할 문장이 없어요." />
    return (
      <>
        {counter(reviewTasks.length)}
        {t.kind === 'listen' ? (
          <QuestionCard key={i} question={t.question} isLast={false} onAnswered={(ok) => record.listened(t.id, ok)} onNext={() => advance(reviewTasks.length)} />
        ) : (
          <SpeakCard key={i} entry={t.entry} onRated={(r: Rating) => { record.spoke(t.id, r); advance(reviewTasks.length) }} />
        )}
      </>
    )
  }

  if (step === 'new') {
    const item = plan.newItems[i]
    return (
      <>
        {counter(plan.newItems.length)}
        <StudyCard key={item.id} item={item} mode="learn" showPinyin={showPinyin} />
        <StudyActions key={`a-${item.id}`} item={item} />
        <button type="button" className="btn-secondary strong" onClick={() => advance(plan.newItems.length)}>
          {i + 1 >= plan.newItems.length ? '다음 단계 ›' : '다음 문장 ›'}
        </button>
      </>
    )
  }

  if (step === 'listen') {
    const q = listenQs[i]
    return (
      <>
        {counter(listenQs.length)}
        <QuestionCard key={i} question={q} isLast={false} onAnswered={(ok) => record.listened(q.entry.id, ok)} onNext={() => advance(listenQs.length)} />
      </>
    )
  }

  if (step === 'speak' || step === 'recall') {
    const list = step === 'speak' ? plan.speak : recall
    const e = list[i]
    if (!e) return <EmptyStep onDone={onDone} text="떠올릴 문장이 없어요." />
    return (
      <>
        {counter(list.length)}
        {step === 'recall' && i === 0 && <p className="note">오늘 배운 문장을 보지 않고 떠올려 보세요. 배운 직후 한 번 더 떠올리면 훨씬 오래 기억돼요.</p>}
        <SpeakCard key={`${step}-${i}`} entry={e} onRated={(r: Rating) => { record.spoke(e.id, r); advance(list.length) }} />
      </>
    )
  }

  if (step === 'roleplay' && plan.roleplayId)
    return (
      <>
        <RoleplayRun roleplayId={plan.roleplayId} embedded onFinish={onDone} />
        <button type="button" className="text-link" onClick={onDone}>
          역할극 건너뛰기 ›
        </button>
      </>
    )

  return <EmptyStep onDone={onDone} text="" />
}

function EmptyStep({ onDone, text }: { onDone: () => void; text: string }) {
  return (
    <div className="card empty">
      <p>{text}</p>
      <button type="button" className="btn-secondary strong" onClick={onDone}>다음 단계 ›</button>
    </div>
  )
}
