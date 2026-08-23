import { describe, it, expect } from 'vitest'
import { parseNetscape } from './parser.ts'

const MINIMAL = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
  <DT><A HREF="https://example.com" ADD_DATE="1700000000">Example</A>
  <DT><A HREF="https://openai.com" ADD_DATE="1700001000" TAGS="ai,research">OpenAI</A>
</DL>`

describe('parseNetscape', () => {
  it('returns one bookmark per anchor', () => {
    const result = parseNetscape(MINIMAL)
    expect(result).toHaveLength(2)
  })

  it('extracts url and title', () => {
    const [first] = parseNetscape(MINIMAL)
    expect(first.url).toBe('https://example.com')
    expect(first.title).toBe('Example')
  })

  it('converts ADD_DATE (seconds) to ms', () => {
    const [first] = parseNetscape(MINIMAL)
    expect(first.addedAt).toBe(1700000000 * 1000)
  })

  it('parses comma-separated TAGS', () => {
    const [, second] = parseNetscape(MINIMAL)
    expect(second.tags).toEqual(['ai', 'research'])
  })

  it('assigns sequential numeric ids', () => {
    const result = parseNetscape(MINIMAL)
    expect(result.map(b => b.id)).toEqual(['0', '1'])
  })

  it('skips javascript: urls', () => {
    const html = `<DL>
      <DT><A HREF="javascript:void(0)">Bad</A>
      <DT><A HREF="https://good.com">Good</A>
    </DL>`
    const result = parseNetscape(html)
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://good.com')
  })

  it('returns empty array for empty input', () => {
    expect(parseNetscape('')).toHaveLength(0)
  })

  it('handles missing ADD_DATE gracefully', () => {
    const html = `<DT><A HREF="https://nodates.com">No dates</A>`
    const [b] = parseNetscape(html)
    expect(b.addedAt).toBeUndefined()
    expect(b.tags).toBeUndefined()
  })
})
