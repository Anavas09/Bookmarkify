import type { Bookmark } from '../types.ts'
import { normalizeUrl } from '../normalizeUrl.ts'
import type { LinkChecks } from './types.ts'

export const RESCAN_AFTER_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

// `key` is the normalized URL the result is stored under; `url` is what gets
// requested: the one of the first bookmark, as it is. The normalized form drops
// the trailing slash, the tracking parameters and the fragment, and a server
// can answer 404 to that when it answers fine to the real one.
export interface ScanTarget {
  key: string
  url: string
}

// What a scan checks: links never checked, the ones found broken and the ones
// checked too long ago. What the user dismissed is left alone.
export function selectScanTargets(bookmarks: Bookmark[], checks: LinkChecks, now: number): ScanTarget[] {
  const targets = new Map<string, ScanTarget>()
  for (const b of bookmarks) {
    const key = normalizeUrl(b.url)
    if (key === null || targets.has(key)) continue
    const check = checks[key]
    if (check === undefined) targets.set(key, { key, url: b.url })
    else if (!check.dismissed && (check.status === 'broken' || now - check.checkedAt > RESCAN_AFTER_DAYS * DAY_MS)) {
      targets.set(key, { key, url: b.url })
    }
  }
  return [...targets.values()]
}
