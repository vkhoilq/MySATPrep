# src/hooks/

## Responsibility

Provides a collection of reusable, client-side React hooks that encapsulate browser API interactions, DOM measurements, and UI behavioral logic. These hooks abstract away direct window/document/ResizeObserver handling, keyboard navigation patterns, and Tiptap editor integration from consuming components.

## Design

Each hook is an independent, composable unit with a single responsibility. Hooks that depend on one another do so via explicit imports (e.g., `useThrottledCallback` is reused by `useWindowSize` and `useElementRect`). The module follows a **utility-hook** pattern: hooks accept an options object with sensible defaults and return plain state or callback refs.

Key hook signatures and roles:

- **`useMenuNavigation<T>(options)`** — Generic keyboard navigation for dropdown menus/command palettes. Accepts `editor`, `containerRef`, `items: T[]`, `onSelect`, `onClose`, `orientation` ("vertical" | "horizontal" | "both"), `autoSelectFirstItem`. Returns `{ selectedIndex, setSelectedIndex }`. Attaches a `keydown` capture listener to the Tiptap editor DOM or a provided container ref. Handles ArrowUp/Down/Left/Right, Tab, Home, End, Enter, Escape.

- **`useWindowSize()`** — Tracks `window.visualViewport` dimensions (width, height, offsetTop, offsetLeft, scale). Uses `useThrottledCallback` (200ms) to debounce resize events. Only updates state when values change (referential equality check). Returns a `WindowSizeState` object.

- **`useUnmount(callback)`** — Calls the given callback on component unmount via a ref-based pattern (avoids stale closure issues). Returns nothing.

- **`useComposedRef<T>(libRef, userRef)`** — Merges an internal (required) ref with an optional external ref (callback or `RefObject`). Invalidates the previous external ref on change. Returns a single callback ref. Useful for forwarding refs while keeping internal access.

- **`useThrottledCallback<T>(fn, wait, dependencies, options)`** — Creates a throttled version of a function using `lodash.throttle`. Accepts `leading`/`trailing` options. Automatically cancels pending calls on unmount via `useUnmount`. Returns the throttled function with `.cancel()` and `.flush()`.

- **`useMediaQuery(query)`** — Returns a boolean matching a CSS media query string using `window.matchMedia`. Re-evaluates on query change.

- **`useIsMobile(breakpoint = 768)`** — Returns a boolean for responsive mobile breakpoint. Uses `window.matchMedia` with `(max-width: {breakpoint - 1}px)`. Also exported from `use-media-query.tsx` with a fixed 768px variant.

- **`useElementRect(options)`** — Tracks an element's bounding rect via `getBoundingClientRect()`. Accepts `element` (selector | RefObject | Element), `enabled`, `throttleMs` (default 100), `useResizeObserver`. Attaches scroll/resize listeners and optionally a `ResizeObserver`. Returns a `RectState` (all `DOMRect` fields except `toJSON`). Exposes convenience hooks `useBodyRect` and `useRefRect`.

- **`useScrolling(target, options)`** — Returns a boolean indicating whether the given scroll target (RefObject | Window | null) is currently being scrolled. Uses `scroll` event with a debounced fallback timer (default 150ms) and respects the native `scrollend` event when available. Falls back to `document` for mobile.

- **`useTiptapEditor(providedEditor?)`** — Bridges a direct editor instance and Tiptap's `useCurrentEditor` context. Uses `useEditorState` to subscribe to editor state changes. Returns `{ editor, editorState?, canCommand? }`.

- **`useCursorVisibility({ editor, overlayHeight })`** — Ensures the Tiptap cursor stays visible when the virtual keyboard or toolbar would obscure it. Uses `useWindowSize` and `useBodyRect`. Computes cursor coordinates via `view.coordsAtPos(from)` and smooth-scrolls if needed. Returns the body rect.

## Flow

1. **DOM measurement hooks** (`useWindowSize`, `useElementRect`): On mount, attach event listeners (resize, scroll, `ResizeObserver`). On each event, the throttled callback reads browser APIs (`visualViewport`, `getBoundingClientRect`), compares against previous state, and updates React state only on actual changes. Cleanup removes listeners on unmount.

2. **Keyboard navigation** (`useMenuNavigation`): On mount, attaches a capture-phase `keydown` listener to the editor DOM element or container ref. Each keypress updates `selectedIndex` via functional state updates (circular indexing). Enter triggers `onSelect`, Escape triggers `onClose`. Query changes reset the selected index.

3. **Composed refs** (`useComposedRef`): When the callback ref is invoked by React during rendering, it assigns the instance to both the internal and external refs, and nullifies the previous external ref.

4. **Throttling** (`useThrottledCallback`): Creates a `lodash.throttle` wrapper inside `useMemo`, keyed by `dependencies`. On unmount, `useUnmount` calls `.cancel()`.

5. **Editor integration** (`useTiptapEditor`, `useCursorVisibility`): Data flows from the editor's ProseMirror state → `view.coordsAtPos()` → comparison against window/body rects → imperative `window.scrollTo()`.

## Integration

- **Consumed by**: Components throughout `src/app/` and `src/components/` that need dropdown menus (`useMenuNavigation`), responsive layouts (`useMediaQuery`, `useIsMobile`), rich text editing (`useTiptapEditor`, `useCursorVisibility`), viewport-aware positioning (`useElementRect`, `useWindowSize`), scroll-aware UI toggles (`useScrolling`), and ref forwarding (`useComposedRef`).

- **Depends on**: 
  - `lodash.throttle` (external — `useThrottledCallback`)
  - `@tiptap/react` (external — `useMenuNavigation`, `useTiptapEditor`, `useCursorVisibility`)
  - Internal hooks: `useThrottledCallback` ← `useUnmount`; `useWindowSize` ← `useThrottledCallback`; `useElementRect` ← `useThrottledCallback`; `useCursorVisibility` ← `useWindowSize`, `useElementRect`
  - Browser globals: `window`, `window.visualViewport`, `window.matchMedia`, `ResizeObserver`, `Element.getBoundingClientRect`
