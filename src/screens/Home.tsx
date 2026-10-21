import { Link } from 'react-router-dom'
import { sentences } from '../content'
import { computeStats, studyLink } from '../stats'
import { today, useStudyState } from '../store'

export default function Home() {
  const state = useStudyState()
  const stats = computeStats(state, today())
  const todayDone = state.days[today()]?.completed
  const recent = Object.entries(state.progress)
    .filter(([id, p]) => p.lastStudiedAt && sentences.get(id)?.kind === 'staff')
    .sort((a, b) => (b[1].lastStudiedAt ?? '').localeCompare(a[1].lastStudiedAt ?? ''))
    .slice(0, 3)
    .map(([id]) => sentences.get(id)!)

  return (
    <>
      <header className="screen-header">
        <p className="eyebrow">매장 중국어</p>
        <h1>{todayDone ? '오늘 학습 완료! 👏' : '오늘도 5분만 해요'}</h1>
      </header>

      <Link to="/today" className="btn-primary">
        {todayDone ? '한 번 더 학습하기' : '오늘의 학습 시작'}
        <small>복습 → 새 문장 3개 → 듣기 → 말하기 → 역할극</small>
      </Link>

      <section className="card stats" aria-label="학습 현황">
        <div><strong>{stats.studyDays}</strong><span>누적 학습일</span></div>
        <div><strong>{stats.percent}%</strong><span>전체 진행률</span></div>
        <Link to="/review"><strong>{stats.dueIds.length}</strong><span>복습 대기</span></Link>
      </section>

      <section className="shortcut-grid" aria-label="바로가기">
        <Link to="/study/listen" className="shortcut">🎧<span>고객 질문 듣기</span></Link>
        <Link to="/study/roleplay" className="shortcut">💬<span>상황별 역할극</span></Link>
      </section>

      <Link to="/rescue" className="card rescue">
        <strong>위기 탈출 카드</strong>
        <span>못 알아들었을 때 바로 꺼내 쓰는 문장</span>
      </Link>

      {recent.length > 0 && (
        <section className="card">
          <strong>최근 학습한 문장</strong>
          <ul className="sentence-list">
            {recent.map((s) => (
              <li key={s.id}>
                <Link to={studyLink(s.id)}>
                  <span lang="zh-CN">{s.chinese}</span>
                  <small>{s.kind === 'staff' ? s.korean : s.meaning}</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
