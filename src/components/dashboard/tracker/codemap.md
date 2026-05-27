# dashboard/tracker/

## Responsibility
Question Bank Tracker — a comprehensive progress tracking view that visualizes the user's answered/unanswered questions across all domains and skills for the selected assessment. Maps the entire College Board question bank into a hierarchical task tree.

## Design
- **Single component**: `tracker.tsx` exports `Tracker` as default.
- **Pattern**: Data transformation pipeline — fetches all questions from `/api/get-questions`, groups them by domain → skill, cross-references against `practiceStatistics` for answered/correct status, and renders a two-column layout: progress summary sidebar + hierarchical `TrackerCard` trees.
- **State management**: `useReducer` with 4 action types (`FETCH_START`, `FETCH_SUCCESS`, `FETCH_ERROR`, `RESET`) for question fetching lifecycle.
- **Data flow**:
  1. Fetch all questions for active assessment (both Math and R&W domains).
  2. `transformQuestionsToTasksBySubject` memo splits by Math/R&W, then groups by `primaryClassCd` → `skill_cd`.
  3. Each group becomes a `Task` with `subtasks` (skills) and nested `questions` array.
  4. Cross-references `practiceStatistics` to compute answered/correct counts and status per node.
- **Visualization**: Left sidebar shows overall progress percentage, correct/incorrect counts, difficulty breakdown with progress bars. Right side shows `TrackerCard` for Math and R&W with expandable domain → skill → question tree.

## Files

| File | Role |
|---|---|
| `tracker.tsx` | Full tracker component (~822 lines). Handles loading skeleton, error state with retry, empty state, and data display. |
| `codemap.md` | This file. |

## Flow
1. On mount or `activeAssessmentId` change → dispatch `FETCH_START` → fetch `/api/get-questions` with all domains → on success dispatch `FETCH_SUCCESS` with `PlainQuestionType[]`.
2. `useMemo` transforms questions → tasks:
   - Filter Math vs R&W.
   - Group by `primaryClassCd` (domain) → `skill_cd` (skill).
   - For each skill, count total/answered/correct from `practiceStatistics`.
   - Build `Task` structure with status (`completed`/`in-progress`/`pending`) and `dependencies` (progress string).
   - Add per-question `href` links to `/question/{id}`.
3. `difficultyStats` memo computes overall progress percentage, per-difficulty breakdowns.
4. Renders: left panel (progress + difficulty stats) + right panel (Math/R&W `TrackerCard` trees).

## Integration
- Consumed by: `src/app/(dashboard)/dashboard/tracker/page.tsx`
- Depends on: `@/components/ui/card-v2`, `@/components/ui/tracker-card`, `@/components/ui/progress`, `@/components/ui/badge`, `@/components/ui/separator`, `@/contexts/assessment-context`, `@/lib/practiceStatistics`, `@/lib/utils`, `@/static-data/assessment` (`AssessmentsId`), `@/static-data/domains` (`primaryClassCdObjectData`, `skillCdsObjectData`), `@/static-data/validation` (`mathDomains`, `rwDomains`), `@/types/question`, `@/types`, `lucide-react`
