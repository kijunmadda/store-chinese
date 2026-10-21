import { Link } from 'react-router-dom'
import BackHeader from '../components/BackHeader'
import { categories, items } from '../content'

export default function SentenceCategories() {
  return (
    <>
      <BackHeader title="문장 학습" />
      <p className="note">카테고리를 고르세요. 문장은 상황별로 묶여 있습니다.</p>
      <ul className="menu-list">
        {categories.map((c) => {
          const count = items.filter((i) => i.category === c.id && i.learningModes.includes('study')).length
          if (count === 0)
            return (
              <li key={c.id} className="menu-item disabled">
                <span className="menu-text">
                  <strong>{c.name}</strong>
                  <small>콘텐츠 준비 중</small>
                </span>
              </li>
            )
          return (
            <li key={c.id}>
              <Link to={`/study/sentences/${c.id}`} className="menu-item">
                <span className="menu-text">
                  <strong>{c.name}</strong>
                  <small>상황 {count}개</small>
                </span>
                <span className="chevron" aria-hidden="true">›</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
