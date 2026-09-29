import { describe, it, expect, beforeEach } from 'vitest'
import { useBookmarkStore, getInitialState, PERSIST_KEY } from './useBookmarkStore.ts'
import type { Bookmark, BookmarkDocument, DocumentMeta } from '../core/types.ts'
import type { BookmarkSource } from '../core/ports/BookmarkSource.ts'

class FakeSource implements BookmarkSource {
  exportedWith: BookmarkDocument | null = null
  private readonly seed: Bookmark[]
  private readonly seedMeta: DocumentMeta

  constructor(seed: Bookmark[] = [], meta: DocumentMeta = {}) {
    this.seed = seed
    this.seedMeta = meta
  }

  async load(): Promise<BookmarkDocument> {
    return { bookmarks: this.seed, meta: this.seedMeta }
  }

  async export(doc: BookmarkDocument): Promise<void> {
    this.exportedWith = doc
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

      expect(source.exportedWith?.bookmarks.map(x => x.id)).toEqual(['a', 'c'])
    })

    it('exports everything when nothing is marked', async () => {
      const source = new FakeSource([B('a'), B('b')])
      await useBookmarkStore.getState().load(source)

      await useBookmarkStore.getState().exportFiltered(source)

      expect(source.exportedWith?.bookmarks.map(x => x.id)).toEqual(['a', 'b'])
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

  describe('activeSort', () => {
    it('starts as null', () => {
      expect(useBookmarkStore.getState().activeSort).toBeNull()
    })

    it('setSort stores the sort and resets focus to 0', async () => {
      const source = new FakeSource([B('a'), B('b'), B('c')])
      await useBookmarkStore.getState().load(source)
      useBookmarkStore.getState().moveFocus(2)

      useBookmarkStore.getState().setSort({ kind: 'title', dir: 'desc' })

      const s = useBookmarkStore.getState()
      expect(s.activeSort).toEqual({ kind: 'title', dir: 'desc' })
      expect(s.focusedIndex).toBe(0)
    })

    it('setSort is a no-op if the sort is equal', () => {
      const store = useBookmarkStore.getState()
      store.setSort({ kind: 'date', dir: 'asc' })
      const before = useBookmarkStore.getState()
      store.setSort({ kind: 'date', dir: 'asc' })
      const after = useBookmarkStore.getState()
      expect(after.activeSort).toBe(before.activeSort)
    })

    it('setSort resets the anchor', async () => {
      const source = new FakeSource([B('a'), B('b')])
      await useBookmarkStore.getState().load(source)
      useBookmarkStore.getState().toggleFocused()
      expect(useBookmarkStore.getState().anchor).not.toBeNull()

      useBookmarkStore.getState().setSort({ kind: 'domain' })

      expect(useBookmarkStore.getState().anchor).toBeNull()
    })

    it('clearSort goes back to null and resets focus + anchor', async () => {
      const source = new FakeSource([B('a'), B('b')])
      await useBookmarkStore.getState().load(source)
      useBookmarkStore.getState().setSort({ kind: 'title', dir: 'asc' })
      useBookmarkStore.getState().toggleFocused()
      useBookmarkStore.getState().moveFocus(1)

      useBookmarkStore.getState().clearSort()

      const s = useBookmarkStore.getState()
      expect(s.activeSort).toBeNull()
      expect(s.focusedIndex).toBe(0)
      expect(s.anchor).toBeNull()
    })

    it('load resets activeSort to null', async () => {
      useBookmarkStore.getState().setSort({ kind: 'date', dir: 'desc' })
      await useBookmarkStore.getState().load(new FakeSource([B('a')]))
      expect(useBookmarkStore.getState().activeSort).toBeNull()
    })

    it('moveFocus operates on the sorted order (bulk ops follow the sort)', async () => {
      const source = new FakeSource([
        { id: '1', title: 'Charlie', url: 'https://c.com' },
        { id: '2', title: 'alpha',   url: 'https://a.com' },
        { id: '3', title: 'Bravo',   url: 'https://b.com' },
      ])
      await useBookmarkStore.getState().load(source)
      useBookmarkStore.getState().setSort({ kind: 'title', dir: 'asc' })

      useBookmarkStore.getState().toggleFocused()

      expect(useBookmarkStore.getState().pendingDeletes.has('2')).toBe(true)
    })
  })

  describe('bulk selection', () => {
    describe('toggleFocused', () => {
      it('marks the focused bookmark and sets the anchor to mark', async () => {
        const source = new FakeSource([B('a'), B('b'), B('c')])
        await useBookmarkStore.getState().load(source)
        useBookmarkStore.getState().moveFocus(1)

        useBookmarkStore.getState().toggleFocused()

        const s = useBookmarkStore.getState()
        expect(s.pendingDeletes.has('b')).toBe(true)
        expect(s.anchor).toEqual({ index: 1, action: 'mark' })
      })

      it('unmarks the focused bookmark and sets the anchor to unmark', async () => {
        const source = new FakeSource([B('a'), B('b')])
        await useBookmarkStore.getState().load(source)
        useBookmarkStore.getState().mark('a')

        useBookmarkStore.getState().toggleFocused()

        const s = useBookmarkStore.getState()
        expect(s.pendingDeletes.has('a')).toBe(false)
        expect(s.anchor).toEqual({ index: 0, action: 'unmark' })
      })
    })

    describe('extendMarkFromAnchor', () => {
      it('falls back to a toggle when the anchor is null', async () => {
        const source = new FakeSource([B('a'), B('b')])
        await useBookmarkStore.getState().load(source)

        useBookmarkStore.getState().extendMarkFromAnchor()

        const s = useBookmarkStore.getState()
        expect(s.pendingDeletes.has('a')).toBe(true)
        expect(s.anchor).toEqual({ index: 0, action: 'mark' })
      })

      it('marks the inclusive range from anchor forward to focus', async () => {
        const source = new FakeSource([B('a'), B('b'), B('c'), B('d'), B('e')])
        await useBookmarkStore.getState().load(source)
        useBookmarkStore.getState().toggleFocused()
        useBookmarkStore.getState().moveFocus(3)

        useBookmarkStore.getState().extendMarkFromAnchor()

        const s = useBookmarkStore.getState()
        expect([...s.pendingDeletes].sort()).toEqual(['a', 'b', 'c', 'd'])
        expect(s.anchor).toEqual({ index: 0, action: 'mark' })
      })

      it('marks the inclusive range from focus backward to anchor', async () => {
        const source = new FakeSource([B('a'), B('b'), B('c'), B('d')])
        await useBookmarkStore.getState().load(source)
        useBookmarkStore.getState().moveFocus(3)
        useBookmarkStore.getState().toggleFocused()
        useBookmarkStore.getState().moveFocus(-2)

        useBookmarkStore.getState().extendMarkFromAnchor()

        const s = useBookmarkStore.getState()
        expect([...s.pendingDeletes].sort()).toEqual(['b', 'c', 'd'])
      })

      it('unmarks the range when the anchor action is unmark', async () => {
        const source = new FakeSource([B('a'), B('b'), B('c'), B('d')])
        await useBookmarkStore.getState().load(source)
        useBookmarkStore.getState().mark('a')
        useBookmarkStore.getState().mark('b')
        useBookmarkStore.getState().mark('c')
        useBookmarkStore.getState().mark('d')
        useBookmarkStore.getState().toggleFocused()
        useBookmarkStore.getState().moveFocus(2)

        useBookmarkStore.getState().extendMarkFromAnchor()

        const s = useBookmarkStore.getState()
        expect([...s.pendingDeletes].sort()).toEqual(['d'])
      })

      it('respects the active filter (only operates on visible)', async () => {
        const source = new FakeSource([
          B('a', 'https://a.com'),
          B('b', 'https://b.com'),
          B('c', 'https://a.com'),
          B('d', 'https://a.com'),
        ])
        await useBookmarkStore.getState().load(source)
        useBookmarkStore.getState().setFilter({ kind: 'domain', value: 'a.com' })
        useBookmarkStore.getState().toggleFocused()
        useBookmarkStore.getState().moveFocus(2)

        useBookmarkStore.getState().extendMarkFromAnchor()

        const s = useBookmarkStore.getState()
        expect([...s.pendingDeletes].sort()).toEqual(['a', 'c', 'd'])
        expect(s.pendingDeletes.has('b')).toBe(false)
      })
    })

    describe('markAllVisible / unmarkAllVisible', () => {
      it('markAllVisible marks every visible bookmark', async () => {
        const source = new FakeSource([B('a'), B('b'), B('c')])
        await useBookmarkStore.getState().load(source)

        useBookmarkStore.getState().markAllVisible()

        expect([...useBookmarkStore.getState().pendingDeletes].sort()).toEqual(['a', 'b', 'c'])
      })

      it('markAllVisible only operates within the active filter', async () => {
        const source = new FakeSource([
          B('a', 'https://a.com'),
          B('b', 'https://b.com'),
          B('c', 'https://a.com'),
        ])
        await useBookmarkStore.getState().load(source)
        useBookmarkStore.getState().setFilter({ kind: 'domain', value: 'a.com' })

        useBookmarkStore.getState().markAllVisible()

        expect([...useBookmarkStore.getState().pendingDeletes].sort()).toEqual(['a', 'c'])
      })

      it('unmarkAllVisible clears only visible marks', async () => {
        const source = new FakeSource([
          B('a', 'https://a.com'),
          B('b', 'https://b.com'),
        ])
        await useBookmarkStore.getState().load(source)
        useBookmarkStore.getState().mark('a')
        useBookmarkStore.getState().mark('b')
        useBookmarkStore.getState().setFilter({ kind: 'domain', value: 'a.com' })

        useBookmarkStore.getState().unmarkAllVisible()

        const s = useBookmarkStore.getState()
        expect(s.pendingDeletes.has('a')).toBe(false)
        expect(s.pendingDeletes.has('b')).toBe(true)
      })
    })

    describe('anchor lifecycle', () => {
      it('load resets the anchor', async () => {
        const source = new FakeSource([B('a')])
        await useBookmarkStore.getState().load(source)
        useBookmarkStore.getState().toggleFocused()
        expect(useBookmarkStore.getState().anchor).not.toBeNull()

        await useBookmarkStore.getState().load(new FakeSource([B('x')]))

        expect(useBookmarkStore.getState().anchor).toBeNull()
      })

      it('setFilter resets the anchor', async () => {
        const source = new FakeSource([
          B('a', 'https://a.com'),
          B('b', 'https://b.com'),
        ])
        await useBookmarkStore.getState().load(source)
        useBookmarkStore.getState().toggleFocused()
        expect(useBookmarkStore.getState().anchor).not.toBeNull()

        useBookmarkStore.getState().setFilter({ kind: 'domain', value: 'a.com' })

        expect(useBookmarkStore.getState().anchor).toBeNull()
      })

      it('clearFilter resets the anchor', async () => {
        const source = new FakeSource([
          B('a', 'https://a.com'),
          B('b', 'https://a.com'),
        ])
        await useBookmarkStore.getState().load(source)
        useBookmarkStore.getState().setFilter({ kind: 'domain', value: 'a.com' })
        useBookmarkStore.getState().toggleFocused()
        expect(useBookmarkStore.getState().anchor).not.toBeNull()

        useBookmarkStore.getState().clearFilter()

        expect(useBookmarkStore.getState().anchor).toBeNull()
      })
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

    it('writes activeSort to localStorage', async () => {
      const source = new FakeSource([B('a'), B('b')])
      await useBookmarkStore.getState().load(source)
      useBookmarkStore.getState().setSort({ kind: 'title', dir: 'desc' })

      const raw = localStorage.getItem(PERSIST_KEY)
      const parsed = JSON.parse(raw as string) as { state: { activeSort: unknown } }
      expect(parsed.state.activeSort).toEqual({ kind: 'title', dir: 'desc' })
    })

    it('rehydrates activeSort from localStorage', async () => {
      localStorage.setItem(
        PERSIST_KEY,
        JSON.stringify({
          state: {
            bookmarks: [B('a')],
            pendingDeletes: { __set: [] },
            activeFilter: null,
            activeSort: { kind: 'date', dir: 'asc' },
          },
          version: 0,
        }),
      )

      await useBookmarkStore.persist.rehydrate()

      expect(useBookmarkStore.getState().activeSort).toEqual({ kind: 'date', dir: 'asc' })
    })

    it('does not persist focusedIndex', async () => {
      const source = new FakeSource([B('a'), B('b'), B('c')])
      await useBookmarkStore.getState().load(source)
      useBookmarkStore.getState().moveFocus(2)

      const raw = localStorage.getItem(PERSIST_KEY)
      const parsed = JSON.parse(raw as string) as PersistedShape
      expect(parsed.state.focusedIndex).toBeUndefined()
    })

    it('does not persist the anchor (ephemeral UI state)', async () => {
      const source = new FakeSource([B('a'), B('b')])
      await useBookmarkStore.getState().load(source)
      useBookmarkStore.getState().toggleFocused()
      expect(useBookmarkStore.getState().anchor).not.toBeNull()

      const raw = localStorage.getItem(PERSIST_KEY)
      const parsed = JSON.parse(raw as string) as { state: Record<string, unknown> }
      expect(parsed.state.anchor).toBeUndefined()
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
