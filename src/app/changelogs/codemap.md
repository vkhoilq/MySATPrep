# src/app/changelogs/

## Responsibility
Route for the Changelogs page — displays product release notes, updates, and improvements with contributor avatars. Fetches GitHub user data server-side and renders an interactive changelog dialog component.

## Design
- **Server Component** (`page.tsx`): Uses `async function Page()` for server-side data fetching. Exports `Metadata` (title "MySATPrep Changelog", OpenGraph/Twitter with `/seo/dashboard-layout.png`, canonical `/changelogs`).
- **Data Fetching**: Defines `fetchGitHubUser(username)` — a private server function that calls `https://api.github.com/users/${username}` with `force-cache` and `revalidate: 86400` (24-hour ISR). Uses `AbortSignal.timeout(30000)` for timeout protection. Returns `GitHubUser | null` on failure.
- **Rendering Flow**:
  1. Imports `members` (array of `{ username, role }`) from `@/lib/contributors`.
  2. Maps over members, calling `fetchGitHubUser()` for each via `Promise.all`.
  3. Constructs a `githubUsersMap` record keyed by username containing `{ username, name, designation, image }` — falling back to `githubUser.login` or raw `username` for name, and `avatar_url` or GitHub URL for image.
  4. Passes `githubUsersMap` as a prop to `<ChangelogPage githubUsersMap={...} />`.
- **Rendered Output**: `SiteHeader` (with `disableBlur` and `disableScroll` props), `ChangelogPage` (interactive component from `@/components/ui/interactive-changelog-with-dialog`), `FooterSection`.
- **Pattern**: Hybrid server-client — data fetching is server-side (no client waterfalls), but the changelog component itself is a client component that uses the fetched data as initial props.

## Flow
1. Request arrives at `/changelogs`.
2. `Page()` runs — iterates over `members`, fetches GitHub user profiles in parallel, builds `githubUsersMap`.
3. Renders `SiteHeader` (no blur/scroll effects), then `<ChangelogPage githubUsersMap={githubUsersMap} />`, then `FooterSection`.
4. `ChangelogPage` client component mounts, receives the map, and renders interactive changelog entries with contributor avatars.

## Integration
- Consumed by: "Community" dropdown in the navbar's NavigationMenu links to `/changelogs`. Mobile nav also links to it.
- Depends on: `@/components/ui/interactive-changelog-with-dialog` (the changelog UI component), `@/components/footer`, `@/lib/contributors` (members array, GitHubUser type), GitHub public API (fetch via `https://api.github.com/users/{username}`).
