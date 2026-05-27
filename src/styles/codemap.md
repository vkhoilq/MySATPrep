# src/styles/

## Responsibility

Provides foundational design tokens (colors, shadows, radii, transitions, contrast variables) and CSS keyframe animations that define the application's visual language. These SCSS files augment the Tailwind CSS v4 utility framework with custom design system values and reusable animation keyframes.

## Design

Two partial SCSS files (`_variables.scss` and `_keyframe-animations.scss`) — both use the underscore prefix convention indicating they are meant to be imported (not compiled standalone). They define CSS custom properties on `:root` (and `.dark` for dark mode overrides) and `@keyframes` blocks.

### `_variables.scss` — Design Token Definitions

- **Gray scale (light + dark modes)**: Two parallel sets — alpha-adjusted values (`--tt-gray-light-a-*` / `--tt-gray-dark-a-*`) for transparent overlays, and solid values (`--tt-gray-light-*` / `--tt-gray-dark-*`) for backgrounds/borders. Each spans 50–900 on the opacity scale (50 = lightest, 900 = darkest).

- **Brand color**: Purple-based brand palette (`--tt-brand-color-50` through `--tt-brand-color-950`) with values like `--tt-brand-color-500: rgba(98, 41, 255, 1)`.

- **Semantic colors (green, yellow, red)**: Each with 11-step scale — `inc-5` (lightest increment) through `dec-5` (darkest decrement), with a `base` at the midpoint. Used for correct/incorrect/warning UI states.

- **Basic colors**: `--white`, `--black`, `--transparent`.

- **Shadows**: `--tt-shadow-elevated-md` — multi-layered box shadow with 4 stops for medium elevation. Dark mode variant under `.dark`.

- **Radii**: 6 levels from `--tt-radius-xxs: 0.125rem` (2px) to `--tt-radius-xl: 1rem` (16px).

- **Transitions**: 3 durations (`short: 0.1s`, `default: 0.2s`, `long: 0.64s`) and 5 easing curves (`default`, `cubic`, `quart`, `circ`, `back`), all using `cubic-bezier()`.

- **Contrast**: Tint contrast percentages (`--tt-accent-contrast: 8%`, etc.) for overlay calculations.

- **Global colors (light mode)**: Semantic tokens for background, borders, sidebar, scrollbar, cursor, selection, card — all referencing the gray/brand palettes.

- **Global colors (dark mode)**: `.dark` class overrides for all global colors, plus a modified shadow for dark backgrounds.

- **Text colors**: 9 semantic text color pairs (gray, brown, orange, yellow, green, blue, purple, pink, red) with corresponding `*-contrast` variants for background highlights. Each has both light and `.dark` mode values.

- **Highlight colors**: 9 highlight background colors with corresponding `*-contrast` variants. Used for note-taking, annotations, and emphasizing text selections. Duplicated under `.dark` with adapted values.

- **Box-sizing reset**: `*, ::before, ::after { box-sizing: border-box }` with default transition applied.

### `_keyframe-animations.scss` — Animation Keyframes

Eight `@keyframes` definitions:

| Name | Purpose |
|---|---|
| `fadeIn` | `opacity: 0 → 1` |
| `fadeOut` | `opacity: 1 → 0` |
| `zoomIn` | `scale: 0.95 → 1` |
| `zoomOut` | `scale: 1 → 0.95` |
| `zoom` | Combined `opacity 0→1` + `scale 0.95→1` |
| `slideFromTop` | `translateY(-0.5rem) → 0` |
| `slideFromRight` | `translateX(0.5rem) → 0` |
| `slideFromLeft` | `translateX(-0.5rem) → 0` |
| `slideFromBottom` | `translateY(0.5rem) → 0` |
| `spin` | `rotate(0deg) → 360deg` |

All animations use simple, fast transitions (0.1–0.2s equivalent), suitable for micro-interactions, modal entrances, and loading spinners.

## Flow

1. **Import chain**: These SCSS files are imported into the global stylesheet (likely `src/app/globals.css` or a similar entry point) as SCSS partials. They are **not** CSS modules — their custom properties and keyframes are globally available.
2. **At build time**, the SCSS is compiled to CSS by the Next.js build pipeline (Vite/Turbopack handles SCSS compilation).
3. **At runtime**, the CSS custom properties defined in `_variables.scss` are consumed throughout the application by Tailwind-utility classes, shadcn/ui components, and custom component styles that reference `var(--tt-*)` properties.
4. **Animations** from `_keyframe-animations.scss` are referenced by Tailwind's `animate-*` utilities or inline `animation-name` styles in component CSS.

## Integration

- **Consumed by**: All components across `src/app/` and `src/components/` via CSS custom properties (`var(--tt-bg-color)`, `var(--tt-brand-color-500)`, etc.) and animation names (`fadeIn`, `slideFromTop`, etc.). Tailwind CSS v4 can reference these custom properties in arbitrary values or via Tailwind's `theme()` function if configured.
- **Depends on**:
  - Sass/SCSS compiler (built into Next.js via `sass` package — present in `devDependencies` or Next.js default)
  - No JavaScript or TypeScript imports — purely stylesheet-level integration
