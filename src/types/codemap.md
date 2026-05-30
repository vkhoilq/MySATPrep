# src/types/

## Responsibility

Defines all shared TypeScript interfaces, types, enums, constants, type guards, and utility functions used across the MySATPrep application. This module serves as the single source of truth for the shape of data flowing through the system — question payloads from College Board APIs, localStorage schemas for sessions/statistics/bookmarks, vocabulary datasets, practice configuration structures, and full-length test session state.

## Design

Each file covers a distinct domain, and `index.ts` re-exports selected modules (`lookup`, `question`, `session`, `statistics`) as a convenience barrel. Types are prefixed by domain context (e.g., `DictionaryAPI_`, `ChatAPI_`, `API_Response_`, `FullLength`) to avoid naming collisions. Several files include runtime helpers alongside types (factory functions, migration utilities, type guards, XP calculations, storage helpers). The full-length types (`full-length.ts` and `full-length-session.ts`) were added for the full-length practice feature and follow the same patterns as the existing session and statistics types.

### File breakdown

- **`index.ts`** — Barrel file re-exporting `lookup`, `question`, `session`, and `statistics`. (Notably does NOT re-export `savedQuestions`, `savedCollections`, `vocabulary`, `dictionaryapi`, `questionNotes`, `userProfile`, `full-length`, or `full-length-session`.)

- **`question.ts`** — Core question shapes:
  - `QuestionDifficulty` = `"E" | "M" | "H"`; `ProgramType` = `"SAT" | "P10" | "P89"`
  - Disclosed questions: `MultipleChoiceDisclosedQuestion` (exact College Board disclosed JSON — `answer.choices` with `a/b/c/d` keys, `correct_choice`, `rationale`, `style: "Multiple Choice"`), `SPRDisclosedQuestion` (student-produced response with `style: "SPR"`)
  - API response shapes: `API_Response_Question` (with optional `answerOptions` as `A/B/C/D` map, nullable `correct_answer`), `QuestionById_Data` (pairs `problem` + `plainQuestion`)
  - Internal unified shape: `Question`, `QuestionState` (adds `stimulus`, `plainQuestion`)
  - `PlainQuestionType` — Metadata-only question from the question bank listing endpoint

- **`session.ts`** — Practice Rush session model:
  - Constants: `SESSION_CONFIG` with max history (10), timeout (2h), auto-save interval (30s), storage keys
  - `SessionStatus` enum: `NOT_STARTED`, `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `ABANDONED`, `EXPIRED`
  - Selection config: `Domain`, `Skill`, `PracticeSelections` (practiceType, assessment, subject, domains, skills, difficulties, randomize, questionIds, excludeBluebook, duplicateSession)
  - Session data: `PracticeSession` (sessionId, timestamp, status, currentQuestionStep, questionAnswers, questionTimes, answeredQuestionDetails, totalQuestions, answeredQuestions, averageTimePerQuestion, totalTimeSpent, totalXPReceived)
  - Analytics: `SessionAnalytics`, `SessionPerformance`, `SessionSummary`, `SessionComparison`, `ExtendedPracticeSession`
  - Type guards: `isValidPracticeSession`, `isValidPracticeSelections` (runtime validation for localStorage deserialization)
  - Factory: `createPracticeSession`, `updateSessionProgress`, `getSessionSummary`
  - Storage: `saveSessionToStorage`, `loadSessionFromStorage`, `getSessionHistory`, `clearSessionStorage` (all use `localStorage`)

- **`statistics.ts`** — Practice Rush statistics stored in localStorage:
  - `QuestionStatistic` (time, answer, isCorrect, external_id, ibn, plainQuestion)
  - Nested map: `SkillStatistics[questionId]` → `DomainStatistics[skillCd]` → `ClassStatistics[primaryClassCd]` → `AssessmentStatistics` (with `answeredQuestions` + `answeredQuestionsDetailed`) → `PracticeStatistics[assessment]`
  - Summary types: `SkillSummary`, `DomainSummary`, `AssessmentSummary`
  - `StatisticEntry` — Flattened utility for writing a stat entry
  - API response types: `StatsAPIResponse`, `StatsData`, `StatsDomainBreakdown`, `StatsDifficultyBreakdown`, `StatsSkillBreakdown`

- **`full-length.ts`** — Full-length practice test type definitions (271 lines):
  - Section and module types: `FullLengthSection` (`"reading-writing" | "math"`), `FullLengthModule` (`1 | 2`), `FullLengthModuleDifficulty` (`"easier" | "harder"`), `FullLengthModuleStatus`
  - Blueprint types: `FullLengthModuleConfig` (operational/pretest counts, time limit, domain/difficulty distribution), `FullLengthSectionConfig` (two modules per section), `FullLengthTestBlueprint` (complete assessment structure)
  - Question slot types: `FullLengthQuestionSlot` (position, domain, skill, difficulty, question type, pretest flag), `FullLengthQuestionType` (`"mcq" | "spr"`)
  - Test config: `FullLengthTestConfig` (assessment, includeBreak, showTimer, allowPause, qa?)
  - Module state: `FullLengthModuleState` (timeRemainingMs, questionOrder, answers, questionTimes, flaggedForReview, pretestQuestionIds, difficulty)
  - Result types: `FullLengthModuleResult` (correctCount, operationalCount, accuracy, domainBreakdown, questionResults), `FullLengthSectionResult`, `FullLengthTestResult` (estimated scores 200-800 per section, 400-1600 total)
  - Per-question: `QuestionResult` (questionId, userAnswer, correctAnswer, isCorrect, isUnanswered, difficulty), `DomainModuleResult`
  - Constants: `ADAPTIVE_THRESHOLD` (0.6), `MINIMUM_ADAPTIVE_ANSWERS` (10)

- **`full-length-session.ts`** — Full-length session types and storage (378 lines):
  - `FULL_LENGTH_SESSION_CONFIG`: Constants for max history (5), auto-save interval (10s), timer save interval (5s), separate localStorage keys (`"fullLengthCurrentSession"`, `"fullLengthSessionHistory"`)
  - `FullLengthTestPhase`: `"intro" | "section-intro" | "module-active" | "module-review" | "module-complete" | "break" | "test-complete"`
  - `FullLengthSession`: Complete session state — identification, config, current position (section/module/question), per-module states, adaptive difficulty, break state, question data (slots, pretest, meta), results, metadata
  - `FullLengthAction`: Union type of 18 reducer actions covering test lifecycle, section/module transitions, answering, navigation, flagging, timers, breaks, and session restoration
  - Factory: `createFullLengthSession()`
  - Type guard: `isValidFullLengthSession()` — validates localStorage deserialized data
  - Storage helpers: `saveFullLengthSession()`, `loadFullLengthSession()`, `clearFullLengthSession()`, `saveFullLengthSessionToHistory()`, `getFullLengthSessionHistory()`, `clearAllFullLengthSessionData()`
  - Module key helper: `getModuleKey(section, moduleNumber)` → `"reading-writing-1"`, `parseModuleKey(key)` → `{ section, moduleNumber }`
  - Adaptive difficulty helper: `determineModule2Difficulty()` — simple accuracy threshold logic

- **`lookup.ts`** — College Board domain/skill taxonomy:
  - `DomainItems` = `"INI" | "CAS" | "EOI" | "SEC" | "H" | "P" | "Q" | "S"`
  - `SkillCd_Variants` — 28 skill code literals (e.g., `"CID"`, `"INF"`, `"H.A."`, `"Q.C."`)
  - `SkillDesc` — 29 human-readable skill descriptions
  - `LookupDomainData` — The full domain→skill tree for R&W and Math, used by question bank filters
  - `LookupRequest`, `LookupResponseData` — Shapes for the College Board lookup API endpoint
  - `QuestionsBank` — Shape of a single question from the bank list endpoint
  - `StateOfferings` — Tuple of 18 state entries (e.g., `{ stateCd: "AR", name: "Arkansas" }`)

- **`vocabulary.ts`** — SAT vocabulary system types:
  - `VocabularyWord` (word, part_of_speech, definition, example, page, categories, difficulty, syllable_count, word_length)
  - `vocabs_database` — Runtime constant built from `cleaned_sat_vocabulary.json`
  - `VocabsData` — localStorage schema (learntVocabs, userSentences)
  - `QuizAttempt`, `WordPerformance`, `PracticePerformanceData` — Per-word quiz tracking and mastery (`"struggling" | "learning" | "proficient" | "mastered"`)
  - `ChatAPI_*_Response` — AI chat endpoint response types for definition checking and sentence writing

- **`dictionaryapi.ts`** — Dictionary API integration types:
  - Raw API types: `DictionaryAPI_Definition`, `DictionaryAPI_Meaning`, `DictionaryAPI_DictionaryEntry`, `DictionaryAPI_Response_OK`, `DictionaryAPI_Response_NOTFOUND`
  - Normalized app types: `Vocab_Phonetic`, `VocabAPI_Meaning` (keyed by `partOfSpeechType`), `VocabAPI_Response_OK`

- **`savedQuestions.ts`** — Bookmark/saved-questions localStorage schema:
  - `SavedQuestion` (questionId, externalId, ibn, plainQuestion?, timestamp)
  - `SavedQuestions[assessment]` — Map of assessment key to array of saved questions
  - `LegacySavedQuestion`, `LegacySavedQuestions` — Backward-compatible formats
  - `migrateSavedQuestions()` — Utility to upgrade legacy data

- **`savedCollections.ts`** — Collection/folder organization for saved questions:
  - `SavedCollection` (id, name, description, createdAt, updatedAt, questionIds, questionDetails[], color?)
  - `SavedCollections[collectionId]` — Map of collection UUIDs
  - `CollectionWithQuestions` — Joined view with full `SavedQuestion[]`

- **`questionNotes.ts`** — User notes on questions:
  - `QuestionNote` (questionId, difficulty?, primaryClassCd?, skillCd?, subject?, createdDate?, updatedDate?, note, timestamp, createdAt)
  - `QuestionNotes[assessment]` — Map of assessment key to note array

- **`userProfile.ts`** — User XP and leveling system:
  - `UserProfile` (totalXP, level, questionsAnswered, correctAnswers, incorrectAnswers, lastActivity, createdAt)
  - `XPTransaction` (questionId, change, reason, timestamp, scoreBandRange)
  - `UserProfileWithHistory` extends `UserProfile` with `xpHistory`
  - Utility functions: `calculateLevel` (`floor(sqrt(totalXP/100))`), `getXPForNextLevel`, `getLevelProgress`

## Flow

- **Data enters** types as the return value of `fetch()` calls to College Board APIs (`question.ts`, `lookup.ts`), AI chat endpoints (`vocabulary.ts`), and the Free Dictionary API (`dictionaryapi.ts`). It also enters via `localStorage.getItem()` deserialization (`session.ts`, `statistics.ts`, `savedQuestions.ts`, `savedCollections.ts`, `questionNotes.ts`, `userProfile.ts`, `vocabulary.ts`, `full-length-session.ts`).
- **Data is validated** at the boundary using type guards (`isValidPracticeSession`, `isValidPracticeSelections`, `isValidFullLengthSession`) before being consumed.
- **Data leaves** the type system as runtime values used by React components, context providers, and API route handlers. The `vocabs_database` constant is computed eagerly at module load from the JSON static asset.
- **Full-length session data** flows through a separate localStorage key namespace (`"fullLengthCurrentSession"`, `"fullLengthSessionHistory"`) to avoid conflicts with Practice Rush sessions. Serialization converts Sets to arrays for JSON compatibility.

## Integration

- **Consumed by**: All modules in `src/app/`, `src/components/`, `src/lib/`, `src/contexts/`, and `src/hooks/` that interact with questions, sessions, statistics, bookmarks, notes, vocabulary, user profiles, or full-length tests.
- **Specifically for full-length**:
  - `src/lib/full-length/questionSelector.ts` — Imports `FullLengthTestBlueprint`, `FullLengthModuleConfig`, `FullLengthQuestionSlot`, `FullLengthSection`, `FullLengthModule`, `FullLengthModuleDifficulty`, `ADAPTIVE_THRESHOLD`
  - `src/lib/full-length/scoring.ts` — Imports `FullLengthSectionResult`, `FullLengthModuleResult`, `FullLengthSection`, `FullLengthModuleDifficulty`, `FullLengthTestResult`, `FullLengthTestConfig`, `QuestionResult`
  - `src/lib/full-length/fullLengthReducer.ts` — Imports `FullLengthSession`, `FullLengthAction`, `FullLengthTestPhase`, `FULL_LENGTH_SESSION_CONFIG`, `getModuleKey` from `full-length-session.ts`
  - `src/components/full-length/FullLengthTest.tsx` — Imports session types, storage helpers, config types
  - `src/app/api/full-length/questions/route.ts` — Imports `FullLengthSection`
- **Depends on**:
  - `src/static-data/cleaned_sat_vocabulary.json` (imported by `vocabulary.ts`)
  - `src/types/lookup.ts` (imported by `question.ts`, `statistics.ts`, `full-length.ts`)
  - `src/types/question.ts` (imported by `session.ts`, `statistics.ts`, `savedQuestions.ts`, `full-length.ts`)
  - `src/types/session.ts` (imported by `full-length-session.ts`)
  - `src/types/savedQuestions.ts` (imported by `savedCollections.ts`)
  - `src/types/dictionaryapi.ts` (imported by `vocabulary.ts`)
  - `src/lib/full-length/questionSelector.ts` (imported by `full-length-session.ts` for `QuestionMeta`)
  - No external npm dependencies — pure TypeScript types and inline utilities.
