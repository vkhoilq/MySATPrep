# src/app/api/question-by-id/[questionId]/

## Responsibility
Cross-assessment question lookup endpoint. Searches for a question by its `questionId` across all assessment types (SAT, PSAT/NMSQT, PSAT 8/9) in the College Board question bank, fetches its full detail via `fetchQuestionData`, and returns the combined metadata + problem data. Falls back to the internal student question bank if not found in the College Board API.

## Design
- **GET-only** dynamic route (`export async function GET(request, { params })`) where `params.questionId` is the question identifier.
- `params` is a `Promise<{ questionId: string }>` (Next.js 15 async params convention).
- Two-phase lookup strategy:
  1. **Phase 1 (College Board)**: Iterates over all entries in `Assessments` (SAT, PSAT/NMSQT, PSAT 8/9), POSTs to `qbank-api.collegeboard.org/questionbank/digital/get-questions` with each `asmtEventId`, searches the returned list for the matching `questionId`, then calls `fetchQuestionData(question.external_id || question.ibn)` to get the full problem.
  2. **Phase 2 (Student QB fallback)**: If Phase 1 yields no results, forwards to `/api/student-qb/question-by-id/${questionId}` on the internal API.
- Returns combined shape: `{ question: PlainQuestionType, problem: API_Response_Question }`.
- Cache headers: s-maxage=86400 (24 hours).
- Aborts early on first match found in Phase 1.

## Flow
1. Client sends `GET /api/question-by-id/:questionId`
2. Validates `questionId` is present (400 if missing).
3. Phase 1 — College Board lookup:
   - For each assessment in `Assessments`:
     a. POSTs to qbank-api with `{ asmtEventId, test: 2, domain: "all domains" }`.
     b. Searches returned list for `q.questionId === questionId`.
     c. If found, extracts `external_id || ibn` and calls `fetchQuestionData(questionId)`.
     d. On success, returns `{ success: true, data: { question, problem } }` immediately.
4. Phase 2 — Internal student QB fallback:
   - GETs `/api/student-qb/question-by-id/${questionId}`.
   - If 404, returns `{ success: false, error: "Question not found..." }` with 404.
   - Otherwise proxies the internal response.
5. Returns 500 on unexpected errors.

## Integration
- Consumed by: Bookmark question viewer, review question detail, practice history
- Depends on:
  - `@/lib/questionFetcher` — `fetchQuestionData`
  - `@/lib/getInternalAPITargetURL` — Self-referencing URL resolution for internal API call
  - `@/static-data/assessment` — `Assessments` mapping
  - `@/types` — `DomainItemsArray`, `API_Response_Question_List`, `StatsAPIErrorResponse`
  - College Board qbank-api
  - Internal student QB API (`/api/student-qb/question-by-id/:questionId`)
