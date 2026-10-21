import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import BackHeader from '../components/BackHeader'
import Zh from '../components/Zh'
import { categories, items } from '../content'
import type { ContentItem } from '../content/types'
import { useStoredToggle } from '../hooks'

type Mode = 'learn' | 'recall'

export default function SentenceStudy() {
  const { categoryId } = useParams()
  const [params, setParams] = useSearchParams()
  const [showPinyin, togglePinyin] = useStoredToggle('pref.showPinyin', true)

  const category = categories.find((c) => c.id === categoryId)
  const list = items.filter((i) => i.category === categoryId && i.learningModes.includes('study'))
  const mode: Mode = params.get('mode') === 'recall' ? 'recall' : 'learn'
  const index = Math.min(Math.max(Number(params.get('i')) || 0, 0), Math.max(list.length - 1, 0))

  const go = (next: { i?: number; mode?: Mode }) => {
    setParams({ i: String(next.i ?? index), mode: next.mode ?? mode }, { replace: true })
    window.scrollTo(0, 0)
  }

  if (!category || list.length === 0)
    return (
      <>
        <BackHeader title="문장 학습" />
        <div className="card empty">
          <p>이 카테고리에는 아직 문장이 없어요.</p>
          <Link to="/study/sentences" className="link">카테고리 목록으로</Link>
        </div>
      </>
    )

  const item = list[index]
  const isLast = index === list.length - 1

  return (
    <>
      <BackHeader
        title={category.name}
        right={
          <button type="button" className={`chip ${showPinyin ? 'on' : ''}`} onClick={togglePinyin} aria-pressed={showPinyin}>
            병음
          </button>
        }
      />

      <div className="segmented" role="tablist" aria-label="학습 방식">
        <button type="button" role="tab" aria-selected={mode === 'learn'} onClick={() => go({ mode: 'learn' })}>
          보고 익히기
        </button>
        <button type="button" role="tab" aria-selected={mode === 'recall'} onClick={() => go({ mode: 'recall' })}>
          떠올리기
        </button>
      </div>

      <div className="progress" aria-label={`${list.length}개 중 ${index + 1}번째`}>
        <div className="progress-track">
          <div className="progress-bar" style={{ width: `${((index + 1) / list.length) * 100}%` }} />
        </div>
        <span>{index + 1} / {list.length}</span>
      </div>

      {/* key: 문장이나 모드가 바뀌면 '정답 보기' 상태를 초기화 */}
      <StudyCard key={`${item.id}-${mode}`} item={item} mode={mode} showPinyin={showPinyin} />

      <nav className="pager" aria-label="문장 이동">
        <button type="button" className="btn-secondary" disabled={index === 0} onClick={() => go({ i: index - 1 })}>
          ‹ 이전
        </button>
        {isLast ? (
          <Link to="/study/sentences" className="btn-secondary strong">목록으로</Link>
        ) : (
          <button type="button" className="btn-secondary strong" onClick={() => go({ i: index + 1 })}>
            다음 ›
          </button>
        )}
      </nav>
    </>
  )
}

function StudyCard({ item, mode, showPinyin }: { item: ContentItem; mode: Mode; showPinyin: boolean }) {
  const recall = mode === 'recall'
  const [customerOpen, setCustomerOpen] = useState(!recall)
  const [staffOpen, setStaffOpen] = useState(!recall)
  const responses = item.responses ?? []

  return (
    <article className="card study-card">
      <p className="scenario">
        <span className="label">상황</span> {item.scenario}
        {item.policyDependent && <span className="badge">🔒 매장 규정 확인</span>}
      </p>

      {item.customer && (
        <section className="block">
          <h2 className="block-title">🎧 고객이 이렇게 말해요</h2>
          {/* 고객 문장은 '알아듣기'용: 떠올리기 모드에서는 중국어를 보여 주고 뜻을 가린다 */}
          <Zh chinese={item.customer.chinese} pinyin={item.customer.pinyin} showPinyin={showPinyin} />
          {customerOpen ? (
            <p className="meaning">{item.customer.meaning}</p>
          ) : (
            <button type="button" className="reveal" onClick={() => setCustomerOpen(true)}>
              무슨 뜻일까요? 뜻 보기
            </button>
          )}
          {customerOpen && item.variants && item.variants.length > 0 && (
            <details className="more">
              <summary>같은 뜻의 다른 표현 {item.variants.length}개</summary>
              {item.variants.map((v) => (
                <div key={v.id} className="variant">
                  <Zh chinese={v.chinese} pinyin={v.pinyin} showPinyin={showPinyin} size="md" />
                  <p className="meaning sm">{v.meaning}</p>
                </div>
              ))}
            </details>
          )}
        </section>
      )}

      {responses.map((r) => (
        <section key={r.id} className="block staff">
          <h2 className="block-title">🗣 {item.customer ? '이렇게 답해요' : '이렇게 말해요'}</h2>
          {/* 직원 문장은 '말하기'용: 떠올리기 모드에서는 한국어를 보여 주고 중국어를 가린다 */}
          <p className={recall ? 'prompt-ko' : 'meaning'}>{r.korean}</p>
          {staffOpen ? (
            <Zh chinese={r.chinese} pinyin={r.pinyin} showPinyin={showPinyin} />
          ) : (
            <button type="button" className="reveal" onClick={() => setStaffOpen(true)}>
              중국어로 떠올려 본 뒤 정답 보기
            </button>
          )}
          {r.note && <p className="caution">⚠ {r.note}</p>}
        </section>
      ))}

      {staffOpen && item.alternatives && item.alternatives.length > 0 && (
        <details className="more">
          <summary>이렇게 말해도 돼요 {item.alternatives.length}개</summary>
          {item.alternatives.map((a) => (
            <div key={a.chinese} className="variant">
              <Zh chinese={a.chinese} pinyin={a.pinyin} showPinyin={showPinyin} size="md" />
              <p className="meaning sm">{a.korean}</p>
            </div>
          ))}
        </details>
      )}

      {staffOpen && item.pattern && (
        <p className="pattern">
          <span className="label">문장 틀</span> <span lang="zh-CN">{item.pattern}</span>
        </p>
      )}

      {(staffOpen || responses.length === 0) && item.keywords && item.keywords.length > 0 && (
        <details className="more">
          <summary>핵심 단어 {item.keywords.length}개</summary>
          <dl className="keywords">
            {item.keywords.map((k) => (
              <div key={k.word}>
                <dt lang="zh-CN">{k.word}</dt>
                <dd>
                  <span className="kw-pinyin">{k.pinyin}</span> {k.meaning}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </article>
  )
}
