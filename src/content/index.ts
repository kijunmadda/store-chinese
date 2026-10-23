// content/ 폴더의 JSON을 앱에 불러온다. items/ 폴더에 파일을 추가하면 자동으로 포함된다.
// 중국어: content/items/  ·  영어: content/en/items/ (상황 ID는 중국어와 같게 맞춘다 — 역할극을 함께 씀)
import categoriesJson from '../../content/categories.json'
import roleplaysJson from '../../content/roleplays.json'
import { LANG_ID } from '../langs'
import { fromEnglish } from './english'
import type { Category, ContentItem, CustomerLine, Roleplay, StaffLine } from './types'
import { validateContent, type Issue } from './validate'

const zhFiles = import.meta.glob<ContentItem[]>('../../content/items/*.json', { eager: true, import: 'default' })
const enFiles = import.meta.glob<unknown[]>('../../content/en/items/*.json', { eager: true, import: 'default' })

const rawItems = (LANG_ID === 'en' ? fromEnglish(Object.values(enFiles).flat()) : Object.values(zhFiles).flat()) as unknown[]

export const contentIssues: Issue[] = validateContent(categoriesJson, rawItems, LANG_ID === 'en' ? roleplaysFor(rawItems) : roleplaysJson, LANG_ID)
export const contentErrors = contentIssues.filter((i) => i.level === 'error')

/** 영어는 아직 문장이 다 갖춰지지 않았을 수 있어, 쓰는 문장이 모두 있는 역할극만 검사·사용한다 */
function roleplaysFor(list: unknown[]): unknown[] {
  const ids = new Set(
    (list as ContentItem[]).flatMap((it) => [it.id, ...(it.variants ?? []).map((v) => v.id), ...(it.responses ?? []).map((r) => r.id)]),
  )
  return (roleplaysJson as Roleplay[]).filter((rp) => refsOf(rp.steps).every((id) => ids.has(id)))
}

// 오류가 있는 항목은 앱이 멈추지 않도록 제외한다 (빌드 단계 검사에서 이미 막히지만 이중 안전장치)
const brokenIds = new Set(contentErrors.map((e) => e.where.split(' ')[0]))

export const categories: Category[] = [...(categoriesJson as Category[])].sort((a, b) => a.order - b.order)
// 사용자 최종 확인(verified)을 마친 문장만 학습에 쓴다. 초안·AI 검토만 된 문장은 검증 문서에만 나온다.
// (개발 화면에서만: localStorage 'dev.drafts' = '1'이면 초안도 보여 확인할 수 있다 — 배포본에는 영향 없음)
const showDrafts = import.meta.env.DEV && typeof localStorage !== 'undefined' && localStorage.getItem('dev.drafts') === '1'
const isLive = (status: string) => status === 'verified' || showDrafts
export const items: ContentItem[] = (rawItems as ContentItem[]).filter((it) => !brokenIds.has(it.id) && isLive(it.verificationStatus))
const liveIds = new Set(items.flatMap((it) => [it.id, ...(it.variants ?? []).map((v) => v.id), ...(it.responses ?? []).map((r) => r.id)]))

/** 역할극의 모든 문장 참조 (분기 포함) */
function refsOf(steps: Roleplay['steps']): string[] {
  return steps.flatMap((s) => [...(s.ref ? [s.ref] : []), ...(s.choices ?? []), ...(s.accept ?? []), ...(s.branches ?? []).flatMap((b) => refsOf(b.steps))])
}
// 역할극도 확인 완료이고, 쓰는 문장이 모두 학습 가능한 것만
export const roleplays: Roleplay[] = (roleplaysJson as Roleplay[]).filter((rp) => isLive(rp.verificationStatus) && refsOf(rp.steps).every((id) => liveIds.has(id)))

/** 검토 대기 중인 상황 수 (설정 화면 안내용) */
export const pendingCount = (rawItems as ContentItem[]).filter((it) => !isLive(it.verificationStatus)).length

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
  pending: pendingCount,
}
