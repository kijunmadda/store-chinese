import { Link } from 'react-router-dom'

// 1단계: 화면 틀만 구성. 숫자는 8단계(학습 기록 저장)에서 실제 값으로 연결된다.
export default function Home() {
  return (
    <>
      <header className="screen-header">
        <p className="eyebrow">매장 중국어</p>
        <h1>오늘도 5분만 해요</h1>
      </header>

      <Link to="/today" className="btn-primary">
        오늘의 학습 시작
        <small>복습 → 새 문장 3개 → 듣기 → 말하기 → 역할극</small>
      </Link>

      <section className="card stats" aria-label="학습 현황">
        <div><strong>0</strong><span>누적 학습일</span></div>
        <div><strong>0%</strong><span>전체 진행률</span></div>
        <div><strong>0</strong><span>복습 대기</span></div>
      </section>

      <section className="shortcut-grid" aria-label="바로가기">
        <Link to="/study/listen" className="shortcut">🎧<span>고객 질문 듣기</span></Link>
        <Link to="/study/roleplay" className="shortcut">💬<span>상황별 역할극</span></Link>
      </section>

      <Link to="/rescue" className="card rescue">
        <strong>위기 탈출 카드</strong>
        <span>못 알아들었을 때 바로 쓰는 5문장</span>
      </Link>
    </>
  )
}
