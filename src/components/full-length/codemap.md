# src/components/full-length/

## Responsibility

React components that compose the full-length SAT/PSAT practice test experience — from the intro screen through test-taking to results review.

## Design

A single-page app experience managed by `FullLengthTest.tsx` as the orchestrator. Uses `useReducer` with `fullLengthReducer` for state management. Child components are stateless presentational components that receive data and callbacks as props. The test flow follows the Digital SAT's actual module structure with adaptive difficulty, breaks, and section-level timers.

### File breakdown

- **`FullLengthTest.tsx`** — Main orchestrator component (1179 lines):
  - Manages the entire test lifecycle via `useReducer` and the `fullLengthReducer`
  - Renders different UI based on `state.phase`: `intro` → `section-intro` → `module-active` → `module-review` → `module-complete` → `break` → `test-complete`
  - Fetches question selection from `/api/full-length/questions` on start
  - Lazy-fetches individual question details from `/api/question/{id}` as the user navigates
  - Coordinates timer, navigation, flagging, module submission, break, and results calculation
  - Auto-saves session to `localStorage` on state changes and before page unload
  - QA Mode (5 questions/module, 5-min timer) for development testing
  - Includes Desmos calculator popup for Math sections
  - Builds a minimal `PracticeSession` on completion to notify the parent

- **`QuestionCard.tsx`** — Question display component (280 lines):
  - Renders a question's stimulus (passage/chart), stem (question text), and answer area
  - `AnswerOptions` sub-component: renders MCQ options (A/B/C/D) with selectable labels, correct/wrong highlighting, and strikethrough support
  - `SPRInput` sub-component: text input for Student-Produced Response questions with Enter-to-submit
  - Uses `better-react-mathjax` for math rendering of HTML content from the API
  - Color-coded answer feedback: green (correct), red (incorrect/wrong), blue (selected)

- **`QuestionNavigator.tsx`** — Module question grid (131 lines):
  - Compact grid of numbered buttons in a 5-column layout
  - Color-coded status indicators: green (answered), amber (flagged), blue (current), muted (unanswered)
  - Shows answered/total and flagged counts in a summary footer
  - Dispatches `NAVIGATE_QUESTION` on click to jump to any question

- **`SectionTimer.tsx`** — Countdown timer component (158 lines):
  - Displays MM:SS with `tabular-nums` monospace font
  - Color-coded urgency: green (>5min), yellow (1-5min), orange (30s-1min), red (<30s)
  - Animated pulse via Framer Motion when under 1 minute (urgent state)
  - Mini progress bar showing percentage of time used
  - Toggle visibility with Eye/EyeOff buttons (can hide timer during test)

- **`TestResultsScreen.tsx`** — Post-test results display (855 lines):
  - Hero score card showing estimated total score (400-1600) with level badge
  - Per-section breakdown: R&W and Math scores with correct/incorrect/skipped counts and time management rating
  - Domain performance table (flattened from per-module domain breakdown)
  - Collapsible per-module question details: each question shows stem preview, difficulty, user answer, correct answer, and correct/incorrect status
  - Full question review section: each question shows full stimulus, stem, answer options with correct/wrong highlighting, and optional explanation (rationale)
  - Time management summary cards
  - Uses `interpretSectionScore()`, `interpretTotalScore()`, `getTimeManagementRating()` from `@/lib/full-length/scoring`
  - All question content rendered through `better-react-mathjax` for LaTeX/math support

## Data Flow

1. `FullLengthTest` receives `PracticeSelections` from parent and renders intro screen
2. User clicks "Start" → POST to `/api/full-length/questions` → receives `TestQuestionSelection`
3. Test begins, component dispatches actions to the reducer for each phase transition
4. As user navigates, question details are fetched lazily and cached in `questionDetails` state
5. User answers are dispatched via `SET_QUESTION_ANSWER` and stored in `moduleStates`
6. Module timer runs via `TICK_MODULE_TIMER` dispatched from a `setInterval` (managed inside the component)
7. On module complete → `COMPLETE_MODULE` → optionally `START_MODULE` for Module 2 or `START_BREAK`
8. On all 4 modules complete → `COMPLETE_TEST` with calculated `FullLengthTestResult`
9. `TestResultsScreen` renders the final scores and detailed review

## Integration Points

- **Depends on**: `@/lib/full-length/fullLengthReducer` (reducer + helper functions), `@/lib/full-length/questionSelector` (question selection types), `@/lib/full-length/scoring` (score calculation + interpretation), `@/types/full-length` (test/config/result types), `@/types/full-length-session` (session types, phase type, storage helpers), `@/types/question` (`API_Response_Question`), `@/types/session` (`PracticeSelections`, `PracticeSession`), `@/components/ui/*` (Card, Button, Badge, Progress, etc.), `better-react-mathjax`, `framer-motion`, `lucide-react`
- **Consumed by**: The parent page that renders `<FullLengthTest practiceSelections={...} onSessionComplete={...} />`
- **Not used by**: Practice Rush component tree — this is an independent UI subtree
