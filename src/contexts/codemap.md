# src/contexts/

## Responsibility

Provides React Context-based global state management for the currently active assessment selection (SAT, PSAT/NMSQT, or PSAT 8/9). This context persists the user's preferred assessment across sessions via `localStorage` and exposes action dispatchers for switching assessments programmatically.

## Design

A single **`AssessmentProvider`** component wraps the application (or a subtree) with an `AssessmentContext`. State management uses `useReducer` with a single action type (`SET_ASSESSMENT`). The context exposes three actions and one helper:

- **State shape** (`AssessmentState`):
  ```typescript
  interface AssessmentState {
    activeAssessmentId: string;     // "99" | "100" | "102"
    selectedAssessment: AssessmentWorkspace | undefined;
  }
  ```

- **Actions** (`AssessmentAction`):
  - `SET_ASSESSMENT` — Accepts a string `payload` (assessment ID). The reducer looks it up in the `assessmentWorkspaces` array and sets both `activeAssessmentId` and `selectedAssessment`.

- **Context value** (`AssessmentContextType`):
  - `state: AssessmentState` — Current assessment selection
  - `setActiveAssessment(assessmentId: string)` — Dispatch by ID
  - `setActiveAssessmentByWorkspace(workspace: AssessmentWorkspace)` — Dispatch by full workspace object
  - `getAssessmentKey(assessment?)` — Maps workspace name to localStorage key (`"SAT"`, `"PSAT/NMSQT"`, `"PSAT"`); defaults to `"SAT"`

- **`assessmentWorkspaces`** — Derived at module load from `static-data/assessment.ts` `Assessments` object. Each entry becomes an `AssessmentWorkspace` with an auto-generated Vercel avatar URL and `plan: "Assessment"`.

- **Persistence**: On mount, reads `localStorage.getItem("preferred-assessment-id")` for the initial value. Every time `activeAssessmentId` changes, it writes back to localStorage. A hydration effect on mount handles the case where localStorage has a different value than the initial render.

## Flow

1. **Initialization**: `AssessmentProvider` mounts. The initial state is computed synchronously from `getInitialAssessmentId()` (reads localStorage if available, falls back to `assessmentWorkspaces[0]` — typically SAT with id `"99"`).
2. **Hydration**: A `useEffect` runs on mount. If localStorage contains a different `preferred-assessment-id`, it dispatches `SET_ASSESSMENT` with that value, causing a re-render with the correct assessment.
3. **User interaction**: A consuming component calls `setActiveAssessment("102")`. The reducer updates `activeAssessmentId` and `selectedAssessment`. The persistence `useEffect` writes the new ID to localStorage.
4. **Consumption**: Components use `useAssessment()` to read the current assessment or call the action dispatchers. `getAssessmentKey()` is used to derive the correct localStorage key for per-assessment data (saved questions, statistics, notes).

## Integration

- **Consumed by**: Any component that needs to know the current assessment context — practice session pages, question bank filters, statistics views, saved questions/notes that are partitioned by assessment. Accessed via the `useAssessment()` custom hook.
- **Depends on**:
  - `src/static-data/assessment.ts` — `Assessments` object providing the three assessment entries
  - `src/app/dashboard/types.ts` — `AssessmentWorkspace` interface (extends `Workspace` with `logo`, `plan`, `assessmentId`)
  - `src/components/ui/workspaces.tsx` — `Workspace` base interface (transitive dependency)
  - Browser API: `localStorage` (client-side only, guarded by `typeof window !== "undefined"`)
