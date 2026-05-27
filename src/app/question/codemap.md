# src/app/question/

## Responsibility
Route segment for the SAT Question ID search feature. This directory contains two route entries: the search landing page (`page.tsx`) and the dynamic individual question page (`[questionId]/page.tsx`). The layout (`layout.tsx`) provides a shared SEO/metadata wrapper for both.

## Design
- **Layout** (`layout.tsx`): A server component that wraps both the search page and the individual question page. Exports extensive `Metadata` (OpenGraph, Twitter, Dublin Core, geo tags) and injects JSON-LD structured data (WebPage, BreadcrumbList, SearchAction, WebApplication, Course schemas). Renders screen-reader-only SEO content describing the search tool. No additional UI wrapper — the layout simply renders `{children}` with the JSON-LD script and SEO div prepended. This means both the search page and individual question page share the same `<head>` metadata.
- **Search Page** (`page.tsx`): A `"use client"` component that renders the question ID search interface. Features:
  - A text input bound to `questionId` state, a "Search" button, and Enter-key submission.
  - An animated progress bar (CSS keyframes) shown during navigation.
  - Uses `framer-motion` for entrance animations (fade-in, scale).
  - On submit, calls `router.push(\`/question/${questionId.trim()}\`)` — navigating to the dynamic route.
  - Renders `SiteHeader` (with scroll), `BgGradient`, and `FooterSection`.
- **Dynamic Route** (`[questionId]/page.tsx`): A server component that fetches question data at request time via `fetchQuestionById()`. See its dedicated codemap.

## Flow
1. User visits `/question` → `layout.tsx` renders its JSON-LD and SEO content, then `page.tsx` renders the search UI.
2. User enters a question ID (e.g., `bd9eb2b5`) and clicks Search or presses Enter.
3. `questionId` state triggers `router.push('/question/bd9eb2b5')`, navigating to the dynamic route.
4. Next.js matches `/question/[questionId]` and renders `[questionId]/page.tsx`.

## Integration
- Consumed by: The search page links to `/question/${questionId}` routes. Navbar's search button (`Search` icon) links to `/question`. Manifest shortcuts also reference `/question`.
- Depends on: `@/components/ui/bg-gradient`, `@/components/footer`, `@/app/navbar` (SiteHeader), `next/navigation` (useRouter), `framer-motion`. The `[questionId]` route depends on `@/types` (QuestionById_Response), `@/components/question-problem-card`, `@/components/question-not-found`, `better-react-mathjax`.
