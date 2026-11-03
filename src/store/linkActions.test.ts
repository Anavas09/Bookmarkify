import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Bookmark } from '../core/types.ts'

const animate = vi.fn((update: () => void) => update())
vi.mock('../lib/gridMotion.ts', () => ({
  animateGridChange: (update: () => void) => animate(update),
}))

const { dismissBrokenAnimated, dismissSelectedBrokenAnimated } = await import('./linkActions.ts')
const { useBookmarkStore, getInitialState } = await import('./useBookmarkStore.ts')
const { useLinkStore } = await import('./useLinkStore.ts')
const { selectVisibleBookmarks } = await import('./selectors.ts')

const bm = (id: string, url: string): Bookmark => ({ id, title: id, url })

function visibleBroken(): string[] {
  const { bookmarks, pendingDeletes } = useBookmarkStore.getState()
  return selectVisibleBookmarks(bookmarks, pendingDeletes, { kind: 'broken' }, useLinkStore.getState().checks)
    .map(b => b.id)
}

beforeEach(() => {
  animate.mockClear()
  localStorage.clear()
  useBookmarkStore.setState({
    ...getInitialState(),
    bookmarks: [bm('1', 'https://a.com/x'), bm('2', 'https://a.com/x/'), bm('3', 'https://b.com/')],
    activeFilter: { kind: 'broken' },
  })
  useLinkStore.setState({
    checks: {
      'https://a.com/x': { status: 'broken', checkedAt: 1 },
      'https://b.com/': { status: 'ok', checkedAt: 1 },
    },
    firstScanPrompted: false,
  })
})

describe('dismissBrokenAnimated', () => {
  it('dismissing one id dismisses its twin URL too', () => {
    expect(visibleBroken()).toEqual(['1', '2'])
    dismissBrokenAnimated(['1'])
    expect(visibleBroken()).toEqual([])
    expect(animate).toHaveBeenCalledTimes(1)
  })

  it('does nothing, and does not animate, for ids that are not broken', () => {
    dismissBrokenAnimated(['3'])
    expect(visibleBroken()).toEqual(['1', '2'])
    expect(animate).not.toHaveBeenCalled()
  })
})

describe('dismissSelectedBrokenAnimated', () => {
  it('dismisses the selection and empties it', () => {
    useBookmarkStore.getState().setSelection(['2'], '2')
    dismissSelectedBrokenAnimated()
    expect(visibleBroken()).toEqual([])
    expect(useBookmarkStore.getState().selected.size).toBe(0)
  })

  it('a selection without broken links changes nothing and keeps the selection', () => {
    useBookmarkStore.getState().setSelection(['3'], '3')
    dismissSelectedBrokenAnimated()
    expect(animate).not.toHaveBeenCalled()
    expect([...useBookmarkStore.getState().selected]).toEqual(['3'])
    expect(visibleBroken()).toEqual(['1', '2'])
  })
})
