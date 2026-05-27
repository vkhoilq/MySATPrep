# celebrating-section/

## Responsibility
Post-practice celebration and results display. Renders after a practice session is completed or saved, showing performance statistics, XP changes, accuracy, and skill-level breakdown charts.

## Design
- **Single component**: `practice-rush-celebration.tsx` — a full-page celebration view.
- **Pattern**: Presentation component receiving `sessionData` and `correctAnswerChoices` as props. Uses `useMemo` to compute derived statistics (correct/incorrect per skill per domain).
- **Visual hierarchy**: Emoji header (based on performance) → motivational message → 3 stat cards (XP, speed, accuracy) → domain/skill bar charts → session summary card → CTA button.
- **Chart integration**: Uses Recharts `BarChart` with custom `Rectangle` shapes to show correct/total ratio per skill. Wrapped in shadcn `Chart` component from `bar-chart.tsx`.

## Flow
1. Component mounts → plays celebration sound effect based on session status.
2. Computes display values: `totalAnswered`, `correctAnswers`, `accuracyPercentage`, `timeDisplay`, `avgTimeInSeconds`, `displayXP`.
3. `answeredQuestionsDataSummary` memo processes `answeredQuestionDetails` from the session data, grouping by domain (`primaryClassCd`) and skill (`skill_cd`), counting correct vs incorrect answers against `correctAnswerChoices`.
4. Renders bar charts for each domain that has summary data.
5. "Start New Practice" / "Continue Practicing" button calls `onContinue` callback.

## Integration
- Consumed by: `src/components/practice.tsx` (when `sessionComplete && sessionData` is truthy)
- Depends on: `@/types/session`, `@/components/ui/button`, `@/components/ui/card-v2`, `@/components/ui/bar-chart`, `recharts`, `@/static-data/domains`, `@/lib/playSound`, `@/lib/utils`, `lucide-react`
