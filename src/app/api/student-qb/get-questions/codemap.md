# src/app/api/student-qb/get-questions/

## Responsibility
Internal student question bank listing endpoint. Queries the `questions` table in Neon PostgreSQL with dynamic WHERE clauses built from URL search parameters. Supports filtering by domain, skill, difficulty, unique IDs, exclusions, and optional random ordering. Fully cached via `unstable_cache`.

## Design
- **GET-only** route (`export async function GET(request: NextRequest)`).
- Comprehensive query parameter support: `domains`, `assessment`, `excludeIds`, `difficulties`, `skills`, `random`, `uniqueIds`.
- Input validation:
  - `skillCds` validated against the known `Skills` array (from `@/static-data/domains`).
  - `difficulties` validated against `["E", "M", "H"]`.
  - `domains` validated against `DomainItemsArray`.
- Parameters parsed via `parseCsvParam()` helper (splits comma-separated values, trims, filters empty).
- Dynamic SQL query construction via parameterized `WHERE` clauses:
  - Each filter type adds to `whereClauses: string[]` and `values: Array<string[] | string>`.
  - Uses PostgreSQL `ANY($N::text[])` syntax for multi-value conditions.
  - Falls back to `= $N` for single-value conditions.
  - Special `uniqueIds` mode: queries across `external_id`, `ibn`, and `questionid` columns with OR logic.
  - `random=true` uses `ORDER BY RANDOM()` instead of `ORDER BY createdate DESC`.
- `unstable_cache` wrapper with tag `["student-qb-questions-list"]` and `revalidate: config.REVALIDATE_MEDIUM` (300 seconds).
- Row mapping via `toPlainQuestion()` transforms raw `DbQuestionRow` to `PlainQuestionType`.
- Program scoping via `AsmEventId_to_Program` mapping — adds `WHERE program = $N` clause.
- Cache headers: s-maxage=86400.

## Flow
1. Client sends `GET /api/student-qb/get-questions?domains=INI,CAS&skills=CID&difficulties=E,M&random=true&excludeIds=id1`
2. Parameters parsed and validated.
3. If `uniqueIds` provided, queries across `external_id`, `ibn`, and `questionid` fields.
4. Otherwise filters by `primary_class_cd` (domain), with optional `skill_cd`, `difficulty`, `program`, and exclusion filters.
5. SQL query built with positional parameter placeholders (`$1`, `$2`, etc.).
6. `unstable_cache` checks or populates cache.
7. Rows mapped to `PlainQuestionType` via `toPlainQuestion()`.
8. Returns `{ success: true, data: questions, message }`.
9. Database connection check returns 500 if `config.sql` is null.

## Integration
- Consumed by:
  - Practice Rush question selection
  - Question Bank browser
  - `/api/get-questions` (College Board proxy route calls this as secondary data source)
- Depends on:
  - `@/lib/db` — `config.sql` (Neon PostgreSQL client)
  - `@/static-data/assessment` — `Assessments` mapping
  - `@/types/lookup` — `DomainItemsArray`, `SkillCd_Variants`
  - `@/types/question` — `API_Response_Question_List`, `PlainQuestionType`
  - `@/static-data/domains` — `skillCds` array
  - `../asmEventId` — `AsmEventId_to_Program` mapping
  - `next/cache` — `unstable_cache`
