# src/app/resources/

## Responsibility
Route for the SAT Study Resources page — provides access to reference sheets, formula guides, test-taking strategies, and other downloadable preparation materials.

## Design
- **Server Component** (`page.tsx`): Exports `Metadata` (title "SAT Study Resources & Reference Materials", keywords targeting "SAT study resources", "SAT math formulas", "SAT formula sheet", etc., OpenGraph/Twitter with `/og-resources.png`, canonical `/resources`).
- The default export `Page()` renders three components:
  1. `<SiteHeader />` — navigation bar.
  2. `<ResourceSection />` — the main content component imported from `@/components/resources` (likely renders resource cards, download links, or reference material listings).
  3. `<FooterSection />` — standard footer.
- **Minimal Server Shell**: No server-side data fetching — all resource content is expected to be managed within the `ResourceSection` component. The server page's role is limited to SEO metadata and layout composition.

## Flow
1. User navigates to `/resources` (via navbar's "Resources" link, or direct URL).
2. `page.tsx` renders — metadata is statically analyzed.
3. `SiteHeader`, `ResourceSection`, and `FooterSection` render sequentially.
4. `ResourceSection` mounts on the client and displays the available resources.

## Integration
- Consumed by: Navbar "Resources" link (both desktop NavigationMenu and mobile menu). Sitemap entry at `/resources`.
- Depends on: `@/components/resources` (ResourceSection — the main content component), `@/components/footer`, `@/app/navbar` (SiteHeader).
