# src/app/dashboard/tracker/

## Responsibility
Progress tracker page (`/dashboard/tracker`) that renders detailed analytics and performance visualizations for the user's SAT question bank practice. Provides aggregation of accuracy, time spent, difficulty breakdowns, and domain-level insights across all answered questions.

## Design
- **Server component**: No `"use client"` directive. The component itself is static scaffolding; all interactive/chart logic lives in the imported `Tracker` component.
- **SEO-first page**: This page has the most extensive SEO metadata in the dashboard section, including:
  - Full `next/metadata` export with title, description, keywords (80+), OpenGraph, Twitter card, Apple web app, robots, verification tags, and Dublin Core metadata.
  - Inline JSON-LD structured data (`application/ld+json`) describing the page as a `SoftwareApplication` with feature list, breadcrumb, organization provider, and image objects.
  - Hidden `<div className="hidden">` section with 570+ lines of semantic HTML (headings h1-h6, articles, nav, aside, footer) designed for search engine crawling and ranking for long-tail SAT tracker keywords.
  - Schema.org microdata (`itemScope`, `itemType`, `itemProp`) for `SoftwareApplication` and `AnalyticsSystem`.
  - Hidden `<img>` tags with SEO-optimized alt text for image indexing.
- **Delegation pattern**: The actual analytics dashboard UI is rendered by `Tracker` from `@/components/dashboard/tracker/tracker`, which is likely a client component using Recharts for charts and reading `practiceStatistics` from localStorage.
- **Canonical URL**: Set to `https://www.mysatprep.fun/dashboard/tracker`.

## Flow
1. User navigates to `/dashboard/tracker` via sidebar "Question Bank Tracker" link.
2. The server component renders the JSON-LD script and hidden SEO content.
3. The `Tracker` component mounts client-side, reads `practiceStatistics` from localStorage, and renders analytics visualizations (accuracy charts, time trends, domain breakdowns, difficulty distributions).
4. User interacts with charts and filters to explore their performance data.

## Integration
- Consumed by: Route at `/dashboard/tracker`; linked from `AppSidebar` nav item "Question Bank Tracker".
- Depends on:
  - `@/components/dashboard/tracker/tracker` — Main analytics dashboard component
  - `next/metadata` — Metadata generation
  - `@/types/statistics` — Practice statistics types
