# src/lib/functions/

## Responsibility
Thin client-side API wrapper functions for fetching individual question data from internal Next.js API routes. These are the leaf-level data-access utilities that page components and hooks call when they need question detail (stem, answer options, rationale, correct answer) for a single question by its identifier.

## Design
- **Uniform fetch-and-parse pattern** — Both `FetchQuestionByID` and `FetchQuestionByUniqueID` follow an identical pattern: `fetch()` to an internal `/api/` endpoint, parse JSON, check `result.success && result.data`, return the data or throw. Error handling is minimal — they log to console and re-throw, letting callers catch.
- **Two distinct query surfaces**:
  - `FetchQuestionByID(questionId)` calls `/api/question/{questionId}` and returns `API_Response_Question | null`. This endpoint accepts either an `externalId` or an `ibn` (internal blueprint number). Return type `API_Response_Question` includes `answerOptions?`, `correct_answer`, `rationale`, `stem`, `type` (`"mcq" | "spr"`), `stimulus`, `externalid?`, and `ibn?`.
  - `FetchQuestionByUniqueID(questionId)` calls `/api/question-by-id/{questionId}` and returns `QuestionById_Data | null`. This is the more specific endpoint that returns both the `problem` (the `API_Response_Question`) and the `question` (the `PlainQuestionType` metadata). Used when full question metadata + problem is needed together.
- **Simple function exports** — No classes, no configuration, no caching layer. Each function is a plain `async` function exported as a named const. Fetch options (method, headers, body) are implicit in the route handler (GET requests).
- **Import path** — Both files import types from `@/types` (the barrel export), resolving to `@/types/index.ts` which re-exports `API_Response_Question` and `QuestionById_Data`.

## Flow
1. Caller invokes `FetchQuestionByID(questionId)` or `FetchQuestionByUniqueID(questionId)` with a question identifier string.
2. Function builds the URL: `/api/question/{id}` or `/api/question-by-id/{id}`.
3. `fetch()` executes a GET request to the internal Next.js API route.
4. On non-ok response, throws an `Error` with the HTTP status.
5. On ok response, parses JSON and checks the `success` and `data` fields.
6. If valid, returns `data` (typed as `API_Response_Question` or `QuestionById_Data`).
7. If invalid, throws with `result.message` or a default error string.
8. All errors are caught, logged to console with `console.error`, and re-thrown.

## Integration
- **Consumed by**: `src/app/` page components and `src/components/` UI components that need to load a single question's full data (e.g., question detail views, practice session cards). Also consumed by hooks in `src/lib/questionbank/` as the data-fetching layer in the batching pipeline, though that module uses its own `api.ts` wrapper (which follows the same pattern as `FetchQuestionByUniqueID`).
- **Depends on**: `@/types` (barrel export providing `API_Response_Question` from `@/types/question` and `QuestionById_Data` from `@/types/question`), browser `fetch()` API, internal Next.js API routes at `/api/question/{id}` and `/api/question-by-id/{id}`
