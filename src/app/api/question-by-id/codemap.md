# src/app/api/question-by-id/

## Responsibility
Route group (intermediate directory) for the question-by-ID sub-tree. Contains the dynamic segment `[questionId]/` as its only child. This directory has no `route.ts` — it exists solely as a Next.js App Router path segment (`/api/question-by-id/`) that nests the cross-assessment question lookup endpoint.

## Design
- No exported route handler; serves as a URL namespace prefix.
- All requests to `/api/question-by-id/*` are handled by the `[questionId]` child route.
- Follows the App Router convention of colocating related route segments.

## Flow
- Inbound requests at `/api/question-by-id/:questionId` are routed to `[questionId]/route.ts`.
- No data processing occurs at this level.

## Integration
- Consumed by: `[questionId]/` dynamic route
- Depends on: Nothing
