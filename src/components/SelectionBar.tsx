import { useEffect, useMemo, useState, type AnimationEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useBookmarkStore } from '../store/useBookmarkStore.ts'
import {
  deleteSelectedAnimated,
  restoreSelectedAnimated,
  undoDeleteAnimated,
} from '../store/animatedActions.ts'
import { cx } from '../lib/cx.ts'
import { isMac } from '../lib/platform.ts'
import { Key } from './Key.tsx'

const UNDO_TIMEOUT_MS = 6000

interface BarContent {
  selectedCount: number
  keptInSelection: number
  deletedInSelection: number
  undoCount: number
}

function sameContent(a: BarContent, b: BarContent | null): boolean {
  return (
    b !== null &&
    a.selectedCount === b.selectedCount &&
    a.keptInSelection === b.keptInSelection &&
    a.deletedInSelection === b.deletedInSelection &&
    a.undoCount === b.undoCount
  )
}

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
  const clearSelection = useBookmarkStore(s => s.clearSelection)
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
  const undoCount = lastDeleted?.length ?? 0
  const live: BarContent | null =
    selected.size > 0 || undoCount > 0
      ? {
          selectedCount: selected.size,
          keptInSelection: selected.size - deletedInSelection,
          deletedInSelection,
          undoCount,
        }
      : null

  // The last content shown stays rendered while the bar animates out, so it
  // does not flash to empty counts before disappearing.
  const [content, setContent] = useState(live)
  if (live !== null && !sameContent(live, content)) setContent(live)

  if (content === null) return null
  const leaving = live === null

  function handleAnimationEnd(e: AnimationEvent<HTMLDivElement>) {
    if (leaving && e.target === e.currentTarget) setContent(null)
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
      <div
        onAnimationEnd={handleAnimationEnd}
        className={cx(
          'theme-invert',
          // While leaving, its buttons act on a state that no longer exists.
          leaving ? 'bar-out' : 'bar-in pointer-events-auto',
          'flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-md border border-edge bg-paper-card px-4 py-2.5 shadow-lg font-mono text-[12px] text-ink-soft',
        )}
      >
        {/* The selection wins: once a new one starts, the undo notice steps aside. */}
        {content.selectedCount > 0 ? (
          <>
            <span>{t('selectionBar.count', { count: content.selectedCount })}</span>
            {content.keptInSelection > 0 && (
              <span className="flex items-center gap-2">
                <button type="button" onClick={deleteSelectedAnimated} className={ACTION_BTN_CLASS}>
                  {t('selectionBar.delete', { count: content.keptInSelection })}
                </button>
                <span className="flex items-center gap-1 text-[11px] text-ink-mute">
                  <span>{t('selectionBar.orPress')}</span>
                  <Key>{mac ? '⌫' : t('selectionBar.deleteKey')}</Key>
                </span>
              </span>
            )}
            {content.deletedInSelection > 0 && (
              <button type="button" onClick={restoreSelectedAnimated} className={ACTION_BTN_CLASS}>
                {t('selectionBar.restore', { count: content.deletedInSelection })}
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
            <span>{t('selectionBar.deleted', { count: content.undoCount })}</span>
            <span className="flex items-center gap-2">
              <button type="button" onClick={undoDeleteAnimated} className={ACTION_BTN_CLASS}>
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
