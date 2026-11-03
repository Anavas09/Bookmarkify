import type { LinkChecker } from '../ports/LinkChecker.ts'
import { classify } from './classify.ts'
import type { ScanTarget } from './targets.ts'
import type { LinkCheck, LinkChecks } from './types.ts'

// This many different domains failing to connect in a row means the problem is
// the connection and not the domains.
export const OFFLINE_STREAK = 20

// A small scan can't reach the streak. With no answer at all from this many
// different domains it is just as likely to be the connection (wifi without
// internet, a VPN down) as the domains.
export const NO_ANSWER_HOSTS = 2

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
  targets: ScanTarget[],
  checker: LinkChecker,
  { signal, onProgress, now = Date.now, concurrency = DEFAULT_CONCURRENCY }: ScanOptions,
): Promise<ScanOutcome> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { reason: 'offline', checks: {} }
  }

  const checks: LinkChecks = {}
  // Failed twice to connect. They are only called broken once the scan ends
  // without turning out to be a connection problem.
  const unreachable: string[] = [] // keys
  const failedHosts = new Set<string>()
  const unansweredHosts = new Set<string>()
  let answered = 0
  let offline = false
  let next = 0
  let done = 0

  async function worker() {
    while (!signal.aborted && !offline && next < targets.length) {
      const { key, url } = targets[next++]
      let status = classify(await checker.probe(url, signal))
      if (status === 'network' && !signal.aborted) status = classify(await checker.probe(url, signal))
      // A request cut short by cancelling says nothing about the link.
      if (signal.aborted) return
      if (status === 'network') {
        unreachable.push(key)
        failedHosts.add(hostOf(url))
        unansweredHosts.add(hostOf(url))
        if (failedHosts.size >= OFFLINE_STREAK) offline = true
      } else {
        failedHosts.clear()
        answered++
        checks[key] = { status, checkedAt: now() }
      }
      onProgress(++done, targets.length)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker))

  if (offline || (answered === 0 && unansweredHosts.size >= NO_ANSWER_HOSTS)) {
    return { reason: 'offline', checks }
  }
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
