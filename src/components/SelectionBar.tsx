import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useBookmarkStore } from '../store/useBookmarkStore.ts'
import { cx } from '../lib/cx.ts'
import { isMac } from '../lib/platform.ts'
import { Key } from './Key.tsx'

const UNDO_TIMEOUT_MS = 6000

const ACTION_BTN_CLASS =
  'font-mono text-[12px] tracking-wide px-3 py-1.5 rounded-sm border border-accent text-accent ' +
  'hover:bg-accent hover:text-paper transition-colors cursor-pointer'

const LINK_BTN_CLASS =
  'font-mono text-[11px] text-ink-mute hover:text-ink underline underline-offset-2 ' +
  'decoration-transparent hover:decoration-current transition-colors cursor-pointer'

// Fixed at the bottom so its actions stay reachable while scrolling. It must
// render outside <main>: Selecto listens there (dragContainer="main") and would
// take a click on these buttons as a click on empty space, clearing the selection.
export function SelectionBar() {
  const { t } = useTranslation()
  const selected = useBookmarkStore(s => s.selected)
  const pendingDeletes = useBookmarkStore(s => s.pendingDeletes)
  const lastDeleted = useBookmarkStore(s => s.lastDeleted)
  const deleteSelected = useBookmarkStore(s => s.deleteSelected)
  const restoreSelected = useBookmarkStore(s => s.restoreSelected)
  const clearSelection = useBookmarkStore(s => s.clearSelection)
  const undoDelete = useBookmarkStore(s => s.undoDelete)
  const dismissUndo = useBookmarkStore(s => s.dismissUndo)
  const mac = isMac()

  // Every new deleted batch restarts the countdown; after it, undo is gone
  // (Ctrl/Cmd+Z included), so what can be undone is always what is shown.
  useEffect(() => {
    if (lastDeleted === null) return
    const timer = setTimeout(dismissUndo, UNDO_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [lastDeleted, dismissUndo])

  const deletedInSelection = useMemo(() => {
    let n = 0
    for (const id of selected) if (pendingDeletes.has(id)) n++
    return n
  }, [selected, pendingDeletes])
  const keptInSelection = selected.size - deletedInSelection
  const undoCount = lastDeleted?.length ?? 0

  if (selected.size === 0 && undoCount === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
      <div className="bar-in pointer-events-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-md border border-edge bg-paper-card px-4 py-2.5 shadow-lg font-mono text-[12px] text-ink-soft">
        {/* The selection wins: once a new one starts, the undo notice steps aside. */}
        {selected.size > 0 ? (
          <>
            <span>{t('selectionBar.count', { count: selected.size })}</span>
            {keptInSelection > 0 && (
              <span className="flex items-center gap-2">
                <button type="button" onClick={deleteSelected} className={ACTION_BTN_CLASS}>
                  {t('selectionBar.delete', { count: keptInSelection })}
                </button>
                <span className="flex items-center gap-1 text-[11px] text-ink-mute">
                  <span>{t('selectionBar.orPress')}</span>
                  <Key>{mac ? '⌫' : t('selectionBar.deleteKey')}</Key>
                </span>
              </span>
            )}
            {deletedInSelection > 0 && (
              <button type="button" onClick={restoreSelected} className={ACTION_BTN_CLASS}>
                {t('selectionBar.restore', { count: deletedInSelection })}
              </button>
            )}
            <button
              type="button"
              onClick={clearSelection}
              className={cx(LINK_BTN_CLASS, 'flex items-center gap-1')}
            >
              <Key>esc</Key>
              <span>{t('selectionBar.clear')}</span>
            </button>
          </>
        ) : (
          <>
            <span>{t('selectionBar.deleted', { count: undoCount })}</span>
            <span className="flex items-center gap-2">
              <button type="button" onClick={undoDelete} className={ACTION_BTN_CLASS}>
                {t('selectionBar.undo')}
              </button>
              <span className="flex items-center gap-1 text-[11px] text-ink-mute">
                <span>{t('selectionBar.orPress')}</span>
                <Key>{mac ? '⌘' : 'ctrl'}</Key>
                <span aria-hidden="true">+</span>
                <Key>z</Key>
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  )
}
