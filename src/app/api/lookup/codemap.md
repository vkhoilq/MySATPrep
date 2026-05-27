# src/app/api/lookup/

## Responsibility
Proxies the College Board question bank lookup API to retrieve metadata about available assessments, tests, domains, skills, live items, and state offerings. Augments the upstream response with structured domain/skill tree data (`LookupDomainData`) for richer frontend consumption.

## Design
- **GET-only** route (`export async function GET()`).
- Forwards to `https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/lookup`.
- Uses `cache: "force-cache"` with `next: { revalidate: 86400 }` for daily cache-busting.
- Data augmentation:
  - The upstream `lookupData.domain` (which contains domain/skill metadata from College Board) is replaced with `LookupDomainData` — a locally-defined structured tree of R&W and Math domains with skills, skill codes, and IDs.
  - This ensures consistent, frontend-friendly domain/skill taxonomy regardless of upstream changes.
- Error handling specifically catches `AbortError` (timeout) and returns 408.
- Cache headers: s-maxage=3600 for CDN and Vercel CDN.

## Flow
1. Client sends `GET /api/lookup`
2. Fetches College Board lookup API with 30s timeout.
3. On success, deep-clones the response data and patches `lookupData.domain` with `LookupDomainData`.
4. Returns `{ success: true, data: dataDuplicate, message }` with caching headers.
5. On timeout, returns 408 `{ success: false, error: "Request timeout..." }`.
6. On other errors, returns 500 with error details.

## Integration
- Consumed by: Question Bank browser (domain/skill selector UI), Practice Rush configuration screens
- Depends on:
  - `@/types/lookup` — `LookupDomainData`, `LookupRequest`, `LookupResponseData`
  - College Board qbank-api (`qbank-api.collegeboard.org`)
