# src/types/

## Responsibility

Defines all shared TypeScript interfaces, types, enums, constants, type guards, and utility functions used across the MySATPrep application. This module serves as the single source of truth for the shape of data flowing through the system — question payloads from College Board APIs, localStorage schemas for sessions/statistics/bookmarks, vocabulary datasets, and practice configuration structures.

## Design

Each file covers a distinct domain, and `index.ts` re-exports selected modules (`lookup`, `question`, `session`, `statistics`) as a convenience barrel. Types are prefixed by domain context (e.g., `DictionaryAPI_`, `ChatAPI_`, `API_Response_`, `Question`) to avoid naming collisions. Several files include runtime helpers alongside types (factory functions, migration utilities, type guards, XP calculations).

### File breakdown

- **`index.ts`** — Barrel file re-exporting `lookup`, `question`, `session`, and `statistics`. (Notably does NOT re-export `savedQuestions`, `savedCollections`, `vocabulary`, `dictionaryapi`, `questionNotes`, or `userProfile`.)

- **`question.ts`** — Core question shapes:
  - `QuestionDifficulty` = `"E" | "M" | "H"`; `ProgramType` = `"SAT" | "P10" | "P89"`
  - Disclosed questions: `MultipleChoiceDisclosedQuestion` (exact College Board disclosed JSON — `answer.choices` with `a/b/c/d` keys, `correct_choice`, `rationale`, `style: "Multiple Choice"`), `SPRDisclosedQuestion` (student-produced response with `style: "SPR"`)
  - API response shapes: `API_Response_Question` (with optional `answerOptions` as `A/B/C/D` map, nullable `correct_answer`), `QuestionById_Data` (pairs `problem` + `plainQuestion`)
  - Internal unified shape: `Question`, `QuestionState` (adds `stimulus`, `plainQuestion`)
  - `PlainQuestionType` — Metadata-only question from the question bank listing endpoint

- **`session.ts`** — Full practice session model:
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

- **Data enters** types as the return value of `fetch()` calls to College Board APIs (`question.ts`, `lookup.ts`), AI chat endpoints (`vocabulary.ts`), and the Free Dictionary API (`dictionaryapi.ts`). It also enters via `localStorage.getItem()` deserialization (`session.ts`, `statistics.ts`, `savedQuestions.ts`, `savedCollections.ts`, `questionNotes.ts`, `userProfile.ts`, `vocabulary.ts`).
- **Data is validated** at the boundary using type guards (`isValidPracticeSession`, `isValidPracticeSelections`) before being consumed.
- **Data leaves** the type system as runtime values used by React components, context providers, and API route handlers. The `vocabs_database` constant is computed eagerly at module load from the JSON static asset.

## Integration

- **Consumed by**: All modules in `src/app/`, `src/components/`, `src/lib/`, `src/contexts/`, and `src/hooks/` that interact with questions, sessions, statistics, bookmarks, notes, vocabulary, or user profiles.
- **Depends on**:
  - `src/static-data/cleaned_sat_vocabulary.json` (imported by `vocabulary.ts`)
  - `src/types/lookup.ts` (imported by `question.ts`, `statistics.ts`)
  - `src/types/question.ts` (imported by `session.ts`, `statistics.ts`, `savedQuestions.ts`)
  - `src/types/savedQuestions.ts` (imported by `savedCollections.ts`)
  - `src/types/dictionaryapi.ts` (imported by `vocabulary.ts`)
  - No external npm dependencies — pure TypeScript types and inline utilities.
