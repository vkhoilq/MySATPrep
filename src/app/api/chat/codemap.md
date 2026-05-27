# src/app/api/chat/

## Responsibility
AI-powered SAT vocabulary tutoring endpoint. Receives a user's self-written definition or sentence for a vocabulary word, evaluates it against the correct definition, and returns structured JSON feedback via an OpenRouter-hosted Large Language Model (GLM-4.5-Air).

## Design
- **POST-only** route handler (`export async function POST(req: Request)`).
- Uses **Vercel AI SDK** (`ai`) with the `@openrouter/ai-sdk-provider` package.
- Models two tutoring tasks via a `Task` union type: `"validate-user-definition"` and `"validate-user-sentence"`.
- A `getSystem(task, data)` factory function dynamically constructs a system prompt based on the task type and word data. Prompts enforce JSON-only output (no markdown fences).
- The model used is `z-ai/glm-4.5-air:free` via `openrouter.chat(...)`.
- `maxDuration = 30` seconds (Next.js serverless function limit).
- Raw JSON parsing of the LLM response via `JSON.parse(result.text)`.

## Flow
1. Client sends `POST /api/chat` with JSON body: `{ message: string, data: any, task: "validate-user-definition" | "validate-user-sentence" }`
2. Route validates `task` is present and one of the two known values — returns `{ error: "Missing task" }` with 400 if invalid.
3. `getSystem(task, data)` generates a system prompt embedding:
   - For `validate-user-definition`: `data.word`, `data.userDefinition`, `data.correctDefinition`
   - For `validate-user-sentence`: `data.word`, `data.userSentence`, `data.exampleSentence`, `data.correctDefinition`
4. `generateText({ model, system, prompt: message })` is called.
5. On success, `result.text` is parsed as JSON and returned as `{ result, success: true }`.
6. On parse failure, returns `{ message: "Unable to parse AI Response to JSON.", success: false }` with 200 status.

## Integration
- Consumed by: SAT Vocabulary Tutor UI (vocabulary practice pages)
- Depends on:
  - `@openrouter/ai-sdk-provider` — OpenRouter provider for Vercel AI SDK
  - `ai` — Vercel AI SDK `generateText`
  - `process.env.OPENROUTER_KEY` — API key for OpenRouter
