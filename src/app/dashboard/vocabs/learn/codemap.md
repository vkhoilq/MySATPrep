# src/app/dashboard/vocabs/learn/

## Responsibility
Interactive flashcard learning page (`/dashboard/vocabs/learn`) that provides a spaced-repetition-based flashcard system for mastering SAT vocabulary. Wraps the flashcard UI with an informational banner and Suspense boundary.

## Design
- **Server component**: No `"use client"` directive. The page is static scaffolding that delegates to a client component.
- **SEO-first page**: Extensive metadata and structured data including:
  - 35+ keywords targeting SAT flashcard search terms.
  - JSON-LD structured data describing the page as a `Course` with `hasPart` entries for spaced repetition, quiz mode, and progress tracking.
  - Hidden SEO `<div>` with 220+ lines of semantic HTML covering flashcard features, learning methodology, and long-tail keywords.
  - Schema.org microdata for `Course` and `LearningResource`.
- **Banner pattern**: A `PageBanner` component renders a `Banner` shadcn component with a warning icon and instructional text ("You should submit a sentence for each vocabulary so that you save your progress").
- **Suspense boundary**: The `LearnVocab` component is wrapped in `<Suspense>` with a spinner fallback, indicating that the flashcard data may be loaded asynchronously (possibly via dynamic import or data fetching).
- **Delegation pattern**: `LearnVocab` from `@/components/dashboard/vocabs/learn` contains the full flashcard UI — card flip animation, navigation (previous/next), difficulty rating, progress tracking, and sentence submission.
- **Canonical URL**: Set to `https://www.mysatprep.fun/dashboard/vocabs/learn`.

## Flow
1. User navigates to `/dashboard/vocabs/learn` (via sidebar "SAT Vocabs Flashcards" link or from the vocabs main page).
2. The server component renders the JSON-LD script, banner, and SEO hidden content.
3. `LearnVocab` mounts inside a Suspense boundary — while loading, a centered spinner is shown.
4. The flashcard system loads word data (from static JSON datasets), initializes the spaced repetition algorithm, and presents the first card.
5. User interacts with flashcards (flip, rate difficulty, submit a sentence to save progress), and progress is tracked locally.

## Integration
- Consumed by: Route at `/dashboard/vocabs/learn`; linked from `AppSidebar` explore section "SAT Vocabs Flashcards".
- Depends on:
  - `@/components/dashboard/vocabs/learn` — `LearnVocab` flashcard component
  - `@/components/ui/banner-v2` — Banner component for instructional messages
  - `lucide-react` — MessageCircleWarningIcon
  - `next/metadata` — Metadata generation
  - `react` (Suspense) — Async loading boundary
