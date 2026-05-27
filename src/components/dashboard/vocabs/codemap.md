# dashboard/vocabs/

## Responsibility
SAT Vocabulary dashboard — word bank browser and flashcard learning system. Provides a searchable/filterable vocabulary list with progress tracking, and a flashcard-based learning interface for mastering individual words.

## Design
- **Pattern**: Two-page vocabulary system: browsing (`vocabs.tsx`) and learning (`learn.tsx`). Both share `useLocalStorage` for `VocabsData` (learnt words + user sentences) and `PracticePerformanceData` (quiz/attempt history).
- **Data source**: Static JSON from `@/types/vocabulary` (`vocabs_database`). No API calls.
- **State management**: `useReducer` for search/filter state and flashcard navigation. `useMemo` for computing statistics and filtered lists.

## Files

| File | Role |
|---|---|
| `vocabs.tsx` (`VocabsMainPage`) | Word bank browser and dashboard. Left column: progress card (overall %, breakdown by difficulty, mastery levels, practice stats). Right column: search input, difficulty/part-of-speech/mastery filter pills, grid of word cards with mastery-level coloring and performance indicators. Links to `/dashboard/vocabs/learn?word={word}`. |
| `learn.tsx` (`LearnVocab`) | Flashcard learning interface. Shows one word at a time with `CardFlip` component. Features: difficulty/progress filters, previous/next navigation, sentence submission form (validates word is used), view/delete previous user sentences. Supports `?word=` URL parameter for deep-linking. Tracks learned words and sentences in `VocabsData` localStorage. |
| `practice/` | Sub-directory with practice game components (see `practice/codemap.md`). |
| `codemap.md` | This file. |

## Flow
1. **VocabsMainPage**: Mount → load `vocabsData` and `practiceData` from localStorage → compute statistics via `useMemo` (total words, learned, sentences, difficulty breakdown, mastery levels) → render sidebar stats + searchable/filterable word grid.
2. **LearnVocab**: Mount → load vocabsData → if `?word=` param, find word and set as current → render `CardFlip` with word details → user types a sentence using the word → on submit, validate → save to `vocabsData.userSentences` and `learntVocabs` → navigate to next word.

## Integration
- Consumed by: `src/app/(dashboard)/dashboard/vocabs/page.tsx`, `src/app/(dashboard)/dashboard/vocabs/learn/page.tsx`
- Depends on: `@/types/vocabulary` (static database, types), `@/lib/useLocalStorage`, `@/lib/utils`, `@/lib/playSound`, `@/components/ui/flip-card`, `@/components/ui/button`, `@/components/ui/select`, `@/components/ui/card-v2`, `lucide-react`, `framer-motion`, `next/link`, `next/navigation`
