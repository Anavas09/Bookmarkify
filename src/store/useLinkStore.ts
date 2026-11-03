import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type { LinkChecks } from '../core/linkCheck/types.ts'

// Apart from the triage (`bookmarkify:v2`): these are results about URLs, not
// marks on bookmarks, and they outlive a deletion.
export const LINKS_PERSIST_KEY = 'bookmarkify:links:v1'

interface LinkStore {
  checks: LinkChecks
  firstScanPrompted: boolean
  // Written once, when the scan ends, so the grid doesn't repaint per result.
  applyScan(results: LinkChecks): void
  dismiss(urls: string[]): void
  markFirstScanPrompted(): void
}

// Corrupt or missing data must not stop the app: it starts without results.
const safeStorage: StateStorage = {
  getItem(name) {
    try {
      const raw = localStorage.getItem(name)
      if (raw === null) return null
      JSON.parse(raw)
      return raw
    } catch {
      return null
    }
  },
  setItem(name, value) {
    try {
      localStorage.setItem(name, value)
    } catch {
      // Full or blocked storage: the results just aren't kept.
    }
  },
  removeItem(name) {
    try {
      localStorage.removeItem(name)
    } catch {
      // Same as above.
    }
  },
}

export const useLinkStore = create<LinkStore>()(
  persist(
    set => ({
      checks: {},
      firstScanPrompted: false,

      applyScan(results) {
        set(state => {
          const next: LinkChecks = { ...state.checks }
          for (const [url, check] of Object.entries(results)) {
            // A thumbs-up survives a new scan, even if the URL is still broken.
            const dismissed = state.checks[url]?.dismissed
            next[url] = dismissed ? { ...check, dismissed } : check
          }
          return { checks: next }
        })
      },

      dismiss(urls) {
        set(state => {
          let next: LinkChecks | null = null
          for (const url of urls) {
            const check = state.checks[url]
            if (!check || check.dismissed) continue
            next ??= { ...state.checks }
            next[url] = { ...check, dismissed: true }
          }
          return next ? { checks: next } : state
        })
      },

      markFirstScanPrompted() {
        set(state => (state.firstScanPrompted ? state : { firstScanPrompted: true }))
      },
    }),
    {
      name: LINKS_PERSIST_KEY,
      storage: createJSONStorage(() => safeStorage),
      partialize: ({ checks, firstScanPrompted }) => ({ checks, firstScanPrompted }),
    },
  ),
)
