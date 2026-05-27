# src/app/api/get-questions/

## Responsibility
Question listing aggregation endpoint. Fetches questions from the College Board qbank-api (`get-questions`) and merges them with results from the internal student question bank (Neon PostgreSQL), applying client-specified filters for domain, skill, difficulty, and exclusion lists.

## Design
- **GET-only** route (`export async function GET(request: NextRequest)`).
- Uses search parameters to control filtering: `domains`, `assessment`, `excludeIds`, `difficulties`, `skills`, `random`, `uniqueIds`.
- Built-in validation using `DomainItemsArray` (from `@/types/lookup`) for domain codes, `skillCds` (from `@/static-data/domains`) for skill codes, and `["E", "M", "H"]` for difficulties.
- Two-tier data fetching:
  1. **Primary**: POSTs to `https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions` with `{ asmtEventId, test: 2, domain }`.
  2. **Secondary**: GETs the internal `/api/student-qb/get-questions` endpoint using `getInternalAPITargetURL()` to resolve the base URL.
- Post-fetch filtering applied client-side:
  - `excludeQuestionIds` — filters out by `question.questionId`
  - `skillCds` — filters by `question.skill_cd`
  - `difficulties` — filters by `question.difficulty`
- Assessment mapping uses `Assessments` static data (`SAT: 99`, `PSAT/NMSQT: 100`, `PSAT 8/9: 102`).
- Upstream fetch uses `AbortSignal.timeout(30000)` and `cache: "force-cache"`.

## Flow
1. Client sends `GET /api/get-questions?domains=INI,CAS&skills=CID,INF&difficulties=E,M&excludeIds=id1,id2`
2. Query parameters are parsed and validated:
   - `skillCds` validated against the known `Skills` array
   - `difficulties` validated against `["E", "M", "H"]`
   - `domains` validated against `DomainItemsArray`
3. `asmtEventId` resolved from `Assessments` mapping (defaults to `99` for SAT).
4. College Board API called with `{ asmtEventId, test: 2, domain: domainsParam }`.
5. Internal student QB API called with same query params forwarded.
6. Both result arrays are concatenated into a single `questions` list.
7. Client-side filtering applied (excludeIds, skillCds, difficulties).
8. Returns `{ success: true, data: questions, message }` with caching headers (s-maxage=3600).

## Integration
- Consumed by: Question Bank browser, Practice Rush question selection
- Depends on:
  - `@/static-data/assessment` — Assessments mapping
  - `@/types/lookup` — `DomainItemsArray`, `SkillCd_Variants`
  - `@/types/question` — `API_Response_Question_List`
  - `@/static-data/domains` — `skillCds` array
  - `@/lib/getInternalAPITargetURL` — Self-referencing URL resolution
  - College Board qbank-api (`qbank-api.collegeboard.org`)
  - Internal student QB API (`/api/student-qb/get-questions`)
