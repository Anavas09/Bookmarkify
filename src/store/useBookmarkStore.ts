import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useMemo } from 'react'
import type { Bookmark } from '../core/types.ts'
import type { BookmarkSource } from '../core/ports/BookmarkSource.ts'
import { selectVisibleSortedBookmarks, type Filter, type Sort } from './selectors.ts'

export const PERSIST_KEY = 'bookmarkify:v1'

export interface MarkAnchor {
  index: number
  action: 'mark' | 'unmark'
}

export interface BookmarkStore {
  bookmarks: Bookmark[]
  pendingDeletes: Set<string>
  focusedIndex: number
  activeFilter: Filter
  activeSort: Sort
  anchor: MarkAnchor | null
  load(source: BookmarkSource): Promise<void>
  mark(id: string): void
  unmark(id: string): void
  toggleFocused(): void
  extendMarkFromAnchor(): void
  markAllVisible(): void
  unmarkAllVisible(): void
  moveFocus(delta: number): void
  setFilter(f: Filter): void
  clearFilter(): void
  setSort(s: Sort): void
  clearSort(): void
  exportFiltered(source: BookmarkSource): Promise<void>
}

export function getInitialState(): Pick<
  BookmarkStore,
  'bookmarks' | 'pendingDeletes' | 'focusedIndex' | 'activeFilter' | 'activeSort' | 'anchor'
> {
  return {
    bookmarks: [],
    pendingDeletes: new Set(),
    focusedIndex: 0,
    activeFilter: null,
    activeSort: null,
    anchor: null,
  }
}

export const useBookmarkStore = create<BookmarkStore>()(
  persist(
    (set, get) => ({
      ...getInitialState(),

      async load(source) {
        const bookmarks = await source.load()
        set({
          bookmarks,
          pendingDeletes: new Set(),
          focusedIndex: 0,
          activeFilter: null,
          activeSort: null,
          anchor: null,
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

      toggleFocused() {
        set(state => {
          const visible = selectVisibleSortedBookmarks(state.bookmarks, state.activeFilter, state.activeSort)
          const b = visible[state.focusedIndex]
          if (!b) return state
          const isMarked = state.pendingDeletes.has(b.id)
          const next = new Set(state.pendingDeletes)
          if (isMarked) next.delete(b.id)
          else next.add(b.id)
          return {
            pendingDeletes: next,
            anchor: { index: state.focusedIndex, action: isMarked ? 'unmark' : 'mark' },
          }
        })
      },

      extendMarkFromAnchor() {
        set(state => {
          const visible = selectVisibleSortedBookmarks(state.bookmarks, state.activeFilter, state.activeSort)
          if (visible.length === 0) return state
          if (state.anchor === null) {
            const b = visible[state.focusedIndex]
            if (!b) return state
            const isMarked = state.pendingDeletes.has(b.id)
            const next = new Set(state.pendingDeletes)
            if (isMarked) next.delete(b.id)
            else next.add(b.id)
            return {
              pendingDeletes: next,
              anchor: { index: state.focusedIndex, action: isMarked ? 'unmark' : 'mark' },
            }
          }
          const from = Math.min(state.anchor.index, state.focusedIndex)
          const to = Math.max(state.anchor.index, state.focusedIndex)
          const next = new Set(state.pendingDeletes)
          let changed = false
          for (let i = from; i <= to; i++) {
            const b = visible[i]
            if (!b) continue
            if (state.anchor.action === 'mark') {
              if (!next.has(b.id)) {
                next.add(b.id)
                changed = true
              }
            } else if (next.has(b.id)) {
              next.delete(b.id)
              changed = true
            }
          }
          if (!changed) return state
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

      moveFocus(delta) {
        set(state => {
          const visible = selectVisibleSortedBookmarks(state.bookmarks, state.activeFilter, state.activeSort)
          if (visible.length === 0) return state
          const max = visible.length - 1
          const next = Math.max(0, Math.min(max, state.focusedIndex + delta))
          if (next === state.focusedIndex) return state
          return { focusedIndex: next }
        })
      },

      setFilter(f) {
        set(state => {
          if (filtersEqual(state.activeFilter, f)) return state
          return { activeFilter: f, focusedIndex: 0, anchor: null }
        })
      },

      clearFilter() {
        set(state => {
          if (state.activeFilter === null) return state
          return { activeFilter: null, focusedIndex: 0, anchor: null }
        })
      },

      setSort(s) {
        set(state => {
          if (sortsEqual(state.activeSort, s)) return state
          return { activeSort: s, focusedIndex: 0, anchor: null }
        })
      },

      clearSort() {
        set(state => {
          if (state.activeSort === null) return state
          return { activeSort: null, focusedIndex: 0, anchor: null }
        })
      },

      async exportFiltered(source) {
        const { bookmarks, pendingDeletes } = get()
        const filtered = bookmarks.filter(b => !pendingDeletes.has(b.id))
        await source.export(filtered)
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
  return a.kind === 'duplicate' && b.kind === 'duplicate'
}

function sortsEqual(a: Sort, b: Sort): boolean {
  if (a === null || b === null) return a === b
  if (a.kind !== b.kind) return false
  if (a.kind === 'title' && b.kind === 'title') return a.dir === b.dir
  if (a.kind === 'date' && b.kind === 'date') return a.dir === b.dir
  return a.kind === 'domain' && b.kind === 'domain'
}
