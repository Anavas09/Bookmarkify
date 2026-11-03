import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLinkChecker } from './createLinkChecker.ts'

const signal = new AbortController().signal

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('createLinkChecker', () => {
  it('inside the extension, asks Chrome for the permission', async () => {
    const request = vi.fn(() => Promise.resolve(true))
    vi.stubGlobal('chrome', { permissions: { request } })
    expect(await createLinkChecker().allow()).toBe(true)
    expect(request).toHaveBeenCalledWith({ origins: ['<all_urls>'] })
  })

  it('under npm run dev, uses a fake that answers by the look of the URL', async () => {
    const checker = createLinkChecker()
    expect(await checker.allow()).toBe(true)
    expect(await checker.probe('https://x.com/broken', signal)).toEqual({ kind: 'http', status: 404 })
    expect(await checker.probe('https://dead.example/', signal)).toEqual({ kind: 'network' })
    expect(await checker.probe('https://x.com/forbidden', signal)).toEqual({ kind: 'http', status: 403 })
    expect(await checker.probe('https://x.com/fine', signal)).toEqual({ kind: 'http', status: 200 })
  })

  it('outside the extension and outside dev, does not get the permission', async () => {
    vi.stubEnv('DEV', false)
    expect(await createLinkChecker().allow()).toBe(false)
  })
})
