import { useEffect } from 'react'
import { useBookmarkStore, useVisibleBookmarks } from '../store/useBookmarkStore.ts'

export interface ShortcutActions {
  moveFocus: (delta: number) => void
  toggleMark: () => void
  extendMark: () => void
}

export function handleShortcut(
  key: string,
  shift: boolean,
  actions: ShortcutActions,
): boolean {
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
      if (shift) actions.extendMark()
      else actions.toggleMark()
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
  const hasVisible = useVisibleBookmarks().length > 0

  useEffect(() => {
    if (!hasVisible) return

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isEditableTarget(e.target)) return

      const store = useBookmarkStore.getState()

      const handled = handleShortcut(e.key, e.shiftKey, {
        moveFocus: (d) => store.moveFocus(d),
        toggleMark: () => store.toggleFocused(),
        extendMark: () => store.extendMarkFromAnchor(),
      })

      if (handled) e.preventDefault()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hasVisible])
}
