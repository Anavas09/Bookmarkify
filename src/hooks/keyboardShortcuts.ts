import { useEffect } from 'react'
import { useBookmarkStore, useVisibleBookmarks } from '../store/useBookmarkStore.ts'

export interface ShortcutActions {
  moveFocus: (delta: number) => void
  toggleMark: () => void
}

export function handleShortcut(key: string, actions: ShortcutActions): boolean {
  switch (key) {
    case 'j':
    case 'ArrowRight':
      actions.moveFocus(1)
      return true
    case 'k':
    case 'ArrowLeft':
      actions.moveFocus(-1)
      return true
    case ' ':
      actions.toggleMark()
      return true
    default:
      return false
  }
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable === true) return true
  const ce = target.getAttribute('contenteditable')
  return ce === 'true' || ce === ''
}

export function useKeyboardShortcuts(): void {
  const focusedIndex = useBookmarkStore(s => s.focusedIndex)
  const visible = useVisibleBookmarks()

  useEffect(() => {
    if (visible.length === 0) return

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isEditableTarget(e.target)) return

      const store = useBookmarkStore.getState()
      const currentId = visible[focusedIndex]?.id

      const handled = handleShortcut(e.key, {
        moveFocus: (d) => store.moveFocus(d),
        toggleMark: () => {
          if (currentId === undefined) return
          if (store.pendingDeletes.has(currentId)) {
            store.unmark(currentId)
          } else {
            store.mark(currentId)
          }
        },
      })

      if (handled) e.preventDefault()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusedIndex, visible])
}
