// 중국어 음성 재생.
// 1순위: 미리 만든 MP3 (content/audio.json에 등록된 문장) — 기기와 상관없이 같은 목소리
// 2순위: 기기 음성(Speech Synthesis, zh-CN)
// 한 번에 하나만 재생하고, 새로 재생하거나 화면을 옮기면 이전 소리는 멈춘다.
import audioManifest from '../content/audio.json'
import { getPrefs } from './prefs'

const manifest = audioManifest as Record<string, string>

export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

let currentAudio: HTMLAudioElement | null = null
// 크롬은 재생 중인 utterance가 메모리에서 정리되면 끝 이벤트를 놓치는 문제가 있어 참조를 붙잡아 둔다
let currentUtterance: SpeechSynthesisUtterance | null = null

const isChinese = (v: SpeechSynthesisVoice) => /^zh([-_]|$)/i.test(v.lang)
const isMainland = (v: SpeechSynthesisVoice) => /^zh[-_](CN|Hans)/i.test(v.lang) || /^cmn/i.test(v.lang)

/** 기기의 중국어 음성 목록. 목록이 늦게 채워지는 기기(아이폰 등)를 위해 잠시 기다린다. */
export function getChineseVoices(timeoutMs = 2000): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported) return Promise.resolve([])
  const pick = () => {
    const zh = speechSynthesis.getVoices().filter(isChinese)
    // 중국 본토(zh-CN) 음성을 먼저, 대만·홍콩 음성은 뒤로
    return zh.sort((a, b) => Number(isMainland(b)) - Number(isMainland(a)))
  }
  const now = pick()
  if (now.length > 0) return Promise.resolve(now)
  return new Promise((resolve) => {
    const done = () => {
      speechSynthesis.removeEventListener('voiceschanged', done)
      clearTimeout(timer)
      resolve(pick())
    }
    const timer = setTimeout(done, timeoutMs)
    speechSynthesis.addEventListener('voiceschanged', done)
  })
}

/** 브라우저가 음성 목록 자체를 제공하는지 (비어 있으면 목록 확인 불가) */
export function voiceListAvailable(): boolean {
  return ttsSupported && speechSynthesis.getVoices().length > 0
}

export function stopSpeech() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  if (ttsSupported) speechSynthesis.cancel()
  currentUtterance = null
}

export class SpeechError extends Error {
  readonly reason: 'unsupported' | 'no-voice' | 'failed'
  constructor(reason: 'unsupported' | 'no-voice' | 'failed', message: string) {
    super(message)
    this.reason = reason
  }
}

/**
 * 문장을 읽는다. 끝까지 읽으면 resolve, 다른 소리로 끊기면 'interrupted'로 resolve, 실패하면 reject.
 * @param id  문장 ID — MP3가 등록돼 있으면 MP3를 재생
 * @param slow 느리게 듣기
 * @param rate 속도 직접 지정 (설정보다 우선)
 */
export async function speak(text: string, opts: { id?: string; slow?: boolean; rate?: number } = {}): Promise<'ended' | 'interrupted'> {
  stopSpeech()
  const { rate, voiceURI } = getPrefs()
  // rate: 역할극에서 '빠르게 말하는 고객'처럼 특정 속도가 필요할 때 지정
  const speed = opts.slow ? Math.min(rate, 0.6) : (opts.rate ?? rate)

  const file = opts.id ? manifest[opts.id] : undefined
  if (file) {
    const audio = new Audio(`${import.meta.env.BASE_URL}audio/${file}`)
    audio.playbackRate = speed
    currentAudio = audio
    return new Promise((resolve, reject) => {
      audio.onended = () => resolve('ended')
      audio.onpause = () => currentAudio !== audio && resolve('interrupted')
      audio.onerror = () => reject(new SpeechError('failed', '음성 파일을 불러오지 못했어요'))
      audio.play().catch(() => reject(new SpeechError('failed', '음성 파일을 재생하지 못했어요')))
    })
  }

  if (!ttsSupported) throw new SpeechError('unsupported', '이 브라우저는 음성 재생을 지원하지 않아요')
  const voices = await getChineseVoices()
  // 음성 목록을 아예 알려 주지 않는 브라우저(일부 삼성 인터넷 등)는 언어만 지정해 기기 기본 엔진에 맡긴다.
  // 목록은 있는데 중국어가 없을 때만 '음성 없음'으로 처리한다.
  if (voices.length === 0 && voiceListAvailable()) throw new SpeechError('no-voice', '이 기기에 중국어 음성이 없어요')
  const voice = voices.find((v) => v.voiceURI === voiceURI) ?? voices[0]

  const u = new SpeechSynthesisUtterance(text)
  if (voice) u.voice = voice
  u.lang = voice?.lang ?? 'zh-CN'
  u.rate = speed
  currentUtterance = u
  return new Promise((resolve, reject) => {
    u.onend = () => resolve(currentUtterance === u ? 'ended' : 'interrupted')
    u.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') resolve('interrupted')
      else reject(new SpeechError('failed', `음성 재생 오류 (${e.error})`))
    }
    // 안드로이드 크롬: cancel 직후 바로 speak 하면 무시되는 경우가 있어 한 박자 쉰다
    setTimeout(() => speechSynthesis.speak(u), 50)
  })
}
