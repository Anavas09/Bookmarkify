import type { LinkChecker } from '../ports/LinkChecker.ts'
import { classify } from './classify.ts'
import type { LinkCheck, LinkChecks } from './types.ts'

// This many different domains failing to connect in a row means the problem is
// the connection and not the domains.
export const OFFLINE_STREAK = 20

const DEFAULT_CONCURRENCY = 8

export interface ScanOptions {
  signal: AbortSignal
  onProgress(done: number, total: number): void
  now?: () => number
  concurrency?: number
}

// `offline`: no connection, so nothing that failed to connect is marked.
export interface ScanOutcome {
  reason: 'done' | 'cancelled' | 'offline'
  checks: LinkChecks
}

export async function scanLinks(
  urls: string[],
  checker: LinkChecker,
  { signal, onProgress, now = Date.now, concurrency = DEFAULT_CONCURRENCY }: ScanOptions,
): Promise<ScanOutcome> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { reason: 'offline', checks: {} }
  }

  const checks: LinkChecks = {}
  // Failed twice to connect. They are only called broken once the scan ends
  // without turning out to be a connection problem.
  const unreachable: string[] = []
  const failedHosts = new Set<string>()
  let offline = false
  let next = 0
  let done = 0

  async function worker() {
    while (!signal.aborted && !offline && next < urls.length) {
      const url = urls[next++]
      let status = classify(await checker.probe(url, signal))
      if (status === 'network' && !signal.aborted) status = classify(await checker.probe(url, signal))
      // A request cut short by cancelling says nothing about the link.
      if (signal.aborted) return
      if (status === 'network') {
        unreachable.push(url)
        failedHosts.add(hostOf(url))
        if (failedHosts.size >= OFFLINE_STREAK) offline = true
      } else {
        failedHosts.clear()
        checks[url] = { status, checkedAt: now() }
      }
      onProgress(++done, urls.length)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker))

  if (offline) return { reason: 'offline', checks }
  const checkedAt = now()
  for (const url of unreachable) checks[url] = { status: 'broken', checkedAt } satisfies LinkCheck
  return { reason: signal.aborted ? 'cancelled' : 'done', checks }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}
