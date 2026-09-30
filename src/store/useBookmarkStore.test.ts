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
    it('starts empty with nothing selected', () => {
      const s = useBookmarkStore.getState()
      expect(s.bookmarks).toEqual([])
      expect(s.pendingDeletes.size).toBe(0)
      expect(s.selected.size).toBe(0)
      expect(s.selectionAnchor).toBeNull()
    })
  })

  describe('load', () => {
    it('populates bookmarks and resets selection + pending deletes', async () => {
      useBookmarkStore.setState({
        selected: new Set(['stale']),
        selectionAnchor: 'stale',
        pendingDeletes: new Set(['stale']),
      })

      const source = new FakeSource([B('a'), B('b')])
      await useBookmarkStore.getState().load(source)

      const s = useBookmarkStore.getState()
      expect(s.bookmarks).toHaveLength(2)
      expect(s.selected.size).toBe(0)
      expect(s.selectionAnchor).toBeNull()
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

    it('setFilter stores the filter and clears the selection', async () => {
      const source = new FakeSource([
        B('a', 'https://a.com'),
        B('b', 'https://b.com'),
        B('c', 'https://c.com'),
      ])
      await useBookmarkStore.getState().load(source)
      useBookmarkStore.getState().setSelection(['b', 'c'], 'b')

      useBookmarkStore.getState().setFilter({ kind: 'domain', value: 'a.com' })

      const s = useBookmarkStore.getState()
      expect(s.activeFilter).toEqual({ kind: 'domain', value: 'a.com' })
      expect(s.selected.size).toBe(0)
      expect(s.selectionAnchor).toBeNull()
    })

    it('setFilter is a no-op if the filter is equal', () => {
      const store = useBookmarkStore.getState()
      store.setFilter({ kind: 'domain', value: 'x.com' })
      const before = useBookmarkStore.getState()
      store.setFilter({ kind: 'domain', value: 'x.com' })
      const after = useBookmarkStore.getState()
      expect(after.activeFilter).toBe(before.activeFilter)
    })

    it('clearFilter goes back to null and clears the selection', async () => {
      const source = new FakeSource([B('a'), B('b'), B('c')])
      await useBookmarkStore.getState().load(source)
      useBookmarkStore.getState().setFilter({ kind: 'duplicate' })
      useBookmarkStore.getState().setSelection(['a'], 'a')

      useBookmarkStore.getState().clearFilter()

      expect(useBookmarkStore.getState().activeFilter).toBeNull()
      expect(useBookmarkStore.getState().selected.size).toBe(0)
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

    it('setSort stores the sort and keeps the selection (same items stay visible)', async () => {
      const source = new FakeSource([B('a'), B('b'), B('c')])
      await useBookmarkStore.getState().load(source)
      useBookmarkStore.getState().setSelection(['b'], 'b')

      useBookmarkStore.getState().setSort({ kind: 'title', dir: 'desc' })

      const s = useBookmarkStore.getState()
      expect(s.activeSort).toEqual({ kind: 'title', dir: 'desc' })
      expect([...s.selected]).toEqual(['b'])
    })

    it('setSort is a no-op if the sort is equal', () => {
      const store = useBookmarkStore.getState()
      store.setSort({ kind: 'date', dir: 'asc' })
      const before = useBookmarkStore.getState()
      store.setSort({ kind: 'date', dir: 'asc' })
      const after = useBookmarkStore.getState()
      expect(after.activeSort).toBe(before.activeSort)
    })

    it('clearSort goes back to null', async () => {
      const source = new FakeSource([B('a'), B('b')])
      await useBookmarkStore.getState().load(source)
      useBookmarkStore.getState().setSort({ kind: 'title', dir: 'asc' })

      useBookmarkStore.getState().clearSort()

      expect(useBookmarkStore.getState().activeSort).toBeNull()
    })

    it('load resets activeSort to null', async () => {
      useBookmarkStore.getState().setSort({ kind: 'date', dir: 'desc' })
      await useBookmarkStore.getState().load(new FakeSource([B('a')]))
      expect(useBookmarkStore.getState().activeSort).toBeNull()
    })

    it('selectRangeTo follows the sorted order', async () => {
      const source = new FakeSource([
        { id: '1', title: 'Charlie', url: 'https://c.com' },
        { id: '2', title: 'alpha',   url: 'https://a.com' },
        { id: '3', title: 'Bravo',   url: 'https://b.com' },
      ])
      await useBookmarkStore.getState().load(source)
      useBookmarkStore.getState().setSort({ kind: 'title', dir: 'asc' })

      // sorted: alpha(2), Bravo(3), Charlie(1)
      useBookmarkStore.getState().setSelection(['2'], '2')
      useBookmarkStore.getState().selectRangeTo('3')

      expect([...useBookmarkStore.getState().selected].sort()).toEqual(['2', '3'])
    })
  })

  describe('bulk selection', () => {
    describe('setSelection', () => {
      it('replaces the selection and sets the anchor when given', () => {
        useBookmarkStore.getState().setSelection(['a', 'b'], 'b')
        const s = useBookmarkStore.getState()
        expect([...s.selected].sort()).toEqual(['a', 'b'])
        expect(s.selectionAnchor).toBe('b')
      })

      it('keeps the current anchor when none is given (drag selection)', () => {
        useBookmarkStore.getState().setSelection(['a'], 'a')
        useBookmarkStore.getState().setSelection(['a', 'b', 'c'])
        expect(useBookmarkStore.getState().selectionAnchor).toBe('a')
      })

      it('does not touch pendingDeletes', () => {
        const before = useBookmarkStore.getState().pendingDeletes
        useBookmarkStore.getState().setSelection(['a'], 'a')
        expect(useBookmarkStore.getState().pendingDeletes).toBe(before)
      })
    })

    describe('selectRangeTo', () => {
      beforeEach(async () => {
        await useBookmarkStore.getState().load(
          new FakeSource([B('a'), B('b'), B('c'), B('d'), B('e')]),
        )
      })

      it('selects the inclusive range from the anchor forwards', () => {
        useBookmarkStore.getState().setSelection(['b'], 'b')
        useBookmarkStore.getState().selectRangeTo('d')
        expect([...useBookmarkStore.getState().selected]).toEqual(['b', 'c', 'd'])
      })

      it('selects the inclusive range from the anchor backwards', () => {
        useBookmarkStore.getState().setSelection(['d'], 'd')
        useBookmarkStore.getState().selectRangeTo('a')
        expect([...useBookmarkStore.getState().selected]).toEqual(['a', 'b', 'c', 'd'])
      })

      it('keeps the anchor so the range can be re-extended (Explorer behaviour)', () => {
        useBookmarkStore.getState().setSelection(['c'], 'c')
        useBookmarkStore.getState().selectRangeTo('e')
        useBookmarkStore.getState().selectRangeTo('a')
        const s = useBookmarkStore.getState()
        expect([...s.selected]).toEqual(['a', 'b', 'c'])
        expect(s.selectionAnchor).toBe('c')
      })

      it('without an anchor selects just the target and anchors on it', () => {
        useBookmarkStore.getState().selectRangeTo('c')
        const s = useBookmarkStore.getState()
        expect([...s.selected]).toEqual(['c'])
        expect(s.selectionAnchor).toBe('c')
      })

      it('only covers visible bookmarks when a filter is active', async () => {
        await useBookmarkStore.getState().load(
          new FakeSource([
            B('a', 'https://a.com'),
            B('b', 'https://b.com'),
            B('c', 'https://a.com'),
          ]),
        )
        useBookmarkStore.getState().setFilter({ kind: 'domain', value: 'a.com' })
        useBookmarkStore.getState().setSelection(['a'], 'a')
        useBookmarkStore.getState().selectRangeTo('c')
        expect([...useBookmarkStore.getState().selected]).toEqual(['a', 'c'])
      })
    })

    describe('selectAllVisible / clearSelection', () => {
      it('selectAllVisible selects only what the filter shows', async () => {
        await useBookmarkStore.getState().load(
          new FakeSource([
            B('a', 'https://a.com'),
            B('b', 'https://b.com'),
            B('c', 'https://a.com'),
          ]),
        )
        useBookmarkStore.getState().setFilter({ kind: 'domain', value: 'a.com' })
        useBookmarkStore.getState().selectAllVisible()
        expect([...useBookmarkStore.getState().selected].sort()).toEqual(['a', 'c'])
      })

      it('clearSelection empties the selection and the anchor', () => {
        useBookmarkStore.getState().setSelection(['a'], 'a')
        useBookmarkStore.getState().clearSelection()
        const s = useBookmarkStore.getState()
        expect(s.selected.size).toBe(0)
        expect(s.selectionAnchor).toBeNull()
      })

      it('clearSelection is a no-op when nothing is selected', () => {
        const before = useBookmarkStore.getState()
        useBookmarkStore.getState().clearSelection()
        expect(useBookmarkStore.getState()).toBe(before)
      })
    })

    describe('deleteSelected / restoreSelected', () => {
      it('deleteSelected marks the selection and clears it', () => {
        useBookmarkStore.getState().setSelection(['a', 'b'], 'a')
        useBookmarkStore.getState().deleteSelected()
        const s = useBookmarkStore.getState()
        expect([...s.pendingDeletes].sort()).toEqual(['a', 'b'])
        expect(s.selected.size).toBe(0)
        expect(s.selectionAnchor).toBeNull()
      })

      it('deleteSelected keeps previous marks', () => {
        useBookmarkStore.getState().mark('z')
        useBookmarkStore.getState().setSelection(['a'])
        useBookmarkStore.getState().deleteSelected()
        expect([...useBookmarkStore.getState().pendingDeletes].sort()).toEqual(['a', 'z'])
      })

      it('deleteSelected is a no-op with an empty selection', () => {
        const before = useBookmarkStore.getState().pendingDeletes
        useBookmarkStore.getState().deleteSelected()
        expect(useBookmarkStore.getState().pendingDeletes).toBe(before)
      })

      it('restoreSelected unmarks only the selected ids and clears the selection', () => {
        useBookmarkStore.getState().mark('a')
        useBookmarkStore.getState().mark('b')
        useBookmarkStore.getState().setSelection(['a', 'c'])
        useBookmarkStore.getState().restoreSelected()
        const s = useBookmarkStore.getState()
        expect([...s.pendingDeletes]).toEqual(['b'])
        expect(s.selected.size).toBe(0)
      })
    })

    describe('deleted bookmarks', () => {
      beforeEach(async () => {
        await useBookmarkStore.getState().load(
          new FakeSource([B('a'), B('b'), B('c'), B('d')]),
        )
        useBookmarkStore.getState().mark('b')
      })

      it('selectAllVisible leaves out the deleted ones', () => {
        useBookmarkStore.getState().selectAllVisible()
        expect([...useBookmarkStore.getState().selected]).toEqual(['a', 'c', 'd'])
      })

      it('selectRangeTo skips the deleted ones', () => {
        useBookmarkStore.getState().setSelection(['a'], 'a')
        useBookmarkStore.getState().selectRangeTo('c')
        expect([...useBookmarkStore.getState().selected]).toEqual(['a', 'c'])
      })

      it('the deleted filter selects only the deleted ones', () => {
        useBookmarkStore.getState().setFilter({ kind: 'deleted' })
        useBookmarkStore.getState().selectAllVisible()
        expect([...useBookmarkStore.getState().selected]).toEqual(['b'])
      })

      it('setFilter treats two deleted filters as equal', () => {
        useBookmarkStore.getState().setFilter({ kind: 'deleted' })
        const before = useBookmarkStore.getState().activeFilter
        useBookmarkStore.getState().setFilter({ kind: 'deleted' })
        expect(useBookmarkStore.getState().activeFilter).toBe(before)
      })

      it('deleteSelected is a no-op when everything selected is already deleted', () => {
        useBookmarkStore.getState().setSelection(['b'], 'b')
        const before = useBookmarkStore.getState()
        useBookmarkStore.getState().deleteSelected()
        expect(useBookmarkStore.getState()).toBe(before)
      })
    })

    it('load clears the selection', async () => {
      await useBookmarkStore.getState().load(new FakeSource([B('a')]))
      useBookmarkStore.getState().setSelection(['a'], 'a')

      await useBookmarkStore.getState().load(new FakeSource([B('x')]))

      expect(useBookmarkStore.getState().selected.size).toBe(0)
      expect(useBookmarkStore.getState().selectionAnchor).toBeNull()
    })
  })

  describe('persistence', () => {
    interface PersistedShape {
      state: {
        bookmarks: Array<{ id: string }>
        pendingDeletes: { __set: string[] }
        activeFilter: unknown
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

    it('does not persist the selection (ephemeral UI state)', async () => {
      await useBookmarkStore.getState().load(new FakeSource([B('a'), B('b')]))
      useBookmarkStore.getState().setSelection(['a'], 'a')
      useBookmarkStore.getState().mark('b')

      const raw = localStorage.getItem(PERSIST_KEY)
      const parsed = JSON.parse(raw as string) as { state: Record<string, unknown> }
      expect(parsed.state.selected).toBeUndefined()
      expect(parsed.state.selectionAnchor).toBeUndefined()
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
