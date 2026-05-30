# src/lib/full-length/

## Responsibility

Pure logic layer for the full-length SAT/PSAT practice test feature — handles question selection from the College Board question bank, score approximation, and session state management, all with no React or side-effect dependencies.

## Design

Three standalone modules with zero cross-dependency between them. Each exports pure functions that receive all data via parameters, making them independently testable.

### File breakdown

- **`questionSelector.ts`** — Question selection algorithm:
  - Groups available questions by domain and difficulty
  - Fills module slots according to the blueprint's domain/difficulty distribution (33/34/33 split for Module 1, adaptive splits for Module 2)
  - Randomly designates 2 questions per module as pretest (unscored) using Fisher-Yates shuffle
  - Provides `selectQuestionsForTest()` (all 4 modules at once) and `reselectModule2Questions()` (called at runtime after Module 1 performance is known)
  - Determines Module 2 difficulty path via `determineModule2DifficultyFromAnswers()` using a simple accuracy threshold (`ADAPTIVE_THRESHOLD = 0.6`)
  - Client-side `fetchQuestionsForSection()` / `fetchQuestionDetails()` helpers call existing `/api/get-questions` and `/api/question/{id}` endpoints

- **`scoring.ts`** — Score approximation:
  - Difficulty-weighted raw scoring (E=1.0, M=1.3, H=1.7) with Module 2 difficulty path multipliers (±5%)
  - Piecewise linear scaled score mapping (200-800 per section) with S-shaped curve
  - `calculateModuleResult()`, `calculateSectionResult()`, `calculateTestResult()` — composable result builders
  - Score interpretation helpers: `interpretSectionScore()`, `interpretTotalScore()`, `getTimeManagementRating()`
  - Pretest questions are excluded from all scoring calculations

- **`fullLengthReducer.ts`** — Session state reducer:
  - `fullLengthReducer(state, action)` handles 18 action types covering test lifecycle, section/module transitions, answering, navigation, flagging, timers, breaks, and session restoration
  - Separate from Practice Rush reducer because full-length has fundamentally different UX (section-level timers, module-gated navigation, free navigation within modules, flagging, breaks, adaptive difficulty)
  - Helper functions: `getCurrentSection()`, `getCurrentModuleState()`, `getTotalAnsweredQuestions()`, `isQuestionFlagged()`, `isQuestionPretest()`, etc.
  - `serializeFullLengthSession()` / `deserializeFullLengthSession()` — converts Sets to arrays and back for localStorage JSON compatibility
  - Auto-completes module when timer reaches 0; transitions through phases: `intro → section-intro → module-active → module-review → module-complete → break → test-complete`

## Data Flow

1. `FullLengthTest` component dispatches `START_TEST` → calls `/api/full-length/questions` → receives `TestQuestionSelection` with per-module question IDs and metadata
2. Question IDs are stored in session state via `SET_QUESTION_SLOTS`
3. Question details are fetched lazily (one at a time) via `/api/question/{id}` as the user navigates
4. As the user answers, `SET_QUESTION_ANSWER` / `NAVIGATE_QUESTION` / `TOGGLE_FLAG_FOR_REVIEW` actions update module state
5. `TICK_MODULE_TIMER` decrements time remaining; auto-completes on zero
6. On module completion, `COMPLETE_MODULE` is dispatched; on section completion, results are calculated via `scoring.ts`
7. On test completion, `COMPLETE_TEST` stores the `FullLengthTestResult` and the component notifies the parent

## Integration Points

- **Depends on**: `@/types/full-length` (test blueprint, slot, config, result types), `@/types/full-length-session` (session state, action types, storage helpers), `@/types/question` (`PlainQuestionType`, `QuestionDifficulty`), `@/static-data/full-length` (blueprint constants, domain/difficulty distributions)
- **Consumed by**: `@/components/full-length/FullLengthTest.tsx` (imports reducer and scoring functions), `@/app/api/full-length/questions/route.ts` (imports `selectQuestionsForTest`)
- **Not used by**: Practice Rush feature — this is an entirely separate flow
