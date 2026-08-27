import { describe, it, expect } from 'vitest'
import { normalizeUrl } from './normalizeUrl.ts'

describe('normalizeUrl', () => {
  it('downcases the host', () => {
    expect(normalizeUrl('https://Example.COM/path')).toBe('https://example.com/path')
  })

  it('drops the fragment', () => {
    expect(normalizeUrl('https://example.com/path#section')).toBe('https://example.com/path')
  })

  it('drops the trailing slash from non-root paths', () => {
    expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path')
  })

  it('keeps the root slash', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/')
  })

  it('strips utm_* params', () => {
    expect(normalizeUrl('https://example.com/?utm_source=x&utm_medium=y&keep=z'))
      .toBe('https://example.com/?keep=z')
  })

  it('strips fbclid, gclid and mc_* params', () => {
    expect(normalizeUrl('https://example.com/?fbclid=1&gclid=2&mc_cid=3&keep=z'))
      .toBe('https://example.com/?keep=z')
  })

  it('sorts remaining query params so equivalent URLs collapse', () => {
    expect(normalizeUrl('https://example.com/?b=2&a=1'))
      .toBe(normalizeUrl('https://example.com/?a=1&b=2'))
  })

  it('preserves the port', () => {
    expect(normalizeUrl('https://example.com:8443/api')).toBe('https://example.com:8443/api')
  })

  it('preserves the protocol distinction between http and https', () => {
    expect(normalizeUrl('http://example.com/')).not.toBe(normalizeUrl('https://example.com/'))
  })

  it('returns null for invalid URLs', () => {
    expect(normalizeUrl('not a url')).toBeNull()
    expect(normalizeUrl('')).toBeNull()
  })

  it('returns null for non-http(s) schemes', () => {
    expect(normalizeUrl('javascript:void(0)')).toBeNull()
    expect(normalizeUrl('ftp://example.com/')).toBeNull()
    expect(normalizeUrl('mailto:foo@example.com')).toBeNull()
  })

  it('is case-insensitive for tracking param names', () => {
    expect(normalizeUrl('https://example.com/?UTM_SOURCE=x&keep=z'))
      .toBe('https://example.com/?keep=z')
  })

  it('collapses equivalent URLs with different tracking + fragment noise', () => {
    const a = normalizeUrl('https://Example.com/path/?utm_source=news#top')
    const b = normalizeUrl('https://example.com/path')
    expect(a).toBe(b)
  })
})
