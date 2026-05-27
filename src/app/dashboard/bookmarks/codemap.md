# src/app/dashboard/bookmarks/

## Responsibility
Standalone route (`/dashboard/bookmarks`) for viewing and managing the user's bookmarked/saved questions for the currently selected assessment. Delegates entirely to a shared saved-questions tab component.

## Design
- **Thin routing page**: Minimal client component that acts as a route entry point. No local state or business logic.
- **Client component**: `"use client"` is required for `useAssessment()` context access.
- **Delegation pattern**: Renders `SavedTab` from `@/components/dashboard`, which contains the full bookmarks UI — listing saved questions organized by assessment key, with options to remove bookmarks or navigate to the question detail.

## Flow
1. User navigates to `/dashboard/bookmarks` (via sidebar "Bookmarked Questions" with badge count hint).
2. `SavedTab` receives `selectedAssessment` from context.
3. The component reads `savedQuestions` from localStorage (keyed by assessment via `getAssessmentKey()`) and renders the list.
4. User can click saved questions to be taken to the question detail/review, or remove bookmarks.

## Integration
- Consumed by: Route at `/dashboard/bookmarks`; linked from `AppSidebar` nav item "Bookmarked Questions".
- Depends on:
  - `@/components/dashboard` (saved.tsx) — `SavedTab` component
  - `@/contexts/assessment-context` — Provides selected assessment
  - `@/types/savedQuestions` — Saved questions type definitions
