import { afterEach, describe, it, expect, vi } from 'vitest'
import { domainOf } from './domain.ts'

describe('domainOf', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the hostname without www', () => {
    expect(domainOf('https://www.example.com/a?b=1')).toBe('example.com')
    expect(domainOf('http://sub.example.com:8080/')).toBe('sub.example.com')
  })

  it('returns the text itself when the URL does not parse', () => {
    expect(domainOf('not a url')).toBe('not a url')
  })

  it('parses each URL once, however many times it is asked', () => {
    let parses = 0
    const Real = URL
    vi.stubGlobal(
      'URL',
      class extends Real {
        constructor(url: string | URL, base?: string | URL) {
          parses++
          super(url, base)
        }
      },
    )
    const url = 'https://www.once.example/page'
    for (let i = 0; i < 5; i++) expect(domainOf(url)).toBe('once.example')
    expect(parses).toBe(1)
  })

  it('also remembers the URLs that do not parse', () => {
    let parses = 0
    const Real = URL
    vi.stubGlobal(
      'URL',
      class extends Real {
        constructor(url: string | URL, base?: string | URL) {
          parses++
          super(url, base)
        }
      },
    )
    for (let i = 0; i < 5; i++) expect(domainOf('still not a url')).toBe('still not a url')
    expect(parses).toBe(1)
  })
})
