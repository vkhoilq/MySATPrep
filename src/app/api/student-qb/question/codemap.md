# src/app/api/student-qb/question/

## Responsibility
Route group (intermediate directory) within the student question bank module. Contains the dynamic segment `[questionId]/` as its only child. This directory has no `route.ts` — it exists as a Next.js App Router path segment (`/api/student-qb/question/`) that nests the student QB question detail endpoint.

## Design
- No exported route handler; serves as a URL namespace prefix.
- All requests to `/api/student-qb/question/*` are handled by the `[questionId]` child route.
- Follows the App Router convention of colocating related route segments within the student-qb module.

## Flow
- Inbound requests at `/api/student-qb/question/:questionId` are routed to `[questionId]/route.ts`.
- No data processing occurs at this level.

## Integration
- Consumed by: `[questionId]/` dynamic route
- Depends on: Nothing
