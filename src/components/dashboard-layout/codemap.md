# dashboard-layout/

## Responsibility
Application sidebar and header navigation for the authenticated dashboard area. Implements the collapsible sidebar shell with navigation groups, assessment switcher, user menu, and news feed.

## Design
- **Pattern**: Composition of sidebar primitives from `@/components/ui/sidebar`. Uses shadcn sidebar pattern with `SidebarProvider` context.
- **Layout hierarchy**: `AppSidebar` → `SidebarHeader` (AssessmentSwitcher) + `SidebarContent` (NavMain, NavProjects, NavSecondary) + `SidebarFooter` (News, commented out).
- **State**: Reads `assessment-context` to determine active assessment. Reads `savedQuestions` and `practiceStatistics` localStorage to show badge counts on nav items.
- **Navigation data** is defined inline in `app-sidebar.tsx` with three groups:
  - `navMain`: Platform links (Home, SAT Vocabs, Question Bank Tracker, Bookmarks, Answered Questions, Sessions, Export/Import)
  - `navSecondary`: Home Page link
  - `explore`: External feature links (Questionbank, Vocabs Flashcards, Vocabs Practice, Practice Rush, Review, Resources)

## Files

| File | Role |
|---|---|
| `app-sidebar.tsx` | Main sidebar component. Composes `AssessmentSwitcher`, `NavMain`, `NavProjects`, `NavSecondary`. Computes badge counts for saved/answered questions using `useLocalStorage` + `useMemo`. |
| `assessment-switcher.tsx` | Assessment dropdown in sidebar header. Uses `useAssessment` context to get/set active assessment via `setActiveAssessmentByWorkspace`. Renders assessment options in a `DropdownMenu`. |
| `nav-main.tsx` | Primary navigation group ("Platform"). Renders items with optional badges and collapsible sub-items using `Collapsible` + `SidebarMenuSub`. |
| `nav-projects.tsx` | "Explore & Learn" navigation group. Renders flat list of external feature links. Collapsible-visible only when sidebar is expanded. |
| `nav-secondary.tsx` | Secondary navigation group at the bottom of sidebar. Includes `SidebarFooterNews` and a Home Page link. |
| `nav-header.tsx` | Top header bar with `SidebarTrigger` (hamburger), separator, and `NavActions`. Sticky with `z-50`. |
| `nav-actions.tsx` | Action buttons in header: Reference popup, Desmos calculator popup, and "Practice Rush" link. |
| `nav-user.tsx` | User menu dropdown with avatar, name, email, and mock menu items (Upgrade, Account, Billing, Notifications, Log out). |
| `app-footer-news.tsx` | Sidebar footer news component. Renders `News` component with hardcoded demo articles about dashboard features. |

## Flow
1. `AppSidebar` renders → reads active assessment from `assessment-context` → reads `savedQuestions`/`practiceStatistics` from localStorage → computes badge counts via `useMemo` → renders navigation structure.
2. User clicks nav item → navigates via Next.js `Link`. Badge counts update reactively when localStorage data changes.
3. AssessmentSwitcher dropdown → `useAssessment().setActiveAssessmentByWorkspace()` → updates context → all dashboard tabs re-render with new assessment.
4. NavActions buttons toggle `DraggableReferencePopup` and `DraggableDesmosPopup` overlays.

## Integration
- Consumed by: `src/app/(dashboard)/layout.tsx` (renders `AppSidebar` and `NavHeader` as the dashboard shell)
- Depends on: `@/components/ui/sidebar`, `@/components/ui/dropdown-menu`, `@/components/ui/collapsible`, `@/components/ui/badge`, `@/components/ui/breadcrumb`, `@/components/ui/separator`, `@/components/ui/avatar`, `@/components/ui/sidebar-news`, `@/contexts/assessment-context`, `@/lib/useLocalStorage`, `@/types/savedQuestions`, `@/types/statistics`, `../popups` (reference, desmos), `../logo`, `lucide-react`, `next/link`
