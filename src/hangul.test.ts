import { describe, expect, it } from 'vitest'
import hangulJson from './generated/hangul.json'
import { items } from './content'
import { pinyinToHangul, syllableToHangul } from './hangul'

describe('병음 → 한글 발음', () => {
  it.each([
    ['ni', '니'], ['hao', '하오'], ['xie', '시에'], ['zhe', '저'], ['shi', '쉬'], ['sha', '샤'], ['shao', '샤오'], ['shei', '셰이'], ['shang', '샹'], ['xu', '쒸'], ['xue', '쒸에'], ['zi', '쯔'], ['si', '쓰'], ['ri', '르'],
    ['qian', '치엔'], ['jian', '지엔'], ['xiao', '시아오'], ['liu', '리우'], ['guo', '꿔'], ['huan', '환'], ['kuai', '콰이'],
    ['gui', '꾸이'], ['hui', '후이'], ['dui', '뚜이'], ['duo', '뚸'], ['shuo', '슈어'], ['shua', '슈아'], ['chuan', '촨'], ['zuo', '쭤'], ['zhuang', '좡'], ['ju', '쥐'], ['qu', '취'], ['quan', '취엔'],
    ['lü', '뤼'], ['nü', '뉘'], ['you', '요우'], ['yi', '이'], ['wo', '워'], ['yu', '위'], ['er', '얼'], ['men', '먼'], ['deng', '떵'],
    ['zhong', '종'], ['bu', '뿌'], ['ge', '꺼'], ['ren', '런'], ['ci', '츠'], ['chi', '츠'],
  ])('%s → %s', (py, hangul) => {
    expect(syllableToHangul(py)).toBe(hangul)
  })

  it('성조 숫자와 단어 띄어쓰기', () => {
    // 3성 연속은 실제 발음대로: 앞이 2성
    expect(pinyinToHangul([['Nǐ'], ['hǎo']])).toBe('니² 하오³')
    expect(pinyinToHangul([['Kě', 'yǐ']])).toBe('커²이³')
    expect(pinyinToHangul([['Xiè', 'xie']])).toBe('시에⁴시에')
    // 경성은 예사소리: 的 더, 子 즈
    expect(pinyinToHangul([['hǎo'], ['de']])).toBe('하오³ 더')
    expect(pinyinToHangul([['jìng', 'zi']])).toBe('징⁴즈')
    expect(pinyinToHangul([['dà']])).toBe('따⁴')
    expect(pinyinToHangul([['M'], ['mǎ']])).toBe('M 마³')
    expect(pinyinToHangul([['lǜ']])).toBe('뤼⁴')
    expect(pinyinToHangul([['nǚ', 'shì']])).toBe('뉘³쉬⁴')
    expect(pinyinToHangul([['nǎr']])).toBe('날³')
  })

  it('앱의 모든 중국어 문장·단어에 한글 발음이 만들어짐', () => {
    const map = hangulJson as Record<string, string>
    const missing: string[] = []
    for (const it of items) {
      const lines = [it.customer, ...(it.variants ?? []), ...(it.responses ?? []), ...(it.alternatives ?? [])].filter(Boolean) as { chinese: string }[]
      for (const l of lines) if (!map[l.chinese]) missing.push(l.chinese)
      for (const k of it.keywords ?? []) if (!map[k.word]) missing.push(k.word)
    }
    expect(missing).toEqual([])
  })
})
