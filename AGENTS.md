# AGENTS.md — MySATPrep

## Project Overview

Next.js 15 app (React 19, TypeScript) — SAT practice platform fetching questions from College Board's question bank. Includes Practice Rush, Question Bank browser, SAT Vocabulary with AI tutoring, bookmarks, and review tracking.

## Developer Commands

```
bun run dev      # Dev server with Turbopack
bun run build    # Production build (output: standalone)
bun run start    # Start production server
bun run lint     # Next.js ESLint
```

**Package manager: Bun** (bun.lock present, Dockerfile uses `oven/bun:1`). Do not use npm/yarn/pnpm.

## Architecture

- **App Router** — `src/app/` is the Next.js app root with file-based routing
- **Path alias** — `@/*` → `./src/*`
- **API routes** — `src/app/api/` proxies to College Board APIs and handles internal DB queries
- **`src/src/`** — static assets (images, GIFs, SVGs), NOT a source directory
- **`scripts/`** — Python vocabulary parsers (standalone, not part of the app build)
- **`vocabs/`** and **`src/static-data/`** — pre-built SAT vocabulary JSON datasets

## Key Libraries

- **UI**: shadcn/ui (new-york style), Radix primitives, Tailwind CSS v4
- **Rich text**: TipTap editor (used in question notes/features)
- **Math**: MathJX via `better-react-mathjax`
- **AI**: Vercel AI SDK (`ai` v5) + OpenRouter (`z-ai/glm-4.5-air:free`)
- **DB**: Neon serverless PostgreSQL (`@neondatabase/serverless`)
- **Charts**: Recharts
- **Animations**: Framer Motion

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` or `NEON_DATABASE_URL` | Neon PostgreSQL connection |
| `OPENROUTER_KEY` | AI vocabulary tutor (OpenRouter API key) |
| `CB_MYPRACTICE_SESSION_ID` | College Board JWT token fetch |
| `AUTHENTICATION_CB_MYPRACTICE` | Auth header for College Board API |
| `NEXT_PUBLIC_URL` | Override internal API target URL |

No `.env` file committed — these must be set locally or via Vercel.

## External Integrations

- **College Board disclosed questions** — fetched from `saic.collegeboard.org/disclosed/{id}.json` (question IDs containing `-DC`)
- **College Board question bank API** — `qbank-api.collegeboard.org` (regular questions)
- **College Board JWT endpoint** — `sucred.catapult-prod.collegeboard.org` (requires session ID + auth header)
- **Internal API self-call** — `getInternalAPITargetURL()` resolves to self (Vercel URL or localhost:3000) for DB-backed question lookups

## Testing

**No test framework is configured.** No test files exist. If adding tests, coordinate with the user first.

## Docker

Multi-stage build using Bun for install/build, Node 20-slim for runtime. Outputs standalone. Runs on port 3000. `docker compose up` starts the production container.

## Linting

ESLint flat config extending `next/core-web-vitals` and `next/typescript`. Two rules disabled:
- `react/no-unescaped-entities`: off
- `@next/next/no-page-custom-font`: off

## Notable Conventions

- Question types: `mcq` (multiple choice) and `spr` (student-produced response / input answer)
- `src/lib/questionFetcher.ts` is the central question data layer — handles disclosed vs regular questions, internal DB fallback, and fraction translation for SPR answers
- AI chat route (`/api/chat`) returns raw JSON (no markdown code fences) — the system prompt enforces this
- `components.json` configures shadcn/ui — use `bunx shadcn@latest add <component>` to add components

## Repository Map

A full codemap is available at `codemap.md` in the project root.

Before working on any task, read `codemap.md` to understand:
- Project architecture and entry points
- Directory responsibilities and design patterns
- Data flow and integration points between modules

For deep work on a specific folder, also read that folder's `codemap.md`.
