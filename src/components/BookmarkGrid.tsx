import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Selecto, { type OnSelectEnd } from 'react-selecto'
import { useBookmarkStore, useVisibleBookmarks } from '../store/useBookmarkStore.ts'
import { BookmarkCard } from './BookmarkCard.tsx'

const CARD_SELECTOR = '[data-bookmark-id]'

function idOf(el: Element): string | null {
  return el instanceof HTMLElement ? el.dataset.bookmarkId ?? null : null
}

function cardFromEvent(e: { inputEvent: unknown }): Element | null {
  const target = (e.inputEvent as Event | undefined)?.target
  return target instanceof Element ? target.closest(CARD_SELECTOR) : null
}

export function BookmarkGrid() {
  const { t } = useTranslation()
  const visible = useVisibleBookmarks()
  const pendingDeletes = useBookmarkStore(s => s.pendingDeletes)
  const selected = useBookmarkStore(s => s.selected)
  const gridRef = useRef<HTMLDivElement>(null)
  const selectoRef = useRef<Selecto>(null)

  // Store → Selecto: keep Selecto's internal selection in sync when the store
  // changes it (Ctrl+A, Esc, Shift+click range, delete, filter change).
  useEffect(() => {
    const selecto = selectoRef.current
    const grid = gridRef.current
    if (!selecto || !grid) return
    const targets = [...grid.querySelectorAll<HTMLElement>(CARD_SELECTOR)].filter(el =>
      selected.has(el.dataset.bookmarkId ?? ''),
    )
    selecto.setSelectedTargets(targets)
  }, [selected, visible])

  // Selecto → store
  function handleSelectEnd(e: OnSelectEnd) {
    const store = useBookmarkStore.getState()
    const clicked = e.isClick ? cardFromEvent(e) : null
    const clickedId = clicked ? idOf(clicked) : null
    const shift = (e.inputEvent as MouseEvent | undefined)?.shiftKey === true

    if (clickedId && shift) {
      store.selectRangeTo(clickedId)
      return
    }
    const ids = e.selected.map(idOf).filter((id): id is string => id !== null)
    store.setSelection(ids, clickedId ?? undefined)
  }

  if (visible.length === 0) {
    return (
      <p className="font-mono text-[12px] text-ink-mute px-1 py-8">
        {t('grid.empty')}
      </p>
    )
  }

  return (
    <>
      <Selecto
        ref={selectoRef}
        dragContainer="main"
        className="selection-lasso"
        selectableTargets={[CARD_SELECTOR]}
        selectByClick
        selectFromInside
        hitRate={0}
        toggleContinueSelect={[['ctrl'], ['meta']]}
        // Clicking the title opens the link instead of selecting.
        dragCondition={e => !(e.inputEvent.target as Element | null)?.closest('a')}
        scrollOptions={{
          container: document.body,
          threshold: 40,
          throttleTime: 30,
          getScrollPosition: () => [window.scrollX, window.scrollY],
        }}
        onScroll={({ direction }) => window.scrollBy(direction[0] * 10, direction[1] * 10)}
        onSelectEnd={handleSelectEnd}
      />
      <div
        ref={gridRef}
        className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]"
      >
        {visible.map((b, i) => (
          <BookmarkCard
            key={b.id}
            index={i}
            bookmark={b}
            marked={pendingDeletes.has(b.id)}
            selected={selected.has(b.id)}
          />
        ))}
      </div>
    </>
  )
}
