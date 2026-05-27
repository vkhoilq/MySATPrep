# src/app/report-bug/

## Responsibility
Route for the Bug Report page — provides a form for users to report issues, broken pages, or unexpected behavior on MySATPrep. Embeds an Airtable form and links to the open-source GitHub repository.

## Design
- **Server Component** (`page.tsx`): Exports `Metadata` (title "Report a Bug - MySATPrep", OpenGraph/Twitter with `/seo/dashboard-layout.png`, canonical `/report-bug`).
- **Static Page**: No data fetching, no client interactivity beyond the embedded iframe. The page renders:
  1. `<SiteHeader />` — navigation bar.
  2. A `<section>` with:
     - A heading "Report Bug" and descriptive paragraphs.
     - A link to the GitHub repo (`https://github.com/aldhanekaa/MySATPrep/`) with an explanation that valid issues earn contributor recognition.
     - An Airtable embed iframe pointing to `https://airtable.com/embed/appRwFRovs7CtS7m8/pagadmaARK4PfdZLI/form`.
  3. `<FooterSection />` — standard footer.
- **Airtable as Backend**: The bug report form is a fully hosted Airtable form embedded via `<iframe>`. No custom form implementation — submissions go directly to Airtable.

## Flow
1. User navigates to `/report-bug` (via Community dropdown → "Report Bug" link).
2. Server renders the page with header, footer, and the Airtable iframe.
3. User fills out the Airtable form within the iframe — data is submitted directly to Airtable (cross-origin).
4. Alternatively, user clicks the GitHub repository link to create an issue there.

## Integration
- Consumed by: Navbar's Community NavigationMenu dropdown (desktop) and mobile nav link to `/report-bug`.
- Depends on: `@/components/footer`, `@/app/navbar` (SiteHeader). External dependency on Airtable form embed (external URL).
