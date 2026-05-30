# src/

## Responsibility

The application source root. Contains all runtime code for the MySATPrep Next.js 15 app — UI components, API route handlers, business logic, type definitions, static data, contexts, hooks, and styles. Everything outside `src/` is configuration (Next.js, Docker, ESLint), build tooling, or standalone scripts. The `src/` directory implements the full stack: server components (`src/app/` with App Router file-based routing), client components (`src/components/`), API routes as serverless functions (`src/app/api/`), and pure shared logic (`src/lib/`, `src/types/`, `src/static-data/`).

## Design

### Layered Architecture

- **`src/app/`** — Next.js App Router pages and API routes. Page files (`page.tsx`) are server components for SEO-heavy pages; interactive pages (practice, review) delegate to client components. API routes proxy College Board APIs, serve DB data, and provide AI chat.
- **`src/components/`** — React component tree. Organised by feature: `practice/`, `practice-rush-multistep.tsx`, `full-length/`, `questionbank/`, `dashboard/`, `popups/`, `celebrating-section/`, `ui/` (shadcn primitives). Components are `"use client"` when interactive.
- **`src/lib/`** — Pure logic and infrastructure. Subdirectories for major subsystems: `full-length/` (question selection, scoring, session reducer), `questionbank/` (data engine, filters, hooks), `functions/` (thin API wrappers). Top-level files: `questionFetcher.ts` (multi-source fallback chain), `db.ts` (Neon singleton), `practiceStatistics.ts`, `userProfile.ts` (localStorage persistence).
- **`src/types/`** — Single source of truth for data shapes. Each domain has a dedicated file (`question.ts`, `session.ts`, `statistics.ts`, `full-length.ts`, `full-length-session.ts`, `vocabulary.ts`, `lookup.ts`, etc.). Some files include runtime helpers (factories, type guards, migration utilities).
- **`src/static-data/`** — Compile-time constants and JSON datasets: assessment registry, domain taxonomy, validation rules, SAT vocabulary (988 words), and **full-length test blueprints** (SAT/PSAT/NMSQT/PSAT 8/9 module configurations with domain/difficulty distributions).
- **`src/contexts/`** — React context providers. Currently only `AssessmentContext` (shared assessment selection across the app).
- **`src/hooks/`** — 10 reusable React hooks (DOM, keyboard, TipTap, responsive).
- **`src/styles/`** — Design tokens (colors, shadows, radii) and CSS keyframe animations.

### Key Abstractions

- **Question retrieval fallback chain** (`lib/questionFetcher.ts`): disclosed questions → `saic.collegeboard.org` JSON → internal DB (`/api/student-qb/question/{id}`) → College Board qbank-api. All outputs normalised to `API_Response_Question`.
- **Two practice session reducers**: `PracticeRushMultistep` (20+ action types, per-question timer, no module gating) vs `fullLengthReducer` (18 action types, section-level timer, module-gated navigation, question flagging, adaptive difficulty, break management). These are intentionally separate because the UX models are fundamentally different.
- **Full-length test blueprint system**: Blueprint constants in `static-data/full-length.ts` define per-assessment module composition (operational/pretest counts, time limits, domain distribution, difficulty distribution). The blueprint drives `questionSelector.ts` to fill module slots from the available question pool.
- **localStorage isolation**: Full-length sessions use distinct keys (`fullLengthCurrentSession`, `fullLengthSessionHistory`) from Practice Rush keys, preventing data conflicts when users switch between modes.

## Flow

### Full-Length Practice Test Flow

1. **Onboarding**: User selects "Full Length Practice" in `PracticeOnboarding` → `practiceType: "full-length"` skips subject/domain/difficulty steps (the blueprint determines these) → `PracticeSelections` passed to parent.
2. **Routing**: `practice.tsx` detects `practiceType === "full-length"` → renders `FullLengthTest` component instead of `PracticeRushMultistep`.
3. **Question selection**: `FullLengthTest` dispatches `START_TEST` → calls `POST /api/full-length/questions` (server-side) → route handler fetches questions from College Board API + internal DB fallback → runs `selectQuestionsForTest()` which fills module slots per blueprint → returns `TestQuestionSelection` with per-module question IDs, pretest IDs, and metadata.
4. **Session lifecycle**: Reducer transitions through phases: `intro → section-intro → module-active → module-review → module-complete → break → test-complete`. Question details are fetched lazily per-module via `/api/question/{id}` as the user navigates.
5. **Scoring**: `scoring.ts` uses difficulty-weighted raw scores (E=1.0, M=1.3, H=1.7), applies Module 2 path multipliers (±5%), and maps to scaled scores (200-800 per section) via a piecewise linear S-curve. Pretest questions are excluded. Results saved to `fullLengthSessionHistory` (max 5 sessions).
6. **Persistence**: Auto-save every 10 seconds (vs 30s for Practice Rush). Module state serialises Sets as arrays for JSON compatibility.

### Practice Rush Flow

1. Onboarding → subject/domain/skill/difficulty selection → questions fetched from `/api/get-questions` → per-question timer → XP tracking → session history (max 10).

### Vocabulary Flow

1. Static JSON dataset → flashcard UI → `/api/chat` → OpenRouter → GLM-4.5 AI tutor for definition checking and sentence writing.

## Integration

- **Entry points**: `src/app/page.tsx` (landing), `src/app/practice/page.tsx` (practice route → `PracticePageComponent`), `src/app/questionbank/page.tsx`, `src/app/dashboard/layout.tsx`, `src/app/api/` (serverless functions).
- **Root layout**: `src/app/layout.tsx` wraps all routes in `AssessmentProvider`, `MathJaxContext`, analytics providers (GA, GTM, Vercel, Clarity), and global UI (Toaster).
- **API routes communicate with**: College Board qbank-api (`qbank-api.collegeboard.org`), disclosed questions API (`saic.collegeboard.org`), JWT endpoint (`sucred.catapult-prod.collegeboard.org`), Neon PostgreSQL, and internally via `/api/student-qb/`.
- **Full-length integration points**:
  - `practice.tsx` conditionally renders `FullLengthTest` vs `PracticeRushMultistep` based on `practiceType`
  - Both share the same `onSessionComplete` callback and `handleSessionComplete` handler
  - `FullLengthTest` uses existing `/api/question/{id}` for question detail fetching
  - `practice-onboarding.tsx` disables PSAT/NMSQT and PSAT 8/9 for full-length (only SAT supported initially)
  - Question selector reuses `PlainQuestionType` from `@/types/question` and the existing `Assessments` registry
  - Separate localStorage keys prevent state conflicts with Practice Rush
