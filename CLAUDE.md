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
npm test           # run all tests (Vitest)
npm test -- path/to/file.test.ts   # run a single test file
npm run lint       # ESLint
```

## Architecture rule (critical)

All bookmark reading/writing goes through the `BookmarkSource` port at `src/core/ports/BookmarkSource.ts`. No file outside `src/core/adapters/` may know about the Netscape HTML format or the `chrome.bookmarks` API. This decouples the UI from the data source so the app can migrate to a Chrome extension without rewriting any UI code.

Two adapters are planned:
- `src/core/adapters/NetscapeAdapter.ts` — parses an uploaded `.html` file
- `src/core/adapters/ChromeAdapter.ts` — wraps `chrome.bookmarks` for the extension build

## State model

Deletions are **non-destructive**: marked IDs accumulate in a `Set<string>` inside the Zustand store. The actual export filters them out at commit time. Nothing is permanently deleted until the user triggers an explicit export action.

Keyboard shortcuts: `j`/`k` navigate, `x` marks for deletion, `u` undoes.

## Implementation order

1. Netscape HTML parser + core types (with Vitest tests, no UI)
2. Card grid with real data
3. Keyboard navigation (j/k/x/u) + undo
4. Filters: by domain, by duplicate URL (normalized)
5. Export (filtered Netscape HTML)
6. External metadata (og:image) — last, using IntersectionObserver with a concurrency queue of 5
