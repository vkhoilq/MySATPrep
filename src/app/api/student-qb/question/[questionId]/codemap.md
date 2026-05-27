# src/app/api/student-qb/question/[questionId]/

## Responsibility
Single student question detail endpoint. Queries the `questions_by_external` table in Neon PostgreSQL for full question content (stem, answer options, rationale, correct answer, type, stimulus) by an external ID. Returns a normalized `API_Response_Question` shape with cached results.

## Design
- **GET-only** dynamic route (`export async function GET(request, { params })`) where `params.questionId` is the external identifier.
- `params` is a `Promise<{ questionId: string }>` (Next.js 15 async params convention).
- `export const revalidate = 86400` (24h ISR).
- Core data access via `getQuestionByExternalIdCached()` — an `unstable_cache`-wrapped function:
  - Queries `SELECT externalid, answeroptions, correct_answer, rationale, stem, type, stimulus, ibn FROM questions_by_external WHERE externalid = $1 LIMIT 1`.
  - Cache tag: `["student-qb-question", "questions_by_external"]`.
  - Revalidation: `config.REVALIDATE_LONG` (3600 seconds).
- Answer option normalization via `normalizeAnswerOptions()`:
  - Accepts `unknown` type from DB JSON column.
  - Handles **array format**: `[{ content: "..." }, ...]` → maps to `{ A, B, C, D }`.
  - Handles **object format**: `{ A: "...", B: "..." }` or `{ a: "...", b: "..." }` → normalizes to uppercase keys.
  - Returns `undefined` if data is not well-formed.
- Question type normalization: `row.type === "spr" ? "spr" : "mcq"` (defaults to mcq).
- Cache headers: `max-age=0, s-maxage=86400, stale-while-revalidate=86400`.
- 404 on missing row with cache headers.

## Flow
1. Client sends `GET /api/student-qb/question/:questionId`
2. Validates `questionId` is present (400 if missing).
3. Validates DB connection is available (500 if `config.sql` is null).
4. Calls `getQuestionByExternalIdCached(questionId)`:
   - Queries `questions_by_external` table by `externalid`.
   - Normalizes `answeroptions` via `normalizeAnswerOptions()`.
   - Normalizes `type` to `"mcq"` or `"spr"`.
5. If no row found, returns `{ success: false, error: "Given Question Id Not Found" }` with 404.
6. Returns `{ success: true, data, message }` with caching headers.

## Integration
- Consumed by:
  - `/api/question/[questionId]` (via `fetchQuestionData` fallback chain)
  - `/api/question-by-id/[questionId]` (via internal API call)
- Depends on:
  - `@/lib/db` — `config.sql` (Neon PostgreSQL client), `config.REVALIDATE_LONG`
  - `@/types/question` — `API_Response_Question`
  - `next/cache` — `unstable_cache`
