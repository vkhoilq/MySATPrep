# src/app/api/question/

## Responsibility
Route group (intermediate directory) for the question detail sub-tree. Contains the dynamic segment `[questionId]/` as its only child. This directory has no `route.ts` — it exists solely as a Next.js App Router path segment (`/api/question/`) that nests the individual question fetch endpoint.

## Design
- No exported route handler; serves as a URL namespace prefix.
- All requests to `/api/question/*` are handled by the `[questionId]` child route.
- Follows the App Router convention of colocating related route segments.

## Flow
- Inbound requests at `/api/question/:questionId` are routed to `[questionId]/route.ts`.
- No data processing occurs at this level.

## Integration
- Consumed by: `[questionId]/` dynamic route
- Depends on: Nothing
