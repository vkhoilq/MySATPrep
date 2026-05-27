# popups/

## Responsibility
Draggable, resizable popup overlays used throughout the application for reference materials, note-taking, and external tools. Implements a shared popup state management system with mouse/touch drag support and responsive sizing.

## Design
- **Pattern**: Shared reducer + component composition. `index.ts` defines the `PopupState` interface, `popupInitialState`, and `popupReducer` that manages position, size, dragging, and resizing. All three popup components (`Reference`, `Desmos`, `Notes`) reuse this reducer.
- **Dragging**: Tracks `isDragging` + `dragStart` offset. On mousemove, computes new position = `clientX/Y - dragStart`. Touch support via `touchmove` with `passive: false`.
- **Resizing**: Supports `se` (south-east) and `ne` (north-east) directions. Updates both size and position for `ne` to maintain the popup's right edge. Minimum sizes enforced.
- **Responsive defaults**: On open, checks window dimensions and adjusts default size for mobile (<640px), tablet (<1024px), and desktop.
- **IFrame interaction**: Desmos popup disables `pointer-events` on its iframe during drag/resize to prevent event capture conflicts, then re-enables on mouseup.

## Files

| File | Role |
|---|---|
| `index.ts` | Shared state: `PopupState` interface, `popupInitialState`, `popupReducer`, barrel exports. |
| `reference-popup.tsx` | SAT Reference Sheet popup. Displays an image (`sat-math-refrence-sheet.webp`) of the official math reference sheet. Resizable, draggable. |
| `desmos-popup.tsx` | Desmos Graphing Calculator popup. Embeds `https://www.desmos.com/testing/cb-sat-ap/graphing` in an iframe. Handles iframe pointer events during drag/resize. Larger default size. |
| `notes-popup.tsx` | Personal notes popup. Provides a `<textarea>` for writing question-specific notes. Auto-saves with 1-second debounce via `useEffect`. Displays character count. |

## Flow
1. Parent component toggles `isOpen` prop → popup mounts with `popupInitialState` position/size.
2. `useEffect` runs on open: adjusts size for responsive breakpoints, constrains position to window bounds.
3. User drags header → `handleMouseDown` dispatches `START_DRAGGING` → `mousemove` dispatches `SET_POSITION` → `mouseup` dispatches `STOP_DRAGGING`.
4. User resizes via handle → `handleResizeMouseDown` dispatches `START_RESIZING` → `mousemove` computes new width/height → dispatches `SET_SIZE` (and `SET_POSITION` for ne-direction).
5. Notes popup: `onChange` updates local state → 1s debounce timer → calls `onSaveNote` only if text differs from `currentNote`.

## Integration
- Consumed by: `src/components/practice-rush-multistep.tsx`, `src/components/question-problem-card.tsx`, `src/components/dashboard-layout/nav-actions.tsx`, `src/components/dashboard/buttons-group.tsx`
- Depends on: `@/components/ui/button`, `@/types/questionNotes`, `@/lib/playSound`, `lucide-react` (X, GripHorizontal, NotebookPen), `next/image` (reference popup)
