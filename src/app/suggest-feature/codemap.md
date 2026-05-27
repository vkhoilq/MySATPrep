# src/app/suggest-feature/

## Responsibility
Route for the Feature Suggestion page — allows users to submit product ideas, improvements, and feature requests for MySATPrep. Embeds an Airtable form and links to the open-source GitHub repository.

## Design
- **Server Component** (`page.tsx`): Exports `Metadata` (title "Suggest a Feature - MySATPrep", OpenGraph/Twitter with `/seo/dashboard-layout.png`, canonical `/suggest-feature`).
- **Static Page**: No data fetching or client interactivity beyond the embedded iframe. The page renders:
  1. `<SiteHeader />` — navigation bar.
  2. A `<section>` with:
     - A heading "Suggest a Feature" and descriptive paragraphs.
     - A link to the GitHub repo (`https://github.com/aldhanekaa/MySATPrep/`) with an explanation that feasible suggestions earn contributor recognition.
     - An Airtable embed iframe pointing to `https://airtable.com/embed/appRwFRovs7CtS7m8/pag8kXB0EovDa2J4Q/form` (a different form ID than the bug report page).
  3. `<FooterSection />` — standard footer.
- **Airtable as Backend**: Feature suggestions are submitted via an embedded Airtable form. No custom backend implementation. The iframe handles cross-origin submission directly to Airtable.

## Flow
1. User navigates to `/suggest-feature` (via Community dropdown → "Suggest a Feature" link).
2. Server renders the page with header, footer, and the Airtable iframe.
3. User fills out the Airtable form within the iframe — data is submitted directly to Airtable.
4. Alternatively, user clicks the GitHub repository link to create a feature request issue there.

## Integration
- Consumed by: Navbar's Community NavigationMenu dropdown (desktop) and mobile nav link to `/suggest-feature`.
- Depends on: `@/components/footer`, `@/app/navbar` (SiteHeader). External dependency on Airtable form embed (external URL).
