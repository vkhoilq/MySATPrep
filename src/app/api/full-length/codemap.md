# src/app/api/full-length/

## Responsibility

Server-side API route that fetches questions from the College Board question bank and internal database, runs the question selection algorithm, and returns curated question sets organized by module for a full-length SAT/PSAT practice test.

## Design

A single POST endpoint that serves as the backend for the full-length test feature. Designed as a "gateway" — it aggregates questions from multiple sources (College Board API, internal DB), runs the pure selection logic from `@/lib/full-length/questionSelector`, and returns the result. The selection result is purposefully not cached (`Cache-Control: no-store`) because the algorithm randomizes pretest question designation.

### File breakdown

- **`questions/route.ts`** — POST handler and server-side fetcher (174 lines):
  - Accepts `{ assessment, qa }` in the request body
  - Validates assessment against `Assessments` enum (or allows `"QA-SAT"` for QA mode)
  - Fetches R&W and Math questions in parallel using `Promise.all`
  - `fetchQuestionsForSectionServer()` is the server-side fetch function that:
    1. Calls the College Board `qbank-api.collegeboard.org` POST endpoint with domain codes and `asmtEventId`
    2. Falls back to the internal DB via `getInternalAPITargetURL()` → `/api/student-qb/get-questions`
    3. Merges results from both sources (deduplication happens in the selection algorithm)
    4. Uses `next: { revalidate: 86400 }` and `cache: "force-cache"` for College Board API
  - Runs `selectQuestionsForTest()` with the merged question arrays and effective assessment
  - Returns `TestQuestionSelection` with per-module question IDs, pretest IDs, and slot metadata

## Data Flow

1. Client sends `POST /api/full-length/questions` with `{ assessment, qa }`
2. Route handler validates input and determines effective assessment (e.g., `"QA-SAT"` if qa=true)
3. Fetches questions from two sources in parallel:
   - College Board API (primary source, cached for 24h)
   - Internal Neon DB (fallback via self-fetch)
4. Merges all available questions into two arrays (R&W and Math)
5. Calls `selectQuestionsForTest()` which distributes questions into 4 modules according to the domain/difficulty blueprint
6. Returns `{ success: true, data: TestQuestionSelection }` with no caching
7. If no questions found, returns 404 with descriptive error

## Integration Points

- **Depends on**: `@/lib/full-length/questionSelector` (`selectQuestionsForTest`), `@/static-data/assessment` (`Assessments` map), `@/types/lookup` (`DomainItemsArray`), `@/types/question` (`PlainQuestionType`), `@/types/full-length` (`FullLengthSection`), `@/lib/getInternalAPITargetURL` (self-fetch URL resolution)
- **Consumed by**: `@/components/full-length/FullLengthTest.tsx` (client-side `fetch("/api/full-length/questions", ...)`)
- **External calls**: College Board `qbank-api.collegeboard.org` POST endpoint, internal `/api/student-qb/get-questions` self-fetch
