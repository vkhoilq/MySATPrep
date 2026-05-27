# src/app/contributors/

## Responsibility
Route for the Contributors page — highlights the open-source community members who have contributed to MySATPrep through features, bug reports, and suggestions.

## Design
- **Server Component** (`page.tsx`): Exports `Metadata` (title "Contributors - MySATPrep", OpenGraph/Twitter with `/og-contributors.png`, canonical `/contributors`).
- The default export `Page()` renders three components in sequence:
  1. `<SiteHeader />` — the standard navigation bar.
  2. `<ContributorsSection />` — the main content component imported from `@/components/contributors-section`. This is likely a client component that displays contributor cards or a list.
  3. `<FooterSection />` — the standard footer.
- **Minimal Server Shell**: The page has no data fetching logic of its own — all contributor data (avatars, names, roles) is expected to be managed within the `ContributorsSection` component or fetched client-side. The server page's sole responsibility is SEO metadata and composing the layout.

## Flow
1. User navigates to `/contributors` (via Community dropdown → "Contributors" link, or direct URL).
2. `page.tsx` renders — metadata is statically analyzed for `<head>` tags.
3. `SiteHeader`, `ContributorsSection`, and `FooterSection` are rendered sequentially.
4. `ContributorsSection` mounts on the client and displays the contributor list.

## Integration
- Consumed by: Navbar's Community NavigationMenu dropdown (desktop) and mobile nav link to `/contributors`. Also referenced from `/report-bug` and `/suggest-feature` pages as incentive links ("feature you on the contributors list").
- Depends on: `@/components/contributors-section` (main content), `@/components/footer`, `@/app/navbar` (SiteHeader).
