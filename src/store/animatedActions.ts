import { animateGridChange } from '../lib/viewTransition.ts'
import { useBookmarkStore } from './useBookmarkStore.ts'

// Store actions that add or remove cards from the grid, animated. Each one
// checks first that something will change, to avoid empty transitions.

export function deleteSelectedAnimated(): void {
  const { selected, pendingDeletes } = useBookmarkStore.getState()
  const hasFresh = [...selected].some(id => !pendingDeletes.has(id))
  if (!hasFresh) return
  animateGridChange(() => useBookmarkStore.getState().deleteSelected())
}

export function restoreSelectedAnimated(): void {
  const { selected, pendingDeletes } = useBookmarkStore.getState()
  const hasDeleted = [...selected].some(id => pendingDeletes.has(id))
  if (!hasDeleted) return
  animateGridChange(() => useBookmarkStore.getState().restoreSelected())
}

export function undoDeleteAnimated(): void {
  if (useBookmarkStore.getState().lastDeleted === null) return
  animateGridChange(() => useBookmarkStore.getState().undoDelete())
}
