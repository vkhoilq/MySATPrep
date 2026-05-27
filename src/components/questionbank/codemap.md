# questionbank/

## Responsibility
SAT/PSAT Question Bank browser — a full-featured question exploration interface that allows users to filter, search, and view questions from the College Board question bank with multiple display modes, onboarding tours, and Bluebook question identification.

## Design
- **Pattern**: Multi-component composition with `QB_MainHero` as the root orchestrator and `QuestionResults` handling filtering/rendering. Three renderers (`List`, `Single`, `Compact`) provide different viewing experiences.
- **State management**: `useReducer` in `main-hero.tsx` for filter selection (assessment, subject, domains). `useReducer` in `question-results.tsx` for question data lifecycle (fetching, loading, filtering). A second `useReducer` for tour/onboarding state.
- **Filtering**: `filterQuestions()` from `@/lib/questionbank` handles difficulty, skill, Bluebook exclusion/inclusion, sort order, date range, and answer status filters. Bluebook identification uses external IDs from `/api/lookup`.
- **View modes**: Three radio-toggle views — List (infinite scroll), Single (dot-navigation carousel with arrow keys), Compact (grid navigation with difficulty-colored dots + prev/next).
- **Onboarding**: `InteractiveOnboardingChecklist` + `TourAlertDialog` guides users through filter features step-by-step. Completion stored in localStorage.

## Files

| File | Role |
|---|---|
| `qb.tsx` | Page wrapper. Renders `SiteHeader` + `QB_MainHero` (suspended) + `FooterSection`. |
| `main-hero.tsx` | Hero section with assessment/subject/domain selectors. On "Apply Filter", fetches questions from `/api/get-questions` + lookup data from `/api/lookup`, then renders `QuestionResults`. Reads URL params for deep-linking from tracker. Uses `WarpBackground` with expand animation. |
| `question-results.tsx` | Core results component. Manages question fetching (batch of 3 with 200ms delays), filtering, view mode toggling, Bluebook toggles, answer visibility, sort order, date range, and infinite scroll via `IntersectionObserver`. Shows onboarding tour. ~1447 lines. |
| `list-render.tsx` | Simple list view — maps filtered questions to `OptimizedQuestionCard` with `withDate` prop. |
| `single-render.tsx` | Single question view with dot navigation, prev/next arrows, keyboard support (ArrowLeft/Right), and auto-loading when approaching end. |
| `compact-render.tsx` | Compact view with difficulty-colored grid buttons (12 columns), navigation indicator, prev/next buttons, and difficulty legend. Lazy-fetches specific questions on navigation. |
| `codemap.md` | This file. |

## Flow
1. **QB_MainHero**: Mount → read URL params (`assessment`, `subject`, `primaryClassCd`, `skillCd`) → populate state → auto-apply filter if params present → show hero with selectors.
2. User selects assessment → subject → domains → clicks "Apply Filter" → URL updates via `router.push` → fetch from `/api/get-questions` → fetch Bluebook external IDs from `/api/lookup` → dispatch questions to state → expand animation → show `QuestionResults`.
3. **QuestionResults**: Initialize questions array → progressively fetch individual question data via `FetchQuestionByID` (batches of 3 concurrent) → apply filters (difficulty, skill, Bluebook, sort, date, answer status) → render active view.
4. **Views**: List = infinite scroll with `IntersectionObserver`. Single/Compact = dot navigation with `useState` for current index. Compact also calls `fetchSpecificQuestion` on-demand.
5. User interacts with Bluebook toggle → filter applies reactively. Date range uses `Calendar` component. Sort order re-fetches IDs.
6. Onboarding: `TourAlertDialog` appears on first visit. `InteractiveOnboardingChecklist` tracks completed steps via localStorage.

## Integration
- Consumed by: `src/app/questionbank/page.tsx`
- Depends on: `@/lib/questionbank` (`QuestionWithData`, `DIFFICULTY_OPTIONS`, `questionResultsReducer`, `filterQuestions`), `@/lib/functions/fetchQuestionByID`, `@/lib/useLocalStorage`, `@/types/question`, `@/static-data/assessment`, `@/static-data/domains`, `@/components/ui/*` (card, button, select, multiselect-combobox, tooltip, warp-background, calendar, tour, onboarding-checklist, separator, radio-group, liquid-radio, empty-state), `@/components/dashboard/shared/OptimizedQuestionCard`, `@/components/dashboard/buttons-group`, `@/components/footer`, `@/app/navbar`, `framer-motion`, `lucide-react`, `next/navigation`
