# src/app/dashboard/

## Responsibility
Root layout and landing page for the authenticated dashboard section of the application. Provides the sidebar navigation shell shared by all dashboard sub-routes, and serves as the main hub for selecting assessment types (SAT, PSAT/NMSQT, PSAT 8/9) and accessing practice overview tabs.

## Design
- **Route group**: Serves as a layout wrapper under `/dashboard/*` — all sub-routes (`/dashboard/answered`, `/dashboard/bookmarks`, etc.) render inside `{children}` within this layout.
- **Server/Client boundary**: `layout.tsx` is a **server component** (no `"use client"`). `page.tsx` is a **client component** (`"use client"`) because it uses React state, `useLocalStorage`, and interacts with `AssessmentContext`.
- **Sidebar provider pattern**: Uses `SidebarProvider` → `AppSidebar` + `SidebarInset` composition from shadcn/ui sidebar primitives. The sidebar is collapsible (icon/inset variants).
- **Assessment context integration**: The entire dashboard tree consumes `AssessmentContext` (`@/contexts/assessment-context`). This context manages which assessment (SAT, PSAT/NMSQT, PSAT 8/9) the user is currently focused on, persisted to `localStorage` under `preferred-assessment-id`.
- **Tabs pattern**: The main page uses `Workspaces` (a workspace/command-palette-style selector) for assessment type switching and renders `HomeTab` as the default content. A local `activeTab` state supports future mobile expandable tabs (home, saved, answered, sessions).
- **Badge computation**: `page.tsx` computes saved and answered question counts from `localStorage` (`"savedQuestions"` and `"practiceStatistics"` keys) via `useLocalStorage`, keyed by assessment via `getAssessmentKey()`.
- **Types**: `types.ts` defines `AssessmentWorkspace` extending the generic `Workspace` interface with `logo`, `plan`, and `assessmentId` fields.
- **Assessment data**: Assessment options originate from `@/static-data/assessment` (`Assessments` object mapping SAT/PSAT/NMSQT/PSAT 8/9 to numeric IDs).

## Flow
1. User navigates to `/dashboard`.
2. `DashboardLayout` renders the sidebar shell (`AppSidebar` with nav links, `NavHeader` with breadcrumb/actions).
3. `DashboardPage` mounts and:
   a. Reads `preferred-assessment-id` from localStorage via `AssessmentContext` (hydrated from stored value or default SAT).
   b. Loads `savedQuestions` and `practiceStatistics` from localStorage.
   c. Computes badge counts for the Saved and Answered tabs based on the current assessment.
   d. Renders an `Workspaces` assessment-type dropdown and a time-based greeting.
   e. Renders `HomeTab` (driven by `@/components/dashboard/home.tsx`) passing `selectedAssessment`.
4. User changes assessment via `Workspaces` → `handleAssessmentChange` dispatches `SET_ASSESSMENT` in the context reducer and persists to localStorage.

## Integration
- Consumed by: Sub-routes under `/dashboard/*` (answered, bookmarks, sessions, tracker, vocabs, etc.) inherit the sidebar layout.
- Depends on:
  - `@/components/dashboard-layout/app-sidebar` — Navigation sidebar with badge-linked links
  - `@/components/dashboard-layout/nav-header` — Sticky header with sidebar trigger and actions
  - `@/components/ui/sidebar` — shadcn sidebar primitives
  - `@/components/ui/workspaces` — Workspace/command-palette selector
  - `@/components/dashboard` — `HomeTab`, `SavedTab`, `AnsweredTab`, `SessionsTab` components
  - `@/components/dashboard/buttons-group` — Quick-action buttons
  - `@/contexts/assessment-context` — Assessment state management
  - `@/lib/useLocalStorage` — Generic localStorage hook
  - `@/types/savedQuestions` — Saved questions type definitions
  - `@/types/statistics` — Practice statistics type definitions
  - `@/static-data/assessment` — Static assessment metadata
  - `lucide-react` — Icons
