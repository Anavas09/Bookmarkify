import type { LinkStatus, ProbeOutcome } from './types.ts'

// Only a 404 or a 410 says the page is gone. A 403, a 429 or a 5xx is often a
// site that refuses robots or is down for a while, and marking those would
// have the user delete bookmarks that work. A network failure may be the
// connection, so it is reported apart for the caller to try again.
export function classify(outcome: ProbeOutcome): LinkStatus | 'network' {
  switch (outcome.kind) {
    case 'network':
      return 'network'
    case 'timeout':
      return 'unknown'
    case 'http':
      if (outcome.status === 404 || outcome.status === 410) return 'broken'
      return outcome.status >= 200 && outcome.status < 400 ? 'ok' : 'unknown'
  }
}
