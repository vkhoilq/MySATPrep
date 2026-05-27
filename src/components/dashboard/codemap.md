# dashboard/

## Responsibility
Dashboard tab content components for the authenticated dashboard area. Each file corresponds to a dashboard route tab: Home, Saved Questions, Answered Questions, Practice Sessions, and Progress Tracker. These components consume localStorage data (practice statistics, saved questions, session history) and render per-assessment views.

## Design
- **Pattern**: Tab-based architecture. `index.ts` re-exports all tab components. Each tab receives optional `selectedAssessment?: AssessmentWorkspace` prop from the dashboard layout.
- **State management**: Mix of `useState` (simple data loading) and `useReducer` (complex list management with lazy loading, filtering, and progressive fetching).
- **Data layer**: All data comes from localStorage via custom hooks (`useLocalStorage`) and utility functions (`getPracticeStatistics`, `getSessionHistory`, `getUserProfile`). No server-side data fetching.
- **Sub-directories**: `shared/`, `summary/`, `tracker/`, `vocabs/` hold deeper components.

## Files

| File | Role |
|---|---|
| `index.ts` | Barrel export: `HomeTab`, `SavedTab`, `AnsweredTab`, `TrackerTab`, `SessionsTab`. |
| `home.tsx` | Dashboard home tab. Loads user profile, practice statistics, and session history. Calculates streak days and activity metrics. Renders `SummaryCharts`, progress info, and recent sessions list. |
| `saved.tsx` | Bookmarks browser with folder/collection system. Uses `useReducer` for state. Supports create/edit/delete collections, infinite scroll via `IntersectionObserver`, subject/difficulty filters, and lazy-loaded question fetching. Migrates legacy collection format. |
| `previousSaved.tsx` | Legacy variant of `SavedTab` with similar functionality but different reducer structure. Shows `EmptyState` when no questions match filters. |
| `answered.tsx` | Answered questions browser. Uses `useReducer` with progressive fetching via `/api/question-by-id/{id}`. Features infinite scroll, correctness/accuracy stats, and filterable by subject and correct/incorrect status. |
| `sessions.tsx` | Practice session history viewer. Lists all sessions from `practiceHistory` localStorage. Expandable per-session question results grid, delete with Duolingo-styled confirmation modal, and review navigation. |
| `tracker.tsx` | Placeholder tab — minimal component with "View Analytics" button. The real tracker is in `tracker/tracker.tsx`. |
| `buttons-group.tsx` | Reusable button toolbar: Review session link (with animated arrow), Reference popup, and Desmos calculator popup. |

## Flow
1. **HomeTab**: Mount → `getUserProfile()`, `getPracticeStatistics()`, `getSessionHistory()` → compute metrics (XP, practice time, success rate) and streak days → render `SummaryCharts` + profile info + session history.
2. **SavedTab**: Mount → load `savedQuestions` and `savedCollections` from localStorage → initialize reducer with question list → progressively fetch question data via `FetchQuestionByID` with 100ms delays → support folder navigation, infinite scroll, subject/difficulty filters.
3. **AnsweredTab**: Mount → load `practiceStatistics` → initialize reducer with `answeredQuestionsDetailed` → progressively fetch `QuestionById_Data` via `/api/question-by-id/{id}` → render `OptimizedQuestionCard` for each.
4. **SessionsTab**: Mount → `getSessionHistory()` sorted by timestamp → render expandable session cards → delete with confirmation modal.

## Integration
- Consumed by: `src/app/(dashboard)/dashboard/page.tsx` and sub-routes
- Depends on: `@/types/session`, `@/types/statistics`, `@/types/savedQuestions`, `@/types/savedCollections`, `@/types/question`, `@/types/userProfile`, `@/lib/userProfile`, `@/lib/practiceStatistics`, `@/lib/useLocalStorage`, `@/lib/functions/fetchQuestionByID`, `@/lib/functions/fetchQuestionDatabyUniqueID`, `@/static-data/validation`, `@/app/dashboard/types`, `@/components/ui/*` (select, card-v2, badge, button, dialog, dropdown-menu, breadcrumb, input, empty-state, skeleton), `./shared/OptimizedQuestionCard`, `./summary/charts`, `./tracker/tracker.tsx`, `./vocabs/*`, `lucide-react`, `sonner`
