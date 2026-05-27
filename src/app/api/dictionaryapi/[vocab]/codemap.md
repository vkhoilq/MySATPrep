# src/app/api/dictionaryapi/[vocab]/

## Responsibility
Proxies the FreeDictionaryAPI (`api.dictionaryapi.dev`) to look up English word definitions for SAT vocabulary practice. Transforms the upstream response into a normalized shape with structured phonetic data and part-of-speech-indexed meanings.

## Design
- **GET-only** dynamic route (`export async function GET(request, { params })`) where `params.vocab` is the word to look up.
- `params` is a `Promise<{ vocab: string }>` (Next.js 15 async params convention).
- `export const revalidate = 3600` for ISR-based revalidation.
- Upstream fetch uses `cache: "force-cache"` with `next: { revalidate: 86400 }`.
- Data transformation performed in-route:
  1. Extracts first phonetic entry that has a `text` field → `Vocab_Phonetic`.
  2. Re-indexes `meanings` array into a `VocabAPI_Meaning` dictionary keyed by `partOfSpeech` (noun, verb, adjective, adverb).
- Response types use `DictionaryAPI_Response_OK`, `DictionaryAPI_Response_NOTFOUND`, `Vocab_Phonetic`, and `VocabAPI_Meaning` from `@/types/dictionaryapi`.
- Cache headers set at 3600s s-maxage, 60s CDN-Cache-Control.
- Empty upstream responses or non-array responses return 404.

## Flow
1. Client sends `GET /api/dictionaryapi/:vocab`
2. Extracts `vocab` from dynamic route params.
3. Fetches `https://api.dictionaryapi.dev/api/v2/entries/en/${vocab}` with `cache: "force-cache"` and `next.revalidate: 86400`.
4. Validates response — non-OK status returns 500 `{ success: false, message }`; empty data returns 404.
5. Transforms upstream data:
   - Iterates `phonetics` array for first entry with a `text` string.
   - Converts `meanings` array to a `{ [partOfSpeech]: meaning }` map.
6. Returns `{ success: true, data: { word, phonetic, meanings }, message }` with caching headers.

## Integration
- Consumed by: SAT Vocabulary pages (word detail views)
- Depends on:
  - `@/types/dictionaryapi` — `DictionaryAPI_Response_NOTFOUND`, `DictionaryAPI_Response_OK`, `Vocab_Phonetic`, `VocabAPI_Meaning`
  - FreeDictionaryAPI (`api.dictionaryapi.dev`) — External dictionary API
