import { Link } from 'react-router-dom'
import BackHeader from '../components/BackHeader'
import { roleplays } from '../content'

const LEVEL: Record<string, string> = { beginner: '초급', intermediate: '중급', advanced: '응용' }

export default function RoleplayList() {
  return (
    <>
      <BackHeader title="상황별 역할극" />
      <p className="note">실제 매장 대화를 순서대로 이어가 보세요. 정해진 답이 하나만 있는 건 아니에요.</p>
      <ul className="menu-list">
        {roleplays.map((rp) => (
          <li key={rp.id}>
            <Link to={`/study/roleplay/${rp.id}`} className="menu-item">
              <span className="menu-icon" aria-hidden="true">💬</span>
              <span className="menu-text">
                <strong>{rp.title}</strong>
                <small>
                  {LEVEL[rp.difficulty] ?? rp.difficulty} · {rp.goal}
                </small>
              </span>
              <span className="chevron" aria-hidden="true">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
