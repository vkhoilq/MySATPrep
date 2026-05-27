# src/app/api/student-qb/

## Responsibility
Student Question Bank (student-qb) module root. Houses all internal DB-backed API routes for student-submitted/imported SAT questions. Contains the shared helper `asmEventId.ts` and three sub-route groups: `get-questions/`, `question/`, and `question-by-id/`.

## Design
- Module-level shared files:
  - **`asmEventId.ts`**: Exports `AsmEventId_to_Program` — a constant mapping from assessment event IDs (`99 → "SAT"`, `100 → "P10"`, `102 → "P89"`) to program identifiers used in DB queries.
- The directory itself has no `route.ts`; it acts as a logical grouping prefix (`/api/student-qb/*`).
- All child routes use `@/lib/db` (`config.sql`) for Neon PostgreSQL access and `next/cache` `unstable_cache` for data caching.
- Two DB tables are used:
  - `questions` — Metadata/listing rows (questionId, skill_cd, difficulty, domain, etc.)
  - `questions_by_external` — Full question content (stem, answerOptions, rationale, correct_answer, type, stimulus)

## Flow
- Requests at `/api/student-qb/get-questions` → `get-questions/route.ts`
- Requests at `/api/student-qb/question/:questionId` → `question/[questionId]/route.ts`
- Requests at `/api/student-qb/question-by-id/:questionId` → `question-by-id/[questionId]/route.ts`

## Integration
- Consumed by:
  - `get-questions/` — Question listing
  - `question/[questionId]/` — Single question detail
  - `question-by-id/[questionId]/` — Combined question + problem
  - External callers: `get-questions/route.ts` (College Board proxy) and `question-by-id/[questionId]/route.ts` (cross-assessment lookup) call these as fallback APIs
- Depends on:
  - `@/lib/db` — Neon PostgreSQL connection (`config.sql`, `config.REVALIDATE_LONG`, `config.REVALIDATE_MEDIUM`)
  - `@neondatabase/serverless` — Serverless Neon driver
