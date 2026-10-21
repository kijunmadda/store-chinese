import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BackHeader from '../components/BackHeader'
import { items, sentences } from '../content'
import { buildPool, buildQuestion, type Question } from '../listen'
import type { SpeakEntry } from '../speaking'
import { computeStats } from '../stats'
import { getState, record, today, type Rating } from '../store'
import { shuffle } from '../util'
import { QuestionCard } from './ListenTraining'
import { SpeakCard } from './SpeakPractice'

const MAX = 10

type Task = { kind: 'listen'; id: string; question: Question } | { kind: 'speak'; id: string; entry: SpeakEntry }

/** 복습할 문장으로 과제 만들기: 고객 문장 → 듣기 문제, 직원 문장 → 말하기 카드. 섞어서 낸다. */
export function buildReviewTasks(ids: string[]): Task[] {
  const state = getState()
  const pool = buildPool(items, 'all')
  const tasks: Task[] = []
  for (const id of ids) {
    const s = sentences.get(id)
    if (!s) continue
    const item = items.find((it) => it.id === s.itemId)!
    if (s.kind === 'customer') {
      const entry = pool.find((e) => e.id === id)
      if (entry) tasks.push({ kind: 'listen', id, question: buildQuestion(entry, pool, items, state) })
    } else {
      tasks.push({ kind: 'speak', id, entry: { id, item, line: s } })
    }
  }
  return shuffle(tasks)
}

export default function ReviewSession() {
  const [tasks] = useState(() => buildReviewTasks(shuffle(computeStats(getState(), today()).dueIds).slice(0, MAX)))
  const [index, setIndex] = useState(0)
  const [good, setGood] = useState(0)

  const finish = (id: string, ok: boolean) => {
    record.clearReviewMark(id)
    if (ok) setGood((g) => g + 1)
  }
  const next = () => {
    setIndex((i) => i + 1)
    window.scrollTo(0, 0)
  }

  const finished = tasks.length > 0 && index >= tasks.length
  useEffect(() => {
    if (finished) record.step('review')
  }, [finished])

  if (tasks.length === 0)
    return (
      <>
        <BackHeader title="복습" />
        <div className="card empty">
          <p>지금은 복습할 문장이 없어요.</p>
          <Link to="/" className="link">홈으로</Link>
        </div>
      </>
    )

  if (finished) {
    return (
      <>
        <BackHeader title="복습 완료" />
        <section className="card result">
          <p className="score">{good} / {tasks.length}</p>
          <p>잘 기억한 문장</p>
          <p className="note">기억이 흐렸던 문장은 일정에 맞춰 다시 나와요.</p>
        </section>
        <div className="pager">
          <Link to="/review" className="btn-secondary">복습 화면</Link>
          <Link to="/" className="btn-secondary strong">홈으로</Link>
        </div>
      </>
    )
  }

  const t = tasks[index]
  return (
    <>
      <BackHeader title="복습" />
      <div className="progress" aria-label={`${tasks.length}개 중 ${index + 1}번째`}>
        <div className="progress-track">
          <div className="progress-bar" style={{ width: `${((index + 1) / tasks.length) * 100}%` }} />
        </div>
        <span>{index + 1} / {tasks.length}</span>
      </div>
      {t.kind === 'listen' ? (
        <QuestionCard
          key={`${index}-${t.id}`}
          question={t.question}
          isLast={index === tasks.length - 1}
          onAnswered={(correct) => {
            record.listened(t.id, correct)
            finish(t.id, correct)
          }}
          onNext={next}
        />
      ) : (
        <SpeakCard
          key={`${index}-${t.id}`}
          entry={t.entry}
          onRated={(r: Rating) => {
            record.spoke(t.id, r)
            finish(t.id, r === 'good')
            next()
          }}
        />
      )}
    </>
  )
}
