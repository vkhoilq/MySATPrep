# src/app/dashboard/answered/

## Responsibility
Standalone route (`/dashboard/answered`) for reviewing all questions the user has answered across their selected assessment. Delegates entirely to a shared tab component.

## Design
- **Thin routing page**: This is a minimal page component. Its sole responsibility is to set up the route segment layout and pass the correct assessment context down to the shared UI.
- **Client component**: Uses `"use client"` directive because it accesses `AssessmentContext` via `useAssessment()`.
- **Delegation pattern**: The page itself contains no business logic — it instantiates `AnsweredTab` from `@/components/dashboard`, which encapsulates the full answered-questions UI (list, filtering, search, etc.).

## Flow
1. User navigates to `/dashboard/answered` (typically via sidebar "Answered Questions" link).
2. `AnsweredTab` is rendered with `selectedAssessment` from context.
3. The component reads `practiceStatistics` from localStorage (keyed by assessment) and displays answered questions with their metadata (difficulty, correctness, time spent).
4. User can browse, filter, or re-answer previously attempted questions through the tab's inline UI.

## Integration
- Consumed by: Route at `/dashboard/answered`; linked from `AppSidebar` nav item "Answered Questions" with badge count.
- Depends on:
  - `@/components/dashboard` (answered.tsx) — `AnsweredTab` component
  - `@/contexts/assessment-context` — Provides selected assessment
  - `@/types/statistics` — Practice statistics types
