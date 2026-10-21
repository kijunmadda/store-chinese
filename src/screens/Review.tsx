import { Link } from 'react-router-dom'
import { sentences } from '../content'
import { computeStats, studyLink } from '../stats'
import { record, today, useStoreStatus, useStudyState } from '../store'

export default function Review() {
  const state = useStudyState()
  const status = useStoreStatus()
  const stats = computeStats(state, today())

  return (
    <>
      <header className="screen-header">
        <h1>복습</h1>
      </header>

      <section className="card review-hero">
        <p className="score">{stats.dueIds.length}</p>
        <p>오늘 복습할 문장</p>
        {stats.dueIds.length > 0 ? (
          <Link to="/review/session" className="btn-primary compact">
            복습 시작 ({Math.min(stats.dueIds.length, 10)}개)
          </Link>
        ) : (
          <p className="note">지금은 복습할 문장이 없어요. 틀린 문제와 헷갈린 문장이 여기에 모여요.</p>
        )}
      </section>

      <section className="card">
        <strong>학습 현황</strong>
        <div className="stats" style={{ marginTop: 12 }}>
          <div><strong>{stats.studyDays}</strong><span>학습한 날</span></div>
          <div><strong>{stats.learned}</strong><span>학습한 문장</span></div>
          <div><strong>{stats.percent}%</strong><span>전체 {stats.total}개 중</span></div>
        </div>
        <ul className="cat-progress">
          {stats.byCategory.map((c) => (
            <li key={c.id}>
              <span>{c.name}</span>
              <div className="progress-track"><div className="progress-bar" style={{ width: `${(c.learned / c.total) * 100}%` }} /></div>
              <small>{c.learned}/{c.total}</small>
            </li>
          ))}
        </ul>
      </section>

      <SentenceList title="듣기에서 틀린 문장" ids={stats.wrongListenIds} />
      <SentenceList title="말하기에서 어려웠던 문장" ids={stats.hardSpeakIds} />
      <SentenceList title="직접 복습에 추가한 문장" ids={stats.markedIds} />

      {status === 'memory-only' && (
        <p className="caution">⚠ 이 브라우저에서는 학습 기록을 저장할 수 없어요 (사생활 보호 모드 등). 앱을 닫으면 기록이 사라집니다.</p>
      )}

      <button
        type="button"
        className="text-link"
        onClick={() => {
          if (window.confirm('학습 기록을 모두 지울까요? 되돌릴 수 없어요.\n(필요하면 먼저 설정에서 백업해 주세요)')) record.resetAll()
        }}
      >
        학습 기록 초기화
      </button>
    </>
  )
}

function SentenceList({ title, ids }: { title: string; ids: string[] }) {
  if (ids.length === 0) return null
  return (
    <section className="card">
      <strong>{title} {ids.length}</strong>
      <ul className="sentence-list">
        {ids.map((id) => {
          const s = sentences.get(id)
          if (!s) return null
          return (
            <li key={id}>
              <Link to={studyLink(id)}>
                <span lang="zh-CN">{s.chinese}</span>
                <small>{s.kind === 'customer' ? s.meaning : s.korean}</small>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
