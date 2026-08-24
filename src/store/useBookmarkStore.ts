import { create } from 'zustand'
import type { Bookmark } from '../core/types.ts'
import type { BookmarkSource } from '../core/ports/BookmarkSource.ts'

export interface BookmarkStore {
  bookmarks: Bookmark[]
  pendingDeletes: Set<string>
  focusedIndex: number
  load(source: BookmarkSource): Promise<void>
  mark(id: string): void
  unmark(id: string): void
  moveFocus(delta: number): void
  exportFiltered(source: BookmarkSource): Promise<void>
}

export function getInitialState(): Pick<BookmarkStore, 'bookmarks' | 'pendingDeletes' | 'focusedIndex'> {
  return {
    bookmarks: [],
    pendingDeletes: new Set(),
    focusedIndex: 0,
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
      if (state.bookmarks.length === 0) return state
      const max = state.bookmarks.length - 1
      const next = Math.max(0, Math.min(max, state.focusedIndex + delta))
      if (next === state.focusedIndex) return state
      return { focusedIndex: next }
    })
  },

  async exportFiltered(source) {
    const { bookmarks, pendingDeletes } = get()
    const filtered = bookmarks.filter(b => !pendingDeletes.has(b.id))
    await source.export(filtered)
  },
}))
