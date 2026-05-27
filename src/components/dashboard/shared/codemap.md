# dashboard/shared/

## Responsibility
Shared presentational components used across multiple dashboard tabs. Contains a single optimized question card component with lazy loading, error handling, and multiple display states.

## Design
- **Pattern**: Compound component with memoization (`React.memo`), lazy rendering via `IntersectionObserver`, and `useMemo` for derived values.
- **Component states**: Loading (skeleton), Error (retry button), Success (renders `QuestionProblemCard`), Not-visible-yet (placeholder).
- **Type system**: Defines `BaseQuestionWithData` and `AnsweredQuestionWithData` interfaces that are reused by `SavedTab` and `AnsweredTab`.
- **Display modes**: Supports `type` prop with values `"saved"`, `"answered"`, and `"standard"` to conditionally render different metadata overlays (timestamp, correctness badge, difficulty badge, time spent).

## Files

| File | Role |
|---|---|
| `OptimizedQuestionCard.tsx` | Lazy-loaded question card. Waits until element is within `100px` of viewport before rendering. Shows skeleton while loading, error with retry on failure, and full `QuestionProblemCard` on success. Renders type-specific metadata headers. |

## Flow
1. Component mounts with `isVisible=false` → creates `IntersectionObserver` observing `cardRef` with `rootMargin: "100px"`.
2. When card enters viewport, sets `isVisible=true` → disconnects observer.
3. If `question.isLoading` → renders skeleton.
4. If `question.hasError` → renders error state with retry button (calls `onRetry(index, questionId)`).
5. If `question.questionData` is available → renders metadata header (saved date, answered stats, or creation date) + `QuestionProblemCard`.
6. `isAnsweredQuestion()` type guard determines if the question has correctness/time/difficulty fields.

## Integration
- Consumed by: `src/components/dashboard/answered.tsx`, `src/components/dashboard/saved.tsx`, `src/components/dashboard/previousSaved.tsx`, `src/components/questionbank/list-render.tsx`, `src/components/questionbank/single-render.tsx`, `src/components/questionbank/compact-render.tsx`
- Depends on: `@/components/ui/button`, `@/components/ui/card-v2`, `@/components/ui/separator`, `@/components/ui/badge`, `@/components/ui/status-badge`, `@/components/question-problem-card`, `@/types/question`, `lucide-react`
