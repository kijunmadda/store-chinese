// content/ 폴더의 JSON을 앱에 불러온다. items/ 폴더에 파일을 추가하면 자동으로 포함된다.
import categoriesJson from '../../content/categories.json'
import roleplaysJson from '../../content/roleplays.json'
import type { Category, ContentItem, CustomerLine, Roleplay, StaffLine } from './types'
import { validateContent, type Issue } from './validate'

const itemFiles = import.meta.glob<ContentItem[]>('../../content/items/*.json', { eager: true, import: 'default' })

const rawItems = Object.values(itemFiles).flat()

export const contentIssues: Issue[] = validateContent(categoriesJson, rawItems, roleplaysJson)
export const contentErrors = contentIssues.filter((i) => i.level === 'error')

// 오류가 있는 항목은 앱이 멈추지 않도록 제외한다 (빌드 단계 검사에서 이미 막히지만 이중 안전장치)
const brokenIds = new Set(contentErrors.map((e) => e.where.split(' ')[0]))

export const categories: Category[] = [...(categoriesJson as Category[])].sort((a, b) => a.order - b.order)
export const items: ContentItem[] = (rawItems as ContentItem[]).filter((it) => !brokenIds.has(it.id))
export const roleplays: Roleplay[] = roleplaysJson as Roleplay[]

export type Sentence =
  | ({ kind: 'customer'; id: string; itemId: string } & CustomerLine)
  | ({ kind: 'staff'; itemId: string } & StaffLine)

/** 모든 문장(고객 질문·변형·직원 답변)을 ID로 찾는 표 */
export const sentences = new Map<string, Sentence>()
for (const it of items) {
  if (it.customer) sentences.set(it.id, { kind: 'customer', id: it.id, itemId: it.id, ...it.customer })
  for (const v of it.variants ?? []) sentences.set(v.id, { kind: 'customer', itemId: it.id, ...v })
  for (const r of it.responses ?? []) sentences.set(r.id, { kind: 'staff', itemId: it.id, ...r })
}

export const contentStats = {
  items: items.length,
  sentences: sentences.size,
  verified: items.filter((i) => i.verificationStatus === 'verified').length,
  roleplays: roleplays.length,
}
