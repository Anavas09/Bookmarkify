import type { LinkChecker } from '../ports/LinkChecker.ts'

// For the tests and npm run dev, where there is no way to reach the sites.
// It answers by the look of the URL, so the sample bookmarks can show each case.
export function createFakeLinkChecker(): LinkChecker {
  return {
    allow: () => Promise.resolve(true),
    async probe(url) {
      await new Promise(resolve => setTimeout(resolve, 40))
      if (url.includes('dead.example')) return { kind: 'network' }
      if (url.includes('broken')) return { kind: 'http', status: 404 }
      if (url.includes('forbidden')) return { kind: 'http', status: 403 }
      return { kind: 'http', status: 200 }
    },
  }
}
