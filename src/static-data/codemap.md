# src/static-data/

## Responsibility

Provides compile-time constants, lookup tables, pre-built JSON datasets, and test blueprint definitions that encode the SAT domain taxonomy, assessment metadata, validation rules, vocabulary word lists, and full-length practice test specifications.

## Design

The module is split between static TypeScript/JSON exports (eagerly evaluated) and dynamic lookup utilities that build runtime indexes. The TypeScript files are tightly coupled with `src/types/lookup.ts` for type definitions. The full-length blueprint module (`full-length.ts`) was added for the full-length practice feature and follows the same pattern as the other static data files.

### File breakdown

- **`assessment.ts`** — Assessment registry:
  - `Assessments` constant: `{ SAT: { text: "SAT", id: 99 }, "PSAT/NMSQT": { text: "PSAT/NMSQT & PSAT 10", id: 100 }, PSAT: { text: "PSAT 8/9", id: 102 } }`
  - `AssessmentsId` constant: Reverse index from string ID to `{ text, textId, id }` (e.g., `"99"` → `{ text: "SAT", textId: "SAT", id: 99 }`)
  - Note: has a stray `import { text } from "stream/consumers"` at the top (dead import — `text` is never used in the file).

- **`domains.ts`** — Domain/skill taxonomy (mirrors `LookupDomainData` in `src/types/lookup.ts`):
  - `skillCds`: Array literal of all 28 valid `SkillCd_Variants` (with a duplicate `"SYN"` entry at the end)
  - `domains`: The full domain hierarchy for both `"R&W"` (4 domains, 10 skills) and `"Math"` (4 domains, 19 skills). Each entry matches the `{ text, id, primaryClassCd, skill[] }` shape.
  - `skillCdsObjectData`: Dynamically built `Record<skill_cd, { text, id, skill_cd }>` — flattens the domain tree into a skill-code-keyed lookup. Built at module load via an IIFE.
  - `primaryClassCdObjectData`: Dynamically built `Record<primaryClassCd, { subject, text, id, primaryClassCd, skill[] }>` — domain-keyed lookup with subject metadata. Built at module load via an IIFE.
  - `getSubjectBySkillCd(skillCd)`: Returns `"reading-writing"` or `"math"` by scanning the domain tree.
  - `getSubjectByPrimaryClassCd(primaryClassCd)`: Same but keyed by primary class code.

- **`validation.ts`** — Validation constants for filtering and form validation:
  - `validSkillCds`: Same array as `domains.ts`'s `skillCds` (28 values, though without the duplicate `"SYN"`)
  - `mathDomains`: `["H", "P", "Q", "S"]`
  - `rwDomains`: `["INI", "CAS", "EOI", "SEC"]`
  - `mathSkillPrefixes`: `["H.", "P.", "Q.", "S."]`
  - `rwSkillCds`: `["CID", "INF", "COE", "WIC", "TSP", "CTC", "SYN", "TRA", "BOU", "FSS"]`
  - `validSubjects`: `["math", "reading-writing"]`
  - `validPracticeTypes`: `["rush", "full-length"]`

- **`full-length.ts`** — Full-length practice test blueprint constants (496 lines):
  - Defines the exact structure of each Digital SAT assessment following College Board's official specifications
  - **SAT Blueprint**: R&W (2×27 questions, 2×32 min) + Math (2×22 questions, 2×35 min) + 10 min break = 98 questions, 134 min testing
  - **PSAT/NMSQT Blueprint**: R&W (2×27, 2×30 min) + Math (2×20, 2×32 min) + break = 94 questions
  - **PSAT 8/9 Blueprint**: R&W (2×26, 2×30 min) + Math (2×20, 2×30 min) + break = 92 questions
  - **QA-SAT Blueprint**: 5 questions/module, 5-min timer — for development QA testing
  - Difficulty distribution constants: `MODULE_1_DIFFICULTY_MIX` (33/34/33), `MODULE_2_EASIER_MIX` (40/40/20), `MODULE_2_HARDER_MIX` (20/40/40)
  - Domain distribution constants: `RW_MODULE_DISTRIBUTION` (INI/CAS/EOI/SEC: 7/7/7/6), `MATH_MODULE_DISTRIBUTION` (H/P/Q/S: 6/6/5/5)
  - Lookup helpers: `getTestBlueprint()`, `getModuleConfig()`, `getSectionConfig()`, `getDifficultyDistribution()`, `getDomainDistribution()`, `getQuestionTypeRatio()`

- **`cleaned_sat_vocabulary.json`** (~14,000 lines) — The primary SAT vocabulary dataset:
  - 988 vocabulary words with metadata
  - Top-level keys: `meta` (title, description, version, source, difficulty_levels, semantic_categories, features, usage_guide), `summary` (word_count, difficulty_distribution, category_distribution), `words[]`
  - Each word: `{ word, part_of_speech, definition, example, page, difficulty, syllable_count, word_length, categories[] }`
  - Imported at module load by `src/types/vocabulary.ts` and cast into the `VocabularyData` type

- **`sat_vocabulary_categorized.json`** (~13,000 lines) — Categorized variant of the vocabulary dataset:
  - Same structure as `cleaned_sat_vocabulary.json` but with an additional `"categories_array"` feature noted in `meta.features`
  - Contains the same 988 words organized with semantic category assignments

## Flow

1. **At module evaluation time**, the TypeScript files export their constants. The IIFEs in `domains.ts` execute immediately, building the `skillCdsObjectData` and `primaryClassCdObjectData` lookup maps.
2. **When `vocabulary.ts`** is imported, it loads `cleaned_sat_vocabulary.json` via a static import and transforms it into the typed `vocabs_database` array (casting `difficulty` and `part_of_speech` strings to their union types).
3. **When `full-length.ts`** is imported, its blueprint constants are eagerly evaluated. The `TEST_BLUEPRINTS` lookup map is built at module load, and helper functions (`getTestBlueprint`, `getModuleConfig`, etc.) are used at runtime by the question selection algorithm.
4. **Consuming code** imports the relevant constant (e.g., `domains`, `validSkillCds`, `Assessments`, `getTestBlueprint`) or calls a lookup function (`getSubjectBySkillCd`) to drive UI filters, form validation, assessment routing, or test construction.

## Integration

- **Consumed by**:
  - `src/contexts/assessment-context.tsx` — Uses `Assessments` to build `assessmentWorkspaces`
  - `src/types/vocabulary.ts` — Imports `cleaned_sat_vocabulary.json` to build `vocabs_database`
  - `src/lib/full-length/questionSelector.ts` — Imports `getTestBlueprint`, `getModuleConfig`, `getDomainDistribution`, `getDifficultyDistribution`, `getQuestionTypeRatio` from `full-length.ts`
  - `src/lib/full-length/scoring.ts` — Imports blueprint types from `@/types/full-length` (which mirrors the blueprint structure)
  - `src/app/api/full-length/questions/route.ts` — Uses `Assessments` from `assessment.ts`
  - Any component in `src/app/` or `src/components/` that renders domain/skill selection UI (question bank filters, practice setup), validates user inputs, or displays vocabulary flashcards/quizzes
  - `src/types/lookup.ts` — Mirrors the domain structure in its `LookupRequest`/`LookupResponseData` types (but the actual data in `LookupDomainData` is a separate copy)

- **Depends on**:
  - `src/types/lookup.ts` — `SkillCd_Variants` type (used by `domains.ts`, `validation.ts`)
  - `src/types/full-length` — `FullLengthTestBlueprint`, `FullLengthSectionConfig`, `FullLengthModuleConfig` types (used by `full-length.ts`)
  - `src/types/question` — `QuestionDifficulty` (used by `full-length.ts` for difficulty distribution)
  - No external npm dependencies — pure TypeScript/JSON
