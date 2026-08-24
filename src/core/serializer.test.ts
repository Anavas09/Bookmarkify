import { describe, it, expect } from 'vitest'
import { serializeNetscape } from './serializer.ts'
import { parseNetscape } from './parser.ts'
import type { Bookmark } from './types.ts'

describe('serializeNetscape', () => {
  it('emits a valid Netscape header and footer', () => {
    const html = serializeNetscape([])
    expect(html).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>')
    expect(html).toContain('<H1>Bookmarks</H1>')
    expect(html).toContain('<DL><p>')
    expect(html).toContain('</DL>')
  })

  it('serializes a minimal bookmark', () => {
    const html = serializeNetscape([
      { id: '0', title: 'Example', url: 'https://example.com' },
    ])
    expect(html).toContain('HREF="https://example.com"')
    expect(html).toContain('>Example</A>')
  })

  it('emits ADD_DATE in seconds (not ms)', () => {
    const html = serializeNetscape([
      { id: '0', title: 'X', url: 'https://x.com', addedAt: 1700000000000 },
    ])
    expect(html).toContain('ADD_DATE="1700000000"')
  })

  it('emits TAGS as a comma-separated list', () => {
    const html = serializeNetscape([
      { id: '0', title: 'X', url: 'https://x.com', tags: ['ai', 'research'] },
    ])
    expect(html).toContain('TAGS="ai,research"')
  })

  it('omits ADD_DATE and TAGS when absent', () => {
    const html = serializeNetscape([
      { id: '0', title: 'X', url: 'https://x.com' },
    ])
    expect(html).not.toContain('ADD_DATE')
    expect(html).not.toContain('TAGS')
  })

  it('escapes special characters in the title', () => {
    const html = serializeNetscape([
      { id: '0', title: 'A & B <C>', url: 'https://a.com' },
    ])
    expect(html).toContain('A &amp; B &lt;C&gt;')
  })

  it('escapes special characters in the url attribute', () => {
    const html = serializeNetscape([
      { id: '0', title: 'X', url: 'https://x.com/?a=1&b="2"' },
    ])
    expect(html).toContain('HREF="https://x.com/?a=1&amp;b=&quot;2&quot;"')
  })

  it('round-trips through parseNetscape', () => {
    const input: Bookmark[] = [
      { id: 'a', title: 'Example', url: 'https://example.com', addedAt: 1700000000000 },
      { id: 'b', title: 'Tagged', url: 'https://tagged.com', tags: ['a', 'b'] },
      { id: 'c', title: 'Plain & Simple', url: 'https://plain.com' },
    ]
    const output = parseNetscape(serializeNetscape(input))
    expect(output).toHaveLength(input.length)
    expect(output[0]).toMatchObject({ title: 'Example', url: 'https://example.com', addedAt: 1700000000000 })
    expect(output[1]).toMatchObject({ title: 'Tagged', url: 'https://tagged.com', tags: ['a', 'b'] })
    expect(output[2]).toMatchObject({ title: 'Plain & Simple', url: 'https://plain.com' })
  })
})
