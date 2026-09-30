import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useMemo } from 'react'
import type { Bookmark, DocumentMeta } from '../core/types.ts'
import type { BookmarkSource } from '../core/ports/BookmarkSource.ts'
import { selectVisibleSortedBookmarks, type Filter, type Sort } from './selectors.ts'

export const PERSIST_KEY = 'bookmarkify:v1'

export interface BookmarkStore {
  bookmarks: Bookmark[]
  meta: DocumentMeta
  pendingDeletes: Set<string>
  selected: Set<string>
  selectionAnchor: string | null
  activeFilter: Filter
  activeSort: Sort
  load(source: BookmarkSource): Promise<void>
  mark(id: string): void
  unmark(id: string): void
  markAllVisible(): void
  unmarkAllVisible(): void
  setSelection(ids: Iterable<string>, anchor?: string | null): void
  selectRangeTo(id: string): void
  selectAllVisible(): void
  clearSelection(): void
  deleteSelected(): void
  restoreSelected(): void
  setFilter(f: Filter): void
  clearFilter(): void
  setSort(s: Sort): void
  clearSort(): void
  exportFiltered(source: BookmarkSource): Promise<void>
}

export function getInitialState(): Pick<
  BookmarkStore,
  'bookmarks' | 'meta' | 'pendingDeletes' | 'selected' | 'selectionAnchor' | 'activeFilter' | 'activeSort'
> {
  return {
    bookmarks: [],
    meta: {},
    pendingDeletes: new Set(),
    selected: new Set(),
    selectionAnchor: null,
    activeFilter: null,
    activeSort: null,
  }
}

export const useBookmarkStore = create<BookmarkStore>()(
  persist(
    (set, get) => ({
      ...getInitialState(),

      async load(source) {
        const doc = await source.load()
        set({
          bookmarks: doc.bookmarks,
          meta: doc.meta,
          pendingDeletes: new Set(),
          selected: new Set(),
          selectionAnchor: null,
          activeFilter: null,
          activeSort: null,
        })
      },

      mark(id) {
        set(state => {
          if (state.pendingDeletes.has(id)) return state
          const next = new Set(state.pendingDeletes)
          next.add(id)
          return { pendingDeletes: next }
        })
      },

      unmark(id) {
        set(state => {
          if (!state.pendingDeletes.has(id)) return state
          const next = new Set(state.pendingDeletes)
          next.delete(id)
          return { pendingDeletes: next }
        })
      },

      markAllVisible() {
        set(state => {
          const visible = selectVisibleSortedBookmarks(state.bookmarks, state.activeFilter, state.activeSort)
          if (visible.length === 0) return state
          const next = new Set(state.pendingDeletes)
          let changed = false
          for (const b of visible) {
            if (!next.has(b.id)) {
              next.add(b.id)
              changed = true
            }
          }
          if (!changed) return state
          return { pendingDeletes: next }
        })
      },

      unmarkAllVisible() {
        set(state => {
          const visible = selectVisibleSortedBookmarks(state.bookmarks, state.activeFilter, state.activeSort)
          if (visible.length === 0) return state
          const next = new Set(state.pendingDeletes)
          let changed = false
          for (const b of visible) {
            if (next.has(b.id)) {
              next.delete(b.id)
              changed = true
            }
          }
          if (!changed) return state
          return { pendingDeletes: next }
        })
      },

      setSelection(ids, anchor) {
        set(state => ({
          selected: new Set(ids),
          selectionAnchor: anchor === undefined ? state.selectionAnchor : anchor,
        }))
      },

      selectRangeTo(id) {
        set(state => {
          const visible = selectVisibleSortedBookmarks(state.bookmarks, state.activeFilter, state.activeSort)
          const to = visible.findIndex(b => b.id === id)
          if (to === -1) return state
          const found = state.selectionAnchor === null
            ? -1
            : visible.findIndex(b => b.id === state.selectionAnchor)
          if (found === -1) return { selected: new Set([id]), selectionAnchor: id }
          const from = Math.min(found, to)
          const end = Math.max(found, to)
          return { selected: new Set(visible.slice(from, end + 1).map(b => b.id)) }
        })
      },

      selectAllVisible() {
        set(state => {
          const visible = selectVisibleSortedBookmarks(state.bookmarks, state.activeFilter, state.activeSort)
          return { selected: new Set(visible.map(b => b.id)) }
        })
      },

      clearSelection() {
        set(state => {
          if (state.selected.size === 0 && state.selectionAnchor === null) return state
          return { selected: new Set(), selectionAnchor: null }
        })
      },

      deleteSelected() {
        set(state => {
          if (state.selected.size === 0) return state
          const next = new Set(state.pendingDeletes)
          for (const id of state.selected) next.add(id)
          return { pendingDeletes: next, selected: new Set(), selectionAnchor: null }
        })
      },

      restoreSelected() {
        set(state => {
          if (state.selected.size === 0) return state
          const next = new Set(state.pendingDeletes)
          for (const id of state.selected) next.delete(id)
          return { pendingDeletes: next, selected: new Set(), selectionAnchor: null }
        })
      },

      setFilter(f) {
        set(state => {
          if (filtersEqual(state.activeFilter, f)) return state
          return { activeFilter: f, selected: new Set(), selectionAnchor: null }
        })
      },

      clearFilter() {
        set(state => {
          if (state.activeFilter === null) return state
          return { activeFilter: null, selected: new Set(), selectionAnchor: null }
        })
      },

      setSort(s) {
        set(state => {
          if (sortsEqual(state.activeSort, s)) return state
          return { activeSort: s }
        })
      },

      clearSort() {
        set(state => {
          if (state.activeSort === null) return state
          return { activeSort: null }
        })
      },

      async exportFiltered(source) {
        const { bookmarks, meta, pendingDeletes } = get()
        const filtered = bookmarks.filter(b => !pendingDeletes.has(b.id))
        await source.export({ bookmarks: filtered, meta })
      },
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => localStorage, {
        replacer: (_key, value) =>
          value instanceof Set ? { __set: [...value] } : value,
        reviver: (_key, value) =>
          isEncodedSet(value) ? new Set(value.__set) : value,
      }),
      partialize: state => ({
        bookmarks: state.bookmarks,
        meta: state.meta,
        pendingDeletes: state.pendingDeletes,
        activeFilter: state.activeFilter,
        activeSort: state.activeSort,
      }),
    },
  ),
)

function isEncodedSet(value: unknown): value is { __set: string[] } {
  return (
    value !== null &&
    typeof value === 'object' &&
    '__set' in value &&
    Array.isArray((value as { __set: unknown }).__set)
  )
}

export function useVisibleBookmarks(): Bookmark[] {
  const bookmarks = useBookmarkStore(s => s.bookmarks)
  const activeFilter = useBookmarkStore(s => s.activeFilter)
  const activeSort = useBookmarkStore(s => s.activeSort)
  return useMemo(
    () => selectVisibleSortedBookmarks(bookmarks, activeFilter, activeSort),
    [bookmarks, activeFilter, activeSort],
  )
}

function filtersEqual(a: Filter, b: Filter): boolean {
  if (a === null || b === null) return a === b
  if (a.kind !== b.kind) return false
  if (a.kind === 'domain' && b.kind === 'domain') return a.value === b.value
  if (a.kind === 'folder' && b.kind === 'folder') {
    if (a.path.length !== b.path.length) return false
    return a.path.every((s, i) => s === b.path[i])
  }
  if (a.kind === 'text' && b.kind === 'text') return a.query === b.query
  return a.kind === 'duplicate' && b.kind === 'duplicate'
}

function sortsEqual(a: Sort, b: Sort): boolean {
  if (a === null || b === null) return a === b
  if (a.kind !== b.kind) return false
  if (a.kind === 'title' && b.kind === 'title') return a.dir === b.dir
  if (a.kind === 'date' && b.kind === 'date') return a.dir === b.dir
  return a.kind === 'domain' && b.kind === 'domain'
}
