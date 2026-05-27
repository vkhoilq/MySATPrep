# dashboard/summary/

## Responsibility
Practice statistics visualization for the dashboard home tab. Renders radar charts and skill-level progress bars showing the user's performance across Math and Reading & Writing domains and skills.

## Design
- **Single component**: `charts.tsx` exports `SummaryCharts` — a data-heavy visualization component.
- **Pattern**: Pure presentation/computation component. Reads practice statistics directly from localStorage via `getPracticeStatistics()`. Uses `useMemo` for two heavy data transformation pipelines.
- **Data transformation**:
  1. `summaryData`: Aggregates correct/incorrect counts per `primaryClassCd` (domain), grouped by subject (Math/R&W). Computes percentage for radar chart rendering.
  2. `answeredQuestionsDataSummary`: Deeper aggregation per `skill_cd` within each domain, producing {correct, incorrect, text, summary} arrays for progress bar display.
- **Visualization**: Two `RadarChart` side-by-side (R&W and Math) with custom `PolarAngleAxis` tick rendering showing count fractions + domain labels. Below: two cards with per-skill `Progress` bars showing percentage correct.

## Flow
1. Component receives `selectedAssessment` prop.
2. On mount/memo trigger, reads `getPracticeStatistics()` from localStorage.
3. Filters to `stats[selectedAssessment.name]`.
4. Iterates `statistics` object (keyed by `primaryClassCd` → `skill_cd` → questionId) to aggregate correct/incorrect counts.
5. Groups into `finalData` by subject, then transforms into arrays with percentage calculations.
6. Renders two `RadarChart` blocks (R&W, Math) and two skill insight blocks with `Progress` bars.
7. Empty states shown when no data exists, with "Start Practice" CTA buttons.

## Integration
- Consumed by: `src/components/dashboard/home.tsx`
- Depends on: `@/lib/practiceStatistics`, `@/lib/utils`, `@/static-data/domains` (`primaryClassCdObjectData`, `skillCdsObjectData`), `@/app/dashboard/types`, `@/components/ui/card`, `@/components/ui/chart`, `@/components/ui/bar-chart`, `@/components/ui/badge`, `@/components/ui/progress`, `@/components/ui/empty-state`, `recharts` (RadarChart, BarChart, PolarAngleAxis, PolarGrid, Radar), `lucide-react`
