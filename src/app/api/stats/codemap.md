# src/app/api/stats/

## Responsibility
Question bank statistics endpoint. Aggregates question counts across all SAT domains, computing breakdowns by domain, difficulty (Easy/Medium/Hard), and skill code. Fetches data from the College Board qbank-api separately for each domain to build detailed per-domain and per-skill statistics.

## Design
- **GET-only** route (`export async function GET(request: NextRequest)`).
- Accepts optional `assessment` search param to select which assessment's question bank to scan (defaults to SAT asmtEventId=99).
- Uses the `DomainItemsArray` (INI, CAS, EOI, SEC, H, P, Q, S) to iterate over all 8 SAT domains.
- For each domain, POSTs to `https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions` and accumulates results.
- Computes three breakdowns:
  - `domainBreakdown`: `{ [domain]: count }`
  - `difficultyBreakdown`: `{ E: count, M: count, H: count }`
  - `skillBreakdown`: `{ [skillCd]: count }`
- Also captures `assessmentInfo: { assessment, asmtEventId }`.
- Robust per-domain error handling: if a domain fetch fails, it `continue`s to the next domain rather than failing entirely.
- Uses `AbortSignal.timeout(30000)` on each fetch.
- Typed response uses `StatsAPIResponse` and `StatsAPIErrorResponse` from `@/types/statistics`.

## Flow
1. Client sends `GET /api/stats?assessment=SAT`
2. Parses `assessment` search param, resolves `asmtEventId` from `Assessments`.
3. Iterates over all 8 domains in `DomainItemsArray`:
   - POSTs to College Board API with `{ asmtEventId, test: 2, domain }`.
   - On success, adds questions to `allQuestions` and updates breakdown counters.
   - On failure, logs error and skips.
4. Sets `statsData.totalQuestions = allQuestions.length`.
5. Returns `{ success: true, data: { stats, totalQuestions, domainBreakdown, difficultyBreakdown, skillBreakdown, assessmentInfo }, message }`.
6. On error, returns `{ success: false, error, details }` with 500 status.

## Integration
- Consumed by: Question Bank overview page, admin dashboard
- Depends on:
  - `@/static-data/assessment` — `Assessments` mapping
  - `@/types` — `DomainItemsArray`, `API_Response_Question_List`, `StatsData`, `StatsAPIResponse`, `StatsAPIErrorResponse`, `StatsDomainBreakdown`, `StatsDifficultyBreakdown`, `StatsSkillBreakdown`
  - College Board qbank-api
