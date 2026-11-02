import type { Bookmark } from '../types.ts'
import { normalizeUrl } from '../normalizeUrl.ts'
import type { LinkChecks } from './types.ts'

export const RESCAN_AFTER_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

// What a scan checks: links never checked, the ones found broken and the ones
// checked too long ago. What the user dismissed is left alone.
export function selectScanTargets(bookmarks: Bookmark[], checks: LinkChecks, now: number): string[] {
  const targets = new Set<string>()
  for (const b of bookmarks) {
    const url = normalizeUrl(b.url)
    if (url === null) continue
    const check = checks[url]
    if (check === undefined) targets.add(url)
    else if (!check.dismissed && (check.status === 'broken' || now - check.checkedAt > RESCAN_AFTER_DAYS * DAY_MS)) {
      targets.add(url)
    }
  }
  return [...targets]
}
