# src/app/question/[questionId]/

## Responsibility
Dynamic route for displaying an individual SAT question by its question ID. Fetches the question server-side from an internal API route (`/api/question-by-id/{questionId}`), generates dynamic metadata (title, description, OpenGraph based on question content), and renders the `QuestionProblemCard` component for display.

## Design
- **Server Component** (`page.tsx`): No `"use client"` directive — all rendering is done on the server. Two main exports:
  1. `generateMetadata({ params })`: Async function that fetches the question via `fetchQuestionById()`, extracts `question.skill_desc`, `question.difficulty` (E/M/H mapped to Easy/Medium/Hard), and `problem.stem` (HTML-stripped + LaTeX-removed preview). Returns tailored `Metadata` with title format `"{SkillDesc} Practice Question #{questionId} - MySATPrep"`, description with difficulty + preview, and OpenGraph `article` type. On fetch failure, returns fallback metadata with `robots.index: false`.
  2. `Page({ params })`: Default export — awaits `params`, calls `fetchQuestionById()`, and conditionally renders either `QuestionNotFound` (if `result.data` is null) or `QuestionProblemCard` with `hideViewQuestionButton` prop. Wraps content in `SiteHeader` and a centered `<main>` section.
- **Data Fetching** (`fetchQuestionById`): Private async function that constructs a self-referential URL using environment variables (`NEXT_PUBLIC_URL`, `VERCEL_BRANCH_URL`, `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL`) pointing to `/api/question-by-id/${questionId}`. Uses `fetch` with `force-cache` and `next: { revalidate: 86400 }` (24-hour ISR). Throws on non-OK responses. This is the server-to-server call pattern — the public API route handles the actual College Board API proxy or DB lookup.
- **Error Handling**: If `fetchQuestionById` throws or returns null `data`, `Page` shows `QuestionNotFound` component. `generateMetadata` catches exceptions and returns fallback metadata.
- **No Client Interactivity**: The page is fully server-rendered. Any interactivity (answering, bookmarking) is handled inside `QuestionProblemCard` (a client component).

## Flow
1. Next.js matches `/question/{questionId}` and invokes `generateMetadata` first.
2. `generateMetadata` calls `fetchQuestionById(questionId)` → resolves URL to internal API → `GET /api/question-by-id/{questionId}` → returns `QuestionById_Response`.
3. If fetch fails, fallback metadata with `robots.index: false` is returned (page not indexed).
4. If fetch succeeds, metadata is generated with question details and `robots.index: true`.
5. `Page` runs `fetchQuestionById` again (same cached result via `force-cache`).
6. If `result.data` is null → renders `SiteHeader` + `QuestionNotFound`.
7. If `result.data` exists → renders `SiteHeader` + `QuestionProblemCard`.
8. `QuestionProblemCard` mounts on client, handles answer selection, explanation toggle, bookmarking, etc.

## Integration
- Consumed by: `/question/page.tsx` navigates here via `router.push()`. External search engines index individual question pages. Manifest shortcuts and sitemap reference patterns that map here.
- Depends on: `@/app/navbar` (SiteHeader), `@/components/question-problem-card` (renders the full question UI), `@/components/question-not-found` (fallback for missing questions), `@/types` (QuestionById_Response), `@/components/ui/label`, `better-react-mathjax` (MathJax component for math rendering).
