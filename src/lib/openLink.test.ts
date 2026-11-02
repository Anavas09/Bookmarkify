import { afterEach, describe, expect, it, vi } from 'vitest'
import { isWebUrl, openLink } from './openLink.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('isWebUrl', () => {
  it('is true for http and https, whatever the case', () => {
    expect(isWebUrl('https://example.com')).toBe(true)
    expect(isWebUrl('http://example.com')).toBe(true)
    expect(isWebUrl('HTTPS://example.com')).toBe(true)
  })

  it('is false for what a plain link cannot open from an extension', () => {
    expect(isWebUrl('chrome://flags')).toBe(false)
    expect(isWebUrl('file:///C:/notes.txt')).toBe(false)
    expect(isWebUrl('chrome-extension://abc/page.html')).toBe(false)
  })
})

describe('openLink', () => {
  it('opens a tab with chrome.tabs.create inside the extension', () => {
    const create = vi.fn().mockResolvedValue({})
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    vi.stubGlobal('chrome', { tabs: { create } })

    openLink('chrome://flags')

    expect(create).toHaveBeenCalledWith({ url: 'chrome://flags' })
    expect(open).not.toHaveBeenCalled()
  })

  it('handles the rejection when Chrome refuses the URL', () => {
    const refused = Promise.reject(new Error('Invalid url'))
    const handled = vi.spyOn(refused, 'catch')
    vi.stubGlobal('chrome', { tabs: { create: vi.fn().mockReturnValue(refused) } })

    openLink('chrome://nope')

    expect(handled).toHaveBeenCalled()
  })

  it('falls back to window.open without chrome.tabs (npm run dev)', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    vi.stubGlobal('chrome', undefined)

    openLink('https://example.com')

    expect(open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer')
  })
})
