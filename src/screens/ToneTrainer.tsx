import { useState } from 'react'
import BackHeader from '../components/BackHeader'
import SpeakButtons from '../components/SpeakButtons'
import Zh from '../components/Zh'
import { record } from '../store'
import {
  buildPriceQuestion,
  buildToneQuestion,
  pinyinOf,
  spokenTones,
  stripTones,
  toneData,
  toneLabel,
  tonesOf,
  wonToKorean,
  type TonePair,
  type ToneWord,
} from '../tones'
import { shuffle } from '../util'

type Tab = 'basics' | 'listen' | 'pairs' | 'price' | 'rules'
const TABS: { key: Tab; label: string }[] = [
  { key: 'basics', label: '기초' },
  { key: 'listen', label: '성조 듣기' },
  { key: 'pairs', label: '헷갈리는 쌍' },
  { key: 'price', label: '가격 듣기' },
  { key: 'rules', label: '성조 변화' },
]

export default function ToneTrainer() {
  const [tab, setTab] = useState<Tab>('basics')
  return (
    <>
      <BackHeader title="발음·성조" />
      <div className="tab-scroll" role="tablist" aria-label="훈련 종류">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`chip ${tab === t.key ? 'on' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'basics' && <Basics />}
      {tab === 'listen' && <ToneQuiz />}
      {tab === 'pairs' && <PairQuiz />}
      {tab === 'price' && <PriceQuiz />}
      {tab === 'rules' && <Rules />}
    </>
  )
}

function WordLine({ w, showMeaning = true }: { w: ToneWord; showMeaning?: boolean }) {
  return (
    <div className="variant">
      <Zh chinese={w.word} pinyin={pinyinOf(w)} showPinyin size="md" />
      {showMeaning && <p className="meaning sm">{w.meaning}</p>}
    </div>
  )
}

function Basics() {
  return (
    <section className="card study-card">
      <p className="note">중국어는 같은 소리라도 높낮이(성조)에 따라 뜻이 달라져요. 아래 네 글자를 들어 보고 따라 해 보세요.</p>
      {toneData.basics.map((w) => (
        <WordLine key={w.word} w={w} />
      ))}
      <p className="note">
        <strong>경성</strong>: 짧고 가볍게 읽는 소리 (성조 표시 없음). 예) 谢谢 xièxie 의 두 번째 xie
      </p>
    </section>
  )
}

/** 공통: 정답/오답 표시가 있는 보기 버튼들 */
function Options<T extends string | number>({ options, answer, chosen, onChoose, render }: {
  options: T[]
  answer: T
  chosen: T | null
  onChoose: (o: T) => void
  render: (o: T) => React.ReactNode
}) {
  return (
    <div className="options">
      {options.map((o) => {
        const state = chosen === null ? '' : o === answer ? 'right' : o === chosen ? 'wrong' : 'dim'
        return (
          <button key={String(o)} type="button" className={`option ${state}`} disabled={chosen !== null} onClick={() => onChoose(o)}>
            {render(o)}
          </button>
        )
      })}
    </div>
  )
}

function Score({ right, total }: { right: number; total: number }) {
  return total > 0 ? <p className="flow-sub">맞힌 문제 {right} / {total}</p> : null
}

function ToneQuiz() {
  const [q, setQ] = useState(() => buildToneQuestion())
  const [chosen, setChosen] = useState<string | null>(null)
  const [hint, setHint] = useState(false)
  const [score, setScore] = useState({ right: 0, total: 0 })
  const next = () => {
    setQ(buildToneQuestion())
    setChosen(null)
    setHint(false)
  }
  return (
    <>
      <Score {...score} />
      <section className="card study-card">
        <p className="scenario">단어를 듣고 <strong>성조 조합</strong>을 고르세요</p>
        {chosen === null ? (
          <>
            <SpeakButtons text={q.word.word} />
            {hint ? (
              <p className="meaning">{stripTones(pinyinOf(q.word))} · {q.word.meaning}</p>
            ) : (
              <button type="button" className="text-link" onClick={() => setHint(true)}>소리가 안 나요 · 힌트 보기</button>
            )}
          </>
        ) : (
          <WordLine w={q.word} />
        )}
        <Options
          options={q.options}
          answer={q.answer}
          chosen={chosen}
          onChoose={(o) => {
            setChosen(o)
            setScore((s) => ({ right: s.right + (o === q.answer ? 1 : 0), total: s.total + 1 }))
            record.step('tones')
          }}
          render={(o) => <span className="option-zh">{o.replace(/-/g, ' - ')}성</span>}
        />
        {chosen !== null && (
          <button type="button" className="btn-secondary strong" onClick={next}>다음 ›</button>
        )}
      </section>
    </>
  )
}

function PairQuiz() {
  const pick = () => {
    const pair = toneData.pairs[Math.floor(Math.random() * toneData.pairs.length)]
    return { pair, target: Math.random() < 0.5 ? pair.a : pair.b, order: shuffle([pair.a, pair.b]) }
  }
  const [q, setQ] = useState<{ pair: TonePair; target: ToneWord; order: ToneWord[] }>(pick)
  const [chosen, setChosen] = useState<string | null>(null)
  const [score, setScore] = useState({ right: 0, total: 0 })
  return (
    <>
      <Score {...score} />
      <section className="card study-card">
        <p className="scenario">어느 쪽을 말했을까요? <span className="label">{q.pair.note}</span></p>
        {chosen === null ? <SpeakButtons text={q.target.word} /> : <WordLine w={q.target} />}
        <Options
          options={q.order.map((w) => w.word)}
          answer={q.target.word}
          chosen={chosen}
          onChoose={(o) => {
            setChosen(o)
            setScore((s) => ({ right: s.right + (o === q.target.word ? 1 : 0), total: s.total + 1 }))
            record.step('tones')
          }}
          render={(o) => {
            const w = q.order.find((x) => x.word === o)!
            return (
              <>
                <span className="option-zh" lang="zh-CN">{w.word} <small>{pinyinOf(w)}</small></span>
                <small>{w.meaning}</small>
              </>
            )
          }}
        />
        {chosen !== null && (
          <button type="button" className="btn-secondary strong" onClick={() => { setQ(pick()); setChosen(null) }}>다음 ›</button>
        )}
      </section>
    </>
  )
}

function PriceQuiz() {
  const [q, setQ] = useState(() => buildPriceQuestion())
  const [chosen, setChosen] = useState<number | null>(null)
  const [hint, setHint] = useState(false)
  const [score, setScore] = useState({ right: 0, total: 0 })
  return (
    <>
      <Score {...score} />
      <section className="card study-card">
        <p className="scenario">금액을 듣고 맞는 가격을 고르세요</p>
        {chosen === null && !hint ? (
          <>
            <SpeakButtons text={q.chinese} />
            <button type="button" className="text-link" onClick={() => setHint(true)}>소리가 안 나요 · 글자로 보기</button>
          </>
        ) : (
          <Zh chinese={q.chinese} pinyin={q.pinyin} showPinyin size="md" />
        )}
        <Options
          options={q.options}
          answer={q.amount}
          chosen={chosen}
          onChoose={(o) => {
            setChosen(o)
            setScore((s) => ({ right: s.right + (o === q.amount ? 1 : 0), total: s.total + 1 }))
            record.step('tones')
          }}
          render={(o) => <span className="option-zh">{wonToKorean(o)}</span>}
        />
        {chosen !== null && (
          <>
            <p className="note">
              万(wàn) = 만. 중국어도 한국어처럼 <strong>만 단위</strong>로 끊어 읽어요. 350만 원 → 三百五十<strong>万</strong>
            </p>
            <button type="button" className="btn-secondary strong" onClick={() => { setQ(buildPriceQuestion()); setChosen(null); setHint(false) }}>다음 ›</button>
          </>
        )}
      </section>
    </>
  )
}

function Rules() {
  const threeThree = toneData.words.filter((w) => {
    const t = tonesOf(w)
    return t[0] === 3 && t[1] === 3
  })
  return (
    <>
      <section className="card study-card">
        <strong>① 3성 + 3성 → 앞 글자는 2성처럼</strong>
        <p className="note">병음은 원래 성조로 적지만, 말할 때는 앞을 2성으로 올려요.</p>
        {[{ word: '你好', syllables: ['nǐ', 'hǎo'], meaning: '안녕하세요' }, ...threeThree].map((w) => (
          <div key={w.word} className="variant">
            <WordLine w={w} />
            <p className="note">적힌 성조 {toneLabel(tonesOf(w))} → 실제 발음 {toneLabel(spokenTones(tonesOf(w)))}</p>
          </div>
        ))}
      </section>
      <section className="card study-card">
        <strong>② 一(yī)의 변화</strong>
        <p className="note">4성 앞 → 2성 yí, 1·2·3성 앞 → 4성 yì. 이 앱의 병음은 바뀐 성조로 적어 두었어요.</p>
        <WordLine w={{ word: '一下', syllables: ['yí', 'xià'], meaning: '한번 ~해 보다 (4성 앞)' }} />
        <WordLine w={{ word: '一点', syllables: ['yì', 'diǎn'], meaning: '조금 (3성 앞)' }} />
      </section>
      <section className="card study-card">
        <strong>③ 不(bù)의 변화</strong>
        <p className="note">4성 앞 → 2성 bú, 그 밖에는 4성 bù.</p>
        <WordLine w={{ word: '不太', syllables: ['bú', 'tài'], meaning: '별로 ~않다 (4성 앞)' }} />
        <WordLine w={{ word: '不好', syllables: ['bù', 'hǎo'], meaning: '좋지 않다 (3성 앞)' }} />
      </section>
    </>
  )
}
