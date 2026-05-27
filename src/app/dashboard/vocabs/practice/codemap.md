# src/app/dashboard/vocabs/practice/

## Responsibility
AI-powered vocabulary practice page (`/dashboard/vocabs/practice`) offering multiple interactive practice modes (matching games, adaptive quizzes, context-based exercises) for SAT vocabulary mastery. Wraps the practice UI with an informational banner.

## Design
- **Server component**: No `"use client"` directive. The page is static scaffolding that delegates to client components.
- **SEO-first page**: Extensive metadata and structured data including:
  - 35+ keywords targeting AI-powered SAT vocabulary practice search terms.
  - JSON-LD structured data describing the page as a `Course` with `hasPart` entries for adaptive learning, multiple practice modes, personalized feedback, and context-based learning.
  - Hidden SEO `<div>` with 220+ lines of semantic HTML covering AI learning features, practice modes, and long-tail keywords.
  - Schema.org microdata for `Course` and `LearningResource`.
- **Banner pattern**: `PracticeBanner` from `@/components/dashboard/vocabs/practice/practice-banner` provides contextual information or tips at the top of the page.
- **Delegation pattern**: Renders `VocabsPracticePage_Main` from `@/components/dashboard/vocabs/practice/practice`, which contains the full practice UI — mode selector (adaptive, matching, context, quiz), game interfaces, score tracking, and AI feedback integration.
- **Multiple practice modes**: The practice system likely supports:
  - **Adaptive learning**: AI-driven difficulty adjustment based on user performance.
  - **Matching games**: Word-definition pair matching.
  - **Context-based exercises**: Fill-in-the-blank with SAT-style passages.
  - **AI quiz mode**: Personalized quizzes with AI-generated feedback.
- **Canonical URL**: Set to `https://www.mysatprep.fun/dashboard/vocabs/practice`.

## Flow
1. User navigates to `/dashboard/vocabs/practice` (via sidebar "SAT Vocabs Practice" link or from the vocabs main page).
2. The server component renders the JSON-LD script, the `PracticeBanner`, and SEO hidden content.
3. `VocabsPracticePage_Main` mounts and presents the practice mode selector.
4. User selects a practice mode — the component loads vocabulary data and presents interactive exercises matching the selected mode.
5. User completes exercises, receives immediate feedback (correct/incorrect), and accumulates progress data tracked in localStorage.
6. AI-powered feedback provides personalized recommendations based on performance patterns.

## Integration
- Consumed by: Route at `/dashboard/vocabs/practice`; linked from `AppSidebar` explore section "SAT Vocabs Practice".
- Depends on:
  - `@/components/dashboard/vocabs/practice/practice` — `VocabsPracticePage_Main` main practice component
  - `@/components/dashboard/vocabs/practice/practice-banner` — `PracticeBanner` component
  - `next/metadata` — Metadata generation
  - `@/static-data/` — Vocabulary JSON datasets
