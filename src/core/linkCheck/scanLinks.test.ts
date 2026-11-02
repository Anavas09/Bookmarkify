import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LinkChecker } from '../ports/LinkChecker.ts'
import type { ProbeOutcome } from './types.ts'
import { OFFLINE_STREAK, scanLinks } from './scanLinks.ts'

const NOW = 1_700_000_000_000
const ok: ProbeOutcome = { kind: 'http', status: 200 }
const net: ProbeOutcome = { kind: 'network' }

// Answers per URL: one outcome for every attempt, or a list, one per attempt.
function fakeChecker(answers: (url: string) => ProbeOutcome | ProbeOutcome[]) {
  const calls: string[] = []
  const attempts = new Map<string, number>()
  let inFlight = 0
  let peak = 0
  const checker: LinkChecker = {
    allow: () => Promise.resolve(true),
    async probe(url) {
      calls.push(url)
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise(r => setTimeout(r, 1))
      inFlight--
      const n = attempts.get(url) ?? 0
      attempts.set(url, n + 1)
      const a = answers(url)
      return Array.isArray(a) ? a[Math.min(n, a.length - 1)] : a
    },
  }
  return { checker, calls, peak: () => peak }
}

const run = (urls: string[], checker: LinkChecker, extra: Partial<Parameters<typeof scanLinks>[2]> = {}) =>
  scanLinks(urls, checker, {
    signal: new AbortController().signal,
    onProgress: () => {},
    now: () => NOW,
    ...extra,
  })

afterEach(() => vi.restoreAllMocks())

describe('scanLinks', () => {
  it('classifies each answer and stamps it with the time', async () => {
    const { checker } = fakeChecker(url =>
      url.includes('gone') ? { kind: 'http', status: 404 } : url.includes('boom') ? { kind: 'http', status: 500 } : ok)
    const out = await run(['https://a.com/', 'https://a.com/gone', 'https://a.com/boom'], checker)
    expect(out.reason).toBe('done')
    expect(out.checks['https://a.com/']).toEqual({ status: 'ok', checkedAt: NOW })
    expect(out.checks['https://a.com/gone'].status).toBe('broken')
    expect(out.checks['https://a.com/boom'].status).toBe('unknown')
  })

  it('tries again after a network failure', async () => {
    const { checker, calls } = fakeChecker(() => [net, ok])
    const out = await run(['https://a.com/'], checker)
    expect(out.checks['https://a.com/'].status).toBe('ok')
    expect(calls).toHaveLength(2)
  })

  it('calls a domain broken only after it fails twice', async () => {
    const { checker } = fakeChecker(() => net)
    const out = await run(['https://dead.example/'], checker)
    expect(out.checks['https://dead.example/'].status).toBe('broken')
  })

  it('reports progress up to the total', async () => {
    const { checker } = fakeChecker(() => ok)
    const seen: Array<[number, number]> = []
    await run(['https://a.com/1', 'https://a.com/2', 'https://a.com/3'], checker, {
      onProgress: (done, total) => seen.push([done, total]),
    })
    expect(seen.at(-1)).toEqual([3, 3])
  })

  it('keeps what it checked when cancelled, without the request it cut short', async () => {
    const urls = ['https://a.com/1', 'https://a.com/2', 'https://a.com/3', 'https://a.com/4']
    const controller = new AbortController()
    const { checker } = fakeChecker(url => {
      if (url.endsWith('/3')) controller.abort()
      return ok
    })
    const out = await run(urls, checker, { signal: controller.signal, concurrency: 1 })
    expect(out.reason).toBe('cancelled')
    expect(Object.keys(out.checks)).toEqual(['https://a.com/1', 'https://a.com/2'])
  })

  it('does not even start without a connection', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { checker, calls } = fakeChecker(() => ok)
    const out = await run(['https://a.com/'], checker)
    expect(out).toEqual({ reason: 'offline', checks: {} })
    expect(calls).toHaveLength(0)
  })

  it('stops as offline when many different domains fail in a row, and marks none of them', async () => {
    const dead = Array.from({ length: OFFLINE_STREAK + 5 }, (_, i) => `https://dead${i}.example/`)
    const { checker } = fakeChecker(url => (url.includes('dead') ? net : ok))
    const out = await run(['https://fine.com/', ...dead], checker, { concurrency: 1 })
    expect(out.reason).toBe('offline')
    expect(out.checks['https://fine.com/'].status).toBe('ok')
    expect(Object.values(out.checks).some(c => c.status === 'broken')).toBe(false)
  })

  it('does not count a streak that an answer interrupts', async () => {
    const dead = (from: number) =>
      Array.from({ length: OFFLINE_STREAK - 1 }, (_, i) => `https://dead${from + i}.example/`)
    const urls = [...dead(0), 'https://fine.com/', ...dead(100)]
    const { checker } = fakeChecker(url => (url.includes('dead') ? net : ok))
    const out = await run(urls, checker, { concurrency: 1 })
    expect(out.reason).toBe('done')
    expect(Object.values(out.checks).filter(c => c.status === 'broken')).toHaveLength((OFFLINE_STREAK - 1) * 2)
  })

  it('never has more requests in flight than the concurrency', async () => {
    const urls = Array.from({ length: 30 }, (_, i) => `https://a${i}.com/`)
    const { checker, peak } = fakeChecker(() => ok)
    await run(urls, checker, { concurrency: 3 })
    expect(peak()).toBeLessThanOrEqual(3)
    expect(peak()).toBeGreaterThan(1)
  })
})
