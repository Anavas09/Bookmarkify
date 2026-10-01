import { flushSync } from 'react-dom'

const CARD_SELECTOR = '[data-bookmark-id]'

let activeTransitions = 0

// Naming every card would make the browser snapshot thousands of them; the
// ones further than a viewport away just jump into place without animating.
function nameCardsNearViewport() {
  const margin = window.innerHeight
  for (const el of document.querySelectorAll<HTMLElement>(CARD_SELECTOR)) {
    const rect = el.getBoundingClientRect()
    if (rect.bottom < -margin || rect.top > window.innerHeight + margin) continue
    // Ids may start with a digit, which is not a valid name on its own.
    el.style.viewTransitionName = `bm-${CSS.escape(el.dataset.bookmarkId ?? '')}`
  }
}

function clearCardNames() {
  for (const el of document.querySelectorAll<HTMLElement>(CARD_SELECTOR)) {
    el.style.viewTransitionName = ''
  }
}

function canAnimate(): boolean {
  return (
    typeof document.startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

// Zustand updates through useSyncExternalStore, which React's <ViewTransition>
// does not pick up, so the update is flushed synchronously inside the native API.
// Callers must skip no-op updates: an empty transition still blocks the pointer.
export function animateGridChange(update: () => void): void {
  if (!canAnimate()) {
    update()
    return
  }

  nameCardsNearViewport()
  activeTransitions++
  const transition = document.startViewTransition(() => {
    flushSync(update)
    // Restored cards mount with `card-in` and its staggered delay; finish it
    // so the new snapshot does not catch them invisible.
    for (const el of document.querySelectorAll(CARD_SELECTOR)) {
      for (const animation of el.getAnimations()) animation.finish()
    }
    // Again after the update, so restored cards get a name too.
    nameCardsNearViewport()
  })

  // An interrupted transition must not strip the names of the one replacing it.
  transition.finished.finally(() => {
    if (--activeTransitions === 0) clearCardNames()
  })
}
