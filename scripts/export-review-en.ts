// 영어 콘텐츠(content/en/)를 그대로 뽑아 외부 AI 검증용 문서를 만든다.
// 사용: npm run export:review:en          → 검토가 필요한 것(verified가 아닌 것)만
//       npm run export:review:en -- --all → 전체
//       npm run export:review:en -- --part=1 → 카테고리 1~4만 (2 → 5~9, 역할극 포함) — 나눠서 검증받을 때
// 프롬프트는 파일에 넣지 않고 화면에만 출력한다 (Claude가 채팅으로 전달).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

interface Line { id?: string; english: string; hangul: string; meaning?: string; korean?: string; note?: string }
interface Item {
  id: string; category: string; scenario: string
  verificationStatus: string
  reviewNote?: string
  customer?: Line; variants?: Line[]; responses?: Line[]; alternatives?: Line[]
  keywords?: { word: string; hangul: string; meaning: string }[]
}

const root = join(import.meta.dirname, '..')
const read = (p: string) => JSON.parse(readFileSync(join(root, p), 'utf8'))
const categories: { id: string; order: number; name: string }[] = read('content/categories.json')
const ALL = process.argv.includes('--all')
const allItems: Item[] = readdirSync(join(root, 'content/en/items'))
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => read(`content/en/items/${f}`))
const PART = Number(process.argv.find((a) => a.startsWith('--part='))?.split('=')[1] ?? 0)
const inPart = (it: Item) => {
  if (!PART) return true
  const order = categories.find((c) => c.id === it.category)?.order ?? 99
  return PART === 1 ? order <= 4 : order > 4
}
const items = (ALL ? allItems : allItems.filter((i) => i.verificationStatus !== 'verified')).filter(inPart)

interface Step { speaker: string; ref?: string; accept?: string[]; label?: string; branches?: { label: string; steps: Step[] }[] }
interface Rp { id: string; title: string; goal: string; steps: Step[] }
const lineById = new Map<string, Line>()
for (const it of allItems) {
  if (it.customer) lineById.set(it.id, it.customer)
  for (const v of it.variants ?? []) lineById.set(v.id!, v)
  for (const r of it.responses ?? []) lineById.set(r.id!, r)
}
const refs = (steps: Step[]): string[] => steps.flatMap((s) => [...(s.ref ? [s.ref] : []), ...(s.accept ?? []), ...(s.branches ?? []).flatMap((b) => refs(b.steps))])
// 역할극은 문장이 바뀐 상황이 하나라도 들어 있으면 함께 검토 (구조는 중국어와 같음)
const reviewIds = new Set(items.flatMap((it) => [it.id, ...(it.variants ?? []).map((v) => v.id!), ...(it.responses ?? []).map((r) => r.id!)]))
const roleplays = PART === 1 ? [] : (read('content/roleplays.json') as Rp[]).filter((rp) => refs(rp.steps).every((id) => lineById.has(id)) && (ALL || refs(rp.steps).some((id) => reviewIds.has(id))))
function dialog(steps: Step[], indent = ''): string[] {
  return steps.flatMap((st) => {
    if (st.speaker === 'branch') return [`${indent}- [${st.label ?? 'branch'}]`, ...(st.branches ?? []).flatMap((b) => [`${indent}  - (${b.label})`, ...dialog(b.steps, indent + '    ')])]
    const l = lineById.get(st.ref!)
    const reply = st.accept?.[0] ? lineById.get(st.accept[0]) : undefined
    return [
      ...(l ? [`${indent}- ${st.speaker === 'customer' ? 'Customer' : 'Staff'}: ${l.english} (${l.meaning ?? l.korean})`] : []),
      ...(reply ? [`${indent}- Staff: ${reply.english} (${reply.korean})`] : []),
    ]
  })
}

const esc = (s: string) => s.replace(/\|/g, '\\|')
const row = (id: string, role: string, l: Line) =>
  `| ${id} | ${role} | ${esc(l.english)} | ${esc(l.hangul)} | ${esc(l.meaning ?? l.korean ?? '')} |`

const PROMPT_KO = `당신은 미국 영어 원어민이자 외국인 대상 영어 교사(ESL)이며, 고급 백화점(명품 가방·지갑·의류) 판매 경험이 있습니다. 한국어도 읽을 수 있습니다.

첨부한 파일은 한국 백화점 판매직원이 영어권·외국인 고객을 응대하기 위해 배울 영어 문장입니다. 학습자는 영어를 전혀 못 하는 초보입니다. "Customer"는 고객이 하는 말로 학습자는 알아듣기만 하면 되고, "Staff"는 학습자가 직접 말해야 하는 문장입니다. "Staff-ALT"는 대신 써도 되는 표현, "Keywords"는 핵심 단어 설명입니다. "한글 발음"은 영어를 모르는 학습자를 위해 실제 들리는 소리에 가깝게 한글로 적은 참고용 표기입니다.

다음은 의도적인 규칙이니 이것 때문에 문장을 고치지 마세요.
- 직원은 확인하기 전에 재고·할인·교환/환불·결제 수단을 단정하면 안 되므로 "Let me check…" 형태의 답이 많습니다.
- 직원 문장은 공손하되 짧고 쉬운 표현(초급 수준)을 우선합니다. 더 공손하지만 길고 어려운 표현으로 바꾸지 마세요.
- 미국 영어 철자·표현 기준입니다.
- 한글 발음은 연음·플랩(t→ㄹ, 예: little 리를, take a look 테이커 룩)을 반영해 실제 들리는 소리에 가깝게 적었습니다. r/l, f/p, v/b, th 구분은 한글로 불가능하다는 것을 전제로 합니다.

문장마다 다음을 검토해 주세요.
1. 문법·철자 오류
2. 자연스러움 — 미국 매장 직원·손님이 실제로 쓰는 표현인지 (부자연스러우면 쉬운 대안 제안)
3. 한국어 뜻과 영어의 불일치
4. 직원 문장이 무례하거나, 딱딱하거나, 지나치게 단정적인지
5. 한글 발음이 실제 미국 영어 발음과 크게 다른지 (한국인이 그대로 읽었을 때 원어민이 알아듣기 어려운 경우만)

출력: 문제가 있는 문장만 표로 적어 주세요: | ID | 문제 유형(1-5) | 현재 | 수정 제안 | 이유 |. 마지막에 "나머지 모두 OK"라고 적어 주세요. 확실하지 않은 의견은 "불확실"로 표시해 주세요.

마지막으로, 영어를 쓰는 외국인 고객이 한국 백화점에서 가방·지갑·옷을 살 때 자주 하지만 위에 없는 말 10가지를 한국어 뜻과 함께 적어 주세요.

결과는 마크다운(.md) 파일로 만들어 주세요.`

const PROMPT_ZH = `你是以美式英语为母语的人，也是对外英语（ESL）教师，并有高端百货商场（奢侈品箱包、钱包、服装）的销售经验。你也能读懂韩语。

附件是给韩国百货商场销售员学习的英语句子，用来接待说英语的外国顾客。学员完全不会英语，是零基础。"Customer"是顾客说的话（学员只需要听懂），"Staff"是学员需要会说的话，"Staff-ALT"是可以替换的说法，"Keywords"是生词解释。"한글 발음"是给不懂英语的学员看的韩文注音，尽量接近实际听到的发音，仅供参考。

以下是故意的规则，请不要因此修改句子：
- 店员在确认之前不能断定有库存、有折扣、可以退换货或可以用某种支付方式，所以很多回答是"Let me check…"。
- 店员的句子要礼貌，但优先简短、简单（初级水平）。不要改成更礼貌但更长更难的说法。
- 以美式英语拼写和表达为准。
- 韩文注音反映连读和闪音（t→ㄹ，如 little 리를，take a look 테이커 룩）。前提是韩文无法区分 r/l、f/p、v/b、th。

请逐句检查：
1. 语法、拼写错误
2. 是否自然 —— 美国商店的店员和顾客真的会这么说吗？如果不自然，请给出简单的替换说法
3. 韩文意思与英语是否一致
4. 店员的话有没有不礼貌、生硬或过于断定的地方
5. 韩文注音是否与实际美式发音差别很大（只列出韩国人照着读时母语者很难听懂的情况）

输出格式：只列出有问题的句子，用表格：| ID | 问题类型(1-5) | 现在 | 建议修改 | 理由 |。最后写"其余全部OK"。不确定的意见请标注"不确定"。

最后请补充：说英语的外国顾客在韩国百货商场买包、钱包、衣服时，还经常说哪些上面没有的话？请列出10句，附韩文意思。

请把结果整理成 Markdown（.md）文件给我。`

const PROMPT_EN = `You are a native speaker of American English, an ESL teacher, and you have sales experience in a high-end department store (luxury bags, wallets, clothing). You can also read Korean.

The attached file contains English sentences for Korean department-store sales staff to learn for serving English-speaking foreign customers. The learners are absolute beginners who do not speak English at all. "Customer" lines only need to be understood; "Staff" lines must be spoken by the learner; "Staff-ALT" are acceptable alternatives; "Keywords" are vocabulary notes. "한글 발음" is a Korean-alphabet approximation of how the sentence actually sounds, for learners who cannot read English (reference only).

Do NOT change sentences because of the following deliberate rules:
- Staff must not confirm stock, discounts, returns/exchanges or payment methods before checking, so many answers are "Let me check…".
- Staff lines should be polite but short and simple (beginner level). Do not replace them with more formal but longer or harder phrases.
- American English spelling and usage.
- The Hangul reading reflects linking and flapping (t → ㄹ, e.g. little 리를, take a look 테이커 룩). It is understood that Hangul cannot distinguish r/l, f/p, v/b or th.

Check every sentence for:
1. Grammar or spelling errors
2. Naturalness — would staff or customers in a US store really say this? If not, suggest a simple alternative
3. Mismatch between the Korean meaning and the English
4. Staff lines that sound rude, stiff, or too assertive
5. Hangul readings that differ so much from real American pronunciation that a native speaker would struggle to understand a Korean reading them aloud (only list serious cases)

Output: list ONLY the sentences with problems in a table: | ID | Issue type (1-5) | Current | Suggested | Reason |. Then write "All others OK". Mark uncertain comments as "uncertain".

Finally: list 10 more things English-speaking foreign customers commonly say when buying bags, wallets or clothes in a Korean department store that are not covered above, with the Korean meaning.

Please deliver the result as a Markdown (.md) file.`

const out: string[] = []
out.push(`# 영어 콘텐츠 교차검증 요청 (외부 AI용)${PART ? ` — ${PART}부` : ''}`)
out.push('')
out.push(`- 생성일: ${new Date().toISOString().slice(0, 10)} · 상황 ${items.length}개`)
out.push('- 이 문서는 `npm run export:review:en`으로 앱 콘텐츠(content/en/)에서 자동 생성됩니다. 직접 고치지 말고 JSON을 고친 뒤 다시 생성하세요.')
out.push('- 사용법: 이 파일을 그대로 첨부하고, 프롬프트는 Claude가 채팅으로 알려 준 것을 붙여 넣으세요. (파일에는 프롬프트를 넣지 않음)')
out.push('')
out.push('---')
out.push('')
out.push('## Sentences to review')
for (const cat of [...categories].sort((a, b) => a.order - b.order)) {
  const list = items.filter((i) => i.category === cat.id)
  if (list.length === 0) continue
  out.push('')
  out.push(`### ${cat.name} (${cat.id})`)
  out.push('')
  out.push('| ID | Role | English | 한글 발음 | 한국어 뜻 |')
  out.push('|---|---|---|---|---|')
  for (const it of list) {
    out.push(`| ${it.id} | Situation | ${esc(it.scenario)} | | |`)
    if (it.customer) out.push(row(it.id, 'Customer', it.customer))
    for (const v of it.variants ?? []) out.push(row(v.id!, 'Customer', v))
    for (const r of it.responses ?? []) out.push(row(r.id!, 'Staff', r))
    ;(it.alternatives ?? []).forEach((a, n) => out.push(row(`${it.id}-ALT${n + 1}`, 'Staff-ALT', a)))
    if (it.keywords?.length)
      out.push(`| ${it.id}-KW | Keywords | ${esc(it.keywords.map((k) => `${k.word} (${k.hangul}): ${k.meaning}`).join(' / '))} | | |`)
  }
}
const notes = items.filter((i) => i.reviewNote)
if (notes.length) {
  out.push('', '## Please check especially (author notes)', '')
  for (const i of notes) out.push(`- ${i.id}: ${i.reviewNote}`)
}
if (roleplays.length) {
  out.push('', '## Role-play dialogues (please check that each dialogue flows naturally)')
  for (const rp of roleplays) out.push('', `### ${rp.id} ${rp.title} — ${rp.goal}`, '', ...dialog(rp.steps))
}
out.push('')

const fileName = `검증요청_영어콘텐츠${PART ? `_${PART}부` : ''}.md`
writeFileSync(join(root, fileName), out.join('\n'))
console.log(`\n===== 프롬프트 (한국어) =====\n${PROMPT_KO}\n\n===== 프롬프트 (中文) =====\n${PROMPT_ZH}\n\n===== 프롬프트 (English) =====\n${PROMPT_EN}\n`)
console.log(`${fileName} 생성 완료 (상황 ${items.length}개, 역할극 ${roleplays.length}개, ${ALL ? '전체' : '검토 필요한 것만'})`)
