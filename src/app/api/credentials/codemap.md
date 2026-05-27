# src/app/api/credentials/

## Responsibility
Proxies College Board's JWT token endpoint, returning a short-lived `cbJwtToken` for authenticated downstream API calls. Provides caching at the CDN and server level (300s s-maxage) to reduce upstream calls.

## Design
- **GET-only** route handler (`export async function GET()`).
- Delegates the actual upstream fetch to `fetchCbJwtToken()` from `@/lib/fetchCbJwtToken`.
- Uses `NextResponse.json<T>()` with typed generic `<StatsAPIErrorResponse>` for error responses.
- Sets aggressive cache headers (`Cache-Control: public, s-maxage=300`) for CDN + Vercel edge caching.
- Error handling covers three failure modes:
  1. Upstream non-200 status (returns 502 with upstream status)
  2. Missing `cbJwtToken` in response (returns 502 with "Missing cbJwtToken")
  3. Unexpected exceptions (returns 500 with error message)

## Flow
1. Client sends `GET /api/credentials`
2. Calls `fetchCbJwtToken()` which fetches `https://sucred.catapult-prod.collegeboard.org/rel/temp-user-aws-creds?cbEnv=pine&cbAWSDomains=digitalpractice,catapult&cacheNonce=-${CB_MYPRACTICE_SESSION_ID}` with `Authorization` header from `process.env.AUTHENTICATION_CB_MYPRACTICE`
3. Returns `{ success: true, cbJwtToken, message }` on success.
4. Errors propagate with appropriate status codes and `{ success: false, error, details }` shape.

## Integration
- Consumed by: Frontend components needing College Board JWT authentication
- Depends on:
  - `@/lib/fetchCbJwtToken` — Upstream College Board JWT fetch logic
  - `@/types` — `StatsAPIErrorResponse`
  - `process.env.CB_MYPRACTICE_SESSION_ID` — Session identifier for cache nonce
  - `process.env.AUTHENTICATION_CB_MYPRACTICE` — Authorization header value
