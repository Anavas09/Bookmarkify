import { describe, expect, it } from 'vitest'
import { classify } from './classify.ts'

describe('classify', () => {
  it.each([404, 410])('treats %i as broken', status => {
    expect(classify({ kind: 'http', status })).toBe('broken')
  })

  it.each([200, 204, 301, 399])('treats %i as ok', status => {
    expect(classify({ kind: 'http', status })).toBe('ok')
  })

  it.each([403, 429, 500, 503])('leaves %i unknown: it proves nothing about the link', status => {
    expect(classify({ kind: 'http', status })).toBe('unknown')
  })

  it('leaves a timeout unknown', () => {
    expect(classify({ kind: 'timeout' })).toBe('unknown')
  })

  it('reports a network failure apart, so the caller can try again', () => {
    expect(classify({ kind: 'network' })).toBe('network')
  })
})
