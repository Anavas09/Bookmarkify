import { flushSync } from 'react-dom'
import { animate } from 'motion/react'
import { create } from 'zustand'

const CARD_SELECTOR = '[data-bookmark-id]'

export interface GridSnapshot {
  ids: Set<string> // every card in the grid
  near: Set<string> // cards less than a viewport away from the screen
  first: number // grid slots the near cards take up
  last: number
}

interface GridMotion {
  // Bumped by every animated change. Cards near the viewport take it as their
  // layoutDependency, so only they measure and slide; the rest jump into place.
  epoch: number
  near: Set<string>
  // Cards brought back near the viewport, which fade in without stagger.
  entering: Set<string>
}

export const useGridMotion = create<GridMotion>(() => ({
  epoch: 0,
  near: new Set(),
  entering: new Set(),
}))

// The cards near the viewport animate, and so do the ones that will land in
// their slots, which may come from further down.
export function planGridMotion(
  before: GridSnapshot,
  after: string[],
): Pick<GridMotion, 'near' | 'entering'> {
  const near = new Set(before.near)
  const entering = new Set<string>()
  for (let i = before.first; i <= before.last && i < after.length; i++) {
    near.add(after[i])
    if (!before.ids.has(after[i])) entering.add(after[i])
  }
  return { near, entering }
}

interface NearCard {
  el: HTMLElement
  rect: DOMRect
}

function measureGrid(): { snapshot: GridSnapshot; nearCards: Map<string, NearCard> } {
  const margin = window.innerHeight
  const ids = new Set<string>()
  const nearCards = new Map<string, NearCard>()
  let first = Infinity
  let last = -1
  document.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach((el, i) => {
    const id = el.dataset.bookmarkId ?? ''
    ids.add(id)
    const rect = el.getBoundingClientRect()
    if (rect.bottom < -margin || rect.top > window.innerHeight + margin) return
    nearCards.set(id, { el, rect })
    first = Math.min(first, i)
    last = i
  })
  return { snapshot: { ids, near: new Set(nearCards.keys()), first, last }, nearCards }
}

// A copy of the card fades out where it was, over the cards sliding into its place.
function fadeOutCopy({ el, rect }: NearCard): void {
  const copy = el.cloneNode(true) as HTMLElement
  copy.removeAttribute('data-bookmark-id')
  copy.setAttribute('aria-hidden', 'true')
  // A new element would replay the card's CSS entrance.
  copy.querySelectorAll('.card-in').forEach(node => node.classList.remove('card-in'))
  Object.assign(copy.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    transform: 'none',
    pointerEvents: 'none',
  })
  document.body.append(copy)
  animate(copy, { opacity: 0, scale: 0.94 }, { duration: 0.18, ease: 'easeIn' })
    .finished.then(() => copy.remove())
}

// Animates a store update that adds or removes cards. `leaving`
// lists the cards the update may take out of the view; those that do leave
// fade out. flushSync commits the update and the new motion state together,
// so the cards measure themselves right before and right after it.
export function animateGridChange(
  update: () => void,
  visibleIds: () => string[],
  leaving: Iterable<string> = [],
): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update()
    return
  }

  const { snapshot, nearCards } = measureGrid()
  const leavers: NearCard[] = []
  for (const id of leaving) {
    const card = nearCards.get(id)
    if (card) leavers.push(card)
  }

  flushSync(() => {
    update()
    const plan = planGridMotion(snapshot, visibleIds())
    useGridMotion.setState(s => ({ epoch: s.epoch + 1, ...plan }))
  })

  for (const card of leavers) {
    if (!card.el.isConnected) fadeOutCopy(card)
  }
}
