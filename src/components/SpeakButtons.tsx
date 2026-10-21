import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { speak, SpeechError, stopSpeech } from '../speech'

type State = 'idle' | 'playing' | 'playing-slow' | 'error'

/** 🔊 듣기 / 🐢 느리게 버튼. 재생이 안 되면 안내만 띄우고 텍스트 학습은 그대로 계속할 수 있다. */
export default function SpeakButtons({ text, id, rate }: { text: string; id?: string; rate?: number }) {
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState('')
  const playId = useRef(0)

  // 화면에서 사라지면(다른 문장·화면으로 이동) 소리를 멈춘다
  useEffect(() => () => {
    playId.current++
    stopSpeech()
  }, [])

  const play = async (slow: boolean) => {
    const myId = ++playId.current
    setState(slow ? 'playing-slow' : 'playing')
    setError('')
    try {
      await speak(text, { id, slow, rate })
      if (playId.current === myId) setState('idle')
    } catch (e) {
      if (playId.current !== myId) return
      setState('error')
      setError(e instanceof SpeechError ? e.message : '음성을 재생하지 못했어요')
    }
  }

  return (
    <div className="speak">
      <div className="speak-buttons">
        <button type="button" className={`speak-btn ${state === 'playing' ? 'playing' : ''}`} onClick={() => play(false)} aria-label="듣기">
          🔊 <span>듣기</span>
        </button>
        <button type="button" className={`speak-btn ${state === 'playing-slow' ? 'playing' : ''}`} onClick={() => play(true)} aria-label="느리게 듣기">
          🐢 <span>느리게</span>
        </button>
      </div>
      {state === 'error' && (
        <p className="speak-error" role="status">
          {error}. 글자와 병음으로 계속 학습할 수 있어요. <Link to="/settings">음성 설정 확인</Link>
        </p>
      )}
    </div>
  )
}
