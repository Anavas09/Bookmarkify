import { animateGridChange } from '../lib/gridMotion.ts'
import { normalizeUrl } from '../core/normalizeUrl.ts'
import { selectBrokenIds, selectKeptBookmarks, selectVisibleSortedBookmarks } from './selectors.ts'
import { useBookmarkStore } from './useBookmarkStore.ts'
import { useLinkStore } from './useLinkStore.ts'

// «Not broken» (thumbs-up), animated like the deletions. A result belongs to a
// URL, so dismissing a bookmark dismisses its twins too.

function visibleIds(): string[] {
  const { bookmarks, pendingDeletes, activeFilter, activeSort } = useBookmarkStore.getState()
  const { checks } = useLinkStore.getState()
  return selectVisibleSortedBookmarks(bookmarks, pendingDeletes, activeFilter, activeSort, checks)
    .map(b => b.id)
}

// The broken URLs behind `ids`, and the ids of every kept bookmark sharing them.
function brokenTargets(ids: Iterable<string>): { urls: string[]; leaving: string[] } {
  const { bookmarks, pendingDeletes } = useBookmarkStore.getState()
  const { checks } = useLinkStore.getState()
  const kept = selectKeptBookmarks(bookmarks, pendingDeletes)
  const broken = selectBrokenIds(kept, checks)
  const wanted = new Set(ids)
  const urls = new Set<string>()
  for (const b of kept) {
    const norm = normalizeUrl(b.url)
    if (norm !== null && wanted.has(b.id) && broken.has(b.id)) urls.add(norm)
  }
  const leaving = kept
    .filter(b => broken.has(b.id) && urls.has(normalizeUrl(b.url) ?? ''))
    .map(b => b.id)
  return { urls: [...urls], leaving }
}

export function dismissBrokenAnimated(ids: string[]): void {
  const { urls, leaving } = brokenTargets(ids)
  if (urls.length === 0) return
  animateGridChange(() => useLinkStore.getState().dismiss(urls), visibleIds, leaving)
}

export function dismissSelectedBrokenAnimated(): void {
  const { urls, leaving } = brokenTargets(useBookmarkStore.getState().selected)
  if (urls.length === 0) return
  animateGridChange(
    () => {
      useLinkStore.getState().dismiss(urls)
      useBookmarkStore.getState().clearSelection()
    },
    visibleIds,
    leaving,
  )
}
