# components/

## Responsibility
Top-level feature components that compose the main pages of the application. Acts as the primary UI layer that orchestrates layouts, session flows, onboarding wizards, and landing page sections. These are the components imported directly by page layouts and route segments.

## Design
- **Composition over inheritance**: Each component is self-contained and imports sub-components from deeper namespaces (e.g., `ui/`, `popups/`, `celebrating-section/`).
- **State management**: Uses both `useReducer` (`PracticeRushMultistep`) and `useState` for local state. `PracticeRushMultistep` employs a large reducer pattern (`appReducer`) with 20+ action types for managing a complex practice session lifecycle.
- **Client/server boundary**: Files are marked `"use client"` when they use hooks, browser APIs, or interactive state. `contributors-section.tsx` is an async server component that fetches GitHub user data.
- **Patterns**: Container components (`practice.tsx`, `home-hero.tsx`), wizard/onboarding flow (`practice-onboarding.tsx`), session management (`practice-session-restorer.tsx`), and presentational sections (`footer.tsx`, `resources.tsx`, `logo.tsx`).

## Files

| File | Role |
|---|---|
| `practice.tsx` | Main orchestrator for the /practice route. Handles onboarding → practice → celebration flow. Parses URL params (shared links, session continuation, review mode) with extensive validation against static validation data. |
| `practice-rush-multistep.tsx` | Core practice engine (~4346 lines). Uses `useReducer` to manage question navigation, timer, answer checking, XP tracking, batch loading, and session persistence. Employs refs for debounced auto-save. Renders MathJax, Duolingo-styled UI, confetti, and popup overlays. |
| `practice-onboarding.tsx` | 4-step wizard: choose practice type → choose assessment → choose subject → choose domains/skills/difficulty. Uses `AnimatePresence` for transitions. Builds `PracticeSelections` object on completion. |
| `practice-session-restorer.tsx` | Utility to restore in-progress sessions from localStorage. Validates session structure, reconstructs domain/skill objects, and returns `SessionRestorationResult`. Also exports `useHasActivePracticeSession` hook. |
| `review-onboarding.tsx` | 3-step onboarding for the /review route: choose assessment → choose subject → choose review type (incorrect or bookmarked questions). |
| `home-hero.tsx` | Landing page hero section. Renders `SiteHeader`, hero CTA buttons, `ContinuePracticeRushButton`, and a decorative app mockup with animated streak/score display. |
| `continue-practice-rush-button.tsx` | Small call-to-action button linking to `/practice?session=continue`. Only renders when `useHasActivePracticeSession` returns true. |
| `contributors-section.tsx` | **Server component**. Fetches GitHub user data for project contributors with `force-cache` + 86400s revalidation. Renders a grid of contributor cards with avatars. |
| `footer.tsx` | Static footer with copyright and SAT disclaimer text. |
| `resources.tsx` | Resources section with styled cards linking to Khan Academy and College Board. Uses Framer Motion staggered animation. |
| `logo.tsx` | SVG logo component with `iconOnly` prop for compact rendering. |
| `question-not-found.tsx` | 404-style page for missing questions. Includes question ID search input with keyboard handling. |
| `question-problem-card.tsx` | Full question detail view with answer options, notes popup, reference/desmos popups, save/share buttons, and answer visibility toggling (hide/show mode for question bank browsing). |
| `assessment-display.tsx` | Debug/display component that shows the currently selected assessment from `assessment-context`. |
| `session-info-display.tsx` | Dashboard component that shows current session progress (question number, answered count, time, domains) with a "Continue" CTA. |

## Flow
1. **Practice flow**: `practice.tsx` checks URL params → if `session=continue`, validates & restores from localStorage → if shared link params, validates & constructs selections → else shows `PracticeOnboarding`. Once selections are ready, renders `PracticeRushMultistep`. On session complete, renders `PracticeRushCelebration`.
2. **PracticeRushMultistep flow**: INITIALIZE_SESSION → fetch lookup data → fetch questions from `/api/get-questions` → fetch individual question details via `/api/question/{id}` → manage navigation/answering/timer → auto-save every 30s & on answer → on finish, call `completeSession()` → parent receives session data.
3. **Review flow**: `practice.tsx` detects `?session={id}` → loads session from `getSessionHistory()` → passes as `restoredSessionData` with `isReviewMode=true` → `PracticeRushMultistep` renders in read-only mode.
4. **Home hero**: Renders `SiteHeader` + animated CTA section + mockup. `ContinuePracticeRushButton` conditionally appears.
5. **Question detail**: `question-problem-card.tsx` loads saved/bookmarked status from localStorage, handles answer submission with immediate feedback, and manages popup toggles.

## Integration
- Consumed by: `src/app/practice/page.tsx`, `src/app/review/page.tsx`, `src/app/question/[id]/page.tsx`, `src/app/page.tsx` (landing), `src/app/(dashboard)/dashboard/page.tsx` (SessionInfoDisplay)
- Depends on: `@/contexts/assessment-context`, `@/types/session`, `@/types/question`, `@/types/statistics`, `@/types/savedQuestions`, `@/lib/practiceStatistics`, `@/lib/userProfile`, `@/lib/playSound`, `@/lib/useLocalStorage`, `@/lib/contributors`, `@/lib/utils`, `@/static-data/domains`, `@/static-data/assessment`, `@/static-data/validation`, `@/components/ui/*` (button, badge, pill, radio-group, checkbox, card-v2, label, separator, tooltip, confetti, save-button, onboard-card, project-banner, etc.), `@/components/popups/*`, `@/components/celebrating-section/*`, `better-react-mathjax`, `framer-motion`, `lucide-react`, `sonner`
