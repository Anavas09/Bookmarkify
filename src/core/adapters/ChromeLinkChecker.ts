import type { LinkChecker } from '../ports/LinkChecker.ts'
import type { ProbeOutcome } from '../linkCheck/types.ts'

const DEFAULT_TIMEOUT_MS = 15_000

// Checks a link with a request from the extension page. Reading the status of
// a site that is not ours needs access to every site, which is an optional
// permission: without it Chrome only gives opaque answers, where a 404 and a
// 200 look the same.
export class ChromeLinkChecker implements LinkChecker {
  private readonly fetchFn: typeof fetch
  private readonly permissions: Pick<typeof chrome.permissions, 'request'>
  private readonly timeoutMs: number

  constructor(
    fetchFn: typeof fetch,
    permissions: Pick<typeof chrome.permissions, 'request'>,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {
    this.fetchFn = fetchFn
    this.permissions = permissions
    this.timeoutMs = timeoutMs
  }

  // No await before the request: the prompt needs the click's user gesture.
  allow(): Promise<boolean> {
    return this.permissions.request({ origins: ['<all_urls>'] })
  }

  async probe(url: string, signal: AbortSignal): Promise<ProbeOutcome> {
    const timeout = AbortSignal.timeout(this.timeoutMs)
    const both = AbortSignal.any([signal, timeout])
    try {
      let response = await this.request(url, 'HEAD', both)
      // Some servers don't take HEAD; the answer to GET is the one that counts.
      if (response.status === 405 || response.status === 501) {
        response = await this.request(url, 'GET', both)
      }
      return { kind: 'http', status: response.status }
    } catch {
      return timeout.aborted ? { kind: 'timeout' } : { kind: 'network' }
    }
  }

  private async request(url: string, method: 'HEAD' | 'GET', signal: AbortSignal): Promise<Response> {
    const response = await this.fetchFn(url, { method, credentials: 'omit', redirect: 'follow', signal })
    // Only the status matters, so don't download the page.
    void response.body?.cancel()
    return response
  }
}
