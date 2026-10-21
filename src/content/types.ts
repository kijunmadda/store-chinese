// 콘텐츠 JSON(content/ 폴더)의 형식 정의. 필드 설명은 content/README.md 참고.

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type VerificationStatus = 'draft' | 'reviewed' | 'verified'
export type LearningMode = 'study' | 'listen' | 'speak' | 'roleplay' | 'rescue'

export interface Category {
  id: string
  order: number
  name: string
}

/** 고객이 하는 말 — 알아듣기용 */
export interface CustomerLine {
  chinese: string
  pinyin: string
  meaning: string
}

/** 같은 의도의 다른 고객 표현 */
export interface Variant extends CustomerLine {
  id: string
  note?: string
}

/** 직원이 하는 말 — 말하기용 */
export interface StaffLine {
  id: string
  chinese: string
  pinyin: string
  korean: string
  note?: string
}

export interface Alternative {
  chinese: string
  pinyin: string
  korean: string
}

export interface Keyword {
  word: string
  pinyin: string
  meaning: string
}

export interface ContentItem {
  id: string
  category: string
  scenario: string
  difficulty: Difficulty
  customer?: CustomerLine
  variants?: Variant[]
  responses?: StaffLine[]
  alternatives?: Alternative[]
  keywords?: Keyword[]
  pattern?: string
  distractors?: string[]
  learningModes: LearningMode[]
  policyDependent: boolean
  audio?: Record<string, string>
  verificationStatus: VerificationStatus
  reviewNote?: string
}

export interface RoleplayStep {
  speaker: 'customer' | 'staff' | 'branch'
  ref?: string
  rate?: number
  choices?: string[]
  accept?: string[]
  label?: string
  branches?: { label: string; steps: RoleplayStep[] }[]
}

export interface Roleplay {
  id: string
  title: string
  goal: string
  difficulty: Difficulty
  steps: RoleplayStep[]
  reviewKeywords?: string[]
  verificationStatus: VerificationStatus
}
