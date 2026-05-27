# src/app/api/student-qb/question-by-id/[questionId]/

## Responsibility
Combined student question detail endpoint. Joins data from both the `questions` table (metadata: domain, skill, difficulty) and the `questions_by_external` table (content: stem, answer options, rationale) for a given internal question ID. Returns a single response with both `question` (PlainQuestionType) and `problem` (API_Response_Question) payloads.

## Design
- **GET-only** dynamic route (`export async function GET(_request, { params })`) where `params.questionId` is the internal question ID.
- `params` is a `Promise<{ questionId: string }>` (Next.js 15 async params convention).
- `export const revalidate = 86400` (24h ISR).
- Two-step cached data access:
  1. **`getQuestionByIdCached(questionId)`**: 
     - Queries `SELECT ... FROM questions WHERE questionid = $1 LIMIT 1`.
     - Cache tag: `["student-qb-question", "questions"]`.
     - Returns raw `DbQuestionRow` or `null`.
  2. **`getQuestionByExternalIdCached(externalId)`**:
     - Queries `SELECT ... FROM questions_by_external WHERE externalid = $1 LIMIT 1`.
     - Cache tags: `["student-qb-question", "questions_by_external"]`.
     - Returns normalized `API_Response_Question` or `null`.
- Both use `unstable_cache` with `revalidate: config.REVALIDATE_LONG` (3600s).
- Reuses `normalizeAnswerOptions()` (same logic as sibling `question/[questionId]` route — handles both array and object formats).
- Reuses `toPlainQuestion()` for DB row → `PlainQuestionType` mapping.
- Response shape `QuestionById_Data`: `{ question: PlainQuestionType, problem: API_Response_Question }`.
- Three distinct 404 scenarios:
  1. No row in `questions` table.
  2. Row exists but `external_id` is null/missing.
  3. Row exists but no matching row in `questions_by_external`.
- Cache headers: `max-age=0, s-maxage=86400, stale-while-revalidate=86400`.

## Flow
1. Client sends `GET /api/student-qb/question-by-id/:questionId`
2. Validates `questionId` present (400) and DB connection available (500).
3. Calls `getQuestionByIdCached(questionId)`:
   - Returns 404 if no row found.
4. Checks `questionRow.external_id`:
   - Returns 404 if null/missing.
5. Calls `getQuestionByExternalIdCached(questionRow.external_id)`:
   - Returns 404 if no row found.
6. Constructs `QuestionById_Data` and returns `{ success: true, data, message }` with caching headers.

## Integration
- Consumed by:
  - `/api/question-by-id/[questionId]` (Phase 2 fallback)
  - Review question views, bookmark detail views
- Depends on:
  - `@/lib/db` — `config.sql` (Neon PostgreSQL client), `config.REVALIDATE_LONG`
  - `@/types/lookup` — `SkillCd_Variants`
  - `@/types/question` — `API_Response_Question`, `PlainQuestionType`, `QuestionById_Data`
  - `next/cache` — `unstable_cache`
