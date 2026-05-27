# src/app/review/

## Responsibility
Route for the Review feature — allows users to revisit previously answered questions (incorrect answers or bookmarks) for focused re-practice. Supports URL-based deep linking with validated parameters (`assessment`, `subject`, `type`) and an onboarding flow for manual configuration.

## Design
- **Client Component** (`page.tsx`): Uses `"use client"` directive. The default export wraps the main `Review` component in `<Suspense fallback="Loading...">` because `useSearchParams()` requires a Suspense boundary in Next.js 15.
- **`Review` Component** — state-driven review session orchestrator:
  - **Onboarding Flow**: When `onboardingComplete` is `false`, renders `<ReviewOnboarding />` (a multi-step form for selecting assessment type, subject, and review type). If URL params are present, validates them and skips onboarding.
  - **Validation Functions**: `validateAssessment()` (SAT/PSAT/NMSQT/PSAT), `validateSubject()` (math/reading-writing), `validateReviewType()` (incorrect/bookmarks). On failure, shows a `ProjectBanner` with error details and falls back to onboarding.
  - **Data Loading** (`loadQuestionsFromStorage`): Reads from `localStorage` via `useLocalStorage<SavedQuestions>("savedQuestions")` and `useLocalStorage<PracticeStatistics>("practiceStatistics")`. For `bookmarked` type, reads from `savedQuestions[assessmentKey]`. For `incorrect` type, filters `practiceStatistics[assessmentKey].answeredQuestionsDetailed` for `!isCorrect`. Returns `QuestionWithData[]` (each entry tracks `questionId`, `timestamp`, `isCorrect`, `plainQuestion`, `isLoading`, `hasError`).
  - **Selections Construction**: After loading questions, builds `PracticeSelections` with `practiceType: "review"`, extracting unique `skills` and `domains` from the loaded questions' `plainQuestion` data using `skillCdsObjectData` and `primaryClassCdObjectData` static data maps.
  - **Session Handoff**: Once selections are ready, renders `<PracticeRushMultistep practiceSelections={...} onSessionComplete={handleSessionComplete} isReviewMode={false} />` — reusing the practice rush session component.
  - **URL Parameter Parsing**: On mount, reads `assessment`, `subject`, `type` from `useSearchParams()`. Validates all three; if valid, constructs selections directly without showing onboarding.
- **Helper Functions**: `getAssessmentKey()` maps assessment names to localStorage keys; `getAssessmentName()` maps to display names; `getQuestionCount()` returns the count of available questions; `validateQuestionsAvailable()` shows a toast error if count is zero.
- **Sound Effects**: Calls `playSound("loading.wav")` when starting a session.

## Flow
1. User navigates to `/review` (possibly with query params `?assessment=SAT&subject=math&type=incorrect`).
2. `ReviewPage` renders `<Review />` inside `Suspense`.
3. `Review` mounts, reads `searchParams`, and validates them.
4. **If valid URL params**: constructs `PracticeSelections` directly, sets `onboardingComplete = true`, loads questions from localStorage, and renders `PracticeRushMultistep`.
5. **If no/invalid URL params**: renders `ReviewOnboarding` component. User fills out the form → `handleOnboardingComplete` is called → questions loaded from localStorage → `PracticeRushMultistep` rendered.
6. `PracticeRushMultistep` runs the review session. On completion, `handleSessionComplete` shows a success toast.
7. Throughout: validation errors surface via `ProjectBanner` and `toast.error`.

## Integration
- Consumed by: Sitemap entry at `/review`. The SEO hidden nav on the home page links to `/review`. Potential deep links from dashboard/bookmarks pages.
- Depends on: `@/components/review-onboarding` (multi-step form), `@/components/practice-rush-multistep` (session runner), `@/components/ui/project-banner`, `@/lib/useLocalStorage`, `@/lib/playSound`, `@/types/session` (PracticeSelections, PracticeSession), `@/types/savedQuestions`, `@/types/statistics`, `@/types/question`, `@/static-data/domains` (getSubjectByPrimaryClassCd, primaryClassCdObjectData, skillCdsObjectData), `sonner` (toast).
