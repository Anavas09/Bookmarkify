import type { LinkChecker } from '../ports/LinkChecker.ts'
import { ChromeLinkChecker } from './ChromeLinkChecker.ts'
import { createFakeLinkChecker } from './fakeLinkChecker.ts'

// The one place that decides how links are checked: with real requests inside
// the extension, with a fake under npm run dev, and not at all elsewhere.
export function createLinkChecker(): LinkChecker {
  if (globalThis.chrome?.permissions !== undefined) {
    return new ChromeLinkChecker(fetch.bind(globalThis), globalThis.chrome.permissions)
  }
  if (import.meta.env.DEV) return createFakeLinkChecker()
  return {
    allow: () => Promise.resolve(false),
    probe: () => Promise.resolve({ kind: 'network' }),
  }
}
