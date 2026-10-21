import { describe, expect, it } from 'vitest'
import { browserKind, isMobile } from './install'

const UA = {
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  chrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
}

describe('브라우저 구분 (설치 안내 문구 선택)', () => {
  it('삼성 인터넷은 크롬 문자열이 있어도 삼성으로 인식', () => expect(browserKind(UA.samsung)).toBe('samsung'))
  it('아이폰 사파리', () => expect(browserKind(UA.iphone)).toBe('ios-safari'))
  it('안드로이드 크롬', () => expect(browserKind(UA.chrome)).toBe('android-chrome'))
  it('PC', () => {
    expect(browserKind(UA.windows)).toBe('other')
    expect(isMobile(UA.windows)).toBe(false)
    expect(isMobile(UA.samsung)).toBe(true)
  })
})
