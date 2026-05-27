# src/app/practice/

## Responsibility
Route entry for the Practice Rush feature — the core timed/SAT practice session interface. This page is the landing point for users who click "Practice Rush" in the navbar. It delegates all rendering to a client-side component.

## Design
- **Server Component** (`page.tsx`): Exports a `metadata` object with extensive SEO (keywords targeting "SAT practice questions", "College Board practice", "SAT Suite Question Bank", OpenGraph + Twitter cards with `/og-practice.png`, canonical `/practice`).
- The default export `PracticePage()` is a minimal server wrapper that renders `<PracticePageComponent />` — a client component imported from `@/components/practice`. All interactivity, state management, and data fetching (question selection, timer, answer submission) lives in `@/components/practice`.
- This follows the **thin server shell** pattern: the server page owns metadata/SEO, while the client component owns the complex interactive UI.
- No props are passed from server to client; the client component initializes its own state.

## Flow
1. User navigates to `/practice` (via navbar's "Practice Rush" button or direct URL).
2. Next.js renders `page.tsx` — generates `<head>` metadata, then renders `<PracticePageComponent />`.
3. `PracticePageComponent` (in `@/components/practice`) mounts on the client, initializes its own state (practice selections, timer, question fetching), and renders the practice session UI.
4. No server-side data fetching occurs in this route; all API calls happen client-side.

## Integration
- Consumed by: Navbar "Practice Rush" button links to `/practice`.
- Depends on: `@/components/practice` (client component — the entire practice session UI and logic).
