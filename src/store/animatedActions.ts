import { animateGridChange } from '../lib/gridMotion.ts'
import { selectVisibleSortedBookmarks } from './selectors.ts'
import { useBookmarkStore } from './useBookmarkStore.ts'

// Store actions that add or remove cards from the grid, animated. Each one
// checks first that something will change, so no card re-measures for nothing.

function visibleIds(): string[] {
  const { bookmarks, pendingDeletes, activeFilter, activeSort } = useBookmarkStore.getState()
  return selectVisibleSortedBookmarks(bookmarks, pendingDeletes, activeFilter, activeSort)
    .map(b => b.id)
}

export function deleteSelectedAnimated(): void {
  const { selected, pendingDeletes } = useBookmarkStore.getState()
  const fresh = [...selected].filter(id => !pendingDeletes.has(id))
  if (fresh.length === 0) return
  animateGridChange(() => useBookmarkStore.getState().deleteSelected(), visibleIds, fresh)
}

export function restoreSelectedAnimated(): void {
  const { selected, pendingDeletes } = useBookmarkStore.getState()
  const deleted = [...selected].filter(id => pendingDeletes.has(id))
  if (deleted.length === 0) return
  animateGridChange(() => useBookmarkStore.getState().restoreSelected(), visibleIds, deleted)
}

// In the deleted view, the undone batch leaves instead of coming back.
export function undoDeleteAnimated(): void {
  const { lastDeleted } = useBookmarkStore.getState()
  if (lastDeleted === null) return
  animateGridChange(() => useBookmarkStore.getState().undoDelete(), visibleIds, lastDeleted)
}
