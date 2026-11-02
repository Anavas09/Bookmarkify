export type LinkStatus = 'ok' | 'broken' | 'unknown'

export interface LinkCheck {
  status: LinkStatus
  checkedAt: number // ms unix
  // The user said it is not broken: it is not marked again nor checked again.
  dismissed?: boolean
}

// By normalized URL (see normalizeUrl), so two bookmarks of one page share a result.
export type LinkChecks = Record<string, LinkCheck>

// What one request came to: a response, a failure to connect, or no answer in time.
export type ProbeOutcome =
  | { kind: 'http'; status: number }
  | { kind: 'network' }
  | { kind: 'timeout' }
