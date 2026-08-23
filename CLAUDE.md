# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Bookmark Triage

Visual triage app for cleaning browser bookmarks (Netscape HTML file or Chrome extension).

## Stack

Vite + React + TypeScript. Zustand for state. Vitest for tests. No backend.

## Commands

```bash
npm run dev        # start dev server
npm run build      # type-check + build
npm run preview    # preview production build
npm run test       # run all tests once (Vitest)
npm run test:watch # run tests in watch mode
npx vitest run src/core/parser.test.ts   # run a single test file
npm run lint       # ESLint
```

## Directory layout

```
src/
  core/
    ports/
      BookmarkSource.ts   # the port interface — only thing UI depends on
    adapters/
      NetscapeAdapter.ts  # parses uploaded .html (Netscape format)
      ChromeAdapter.ts    # wraps chrome.bookmarks for extension build
    types.ts              # Bookmark, BookmarkFolder, etc.
    parser.ts             # Netscape HTML → types (pure, testable)
    normalizeUrl.ts       # URL normalization for duplicate detection
  store/
    useBookmarkStore.ts   # Zustand store
  components/             # UI only — no knowledge of adapters or format
```

## Architecture rule (critical)

All bookmark reading/writing goes through the `BookmarkSource` port at `src/core/ports/BookmarkSource.ts`. No file outside `src/core/adapters/` may know about the Netscape HTML format or the `chrome.bookmarks` API. This decouples the UI from the data source so the app can migrate to a Chrome extension without rewriting any UI code.

`BookmarkSource` interface:

```ts
interface BookmarkSource {
  load(): Promise<Bookmark[]>;
  export(bookmarks: Bookmark[]): Promise<void>;
}
```

## Core types

```ts
interface Bookmark {
  id: string;        // generated (crypto.randomUUID or index-based)
  title: string;
  url: string;
  addedAt?: number;  // unix ms, from ADD_DATE attribute
  tags?: string[];   // from TAGS attribute
}
```

## State model

Deletions are **non-destructive**: marked IDs accumulate in a `Set<string>` inside the Zustand store. The actual export filters them out at commit time. Nothing is permanently deleted until the user triggers an explicit export action.

```ts
interface BookmarkStore {
  bookmarks: Bookmark[];
  pendingDeletes: Set<string>;
  focusedIndex: number;
  load(source: BookmarkSource): Promise<void>;
  mark(id: string): void;
  unmark(id: string): void;
  moveFocus(delta: number): void;
  exportFiltered(source: BookmarkSource): Promise<void>;
}
```

Keyboard shortcuts: `j`/`k` move focus, `x` marks focused bookmark for deletion, `u` unmarks it.

## Implementation order

1. ✅ Core types + Netscape HTML parser + Vitest tests (no UI)
2. `BookmarkSource` port + `NetscapeAdapter`
3. Zustand store
4. Card grid with real data (file upload → parse → render)
5. Keyboard navigation (j/k/x/u) + undo
6. Filters: by domain, by duplicate URL (normalized)
7. Export (write filtered Netscape HTML, trigger download)
8. External metadata (og:image) — last, using IntersectionObserver with a fetch queue of max 5 concurrent requests
