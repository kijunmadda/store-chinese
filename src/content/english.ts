// 영어 콘텐츠(content/en/)를 앱 내부 형식으로 바꾼다.
// 영어 JSON은 { english, hangul } 으로 적고, 앱 안에서는 중국어와 같은 칸을 쓴다:
//   english → chinese (학습할 문장)   hangul → pinyin (읽기 도움 — 영어는 한글 발음)
// Node에서 바로 실행되도록 다른 파일을 import하지 않는다 (scripts/validate-content.ts에서도 사용).

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)

function line(v: unknown): unknown {
  if (!isObj(v)) return v
  const { english, hangul, ...rest } = v
  return { ...rest, chinese: english, pinyin: hangul }
}

export function fromEnglish(items: unknown): unknown {
  if (!Array.isArray(items)) return items
  return items.map((it) => {
    if (!isObj(it)) return it
    const out: Obj = { ...it }
    if (it.customer !== undefined) out.customer = line(it.customer)
    for (const key of ['variants', 'responses', 'alternatives'] as const) if (Array.isArray(it[key])) out[key] = (it[key] as unknown[]).map(line)
    if (Array.isArray(it.keywords))
      out.keywords = (it.keywords as unknown[]).map((k) => {
        if (!isObj(k)) return k
        const { hangul, ...rest } = k
        return { ...rest, pinyin: hangul }
      })
    return out
  })
}
