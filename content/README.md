# 학습 콘텐츠 수정 안내

프로그램 코드를 건드리지 않고 이 폴더의 JSON 파일만 고치면 앱에 반영됩니다.

| 파일 | 내용 |
|---|---|
| `categories.json` | 카테고리 목록과 순서 |
| `items/*.json` | 학습 문장. 카테고리별로 파일을 나눔 (새 파일을 추가해도 자동 포함) |
| `roleplays.json` | 역할극. 문장을 ID로 연결 |

## ID 규칙 (한 번 정하면 바꾸지 않기 — 학습 기록이 ID로 연결됨)

- 상황 ID = 고객 질문 ID: `S01`
- 고객의 다른 표현: `S01-V1`, `S01-V2`
- 직원 답변: `S01-A`

## 항목 필드

| 필드 | 필수 | 설명 |
|---|---|---|
| `id` | ✔ | 고유 ID |
| `category` | ✔ | `categories.json`의 id |
| `scenario` | ✔ | 매장 상황 설명 |
| `difficulty` | ✔ | `beginner` / `intermediate` / `advanced` |
| `customer` | △ | 고객 질문 `{ chinese, pinyin, meaning }` |
| `variants` | | 같은 의도의 다른 고객 표현 `[{ id, chinese, pinyin, meaning }]` |
| `responses` | △ | 직원 답변 `[{ id, chinese, pinyin, korean, note? }]` |
| `alternatives` | | 직원 답변 대신 써도 되는 표현 |
| `keywords` | | 핵심 단어 `[{ word, pinyin, meaning }]` |
| `pattern` | | 문장 틀 (예: `我帮你___一下`) |
| `learningModes` | ✔ | `study` `listen` `speak` `roleplay` `rescue` 중 선택 |
| `policyDependent` | ✔ | 매장 정책에 따라 달라지면 `true` |
| `verificationStatus` | ✔ | `draft` → `reviewed` → `verified` |

△ = `customer`와 `responses` 중 하나는 반드시 있어야 함

## 표기 규칙

- 직원 문장은 您 대신 **你**
- 병음: 성조 기호 / 一·不는 실제 발음대로 변조 표기 / 3성 연속은 원래 성조 / 경성은 기호 없음
- 재고·할인·교환 등은 확인 전에 단정하지 않음

## 고친 뒤 확인

- `npm run check` — 형식 오류 검사 (오류가 있으면 배포되지 않음)
- `npm run export:review` — 외부 AI 검증용 문서(`검증요청_콘텐츠.md`) 다시 만들기
