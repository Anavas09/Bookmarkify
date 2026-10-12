import type { BookmarkSource } from '../ports/BookmarkSource.ts'
import { ChromeAdapter, type BookmarksApi } from './ChromeAdapter.ts'
import { createDevBookmarks } from './devBookmarks.ts'

// The one place that decides where the bookmarks come from: Chrome's own
// API inside the extension. Under `npm run dev` there is none, so an
// in-memory copy with sample bookmarks stands in for it.
export function createBookmarkSource(): BookmarkSource {
  const api: BookmarksApi | undefined =
    globalThis.chrome?.bookmarks ?? (import.meta.env.DEV ? createDevBookmarks() : undefined)
  if (api !== undefined) return new ChromeAdapter(api)

  const unavailable = () =>
    Promise.reject(new Error('chrome.bookmarks is not available: open Bookmarkify from its extension icon.'))
  return { load: unavailable, commit: unavailable }
}
