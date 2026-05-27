# src/app/

## Responsibility
Root entry point for the Next.js 15 App Router. Defines the global HTML shell (layout), the home landing page, the navigation bar, the 404 page, global CSS (Tailwind v4 + shadcn/ui), and static config files (robots.txt, manifest.json, sitemap.xml). This is the outermost route segment and wraps all child routes in providers, analytics, and third-party scripts.

## Design
- **Root Layout** (`layout.tsx`): A server component that renders the `<html>` and `<body>` tags. It configures Google Fonts (Geist Sans + Geist Mono), injects structured data (JSON-LD for `EducationalOrganization`), and declares canonical URL + SEO meta tags. Wraps `{children}` in three context providers: `AssessmentProvider` (app-wide question/assessment state) and `MathJaxContext` (math rendering via `better-react-mathjax` v3). Also renders `Dialog02` (popup tour), `GoogleAnalytics`, `GoogleTagManager`, `@vercel/speed-insights`, `@vercel/analytics`, and a `Toaster` (sonner toast notifications). Microsoft Clarity analytics is injected via a raw script.
- **Home Page** (`page.tsx`): A server component exporting extensive `Metadata` (OpenGraph, Twitter, Dublin Core, geo tags) and a `jsonLd` graph (WebSite, WebPage, BreadcrumbList, SoftwareApplication). Renders a screen-reader-only SEO div with navigation links, then the visual `HeroSection` + `FooterSection`. No client-side interactivity.
- **Navbar** (`navbar.tsx`): A `"use client"` component (`SiteHeader`) with scroll-aware blur/background transitions. Uses Radix `NavigationMenu` primitives for the desktop nav (Dashboard, Questionbank, Resources, Community dropdown) and a toggleable mobile hamburger menu. Includes "Practice Rush" (blue) and "Search" (outline) CTA buttons. Accepts `IsScrolled`, `disableBlur`, `disableScroll` props for per-page customization.
- **404 Page** (`not-found.tsx`): A server component rendering `SiteHeader` + a centered 404 error section with an animated GIF background and a "Go to Home" button.
- **Global CSS** (`globals.css`): Uses `@import "tailwindcss"` and `tw-animate-css`. Defines `@theme inline` tokens for shadcn/ui CSS variables (colors, shadows, radii), `.dark` variant overrides, and custom keyframe animations (`moving-banner`, `aurora`) used by `Banner` and background effects. Includes component-level styles for `.answer-option` tables, `.questionProblemCard` tables, and MathJax content (`#question_stem img`).
- **Robots** (`robots.ts`): Exports a `MetadataRoute.Robots` function allowing `/` and disallowing `/private/` and `/api/*`. Points sitemap to `https://www.mysatprep.fun/sitemap2.xml`.
- **Manifest** (`manifest.ts`): Exports a `MetadataRoute.Manifest` with PWA configuration — standalone display, theme color `#0066cc`, maskable icons, shortcuts (Practice, Question Bank, Vocab Flashcards, Progress Tracker, Wordbank), and screenshots for wide/narrow form factors.
- **Sitemap** (`sitemap.ts`): Exports a `MetadataRoute.Sitemap` listing main pages (home, questionbank, practice, resources, review, question) and dashboard sub-routes (vocabs, tracker, answered, bookmarks, sessions) with appropriate change frequencies and priorities.

## Flow
1. **Request arrives** → Next.js matches the path to the App Router segment tree; `layout.tsx` is always the first to render.
2. **Layout renders** → injects fonts, providers, scripts, and passes `{children}` down. `metadata` export is statically analyzed for `<head>` tags.
3. **For `/` route** → `page.tsx` renders its metadata + visible content (HeroSection + FooterSection). No data fetching occurs server-side.
4. **For `/not-found`** → Next.js calls `not-found.tsx`, which renders `SiteHeader` + the 404 UI.
5. **For config routes** — `/robots.txt`, `/manifest.json`, `/sitemap2.xml` — Next.js invokes the respective `robots.ts`, `manifest.ts`, or `sitemap.ts` functions. These are statically generated at build time.

## Integration
- Consumed by: All child route segments under `src/app/*/` (their pages render inside the root layout's `{children}` slot).
- Depends on: `@/components/footer` (FooterSection), `@/components/home-hero` (HeroSection), `@/components/ui/banner`, `@/components/ui/popup-tour` (Dialog02), `@/components/logo`, `@/components/ui/button`, `@/components/ui/navigation-menu`, `@/contexts/assessment-context`, `better-react-mathjax`, `@vercel/speed-insights`, `@vercel/analytics`, `@next/third-parties/google`, `sonner` (Toaster), `framer-motion` (in navbar), `lucide-react` (icons).
