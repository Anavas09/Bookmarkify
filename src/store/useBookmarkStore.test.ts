import { describe, it, expect, beforeEach } from 'vitest'
import { useBookmarkStore, getInitialState, PERSIST_KEY } from './useBookmarkStore.ts'
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

const B = (id: string, url = `https://${id}.com`, folderPath?: string[]): Bookmark => ({
  id,
  title: id,
  url,
  ...(folderPath !== undefined && { folderPath }),
})

beforeEach(() => {
  localStorage.clear()
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

  describe('activeFilter', () => {
    it('starts as null', () => {
      expect(useBookmarkStore.getState().activeFilter).toBeNull()
    })

    it('setFilter stores the filter and resets focus to 0', async () => {
      const source = new FakeSource([
        B('a', 'https://a.com'),
        B('b', 'https://b.com'),
        B('c', 'https://c.com'),
      ])
      await useBookmarkStore.getState().load(source)
      useBookmarkStore.getState().moveFocus(2)
      expect(useBookmarkStore.getState().focusedIndex).toBe(2)

      useBookmarkStore.getState().setFilter({ kind: 'domain', value: 'a.com' })

      expect(useBookmarkStore.getState().activeFilter).toEqual({ kind: 'domain', value: 'a.com' })
      expect(useBookmarkStore.getState().focusedIndex).toBe(0)
    })

    it('setFilter is a no-op if the filter is equal', () => {
      const store = useBookmarkStore.getState()
      store.setFilter({ kind: 'domain', value: 'x.com' })
      const before = useBookmarkStore.getState()
      store.setFilter({ kind: 'domain', value: 'x.com' })
      const after = useBookmarkStore.getState()
      expect(after.activeFilter).toBe(before.activeFilter)
    })

    it('clearFilter goes back to null and resets focus', async () => {
      const source = new FakeSource([B('a'), B('b'), B('c')])
      await useBookmarkStore.getState().load(source)
      useBookmarkStore.getState().setFilter({ kind: 'duplicate' })
      useBookmarkStore.getState().moveFocus(2)

      useBookmarkStore.getState().clearFilter()

      expect(useBookmarkStore.getState().activeFilter).toBeNull()
      expect(useBookmarkStore.getState().focusedIndex).toBe(0)
    })

    it('moveFocus clamps to the visible list length when a filter is active', async () => {
      const source = new FakeSource([
        B('a', 'https://a.com'),
        B('b', 'https://b.com'),
        B('c', 'https://a.com'),
      ])
      await useBookmarkStore.getState().load(source)
      useBookmarkStore.getState().setFilter({ kind: 'domain', value: 'a.com' })

      useBookmarkStore.getState().moveFocus(99)
      expect(useBookmarkStore.getState().focusedIndex).toBe(1)
    })

    it('load resets activeFilter to null', async () => {
      useBookmarkStore.getState().setFilter({ kind: 'duplicate' })
      const source = new FakeSource([B('a')])
      await useBookmarkStore.getState().load(source)
      expect(useBookmarkStore.getState().activeFilter).toBeNull()
    })
  })

  describe('persistence', () => {
    interface PersistedShape {
      state: {
        bookmarks: Array<{ id: string }>
        pendingDeletes: { __set: string[] }
        activeFilter: unknown
        focusedIndex?: number
      }
    }

    it('writes bookmarks, pendingDeletes and activeFilter to localStorage', async () => {
      const source = new FakeSource([B('a', 'https://a.com'), B('b', 'https://b.com')])
      await useBookmarkStore.getState().load(source)
      useBookmarkStore.getState().mark('a')
      useBookmarkStore.getState().setFilter({ kind: 'domain', value: 'a.com' })

      const raw = localStorage.getItem(PERSIST_KEY)
      expect(raw).not.toBeNull()
      const parsed = JSON.parse(raw as string) as PersistedShape
      expect(parsed.state.bookmarks.map(b => b.id)).toEqual(['a', 'b'])
      expect(parsed.state.pendingDeletes).toEqual({ __set: ['a'] })
      expect(parsed.state.activeFilter).toEqual({ kind: 'domain', value: 'a.com' })
    })

    it('does not persist focusedIndex', async () => {
      const source = new FakeSource([B('a'), B('b'), B('c')])
      await useBookmarkStore.getState().load(source)
      useBookmarkStore.getState().moveFocus(2)

      const raw = localStorage.getItem(PERSIST_KEY)
      const parsed = JSON.parse(raw as string) as PersistedShape
      expect(parsed.state.focusedIndex).toBeUndefined()
    })

    it('rehydrates from localStorage and revives pendingDeletes as a Set', async () => {
      localStorage.setItem(
        PERSIST_KEY,
        JSON.stringify({
          state: {
            bookmarks: [B('x'), B('y')],
            pendingDeletes: { __set: ['x'] },
            activeFilter: { kind: 'duplicate' },
          },
          version: 0,
        }),
      )

      await useBookmarkStore.persist.rehydrate()

      const s = useBookmarkStore.getState()
      expect(s.bookmarks.map(b => b.id)).toEqual(['x', 'y'])
      expect(s.pendingDeletes).toBeInstanceOf(Set)
      expect(s.pendingDeletes.has('x')).toBe(true)
      expect(s.pendingDeletes.has('y')).toBe(false)
      expect(s.activeFilter).toEqual({ kind: 'duplicate' })
    })
  })
})
