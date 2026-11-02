import { describe, expect, it, vi } from 'vitest'
import { ChromeLinkChecker } from './ChromeLinkChecker.ts'

const reply = (status: number) => ({ status, body: null }) as unknown as Response
const never = new AbortController().signal

function setup(fetchFn: typeof fetch, timeoutMs?: number) {
  const request = vi.fn(() => Promise.resolve(true))
  return { checker: new ChromeLinkChecker(fetchFn, { request }, timeoutMs), request }
}

describe('ChromeLinkChecker', () => {
  it('asks for access to every site and returns the answer', async () => {
    const { checker, request } = setup(vi.fn())
    expect(await checker.allow()).toBe(true)
    expect(request).toHaveBeenCalledWith({ origins: ['<all_urls>'] })
  })

  it('reports the status of the response', async () => {
    const { checker } = setup(vi.fn(() => Promise.resolve(reply(404))))
    expect(await checker.probe('https://a.com/', never)).toEqual({ kind: 'http', status: 404 })
  })

  it('asks without sending cookies and follows redirects', async () => {
    const fetchFn = vi.fn(() => Promise.resolve(reply(200)))
    await setup(fetchFn as unknown as typeof fetch).checker.probe('https://a.com/', never)
    expect(fetchFn).toHaveBeenCalledWith(
      'https://a.com/',
      expect.objectContaining({ method: 'HEAD', credentials: 'omit', redirect: 'follow' }),
    )
  })

  it.each([405, 501])('asks again with GET when HEAD gets a %i', async status => {
    const fetchFn = vi.fn((_url: string, init?: RequestInit) =>
      Promise.resolve(reply(init?.method === 'HEAD' ? status : 200)))
    const out = await setup(fetchFn as unknown as typeof fetch).checker.probe('https://a.com/', never)
    expect(out).toEqual({ kind: 'http', status: 200 })
    expect(fetchFn.mock.calls.map(c => c[1]?.method)).toEqual(['HEAD', 'GET'])
  })

  it('reports a failure to connect as a network failure', async () => {
    const { checker } = setup(vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    expect(await checker.probe('https://dead.example/', never)).toEqual({ kind: 'network' })
  })

  it('reports no answer in time as a timeout', async () => {
    const hang = (_url: string, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
      })
    const { checker } = setup(hang as unknown as typeof fetch, 5)
    expect(await checker.probe('https://slow.example/', never)).toEqual({ kind: 'timeout' })
  })
})
