import { useEffect, useState } from 'react'
import BackupSection from '../components/BackupSection'
import InstallGuide from '../components/InstallGuide'
import { contentErrors, contentStats } from '../content'
import { setPrefs, usePrefs } from '../prefs'
import { getChineseVoices, speak, SpeechError, ttsSupported, voiceListAvailable } from '../speech'
import { record } from '../store'

const TEST_SENTENCE = '我帮你确认一下库存，请稍等。'
const RATES = [
  { value: 0.7, label: '느리게' },
  { value: 0.85, label: '조금 느리게' },
  { value: 1, label: '보통' },
]

export default function Settings() {
  const prefs = usePrefs()
  const [voices, setVoices] = useState<SpeechSynthesisVoice[] | null>(null)
  const [test, setTest] = useState<{ state: 'idle' | 'playing' | 'ok' | 'error'; message?: string }>({ state: 'idle' })

  useEffect(() => {
    getChineseVoices(3000).then(setVoices)
  }, [])

  const runTest = async () => {
    setTest({ state: 'playing' })
    try {
      const result = await speak(TEST_SENTENCE)
      setTest(result === 'ended' ? { state: 'ok' } : { state: 'idle' })
    } catch (e) {
      setTest({ state: 'error', message: e instanceof SpeechError ? e.message : '재생하지 못했어요' })
    }
  }

  const noVoice = voices !== null && voices.length === 0

  return (
    <>
      <header className="screen-header">
        <h1>설정</h1>
      </header>

      <section className="card settings-group" aria-labelledby="voice-title">
        <h2 id="voice-title">중국어 음성</h2>

        {!ttsSupported ? (
          <p className="caution">이 브라우저는 음성 재생을 지원하지 않아요. 크롬이나 사파리로 열어 주세요.</p>
        ) : voices === null ? (
          <p className="note">기기의 중국어 음성을 찾는 중…</p>
        ) : noVoice && !voiceListAvailable() ? (
          <>
            <p className="note">
              이 브라우저는 음성 목록을 알려 주지 않아요. 아래 <strong>테스트 재생</strong>으로 중국어가 들리는지 확인해 주세요.
            </p>
            {test.state === 'error' && <VoiceHelp />}
          </>
        ) : noVoice ? (
          <VoiceHelp />
        ) : (
          <label className="field">
            <span>목소리 ({voices.length}개 사용 가능)</span>
            <select value={prefs.voiceURI} onChange={(e) => setPrefs({ voiceURI: e.target.value })}>
              <option value="">자동 선택 (추천)</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} · {v.lang}
                  {v.localService ? '' : ' · 인터넷 필요'}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="field">
          <span>재생 속도</span>
          <div className="segmented three" role="radiogroup" aria-label="재생 속도">
            {RATES.map((r) => (
              <button key={r.value} type="button" role="radio" aria-checked={prefs.rate === r.value} aria-selected={prefs.rate === r.value} onClick={() => setPrefs({ rate: r.value })}>
                {r.label}
              </button>
            ))}
          </div>
          <small className="note">🐢 버튼은 이 설정과 상관없이 항상 느리게 읽어요.</small>
        </div>

        <div className="field">
          <span>음성 테스트</span>
          <p className="test-sentence" lang="zh-CN">{TEST_SENTENCE}</p>
          <button type="button" className="btn-secondary strong" onClick={runTest} disabled={test.state === 'playing' || !ttsSupported}>
            {test.state === 'playing' ? '재생 중…' : '🔊 테스트 재생'}
          </button>
          {test.state === 'ok' && (
            <p className="note">
              중국어로 들렸다면 정상이에요. 소리가 안 났다면 무음 모드와 음량을, 한국어·영어 발음처럼 들렸다면 아래 안내대로 중국어 음성을 설치해 주세요.
            </p>
          )}
          {test.state === 'error' && <p className="caution">⚠ {test.message}</p>}
        </div>
      </section>

      <section className="card settings-group" aria-labelledby="view-title">
        <h2 id="view-title">화면</h2>
        <label className="switch-row">
          <span>병음 표시</span>
          <input type="checkbox" checked={prefs.showPinyin} onChange={(e) => setPrefs({ showPinyin: e.target.checked })} />
        </label>
        <div className="field">
          <span>하루 목표</span>
          <div className="segmented three" role="radiogroup" aria-label="하루 목표 판 수">
            {[1, 2, 3].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={prefs.dailyGoal === n} aria-selected={prefs.dailyGoal === n} onClick={() => setPrefs({ dailyGoal: n })}>
                {n}판 (약 {n * 3}분)
              </button>
            ))}
          </div>
          <small className="note">매일 조금씩이 한 번에 몰아서 하는 것보다 훨씬 오래 기억에 남아요.</small>
        </div>
      </section>

      <InstallGuide />
      <BackupSection />

      <button
        type="button"
        className="text-link"
        onClick={() => {
          if (window.confirm('학습 기록을 모두 지울까요? 되돌릴 수 없어요.\n(필요하면 먼저 위에서 백업해 주세요)')) record.resetAll()
        }}
      >
        학습 기록 초기화
      </button>

      <section className="card" aria-label="콘텐츠 정보">
        <strong>콘텐츠 정보</strong>
        <p className="note">
          상황 {contentStats.items}개 · 문장 {contentStats.sentences}개 · 역할극 {contentStats.roleplays}개
          <br />
          학습 가능 {contentStats.items}개{contentStats.pending > 0 && ` · 검토 대기 ${contentStats.pending}개 (확인 후 자동으로 추가돼요)`}
          {contentErrors.length > 0 && ` · 오류 ${contentErrors.length}개`}
        </p>
      </section>
      <p className="note">
        학습 기록은 이 기기의 브라우저에만 저장됩니다. 기기 변경이나 데이터 삭제에 대비해 정기적으로 백업해 주세요.
      </p>
    </>
  )
}

function VoiceHelp() {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  return (
    <div className="voice-help">
      <p className="caution">⚠ 이 기기에서 중국어 음성을 찾지 못했어요. 글자와 병음으로는 계속 학습할 수 있어요.</p>
      {isIOS ? (
        <ol>
          <li>설정 → 손쉬운 사용 → 읽기 및 말하기 → 음성</li>
          <li>중국어(중국 본토) 선택 → 음성 하나 내려받기</li>
          <li>사파리를 완전히 닫았다가 다시 열기</li>
        </ol>
      ) : (
        <ol>
          <li>설정 → 일반 → 글자 읽어주기(TTS) 출력</li>
          <li>기본 엔진: 삼성 TTS 엔진 → 옆의 톱니바퀴(설정) → 언어 설치 → 중국어 내려받기</li>
          <li>(삼성 엔진에 중국어가 없으면) 기본 엔진을 Google 음성 엔진으로 바꾸고 → 음성 데이터 설치 → 중국어(중국)</li>
          <li>삼성 인터넷을 완전히 닫았다가 다시 열기</li>
        </ol>
      )}
      <small className="note">메뉴 이름은 기기·버전마다 조금 다를 수 있어요.</small>
    </div>
  )
}
