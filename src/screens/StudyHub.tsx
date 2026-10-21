import { Link } from 'react-router-dom'

const menus = [
  { to: '/study/sentences', icon: '📖', title: '문장 학습', desc: '중국어·병음·뜻 익히기' },
  { to: '/study/listen', icon: '🎧', title: '고객 질문 듣기', desc: '듣고 의미 고르기' },
  { to: '/study/speak', icon: '🗣', title: '말하기 연습', desc: '한국어 보고 중국어 떠올리기' },
  { to: '/study/roleplay', icon: '💬', title: '상황별 역할극', desc: '짧은 대화 이어가기' },
  { to: '/study/tones', icon: '🎵', title: '발음·성조', desc: '성조 듣기·혼동 발음 구별' },
]

export default function StudyHub() {
  return (
    <>
      <header className="screen-header">
        <h1>학습</h1>
      </header>
      <ul className="menu-list">
        {menus.map((m) => (
          <li key={m.to}>
            <Link to={m.to} className="menu-item">
              <span className="menu-icon" aria-hidden="true">{m.icon}</span>
              <span className="menu-text">
                <strong>{m.title}</strong>
                <small>{m.desc}</small>
              </span>
              <span className="chevron" aria-hidden="true">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
