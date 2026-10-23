import { useState } from 'react'
import { Link } from 'react-router-dom'
import { categories, items } from '../content'
import { computeStats, studyLink } from '../stats'
import { today, useStudyState } from '../store'

/** 문장 모음 — 배운 표현을 찾아보는 곳. 학습은 홈의 '학습 시작'에서. */
export default function Collection() {
  const state = useStudyState()
  const stats = computeStats(state, today())
  const [cat, setCat] = useState<string>('all')
  const order = (id: string) => categories.find((c) => c.id === id)?.order ?? 99
  const list = items
    .filter((it) => it.learningModes.includes('study') && (cat === 'all' || it.category === cat))
    .sort((a, b) => order(a.category) - order(b.category))

  /** 익숙한 정도: 상황 안 문장들의 복습 상자 단계 중 가장 낮은 것 (0~5) */
  const level = (ids: string[]) => {
    const boxes = ids.map((id) => state.progress[id]?.box ?? -1)
    return Math.min(...boxes)
  }

  return (
    <>
      <header className="screen-header">
        <h1>문장 모음</h1>
        <p className="note">배운 표현 {stats.learned} / {stats.total} · 눌러서 자세히 보기</p>
      </header>

      <div className="tab-scroll" role="tablist" aria-label="카테고리">
        <button type="button" role="tab" aria-selected={cat === 'all'} className={`chip ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>
          전체
        </button>
        {categories
          .filter((c) => items.some((it) => it.category === c.id))
          .map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} className={`chip ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>
              {c.name}
            </button>
          ))}
      </div>

      <ul className="sentence-list card">
        {list.map((it) => {
          const ids = [...(it.customer ? [it.id] : []), ...(it.responses ?? []).map((r) => r.id)]
          const lv = level(ids)
          const main = it.responses?.[0] ?? null
          return (
            <li key={it.id}>
              <Link to={studyLink(ids[0])}>
                <span lang="zh-CN">{main ? main.chinese : it.customer!.chinese}</span>
                <small>
                  {it.customer && main ? `🎧 ${it.customer.chinese} → ` : ''}
                  {main ? main.korean : it.customer!.meaning}
                </small>
                <span className="mastery" aria-label={lv < 0 ? '아직 안 배움' : `익숙함 ${lv}/5`}>
                  {lv < 0 ? '새 표현' : '●'.repeat(Math.max(lv, 0)) + '○'.repeat(5 - Math.max(lv, 0))}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      <section className="card">
        <strong>더 연습하기</strong>
        <ul className="menu-list" style={{ marginTop: 10 }}>
          <li><Link to="/study/roleplay" className="menu-item"><span className="menu-icon">💬</span><span className="menu-text"><strong>대화 연습</strong><small>상황별 역할극 5개</small></span><span className="chevron">›</span></Link></li>
          <li><Link to="/study/tones" className="menu-item"><span className="menu-icon">🎵</span><span className="menu-text"><strong>발음·성조·가격 듣기</strong><small>성조 구별, 금액 알아듣기</small></span><span className="chevron">›</span></Link></li>
        </ul>
      </section>
    </>
  )
}
