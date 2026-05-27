# src/app/dashboard/sessions/

## Responsibility
Standalone route (`/dashboard/sessions`) for viewing the user's practice session history. Delegates entirely to a shared sessions tab component. Supports reviewing past practice rush results, scores, and performance per session.

## Design
- **Thin routing page**: Minimal client component with no local state. The page wrapper exists solely to define the route and provide responsive layout sizing.
- **Client component**: Does not use `useAssessment()` — unlike answered/bookmarks pages, `SessionsTab` does not require the current assessment context. This is because sessions are likely loaded from localStorage scoped by assessment or loaded generically.
- **Delegation pattern**: All session listing, filtering, and detail-rendering logic lives in `@/components/dashboard/sessions.tsx`.

## Flow
1. User navigates to `/dashboard/sessions` via sidebar "Practice Sessions" link.
2. `SessionsTab` renders inside a centered responsive container (`max-w-4xl` to `max-w-7xl`).
3. The sessions component reads practice session data (likely from `practiceStatistics` in localStorage or an internal API) and displays a chronological list of completed sessions with metadata (date, score, duration, questions attempted).
4. User can click into individual sessions to review answers.

## Integration
- Consumed by: Route at `/dashboard/sessions`; linked from `AppSidebar` nav item "Practice Sessions".
- Depends on:
  - `@/components/dashboard` (sessions.tsx) — `SessionsTab` component
  - `@/types/statistics` — Practice statistics and session data types
