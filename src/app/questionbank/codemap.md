# src/app/questionbank/

## Responsibility
Route for the SAT Question Bank browser — the main catalog page where users browse, filter, and search through the full database of College Board SAT questions. This is the platform's primary entry point for question discovery.

## Design
- **Server Component** (`page.tsx`): Exports a comprehensive `Metadata` object targeting SAT question bank keywords (including "SAT Suite Question Bank", "College Board Question Bank", "official SAT questions") with OpenGraph + Twitter card images (`/seo/question-bank.png`). Canonical URL at `/questionbank`.
- The default export `QuestionbankPage()` renders:
  1. A JSON-LD `structuredData` script (WebPage schema with BreadcrumbList, provider, images).
  2. The visual component: `<QuestionBankPageComponent />` — a client component imported from `@/components/questionbank/qb`.
  3. A screen-reader-only SEO `<div>` with semantic navigation (links to `/questionbank/math`, `/questionbank/reading`, `/questionbank/writing`, `/practice`, `/dashboard`), an `<article>` describing why to use MySATPrep, an `<aside>` with categories, hidden schema.org microdata (EducationalOrganization, Course), and hidden `<img>` elements with descriptive alt text for SEO.
- Follows the **thin server shell** pattern: the page handles SEO/metadata/structured data server-side, while all interactive UI (filters, pagination, question list) lives in the client component.

## Flow
1. User navigates to `/questionbank` (via navbar's "Questionbank" link or direct URL).
2. Next.js renders `page.tsx` — generates `<head>` metadata, injects JSON-LD, then renders `<QuestionBankPageComponent />`.
3. `QuestionBankPageComponent` mounts on the client, fetches question data (presumably from an internal API), and renders the browsable/filterable question bank UI.
4. SEO content is rendered in a `hidden` div for crawlers but invisible to users.

## Integration
- Consumed by: Navbar "Questionbank" link. Manifest shortcut for "Question Bank". Sitemap at `/questionbank`. The SEO hidden nav links to sub-routes `/questionbank/math`, `/questionbank/reading`, `/questionbank/writing`.
- Depends on: `@/components/questionbank/qb` (QuestionBankPageComponent — full interactive question browser).
