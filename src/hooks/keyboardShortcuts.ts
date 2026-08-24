import { useEffect } from 'react'
import { useBookmarkStore } from '../store/useBookmarkStore.ts'

export interface ShortcutActions {
  moveFocus: (delta: number) => void
  markAndAdvance: () => void
  unmark: () => void
}

export function handleShortcut(key: string, actions: ShortcutActions): boolean {
  switch (key) {
    case 'j':
    case 'ArrowDown':
      actions.moveFocus(1)
      return true
    case 'k':
    case 'ArrowUp':
      actions.moveFocus(-1)
      return true
    case 'x':
      actions.markAndAdvance()
      return true
    case 'u':
      actions.unmark()
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
  const bookmarks = useBookmarkStore(s => s.bookmarks)

  useEffect(() => {
    if (bookmarks.length === 0) return

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isEditableTarget(e.target)) return

      const store = useBookmarkStore.getState()
      const currentId = bookmarks[focusedIndex]?.id

      const handled = handleShortcut(e.key, {
        moveFocus: (d) => store.moveFocus(d),
        markAndAdvance: () => {
          if (currentId === undefined) return
          store.mark(currentId)
          store.moveFocus(1)
        },
        unmark: () => {
          if (currentId === undefined) return
          store.unmark(currentId)
        },
      })

      if (handled) e.preventDefault()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusedIndex, bookmarks])
}
