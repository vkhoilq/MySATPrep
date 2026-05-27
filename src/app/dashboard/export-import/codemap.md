# src/app/dashboard/export-import/

## Responsibility
Self-contained page (`/dashboard/export-import`) that enables users to back up and restore all application data stored in browser localStorage to/from a JSON file. Handles the complete lifecycle of export and import operations including file I/O, progress feedback, and refresh.

## Design
- **Self-contained page**: Unlike other dashboard sub-routes that delegate to shared components, this page implements its own full UI and state management inline.
- **Client component**: `"use client"` — uses React hooks (`useState`, `useRef`) and browser APIs (`localStorage`, `FileReader`, `Blob`, `URL.createObjectURL`).
- **Imperative file I/O pattern**:
  - **Export**: Calls `exportLocalStorageData()` to snapshot all localStorage keys into a structured `ExportedData` object (versioned, timestamped), then `downloadExportedData()` triggers a browser download via a dynamically created `<a>` element with a Blob URL. Filename includes a timestamp (e.g., `mysatprep-backup-2026-05-27T12-30-00.json`).
  - **Import**: Uses a hidden `<input type="file" accept=".json">` triggered by a button click. On file selection, `readFileAsJSON()` reads the file via `FileReader` and parses it. Then `importLocalStorageData()` iterates over each key and writes it back to localStorage.
- **Feedback pattern**: A `message` state object (`{type, text}`) renders success/error toasts inline. On successful import, the page automatically reloads after 2 seconds.
- **Assessment context**: `useAssessment()` is imported but only `state` is destructured — it is unused in the current implementation (likely for future scope like per-assessment export filtering).

## Flow
1. User navigates to `/dashboard/export-import` via sidebar "Export Import Data" link.
2. User reads the informational description about data privacy and localStorage-based storage.
3. **Export flow**:
   a. User clicks "Export" → `handleExport` is called.
   b. `exportLocalStorageData()` reads all localStorage keys and creates a JSON snapshot.
   c. `downloadExportedData()` creates a Blob, generates a download link, and triggers browser download.
   d. A success message is shown.
4. **Import flow**:
   a. User clicks "Import" → hidden file input is triggered.
   b. User selects a `.json` file → `handleFileSelect` reads the file via `readFileAsJSON`.
   c. `importLocalStorageData()` writes each key-value pair to localStorage.
   d. A success message with imported/skipped counts is shown; page reloads after 2 seconds.

## Integration
- Consumed by: Route at `/dashboard/export-import`; linked from `AppSidebar` nav item "Export Import Data".
- Depends on:
  - `@/lib/exportImport` — `exportLocalStorageData`, `downloadExportedData`, `readFileAsJSON`, `importLocalStorageData`
  - `@/components/ui/button` — shadcn Button component
  - `@/contexts/assessment-context` — Assessment state (currently unused)
  - `lucide-react` — Download, FolderInput, FolderOutput icons
