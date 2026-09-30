import { useEffect } from 'react'
import { useBookmarkStore } from '../store/useBookmarkStore.ts'

export interface ShortcutActions {
  deleteSelected: () => void
  clearSelection: () => void
  selectAll: () => void
  undo: () => void
}

export interface ShortcutModifiers {
  mod: boolean
  alt: boolean
  shift: boolean
}

export function handleShortcut(
  key: string,
  { mod, alt, shift }: ShortcutModifiers,
  actions: ShortcutActions,
): boolean {
  if (alt) return false
  if (mod) {
    if (key === 'a' || key === 'A') {
      actions.selectAll()
      return true
    }
    // Ctrl/Cmd+Shift+Z is redo elsewhere; there is no redo here.
    if ((key === 'z' || key === 'Z') && !shift) {
      actions.undo()
      return true
    }
    return false
  }
  switch (key) {
    // Mac keyboards label Backspace as "delete"
    case 'Delete':
    case 'Backspace':
      actions.deleteSelected()
      return true
    case 'Escape':
      actions.clearSelection()
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
  const hasBookmarks = useBookmarkStore(s => s.bookmarks.length > 0)

  useEffect(() => {
    if (!hasBookmarks) return

    function onKey(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return

      const store = useBookmarkStore.getState()

      const modifiers = { mod: e.metaKey || e.ctrlKey, alt: e.altKey, shift: e.shiftKey }
      const handled = handleShortcut(e.key, modifiers, {
        deleteSelected: () => store.deleteSelected(),
        clearSelection: () => store.clearSelection(),
        selectAll: () => store.selectAllVisible(),
        undo: () => store.undoDelete(),
      })

      if (handled) e.preventDefault()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hasBookmarks])
}
