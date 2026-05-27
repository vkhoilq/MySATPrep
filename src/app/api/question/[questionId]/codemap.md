# src/app/api/question/[questionId]/

## Responsibility
Single question detail endpoint. Fetches full question data (stem, answer options, rationale, correct answer, type) for a given question ID by delegating to the centralized `fetchQuestionData` library function. Handles both disclosed (`-DC`) and regular questions via the same shared data layer.

## Design
- **GET-only** dynamic route (`export async function GET(request, { params })`) where `params.questionId` is the question identifier.
- `params` is a `Promise<{ questionId: string }>` (Next.js 15 async params convention).
- `export const revalidate = 3600` for ISR-based revalidation.
- Entirely delegates to `fetchQuestionData(questionId)` from `@/lib/questionFetcher` which:
  - Detects disclosed questions (IDs containing `-DC`) and fetches from `saic.collegeboard.org/disclosed/{id}.json`
  - For regular questions, attempts internal Neon DB first (`/api/student-qb/question/{id}`), then falls back to College Board qbank-api
  - Translates written fraction answers (e.g., "three halves" → "3/2") for SPR questions
- Returns structured `{ success, data }` or `{ success: false, error }` with appropriate HTTP status.
- Cache headers: s-maxage=3600.

## Flow
1. Client sends `GET /api/question/:questionId`
2. Extracts `questionId` from dynamic route params.
3. Calls `fetchQuestionData(questionId)`:
   - If `questionId` contains `-DC`: fetches from disclosed questions endpoint, parses MCQ or SPR response, extracts correct answer from `correct_choice` or rationale regex.
   - Otherwise: tries internal `/api/student-qb/question/:questionId` first; on failure, falls back to College Board qbank-api POST with `{ external_id: questionId }`.
4. On success, returns `{ success: true, data, message }`.
5. On failure, returns `{ success: false, error, details }` with `result.status`.

## Integration
- Consumed by: Practice Rush question display, Question Bank question viewer, bookmark question view
- Depends on:
  - `@/lib/questionFetcher` — `fetchQuestionData` (centralized question fetching with disclosed/question bank/fraction translation logic)
  - `@/types/question` — `API_Response_Question`
