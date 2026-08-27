import { create } from 'zustand'
import { useMemo } from 'react'
import type { Bookmark } from '../core/types.ts'
import type { BookmarkSource } from '../core/ports/BookmarkSource.ts'
import { selectVisibleBookmarks, type Filter } from './selectors.ts'

export interface BookmarkStore {
  bookmarks: Bookmark[]
  pendingDeletes: Set<string>
  focusedIndex: number
  activeFilter: Filter
  load(source: BookmarkSource): Promise<void>
  mark(id: string): void
  unmark(id: string): void
  moveFocus(delta: number): void
  setFilter(f: Filter): void
  clearFilter(): void
  exportFiltered(source: BookmarkSource): Promise<void>
}

export function getInitialState(): Pick<
  BookmarkStore,
  'bookmarks' | 'pendingDeletes' | 'focusedIndex' | 'activeFilter'
> {
  return {
    bookmarks: [],
    pendingDeletes: new Set(),
    focusedIndex: 0,
    activeFilter: null,
  }
}

export const useBookmarkStore = create<BookmarkStore>()((set, get) => ({
  ...getInitialState(),

  async load(source) {
    const bookmarks = await source.load()
    set({
      bookmarks,
      pendingDeletes: new Set(),
      focusedIndex: 0,
      activeFilter: null,
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

  moveFocus(delta) {
    set(state => {
      const visible = selectVisibleBookmarks(state.bookmarks, state.activeFilter)
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
      return { activeFilter: f, focusedIndex: 0 }
    })
  },

  clearFilter() {
    set(state => {
      if (state.activeFilter === null) return state
      return { activeFilter: null, focusedIndex: 0 }
    })
  },

  async exportFiltered(source) {
    const { bookmarks, pendingDeletes } = get()
    const filtered = bookmarks.filter(b => !pendingDeletes.has(b.id))
    await source.export(filtered)
  },
}))

export function useVisibleBookmarks(): Bookmark[] {
  const bookmarks = useBookmarkStore(s => s.bookmarks)
  const activeFilter = useBookmarkStore(s => s.activeFilter)
  return useMemo(() => selectVisibleBookmarks(bookmarks, activeFilter), [bookmarks, activeFilter])
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
