// 콘텐츠 검사기. 앱(실행 중 안내)과 scripts/validate-content.ts(빌드 전 검사)가 함께 사용한다.
// Node에서 바로 실행되도록 다른 파일을 import하지 않고, 타입만 지우면 되는 문법만 쓴다.

export interface Issue {
  level: 'error' | 'warning'
  where: string
  message: string
}

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']
const STATUSES = ['draft', 'reviewed', 'verified']
const MODES = ['study', 'listen', 'speak', 'roleplay', 'rescue']
const HAN = /\p{Script=Han}/u
// 병음에 쓰일 수 있는 글자: 로마자, 성조 기호 붙은 모음, ü, 공백, 문장부호, 생략부호
const PINYIN_CHARS = /^[a-zA-ZāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüÜĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙ\s,.!?'’\-…:;"()]+$/

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

export function validateContent(categories: unknown, items: unknown, roleplays: unknown): Issue[] {
  const issues: Issue[] = []
  const err = (where: string, message: string) => issues.push({ level: 'error', where, message })
  const warn = (where: string, message: string) => issues.push({ level: 'warning', where, message })

  // 카테고리
  const categoryIds = new Set<string>()
  if (!Array.isArray(categories)) err('categories.json', '목록([ ]) 형식이어야 합니다')
  else
    categories.forEach((c, i) => {
      if (!isObj(c) || !isStr(c.id) || !isStr(c.name)) err(`categories.json #${i + 1}`, 'id와 name이 필요합니다')
      else categoryIds.add(c.id)
    })

  // 문장 ID (고객 질문 = 항목 ID, 변형 = -V, 직원 답변 = -A)
  const sentenceIds = new Map<string, string>()
  const customerIds = new Set<string>()
  const staffIds = new Set<string>()
  const addId = (id: string, where: string) => {
    if (sentenceIds.has(id)) err(where, `ID "${id}"가 중복됩니다 (${sentenceIds.get(id)}에도 있음)`)
    else sentenceIds.set(id, where)
  }

  const checkLine = (line: unknown, where: string, meaningKey: 'meaning' | 'korean') => {
    if (!isObj(line)) return err(where, '문장 정보가 없습니다')
    if (!isStr(line.chinese)) err(where, '중국어(chinese)가 비어 있습니다')
    else if (!HAN.test(line.chinese)) err(where, `중국어에 한자가 없습니다: "${line.chinese}"`)
    if (!isStr(line.pinyin)) err(where, '병음(pinyin)이 비어 있습니다')
    else {
      if (HAN.test(line.pinyin)) err(where, `병음에 한자가 섞여 있습니다: "${line.pinyin}"`)
      else if (!PINYIN_CHARS.test(line.pinyin)) warn(where, `병음에 예상치 못한 글자가 있습니다: "${line.pinyin}"`)
    }
    if (!isStr(line[meaningKey])) err(where, `한국어 뜻(${meaningKey})이 비어 있습니다`)
  }

  if (!Array.isArray(items)) {
    err('items', '목록([ ]) 형식이어야 합니다')
    return issues
  }

  items.forEach((item, i) => {
    const at = isObj(item) && isStr(item.id) ? item.id : `#${i + 1}`
    if (!isObj(item)) return err(at, '항목 형식이 잘못되었습니다')
    if (!isStr(item.id)) err(at, 'id가 없습니다')
    else addId(item.id, at)
    if (!isStr(item.category) || !categoryIds.has(item.category))
      err(at, `카테고리 "${String(item.category)}"가 categories.json에 없습니다`)
    if (!isStr(item.scenario)) err(at, '상황(scenario)이 비어 있습니다')
    if (!DIFFICULTIES.includes(item.difficulty as string)) err(at, `난이도 값이 잘못되었습니다: ${String(item.difficulty)}`)
    if (!STATUSES.includes(item.verificationStatus as string))
      err(at, `검토 상태 값이 잘못되었습니다: ${String(item.verificationStatus)}`)
    else if (item.verificationStatus !== 'verified') warn(at, `검토 상태가 "${item.verificationStatus}"입니다`)
    if (typeof item.policyDependent !== 'boolean') err(at, 'policyDependent는 true 또는 false여야 합니다')
    if (!Array.isArray(item.learningModes) || item.learningModes.length === 0) err(at, '학습 방식(learningModes)이 없습니다')
    else item.learningModes.forEach((m) => MODES.includes(m as string) || err(at, `알 수 없는 학습 방식: ${String(m)}`))

    const responses = Array.isArray(item.responses) ? item.responses : []
    if (!item.customer && responses.length === 0) err(at, '고객 문장(customer)과 직원 답변(responses) 중 하나는 있어야 합니다')

    if (item.customer !== undefined) {
      checkLine(item.customer, `${at} 고객`, 'meaning')
      if (isStr(item.id)) customerIds.add(item.id)
    }
    if (Array.isArray(item.variants))
      item.variants.forEach((v, j) => {
        const vat = isObj(v) && isStr(v.id) ? v.id : `${at} 변형 #${j + 1}`
        if (!isObj(v) || !isStr(v.id)) return err(vat, '변형 표현에 id가 없습니다')
        if (isStr(item.id) && !v.id.startsWith(`${item.id}-V`)) warn(vat, `변형 ID는 "${item.id}-V숫자" 형식을 권장합니다`)
        addId(v.id, vat)
        customerIds.add(v.id)
        checkLine(v, vat, 'meaning')
      })
    responses.forEach((r, j) => {
      const rat = isObj(r) && isStr(r.id) ? r.id : `${at} 답변 #${j + 1}`
      if (!isObj(r) || !isStr(r.id)) return err(rat, '직원 답변에 id가 없습니다')
      if (isStr(item.id) && !r.id.startsWith(`${item.id}-A`)) warn(rat, `답변 ID는 "${item.id}-A" 형식을 권장합니다`)
      addId(r.id, rat)
      staffIds.add(r.id)
      checkLine(r, rat, 'korean')
    })
    if (Array.isArray(item.alternatives)) item.alternatives.forEach((a, j) => checkLine(a, `${at} 대체 표현 #${j + 1}`, 'korean'))
    if (Array.isArray(item.keywords))
      item.keywords.forEach((k, j) => {
        if (!isObj(k) || !isStr(k.word) || !isStr(k.pinyin) || !isStr(k.meaning))
          err(`${at} 핵심 단어 #${j + 1}`, 'word, pinyin, meaning이 모두 필요합니다')
      })
  })

  // 역할극
  if (!Array.isArray(roleplays)) err('roleplays.json', '목록([ ]) 형식이어야 합니다')
  else {
    const rpIds = new Set<string>()
    const checkSteps = (steps: unknown, at: string) => {
      if (!Array.isArray(steps) || steps.length === 0) return err(at, '단계(steps)가 없습니다')
      steps.forEach((s, k) => {
        const sat = `${at} 단계 ${k + 1}`
        if (!isObj(s)) return err(sat, '단계 형식이 잘못되었습니다')
        if (s.speaker === 'branch') {
          if (!Array.isArray(s.branches) || s.branches.length < 2) return err(sat, '분기는 2개 이상이어야 합니다')
          s.branches.forEach((b, n) => (isObj(b) ? checkSteps(b.steps, `${sat} 분기 ${n + 1}`) : err(sat, '분기 형식 오류')))
          return
        }
        if (s.speaker !== 'customer' && s.speaker !== 'staff') return err(sat, `speaker 값이 잘못되었습니다: ${String(s.speaker)}`)
        const pool = s.speaker === 'customer' ? customerIds : staffIds
        if (!isStr(s.ref) || !pool.has(s.ref)) err(sat, `참조한 ${s.speaker === 'customer' ? '고객 문장' : '직원 답변'} "${String(s.ref)}"가 없습니다`)
        for (const key of ['choices', 'accept'] as const) {
          const list = s[key]
          if (list === undefined) continue
          if (!Array.isArray(list)) err(sat, `${key}는 목록이어야 합니다`)
          else list.forEach((id) => staffIds.has(id as string) || err(sat, `${key}의 직원 답변 "${String(id)}"가 없습니다`))
        }
      })
    }
    roleplays.forEach((rp, i) => {
      const at = isObj(rp) && isStr(rp.id) ? `역할극 ${rp.id}` : `역할극 #${i + 1}`
      if (!isObj(rp) || !isStr(rp.id) || !isStr(rp.title)) return err(at, 'id와 title이 필요합니다')
      if (rpIds.has(rp.id)) err(at, '역할극 ID가 중복됩니다')
      rpIds.add(rp.id)
      checkSteps(rp.steps, at)
    })
  }

  return issues
}
