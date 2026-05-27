# ui/

## Responsibility
Primitive and composite UI components forming the design system. This is the shadcn/ui (new-york style) collection augmented with custom components for gamification, data visualization, and onboarding flows. All components are reusable, composable, and styled with Tailwind CSS v4.

## Design
- **Pattern**: shadcn/ui convention — each file exports one component (or a small group of related components). Components use `forwardRef`, `cn()` for class merging, and Radix primitives for accessibility.
- **Style system**: Tailwind CSS v4 with CSS variables defined via `--color-*` custom properties. Many components use `shadow-[0_4px_0_0_theme(...)]` Duolingo-style "border-b-4" 3D button aesthetic.
- **Specialized categories**:
  - **Gamification**: `confetti.tsx` (canvas-confetti wrapper), `duolingo-toggle.tsx`, `pill.tsx`, `status-badge.tsx`
  - **Charts**: `chart.tsx` (Recharts wrapper), `bar-chart.tsx`, `radar-chart.tsx`
  - **Animation**: `animated-group.tsx`, `progressive-blur.tsx`, `warp-background.tsx`, `aurora-background.tsx`, `bg-gradient.tsx`, `bg-bars.tsx`
  - **Data display**: `activity-card.tsx`, `info-card.tsx`, `tracker-card.tsx`, `tracker-card-backup.tsx`, `flip-card.tsx`, `sidebar-news.tsx`
  - **Navigation**: `sidebar.tsx` (complex collapsible sidebar with Radix), `navbars.tsx`, `breadcrumb.tsx`, `tabs.tsx`, `vertical-tabs.tsx`, `expandable-tabs.tsx`, `navigation-menu.tsx`
  - **Selection**: `liquid-radio.tsx` (SVG filter-based radio), `multiple-select.tsx`, `multiselect-combobox.tsx`, `radio-group.tsx`, `select.tsx`, `select-calendar.tsx`, `checkbox.tsx`, `switch.tsx`
  - **Overlay**: `dialog.tsx`, `sheet.tsx`, `popover.tsx`, `hover-card.tsx`, `tooltip.tsx`, `tour.tsx`, `popup-tour.tsx`, `persistent-popover.tsx`
  - **Onboarding**: `onboarding-check-list.tsx`, `onboarding-dialog.tsx`, `onboarding-popover.tsx`, `onboard-card.tsx`
  - **Feedback**: `alert-dialog.tsx`, `alert.tsx`, `error.tsx`, `empty-state.tsx`, `loading.tsx`, `save-button.tsx`, `banner.tsx`, `banner-v2.tsx`, `toast.tsx` (via sonner)
  - **Layout**: `resizable.tsx`, `scroll-area.tsx`, `separator.tsx`, `card.tsx`, `card-v2.tsx`, `collapsible.tsx`, `workspaces.tsx`
  - **Form**: `input.tsx`, `label.tsx`, `button.tsx`, `calendar.tsx`, `command.tsx`, `dropdown-menu.tsx`
  - **Media**: `avatar.tsx`, `avatar-group.tsx`, `badge.tsx`, `skeleton.tsx`, `progress.tsx`, `infinite-slider.tsx`, `material.tsx`, `interactive-changelog-with-dialog.tsx`
  - **Data display**: `filter-badge.tsx`, `project-banner.tsx`

## Key Components

| Component | Role |
|---|---|
| `sidebar.tsx` | App sidebar shell using Radix `Sheet` for mobile. Provides `SidebarProvider`, `useSidebar` context, collapsible/icon modes. Used by `AppSidebar`. |
| `confetti.tsx` | Canvas-confetti wrapper with `ConfettiRef` API. Exposes `fire()` via `useImperativeHandle`. Also exports `ConfettiButton`. |
| `chart.tsx` | Recharts wrapper providing `ChartContainer`, `ChartTooltip`, `ChartLegend` components with consistent styling via CSS variables. |
| `multiselect-combobox.tsx` | Advanced multi-select with search, groups, and custom render functions. Used for domain/skill/difficulty selection in question bank. |
| `duolingo-toggle.tsx` | Duolingo-styled toggle switch with icon slots for enabled/disabled states. Used for randomize/exclude-Bluebook toggles. |
| `onboard-card.tsx` | Multi-step loading card with animated indicators. Used by `PracticeRushMultistep` during question fetching. |
| `flip-card.tsx` | 3D card flip animation component. Used for vocabulary flashcard learning. |
| `tracker-card.tsx` | Hierarchical task/subtask/individual question tree component with progress indicators. Used by `Tracker` component. |
| `project-banner.tsx` | Announcement banner with variant (info/error/warning), icon, and optional CTA. Used for validation errors on shared links. |
| `empty-state.tsx` | Empty state component with multiple icons, title, description, and optional action button. |
| `liquid-radio.tsx` | Exports `GlassFilter` — an SVG filter def for liquid/glassmorphism radio button effects. |
| `warp-background.tsx` | Animated warp/distortion background using canvas, conditionally disablable. Used by question bank hero. |
| `save-button.tsx` | Save/bookmark button with localStorage persistence, collection selection dialog. |

## Flow
- Components are stateless unless they manage tooltip/popover open state. Sidebar uses React Context (`SidebarProvider`, `useSidebar`).
- Chart components receive data as props and delegate rendering to Recharts.
- Form components (`MultiSelectCombobox`, `Select`, `Calendar`) follow controlled component pattern with `value`/`onChange`.
- Toast notifications use the `sonner` library (toaster rendered at app root).

## Integration
- Consumed by: All feature components across `src/components/`, `src/app/` pages, and dashboard layouts
- Depends on: `class-variance-authority` (cva), `clsx`, `tailwind-merge` (via `@/lib/utils`), Radix UI primitives (`@radix-ui/*`), `lucide-react` (icons), `recharts` (charts), `canvas-confetti`, `sonner`, `framer-motion`, `date-fns`
