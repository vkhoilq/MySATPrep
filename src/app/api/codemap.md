# src/app/api/

## Responsibility
Root API route group. Acts as a simple health-check / environment diagnostic endpoint. Logs environment variables (`GA_KEY`, `GT_KEY`) to the server console and returns a plain-text "hello there" response for GET requests.

## Design
- Single exported `GET()` function (no request params, no route handler params).
- Uses the plain `Response` constructor (not `NextResponse`).
- No data validation, no URL search params, no external dependencies.
- Primarily a debugging/smoke-test endpoint to verify the serverless function environment is correctly configured.

## Flow
1. Client sends `GET /api`
2. Server logs `TEST ENV`, `process.env.GA_KEY`, `process.env.GT_KEY` to stdout
3. Returns `new Response("hello there", { status: 200 })`

## Integration
- Consumed by: Development/testing tooling
- Depends on: None (standalone)
