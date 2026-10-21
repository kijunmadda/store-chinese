// 앱에 들어가는 콘텐츠(content/)를 그대로 뽑아 외부 AI 검증용 문서를 만든다.
// 사용: npm run export:review  →  검증요청_콘텐츠.md 생성
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

interface Line { id?: string; chinese: string; pinyin: string; meaning?: string; korean?: string }
interface Item {
  id: string; category: string; scenario: string
  customer?: Line; variants?: Line[]; responses?: Line[]; alternatives?: Line[]
  keywords?: { word: string; pinyin: string; meaning: string }[]
}

const root = join(import.meta.dirname, '..')
const read = (p: string) => JSON.parse(readFileSync(join(root, p), 'utf8'))
const categories: { id: string; order: number; name: string }[] = read('content/categories.json')
const items: Item[] = readdirSync(join(root, 'content/items'))
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => read(`content/items/${f}`))

const esc = (s: string) => s.replace(/\|/g, '\\|')
const row = (id: string, role: string, l: Line) =>
  `| ${id} | ${role} | ${esc(l.chinese)} | ${esc(l.pinyin)} | ${esc(l.meaning ?? l.korean ?? '')} |`

const PROMPT_ZH = `你是一位在中国大陆长大的汉语母语者，同时是对外汉语教师，并有高端百货商场（奢侈品箱包、钱包、服装）的销售经验。

下面是给韩国百货商场销售员学习的中文句子，用来接待中国顾客。表格中"顾客"是顾客说的话（学员只需要听懂），"店员"是店员说的话（学员需要会说），"店员-替换"是可以替换使用的说法，"关键词"是生词解释。

请注意以下前提，不要因此修改句子：
- 店员的句子故意统一使用"你"而不是"您"。礼貌程度通过"请问""麻烦你""不好意思""一下"等来补充。
- 拼音规则：标声调符号；"一""不"按实际变调标注（如 yíxià、bú tài）；三声连读保持原调（如 nǐ hǎo）；轻声不标调号（如 kànkan、xièxie）。
- 店员在确认之前不能断定有库存、有折扣或可以退换货，所以很多回答是"我帮你确认一下"。

请逐句检查：
1. 简体字是否有错误
2. 拼音的拼写和声调是否有错误（按上面的规则）
3. 韩文意思是否与中文一致（如果你看不懂韩文，请写"跳过"）
4. 是不是中国大陆的人在商场里真的会说的自然表达？如果不自然，请给出更自然的说法
5. 店员的话有没有不礼貌、生硬或过于断定的地方

输出格式：只列出有问题的句子，用表格：| ID | 问题类型(1-5) | 现在的句子 | 建议修改 | 理由 |。没有问题的句子不用列出，最后写一句"其余全部OK"。不确定的意见请标注"不确定"。

最后请补充：中国顾客在韩国百货商场买包、钱包、衣服时，还经常说哪些上面没有的话？请列出10句，附拼音和简单的中文说明。`

const PROMPT_EN = `You are a native Mandarin speaker raised in mainland China, a teacher of Chinese as a foreign language, and you have sales experience in a high-end department store (luxury bags, wallets, clothing).

Below are Chinese sentences for Korean department-store sales staff to learn for serving Chinese customers. "顾客 (customer)" lines only need to be understood by the learner; "店员 (staff)" lines must be spoken by the learner; "店员-替换" are acceptable alternatives; "关键词" are vocabulary notes.

Do NOT change sentences because of the following deliberate rules:
- Staff lines intentionally use 你 instead of 您. Politeness is added with 请问 / 麻烦你 / 不好意思 / 一下.
- Pinyin rules: tone marks; 一 and 不 are written with their actual sandhi tones (yíxià, bú tài); third-tone sandhi is NOT written (nǐ hǎo); neutral tones have no mark (kànkan, xièxie).
- Staff must not confirm stock, discounts or return/exchange policies before checking, so many answers are "我帮你确认一下".

Check every sentence for:
1. Simplified character errors
2. Pinyin spelling or tone errors (under the rules above)
3. Mismatch between the Korean meaning and the Chinese (write "skip" if you cannot read Korean)
4. Naturalness — would a mainland Chinese person really say this in a store? If not, suggest a more natural version
5. Staff lines that sound rude, stiff, or too assertive

Output: list ONLY the sentences with problems in a table: | ID | Issue type (1-5) | Current | Suggested | Reason |. Then write "All others OK". Mark uncertain comments as "uncertain".

Finally: list 10 more things Chinese customers commonly say when buying bags, wallets or clothes in a Korean department store that are not covered above, with pinyin and a short explanation.`

const out: string[] = []
out.push('# 콘텐츠 교차검증 요청 (외부 AI용)')
out.push('')
out.push(`- 생성일: ${new Date().toISOString().slice(0, 10)} · 상황 ${items.length}개`)
out.push('- 이 문서는 `npm run export:review`로 앱 콘텐츠(content/)에서 자동 생성됩니다. 직접 고치지 말고 JSON을 고친 뒤 다시 생성하세요.')
out.push('- 사용법: 아래 **프롬프트(중국어 또는 영어) 하나**와 **"검증 대상 문장" 전체**를 함께 복사해 붙여 넣으세요.')
out.push('')
out.push('---')
out.push('')
out.push('## 프롬프트 — 中文 (딥시크 추천)')
out.push('')
out.push('```')
out.push(PROMPT_ZH)
out.push('```')
out.push('')
out.push('## 프롬프트 — English')
out.push('')
out.push('```')
out.push(PROMPT_EN)
out.push('```')
out.push('')
out.push('---')
out.push('')
out.push('## 검증 대상 문장')
for (const cat of [...categories].sort((a, b) => a.order - b.order)) {
  const list = items.filter((i) => i.category === cat.id)
  if (list.length === 0) continue
  out.push('')
  out.push(`### ${cat.name} (${cat.id})`)
  out.push('')
  out.push('| ID | 角色 | 中文 | 拼音 | 韩文意思 |')
  out.push('|---|---|---|---|---|')
  for (const it of list) {
    if (it.customer) out.push(row(it.id, '顾客', it.customer))
    for (const v of it.variants ?? []) out.push(row(v.id!, '顾客', v))
    for (const r of it.responses ?? []) out.push(row(r.id!, '店员', r))
    ;(it.alternatives ?? []).forEach((a, n) => out.push(row(`${it.id}-ALT${n + 1}`, '店员-替换', a)))
    if (it.keywords?.length)
      out.push(`| ${it.id}-KW | 关键词 | ${esc(it.keywords.map((k) => `${k.word} ${k.pinyin}: ${k.meaning}`).join(' / '))} | | |`)
  }
}
out.push('')

writeFileSync(join(root, '검증요청_콘텐츠.md'), out.join('\n'))
console.log(`검증요청_콘텐츠.md 생성 완료 (상황 ${items.length}개)`)
