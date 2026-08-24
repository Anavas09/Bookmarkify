import { describe, it, expect, beforeEach } from 'vitest'
import { useBookmarkStore, getInitialState } from './useBookmarkStore.ts'
import type { Bookmark } from '../core/types.ts'
import type { BookmarkSource } from '../core/ports/BookmarkSource.ts'

class FakeSource implements BookmarkSource {
  exportedWith: Bookmark[] | null = null
  private readonly seed: Bookmark[]

  constructor(seed: Bookmark[] = []) {
    this.seed = seed
  }

  async load(): Promise<Bookmark[]> {
    return this.seed
  }

  async export(bookmarks: Bookmark[]): Promise<void> {
    this.exportedWith = bookmarks
  }
}

const B = (id: string, url = `https://${id}.com`): Bookmark => ({
  id,
  title: id,
  url,
})

beforeEach(() => {
  useBookmarkStore.setState(getInitialState())
})

describe('useBookmarkStore', () => {
  describe('initial state', () => {
    it('starts empty with focus at 0', () => {
      const s = useBookmarkStore.getState()
      expect(s.bookmarks).toEqual([])
      expect(s.pendingDeletes.size).toBe(0)
      expect(s.focusedIndex).toBe(0)
    })
  })

  describe('load', () => {
    it('populates bookmarks and resets focus + pending deletes', async () => {
      useBookmarkStore.setState({
        focusedIndex: 5,
        pendingDeletes: new Set(['stale']),
      })

      const source = new FakeSource([B('a'), B('b')])
      await useBookmarkStore.getState().load(source)

      const s = useBookmarkStore.getState()
      expect(s.bookmarks).toHaveLength(2)
      expect(s.focusedIndex).toBe(0)
      expect(s.pendingDeletes.size).toBe(0)
    })
  })

  describe('mark / unmark', () => {
    it('mark adds the id to pendingDeletes', () => {
      useBookmarkStore.getState().mark('x')
      expect(useBookmarkStore.getState().pendingDeletes.has('x')).toBe(true)
    })

    it('mark produces a new Set reference (so Zustand notifies subscribers)', () => {
      const before = useBookmarkStore.getState().pendingDeletes
      useBookmarkStore.getState().mark('x')
      const after = useBookmarkStore.getState().pendingDeletes
      expect(after).not.toBe(before)
    })

    it('mark is idempotent', () => {
      const store = useBookmarkStore.getState()
      store.mark('x')
      const first = useBookmarkStore.getState().pendingDeletes
      store.mark('x')
      const second = useBookmarkStore.getState().pendingDeletes
      expect(second).toBe(first)
      expect(second.size).toBe(1)
    })

    it('unmark removes the id', () => {
      useBookmarkStore.getState().mark('x')
      useBookmarkStore.getState().unmark('x')
      expect(useBookmarkStore.getState().pendingDeletes.has('x')).toBe(false)
    })

    it('unmark is a no-op when the id is not marked', () => {
      const before = useBookmarkStore.getState().pendingDeletes
      useBookmarkStore.getState().unmark('ghost')
      expect(useBookmarkStore.getState().pendingDeletes).toBe(before)
    })
  })

  describe('moveFocus', () => {
    beforeEach(async () => {
      const source = new FakeSource([B('a'), B('b'), B('c')])
      await useBookmarkStore.getState().load(source)
    })

    it('moves forward and backward', () => {
      const store = useBookmarkStore.getState()
      store.moveFocus(1)
      expect(useBookmarkStore.getState().focusedIndex).toBe(1)
      store.moveFocus(-1)
      expect(useBookmarkStore.getState().focusedIndex).toBe(0)
    })

    it('clamps at 0', () => {
      useBookmarkStore.getState().moveFocus(-10)
      expect(useBookmarkStore.getState().focusedIndex).toBe(0)
    })

    it('clamps at length - 1', () => {
      useBookmarkStore.getState().moveFocus(99)
      expect(useBookmarkStore.getState().focusedIndex).toBe(2)
    })

    it('is a no-op on an empty list', () => {
      useBookmarkStore.setState({ bookmarks: [], focusedIndex: 0 })
      useBookmarkStore.getState().moveFocus(1)
      expect(useBookmarkStore.getState().focusedIndex).toBe(0)
    })
  })

  describe('exportFiltered', () => {
    it('exports only bookmarks not in pendingDeletes', async () => {
      const source = new FakeSource([B('a'), B('b'), B('c')])
      await useBookmarkStore.getState().load(source)
      useBookmarkStore.getState().mark('b')

      await useBookmarkStore.getState().exportFiltered(source)

      expect(source.exportedWith?.map(x => x.id)).toEqual(['a', 'c'])
    })

    it('exports everything when nothing is marked', async () => {
      const source = new FakeSource([B('a'), B('b')])
      await useBookmarkStore.getState().load(source)

      await useBookmarkStore.getState().exportFiltered(source)

      expect(source.exportedWith?.map(x => x.id)).toEqual(['a', 'b'])
    })

    it('does not clear pendingDeletes after export', async () => {
      const source = new FakeSource([B('a'), B('b')])
      await useBookmarkStore.getState().load(source)
      useBookmarkStore.getState().mark('a')

      await useBookmarkStore.getState().exportFiltered(source)

      expect(useBookmarkStore.getState().pendingDeletes.has('a')).toBe(true)
    })
  })
})
