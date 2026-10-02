import { memo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Selecto, { type OnSelectEnd } from 'react-selecto'
import { LazyMotion, domMax, m, type Transition } from 'motion/react'
import type { Bookmark } from '../core/types.ts'
import { useBookmarkStore, useVisibleBookmarks } from '../store/useBookmarkStore.ts'
import { useGridMotion } from '../lib/gridMotion.ts'
import { BookmarkCard } from './BookmarkCard.tsx'

const CARD_SELECTOR = '[data-bookmark-id]'

// A spring keeps its speed when a new delete interrupts the slide.
const LAYOUT_SPRING: Transition = { type: 'spring', visualDuration: 0.3, bounce: 0 }

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
  const filterKind = useBookmarkStore(s => s.activeFilter?.kind ?? null)
  const epoch = useGridMotion(s => s.epoch)
  const near = useGridMotion(s => s.near)
  const entering = useGridMotion(s => s.entering)
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
    const emptyKey =
      filterKind === 'deleted' ? 'grid.emptyDeleted'
      : filterKind === null ? 'grid.emptyAll'
      : 'grid.empty'
    return (
      <p className="font-mono text-[12px] text-ink-mute px-1 py-8">
        {t(emptyKey)}
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
      {/* `m` components load only the features in domMax (layout animations
          included); `strict` throws if a full `motion` component sneaks in. */}
      <LazyMotion features={domMax} strict>
        <div
          ref={gridRef}
          className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]"
        >
          {visible.map((b, i) => (
            <GridItem
              key={b.id}
              bookmark={b}
              index={i}
              stagger={entering.has(b.id) ? 0 : i}
              marked={pendingDeletes.has(b.id)}
              selected={selected.has(b.id)}
              layoutDependency={near.has(b.id) ? epoch : 0}
            />
          ))}
        </div>
      </LazyMotion>
    </>
  )
}

interface GridItemProps {
  bookmark: Bookmark
  index: number
  stagger: number
  marked: boolean
  selected: boolean
  layoutDependency: number
}

// The wrapper slides the card when others leave or come back
// (lib/gridMotion.ts); filtering and sorting do not change its
// layoutDependency, so it jumps. The card keeps its CSS entrance on its own element, so the two
// transforms do not override each other. Memoized because Motion components
// are slow to re-render: a click only re-renders the cards it selects.
const GridItem = memo(function GridItem({ layoutDependency, ...card }: GridItemProps) {
  return (
    <m.div
      data-bookmark-id={card.bookmark.id}
      layout="position"
      layoutDependency={layoutDependency}
      transition={LAYOUT_SPRING}
      // Block, and the card fills its height (h-full): cheaper to lay out
      // than a grid per card when there are thousands.
      className="h-full"
    >
      <BookmarkCard {...card} />
    </m.div>
  )
})
