import { useEffect } from 'react'
import { useBookmarkStore } from '../store/useBookmarkStore.ts'

export interface ShortcutActions {
  deleteSelected: () => void
  clearSelection: () => void
  selectAll: () => void
}

export interface ShortcutModifiers {
  mod: boolean
  alt: boolean
}

export function handleShortcut(
  key: string,
  { mod, alt }: ShortcutModifiers,
  actions: ShortcutActions,
): boolean {
  if (alt) return false
  if (mod) {
    if (key === 'a' || key === 'A') {
      actions.selectAll()
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

      const handled = handleShortcut(e.key, { mod: e.metaKey || e.ctrlKey, alt: e.altKey }, {
        deleteSelected: () => store.deleteSelected(),
        clearSelection: () => store.clearSelection(),
        selectAll: () => store.selectAllVisible(),
      })

      if (handled) e.preventDefault()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hasBookmarks])
}
