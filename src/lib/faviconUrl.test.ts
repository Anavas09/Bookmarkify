import { describe, it, expect } from 'vitest'
import { faviconUrl } from './faviconUrl.ts'

describe('faviconUrl', () => {
  it('returns Google favicon endpoint with hostname and default size', () => {
    expect(faviconUrl('https://example.com/some/path')).toBe(
      'https://www.google.com/s2/favicons?domain=example.com&sz=32',
    )
  })

  it('preserves www subdomain', () => {
    expect(faviconUrl('https://www.example.com/')).toBe(
      'https://www.google.com/s2/favicons?domain=www.example.com&sz=32',
    )
  })

  it('accepts custom size', () => {
    expect(faviconUrl('https://example.com', 64)).toBe(
      'https://www.google.com/s2/favicons?domain=example.com&sz=64',
    )
  })

  it('accepts http URLs', () => {
    expect(faviconUrl('http://example.com')).toBe(
      'https://www.google.com/s2/favicons?domain=example.com&sz=32',
    )
  })

  it('ignores path and query', () => {
    expect(faviconUrl('https://example.com/a/b?q=1#frag')).toBe(
      'https://www.google.com/s2/favicons?domain=example.com&sz=32',
    )
  })

  it('returns null for invalid URLs', () => {
    expect(faviconUrl('not a url')).toBeNull()
    expect(faviconUrl('')).toBeNull()
  })

  it('returns null for non-http(s) protocols', () => {
    expect(faviconUrl('file:///Users/me/notes.html')).toBeNull()
    expect(faviconUrl('javascript:alert(1)')).toBeNull()
    expect(faviconUrl('chrome://bookmarks')).toBeNull()
  })
})
