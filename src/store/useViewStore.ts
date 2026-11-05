import { create } from 'zustand'

export type View = 'grid' | 'list'

// A plain string, like `bookmarkify:theme`: the view is a preference, not
// triage, so it stays out of `bookmarkify:v2`.
export const VIEW_STORAGE_KEY = 'bookmarkify:view'

// Anything that is not exactly 'list' is the grid, so a stale or corrupt
// value can never leave the app without a view.
export function readStoredView(): View {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

interface ViewStore {
  view: View
  setView(view: View): void
}

export const useViewStore = create<ViewStore>()(set => ({
  view: readStoredView(),

  setView(view) {
    set({ view })
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, view)
    } catch {
      // Full or blocked storage: the choice just isn't kept.
    }
  },
}))
