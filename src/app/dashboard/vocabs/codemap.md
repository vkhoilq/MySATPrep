# src/app/dashboard/vocabs/

## Responsibility
Vocabulary wordbank landing page (`/dashboard/vocabs`) that serves as the entry point into the SAT vocabulary system. Renders a wordbank overview with categorized vocabulary lists, links to flashcard learning and practice modes, and progress summary.

## Design
- **Server component**: No `"use client"` directive. The page is static scaffolding that delegates to a client component for interactive vocabulary browsing.
- **SEO-first page**: Extremely extensive SEO metadata including:
  - 50+ keywords targeting SAT vocabulary search terms.
  - Full OpenGraph, Twitter card, Dublin Core metadata.
  - JSON-LD structured data describing the page as a `Course` with educational audience, prerequisites, time requirements, and credits.
  - Hidden SEO `<div>` with 250+ lines of semantic HTML (articles, sections, nav, aside, footer) covering vocabulary categories, learning features, and long-tail keyword spans.
  - Schema.org microdata for `EducationalOrganization`, `Course`, and `Dataset`.
  - Hidden images with SEO alt text from `seo/vocabs-*.png` assets.
- **Delegation pattern**: Renders `VocabsMainPage` from `@/components/dashboard/vocabs/vocabs`, which contains the interactive wordbank browser with search, filter by difficulty/category, and word detail cards.
- **Canonical URL**: Set to `https://www.mysatprep.fun/dashboard/vocabs`.

## Flow
1. User navigates to `/dashboard/vocabs` via sidebar "SAT Vocabs" link.
2. The server component renders JSON-LD script and extensive hidden SEO content.
3. `VocabsMainPage` mounts client-side, loads vocabulary datasets (from static JSON files in `@/static-data/`), and displays the wordbank with search/filter controls.
4. User can browse words by category/difficulty, click individual words for detailed definitions/examples, and navigate to `/dashboard/vocabs/learn` (flashcards) or `/dashboard/vocabs/practice` (practice modes).

## Integration
- Consumed by: Route at `/dashboard/vocabs`; linked from `AppSidebar` nav items "SAT Vocabs" and sub-links in the explore section.
- Depends on:
  - `@/components/dashboard/vocabs/vocabs` — `VocabsMainPage` component
  - `next/metadata` — Metadata generation
  - `@/static-data/` — JSON vocabulary datasets (from `vocabs/` and `src/static-data/`)
