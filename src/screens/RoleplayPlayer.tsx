import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BackHeader from '../components/BackHeader'
import Zh from '../components/Zh'
import { items, roleplays, sentences, type Sentence } from '../content'
import type { RoleplayStep } from '../content/types'
import { usePrefs } from '../prefs'
import { record } from '../store'
import { shuffle } from '../util'

interface Bubble {
  key: string
  sentence: Sentence
  rate?: number
  /** 직원 답변: 사용자가 고른 답이 맞았는지 (선택형일 때만) */
  verdict?: 'right' | 'wrong'
}

type Pending =
  | { kind: 'choose'; options: Sentence[]; accept: string[] }
  | { kind: 'say'; accept: string[] }
  | { kind: 'staff'; ref: string }
  | { kind: 'branch'; step: RoleplayStep }
  | { kind: 'continue' }
  | { kind: 'done' }

export default function RoleplayPlayer() {
  const { id } = useParams()
  const rp = roleplays.find((r) => r.id === id)
  if (!rp)
    return (
      <>
        <BackHeader title="상황별 역할극" />
        <div className="card empty">
          <p>역할극을 찾을 수 없어요.</p>
          <Link to="/study/roleplay" className="link">목록으로</Link>
        </div>
      </>
    )
  return <RoleplayRun key={rp.id} roleplayId={rp.id} />
}

/** 역할극 진행. embedded: '오늘의 학습' 안에 넣을 때 — 머리글을 숨기고 끝나면 onFinish 호출 */
export function RoleplayRun({ roleplayId, embedded = false, onFinish }: { roleplayId: string; embedded?: boolean; onFinish?: () => void }) {
  const rp = roleplays.find((r) => r.id === roleplayId)!
  const { showPinyin } = usePrefs()
  const [queue, setQueue] = useState<RoleplayStep[]>(rp.steps)
  const [pos, setPos] = useState(0)
  const [log, setLog] = useState<Bubble[]>([])
  const [pending, setPending] = useState<Pending>({ kind: 'continue' })
  const [mistakes, setMistakes] = useState<string[]>([])
  const bottom = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  /** n번째 단계로 들어간다: 고객 말은 바로 말풍선으로 보여 주고, 사용자가 할 일을 정한다 */
  const enter = (q: RoleplayStep[], n: number) => {
    setQueue(q)
    setPos(n)
    const step = q[n]
    if (!step) {
      setPending({ kind: 'done' })
      record.step('roleplay')
      return
    }
    if (step.speaker === 'branch') return setPending({ kind: 'branch', step })
    if (step.speaker === 'staff') return setPending({ kind: 'staff', ref: step.ref! })
    // 고객
    const s = sentences.get(step.ref!)
    if (s) setLog((l) => [...l, { key: `${n}-${s.id}`, sentence: s, rate: step.rate }])
    const accept = step.accept ?? []
    if (accept.length === 0) return setPending({ kind: 'continue' })
    if (step.choices?.length) {
      const options = shuffle(step.choices.map((c) => sentences.get(c)).filter((x): x is Sentence => !!x))
      return setPending({ kind: 'choose', options, accept })
    }
    setPending({ kind: 'say', accept })
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    enter(rp.steps, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 새 말풍선이 생기면 아래로 스크롤
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [log.length, pending.kind])

  const addStaff = (sid: string, verdict?: Bubble['verdict']) => {
    const s = sentences.get(sid)
    if (s) setLog((l) => [...l, { key: `${pos}-${sid}-staff`, sentence: s, verdict }])
  }

  const next = () => enter(queue, pos + 1)

  const choose = (opt: Sentence, accept: string[]) => {
    const ok = accept.includes(opt.id)
    addStaff(opt.id, ok ? 'right' : 'wrong')
    if (!ok) {
      // 틀린 선택이면 추천 답변을 이어서 보여 주고, 추천 답변을 복습 목록에 넣는다
      addStaff(accept[0], 'right')
      record.spoke(accept[0], 'again')
      setMistakes((m) => [...m, accept[0]])
    }
    setPending({ kind: 'continue' })
  }

  const usedStaff = useMemo(
    () => [...new Map(log.filter((b) => b.sentence.kind === 'staff' && b.verdict !== 'wrong').map((b) => [b.sentence.id, b.sentence])).values()],
    [log],
  )

  return (
    <>
      {embedded ? <h2 className="flow-sub">💬 {rp.title}</h2> : <BackHeader title={rp.title} />}
      <section className="card intro">
        <p>
          <span className="label">목표</span> {rp.goal}
        </p>
      </section>

      <div className="chat" aria-live="polite">
        {log.map((b) => (
          <ChatBubble key={b.key} bubble={b} showPinyin={showPinyin} />
        ))}
      </div>

      <div className="action card">
        {pending.kind === 'choose' && (
          <>
            <p className="block-title">어떻게 대답할까요?</p>
            <div className="options">
              {pending.options.map((o) => (
                <button key={o.id} type="button" className="option" onClick={() => choose(o, pending.accept)}>
                  <span lang="zh-CN" className="option-zh">{o.chinese}</span>
                  {showPinyin && <small>{o.pinyin}</small>}
                </button>
              ))}
            </div>
          </>
        )}

        {pending.kind === 'say' && (
          <>
            <p className="block-title">고객에게 중국어로 직접 대답해 보세요</p>
            <p className="note">힌트: {(sentences.get(pending.accept[0]) as Extract<Sentence, { kind: 'staff' }>)?.korean}</p>
            <button
              type="button"
              className="reveal"
              onClick={() => {
                addStaff(pending.accept[0])
                setPending({ kind: 'continue' })
              }}
            >
              말해 본 뒤 추천 답변 보기
            </button>
          </>
        )}

        {pending.kind === 'staff' && (
          <>
            <p className="block-title">직원 차례 — 중국어로 말해 보세요</p>
            <p className="prompt-ko">{(sentences.get(pending.ref) as Extract<Sentence, { kind: 'staff' }>)?.korean}</p>
            <button
              type="button"
              className="reveal"
              onClick={() => {
                addStaff(pending.ref)
                setPending({ kind: 'continue' })
              }}
            >
              말해 본 뒤 정답 보기
            </button>
          </>
        )}

        {pending.kind === 'branch' && (
          <>
            <p className="block-title">{pending.step.label ?? '상황을 골라 주세요'}</p>
            <div className="options">
              {pending.step.branches!.map((b) => (
                <button
                  key={b.label}
                  type="button"
                  className="option"
                  onClick={() => {
                    const q = [...queue.slice(0, pos + 1), ...b.steps, ...queue.slice(pos + 1)]
                    enter(q, pos + 1)
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </>
        )}

        {pending.kind === 'continue' && (
          <button type="button" className="btn-secondary strong" onClick={next}>
            {pos + 1 >= queue.length ? '대화 마치기' : '계속 ›'}
          </button>
        )}

        {pending.kind === 'done' && (
          <>
            <p className="feedback right">대화를 끝까지 이어갔어요! 👏</p>
            {mistakes.length > 0 && <p className="note">틀린 대답 {mistakes.length}개는 복습 목록에 넣어 두었어요.</p>}
            {rp.reviewKeywords && (
              <div className="chips">
                {rp.reviewKeywords.map((k) => (
                  <span key={k} className="chip on" lang="zh-CN">{k}</span>
                ))}
              </div>
            )}
            <p className="block-title">오늘 쓴 직원 표현 — 한 번 더 따라 말해 보세요</p>
            {usedStaff.map((s) => (
              <div key={s.id} className="variant">
                <Zh id={s.id} chinese={s.chinese} pinyin={s.pinyin} showPinyin size="md" />
                {s.kind === 'staff' && <p className="meaning sm">{s.korean}</p>}
              </div>
            ))}
            {usedStaff.some((s) => items.find((it) => it.id === s.itemId)?.alternatives?.length) && (
              <p className="note">문장 학습 화면에서 같은 뜻의 다른 표현도 확인할 수 있어요.</p>
            )}
            {embedded ? (
              <button type="button" className="btn-secondary strong" onClick={onFinish}>
                다음 단계 ›
              </button>
            ) : (
            <div className="pager">
              <Link to="/study/roleplay" className="btn-secondary">목록으로</Link>
              <button
                type="button"
                className="btn-secondary strong"
                onClick={() => {
                  setLog([])
                  setMistakes([])
                  enter(rp.steps, 0)
                }}
              >
                다시 하기
              </button>
            </div>
            )}
          </>
        )}
      </div>
      <div ref={bottom} />
    </>
  )
}

function ChatBubble({ bubble, showPinyin }: { bubble: Bubble; showPinyin: boolean }) {
  const [showMeaning, setShowMeaning] = useState(false)
  const s = bubble.sentence
  const isCustomer = s.kind === 'customer'
  return (
    <div className={`bubble ${isCustomer ? 'customer' : 'staff'} ${bubble.verdict ?? ''}`}>
      <span className="bubble-who">
        {isCustomer ? '🎧 고객' : '🗣 직원'}
        {bubble.verdict === 'wrong' && ' · 어울리지 않는 대답'}
        {bubble.verdict === 'right' && ' · 좋은 대답'}
        {bubble.rate && bubble.rate > 1 && ' · 빠르게 말함'}
        {bubble.rate && bubble.rate < 1 && ' · 천천히 말함'}
      </span>
      <Zh id={s.id} chinese={s.chinese} pinyin={s.pinyin} showPinyin={showPinyin} rate={bubble.rate} size="md" />
      {isCustomer ? (
        showMeaning ? (
          <p className="meaning sm">{s.meaning}</p>
        ) : (
          <button type="button" className="text-link" onClick={() => setShowMeaning(true)}>
            뜻 보기
          </button>
        )
      ) : (
        <p className="meaning sm">{s.korean}</p>
      )}
    </div>
  )
}
