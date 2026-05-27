# Repository Atlas: MySATPrep

## Project Responsibility

MySATPrep is a Next.js 15 (React 19, TypeScript) SAT practice platform that fetches questions from College Board's question bank and provides an interactive study experience. It includes Practice Rush (timed practice sessions), Question Bank browser (filterable question explorer), SAT Vocabulary with AI tutoring (flashcards + chat), bookmarks, review tracking, and progress analytics — all persisted client-side via localStorage with optional Neon PostgreSQL for server-side question data.

## System Entry Points

- `src/app/layout.tsx` — Root layout wrapping all routes in providers (AssessmentProvider, MathJaxContext), analytics (GA, GTM, Vercel, Clarity), and global UI (Toaster, Dialog02)
- `src/app/page.tsx` — Landing page (HeroSection + FooterSection)
- `src/app/api/` — API route handlers proxying College Board APIs, serving question data from Neon DB, and providing AI chat
- `package.json` — Dependency manifest and build scripts (`bun run dev/build/start/lint`)
- `next.config.ts` — Next.js configuration (standalone output, image domains, redirects)
- `Dockerfile` / `docker-compose.yml` — Multi-stage production build (Bun install → Node 20-slim runtime, port 3000)

## Architecture Overview

### Rendering Model
- **Server components** for SEO-heavy pages (home, question bank, tracker, vocabulary, changelogs) with `generateMetadata` and JSON-LD structured data
- **Client components** (`"use client"`) for interactive pages (practice rush, dashboard, review, onboarding)
- **API routes** (`src/app/api/`) as serverless functions proxying College Board and serving DB data

### Data Flow
1. **Question retrieval**: Client → `/api/get-questions` → College Board qbank-api → question IDs → `/api/question/{id}` → `questionFetcher.ts` (disclosed vs regular fallback chain) → question data
2. **Practice sessions**: Client-side `useReducer` in `PracticeRushMultistep` → localStorage persistence → session history → review mode
3. **Statistics**: `practiceStatistics.ts` → hierarchical map (assessment → class → skill → question) → localStorage → dashboard analytics
4. **Vocabulary**: Static JSON datasets (`cleaned_sat_vocabulary.json`) → flashcard UI → AI chat (`/api/chat` → OpenRouter → GLM-4.5)

### State Management
- **AssessmentContext** (`useReducer` + localStorage) — global assessment selection (SAT/PSAT/NMSQT/PSAT 8/9)
- **Question bank** (`useReducer` with 19 action types) — filter state, pagination, progressive loading
- **Practice session** (`useReducer` with 20+ action types) — timer, answers, XP, navigation
- **localStorage** — primary persistence for user profiles, statistics, saved questions, collections, notes, vocabulary progress

### External Integrations
- **College Board disclosed questions** — `saic.collegeboard.org/disclosed/{id}.json` (question IDs containing `-DC`)
- **College Board question bank API** — `qbank-api.collegeboard.org` (regular questions)
- **College Board JWT endpoint** — `sucred.catapult-prod.collegeboard.org` (requires session ID + auth header)
- **OpenRouter AI** — `z-ai/glm-4.5-air:free` model for vocabulary tutoring
- **Neon PostgreSQL** — Serverless DB for student question bank data
- **Free Dictionary API** — `dictionaryapi.dev` for vocabulary definitions

## Directory Map (Aggregated)

| Directory | Responsibility Summary | Detailed Map |
|-----------|------------------------|--------------|
| `src/app/` | Root layout, home page, navbar, 404, global CSS, robots/manifest/sitemap config | [View Map](src/app/codemap.md) |
| `src/app/api/` | API route handlers — health check, College Board proxy, DB queries, AI chat | [View Map](src/app/api/codemap.md) |
| `src/app/api/chat/` | AI vocabulary tutor endpoint (OpenRouter + Vercel AI SDK) | [View Map](src/app/api/chat/codemap.md) |
| `src/app/api/credentials/` | College Board JWT token proxy | [View Map](src/app/api/credentials/codemap.md) |
| `src/app/api/dictionaryapi/` | Dictionary API proxy for vocabulary definitions | [View Map](src/app/api/dictionaryapi/codemap.md) |
| `src/app/api/get-questions/` | Question bank listing endpoint (College Board proxy) | [View Map](src/app/api/get-questions/codemap.md) |
| `src/app/api/lookup/` | Domain/skill taxonomy lookup (College Board proxy) | [View Map](src/app/api/lookup/codemap.md) |
| `src/app/api/question/` | Individual question fetch (disclosed + regular fallback) | [View Map](src/app/api/question/codemap.md) |
| `src/app/api/question-by-id/` | Question fetch by unique ID | [View Map](src/app/api/question-by-id/codemap.md) |
| `src/app/api/stats/` | Practice statistics endpoint (College Board proxy) | [View Map](src/app/api/stats/codemap.md) |
| `src/app/api/student-qb/` | Student question bank routes (Neon DB-backed) | [View Map](src/app/api/student-qb/codemap.md) |
| `src/app/practice/` | Practice Rush page (timed practice sessions) | [View Map](src/app/practice/codemap.md) |
| `src/app/question/` | Question search page | [View Map](src/app/question/codemap.md) |
| `src/app/question/[questionId]/` | Individual question detail page (dynamic route) | [View Map](src/app/question/[questionId]/codemap.md) |
| `src/app/questionbank/` | Question Bank browser (filterable question explorer) | [View Map](src/app/questionbank/codemap.md) |
| `src/app/review/` | Review page (review past practice sessions) | [View Map](src/app/review/codemap.md) |
| `src/app/dashboard/` | Dashboard layout, sidebar, assessment switching, home tab | [View Map](src/app/dashboard/codemap.md) |
| `src/app/dashboard/answered/` | Answered questions tab | [View Map](src/app/dashboard/answered/codemap.md) |
| `src/app/dashboard/bookmarks/` | Saved/bookmarked questions tab | [View Map](src/app/dashboard/bookmarks/codemap.md) |
| `src/app/dashboard/export-import/` | Data export/import (localStorage backup) | [View Map](src/app/dashboard/export-import/codemap.md) |
| `src/app/dashboard/sessions/` | Practice session history tab | [View Map](src/app/dashboard/sessions/codemap.md) |
| `src/app/dashboard/tracker/` | Progress tracker (SEO-heavy, analytics charts) | [View Map](src/app/dashboard/tracker/codemap.md) |
| `src/app/dashboard/vocabs/` | Vocabulary wordbank browser (SEO-heavy) | [View Map](src/app/dashboard/vocabs/codemap.md) |
| `src/app/dashboard/vocabs/learn/` | Vocabulary flashcard learning page | [View Map](src/app/dashboard/vocabs/learn/codemap.md) |
| `src/app/dashboard/vocabs/practice/` | Vocabulary AI practice page | [View Map](src/app/dashboard/vocabs/practice/codemap.md) |
| `src/app/changelogs/` | Changelogs page (fetches GitHub data with ISR) | [View Map](src/app/changelogs/codemap.md) |
| `src/app/contributors/` | Contributors page | [View Map](src/app/contributors/codemap.md) |
| `src/app/report-bug/` | Bug report form (Airtable embed) | [View Map](src/app/report-bug/codemap.md) |
| `src/app/resources/` | Resources page (Khan Academy, College Board links) | [View Map](src/app/resources/codemap.md) |
| `src/app/suggest-feature/` | Feature suggestion form (Airtable embed) | [View Map](src/app/suggest-feature/codemap.md) |
| `src/app/sitemap/` | Secondary sitemap export | [View Map](src/app/sitemap/codemap.md) |
| `src/components/` | Top-level feature components (practice flow, hero, footer, question cards) | [View Map](src/components/codemap.md) |
| `src/components/ui/` | shadcn/ui primitives + custom UI components (78 components) | [View Map](src/components/ui/codemap.md) |
| `src/components/celebrating-section/` | Practice Rush celebration/results display | [View Map](src/components/celebrating-section/codemap.md) |
| `src/components/dashboard/` | Dashboard tab components (home, saved, answered, sessions) | [View Map](src/components/dashboard/codemap.md) |
| `src/components/dashboard-layout/` | Dashboard sidebar and navigation layout | [View Map](src/components/dashboard-layout/codemap.md) |
| `src/components/dashboard/shared/` | Shared dashboard components (OptimizedQuestionCard) | [View Map](src/components/dashboard/shared/codemap.md) |
| `src/components/dashboard/summary/` | Summary charts (Recharts radar/progress) | [View Map](src/components/dashboard/summary/codemap.md) |
| `src/components/dashboard/tracker/` | Question bank tracker (hierarchical progress) | [View Map](src/components/dashboard/tracker/codemap.md) |
| `src/components/dashboard/vocabs/` | Vocabulary components (wordbank, flashcards) | [View Map](src/components/dashboard/vocabs/codemap.md) |
| `src/components/dashboard/vocabs/practice/` | Vocabulary practice modes (6 modes) | [View Map](src/components/dashboard/vocabs/practice/codemap.md) |
| `src/components/popups/` | Draggable popup components (notes, reference, desmos) | [View Map](src/components/popups/codemap.md) |
| `src/components/questionbank/` | Question Bank UI components (hero, results, renderers) | [View Map](src/components/questionbank/codemap.md) |
| `src/lib/` | Core utilities — question fetching, DB client, localStorage persistence, auth tokens, TipTap helpers | [View Map](src/lib/codemap.md) |
| `src/lib/questionbank/` | Question bank data engine — reducer, filters, hooks, API, types, constants | [View Map](src/lib/questionbank/codemap.md) |
| `src/lib/functions/` | Thin API wrappers (fetchQuestionByID, fetchQuestionDatabyUniqueID) | [View Map](src/lib/functions/codemap.md) |
| `src/hooks/` | 10 reusable React hooks (DOM, keyboard nav, Tiptap, responsive) | [View Map](src/hooks/codemap.md) |
| `src/types/` | TypeScript type definitions — question, session, statistics, vocabulary, etc. | [View Map](src/types/codemap.md) |
| `src/contexts/` | AssessmentContext — global assessment selection (SAT/PSAT/NMSQT/PSAT 8/9) | [View Map](src/contexts/codemap.md) |
| `src/static-data/` | Static datasets — domain taxonomy, assessment registry, validation constants, vocabulary JSON | [View Map](src/static-data/codemap.md) |
| `src/styles/` | Design tokens (colors, shadows, radii) and CSS keyframe animations | [View Map](src/styles/codemap.md) |

## Key Libraries

| Library | Purpose |
|---------|---------|
| Next.js 15 | App Router, server components, API routes, ISR |
| React 19 | UI framework |
| TypeScript | Type safety |
| shadcn/ui + Radix | UI primitives (new-york style) |
| Tailwind CSS v4 | Styling |
| TipTap | Rich text editor (question notes) |
| better-react-mathjax | Math rendering (MathJX) |
| Vercel AI SDK v5 + OpenRouter | AI vocabulary tutoring |
| Neon Serverless PostgreSQL | Serverless DB for question data |
| Recharts | Charts (tracker, summary) |
| Framer Motion | Animations |
| Zod | Schema validation |
| canvas-confetti | Celebration effects |
| sonner | Toast notifications |
| cmdk | Command palette |