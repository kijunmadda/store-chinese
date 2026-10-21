import { describe, expect, it } from 'vitest'
import { buildPriceQuestion, buildToneQuestion, spokenTones, stripTones, toneData, toneLabel, toneOf, tonesOf, wonToChinese, wonToKorean } from './tones'

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32
    return seed / 2 ** 32
  }
}

describe('성조 계산', () => {
  it('성조 기호에서 성조를 읽음 (경성 = 0)', () => {
    expect(['mā', 'má', 'mǎ', 'mà', 'ma', 'lǜ'].map(toneOf)).toEqual([1, 2, 3, 4, 0, 4])
  })
  it('3성 + 3성 → 앞은 2성으로 들림', () => {
    expect(spokenTones([3, 3])).toEqual([2, 3])
    expect(spokenTones([3, 4])).toEqual([3, 4])
  })
  it('모든 단어의 음절 수 = 글자 수, 성조 기호가 하나 이하', () => {
    for (const w of [...toneData.basics, ...toneData.words, ...toneData.pairs.flatMap((p) => [p.a, p.b])]) {
      expect(w.syllables.length).toBe([...w.word].length)
      for (const s of w.syllables) expect([...s].filter((c) => toneOf(c) > 0).length).toBeLessThanOrEqual(1)
    }
  })
  it('"성조만 다름" 쌍은 성조를 뺀 병음이 같아야 함', () => {
    for (const p of toneData.pairs.filter((p) => p.kind === 'tone')) {
      expect(stripTones(p.a.syllables.join(''))).toBe(stripTones(p.b.syllables.join('')))
      expect(toneLabel(tonesOf(p.a))).not.toBe(toneLabel(tonesOf(p.b)))
    }
  })
  it('성조 듣기 문제: 보기 4개, 정답 포함, 중복 없음, 3성 연속 단어 제외', () => {
    for (let s = 1; s <= 200; s++) {
      const q = buildToneQuestion(seeded(s))
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options).size).toBe(4)
      expect(q.options).toContain(q.answer)
      expect(q.options).not.toContain('3-3')
    }
  })
})

describe('가격 읽기', () => {
  it.each([
    [3_500_000, '三百五十万韩元', 'sān bǎi wǔ shí wàn hányuán'],
    [1_280_000, '一百二十八万韩元', 'yì bǎi èr shí bā wàn hányuán'],
    [120_000, '十二万韩元', 'shí èr wàn hányuán'],
    [20_000, '两万韩元', 'liǎng wàn hányuán'],
    [2_000_000, '两百万韩元', 'liǎng bǎi wàn hányuán'],
    [220_000, '二十二万韩元', 'èr shí èr wàn hányuán'],
    [10_000, '一万韩元', 'yí wàn hányuán'],
    [11_000_000, '一千一百万韩元', 'yì qiān yì bǎi wàn hányuán'],
    [1_050_000, '一百零五万韩元', 'yì bǎi líng wǔ wàn hányuán'],
    [53_000, '五万三千韩元', 'wǔ wàn sān qiān hányuán'],
    [50_500, '五万零五百韩元', 'wǔ wàn líng wǔ bǎi hányuán'],
    [8_000, '八千韩元', 'bā qiān hányuán'],
    [2_000, '两千韩元', 'liǎng qiān hányuán'],
  ])('%i원 → %s', (amount, zh, py) => {
    expect(wonToChinese(amount)).toEqual({ chinese: zh, pinyin: py })
  })
  it('한국식 표기', () => {
    expect(wonToKorean(3_500_000)).toBe('350만 원')
    expect(wonToKorean(53_000)).toBe('5만 3,000원')
  })
  it('가격 문제: 보기 4개, 정답 포함, 중복 없음, 모두 읽을 수 있는 금액', () => {
    for (let s = 1; s <= 300; s++) {
      const q = buildPriceQuestion(seeded(s))
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options).size).toBe(4)
      expect(q.options).toContain(q.amount)
      for (const o of q.options) expect(() => wonToChinese(o)).not.toThrow()
    }
  })
})
