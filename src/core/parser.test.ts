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

  it('handles missing ADD_DATE and TAGS gracefully', () => {
    const html = `<DL><DT><A HREF="https://nodates.com">No dates</A></DL>`
    const [b] = parseNetscape(html)
    expect(b.addedAt).toBeUndefined()
    expect(b.tags).toBeUndefined()
  })

  describe('folder hierarchy', () => {
    it('root-level bookmarks have no folderPath', () => {
      const [first] = parseNetscape(MINIMAL)
      expect(first.folderPath).toBeUndefined()
    })

    it('bookmarks inside a folder get folderPath: [folder name]', () => {
      const html = `<DL>
        <DT><H3>Personal</H3>
        <DL>
          <DT><A HREF="https://a.com">A</A>
        </DL>
      </DL>`
      const [b] = parseNetscape(html)
      expect(b.folderPath).toEqual(['Personal'])
    })

    it('nested folders build up folderPath deeply', () => {
      const html = `<DL>
        <DT><H3>Work</H3>
        <DL>
          <DT><H3>Frontend</H3>
          <DL>
            <DT><A HREF="https://react.dev">React</A>
          </DL>
        </DL>
      </DL>`
      const [b] = parseNetscape(html)
      expect(b.folderPath).toEqual(['Work', 'Frontend'])
    })

    it('sibling folders do not leak paths across each other', () => {
      const html = `<DL>
        <DT><H3>Work</H3>
        <DL>
          <DT><A HREF="https://work.com">W</A>
        </DL>
        <DT><H3>Personal</H3>
        <DL>
          <DT><A HREF="https://personal.com">P</A>
        </DL>
      </DL>`
      const bs = parseNetscape(html)
      expect(bs).toHaveLength(2)
      expect(bs[0].folderPath).toEqual(['Work'])
      expect(bs[1].folderPath).toEqual(['Personal'])
    })

    it('mixes root-level bookmarks with folders correctly', () => {
      const html = `<DL>
        <DT><A HREF="https://root.com">Root</A>
        <DT><H3>Sub</H3>
        <DL>
          <DT><A HREF="https://sub.com">Inside</A>
        </DL>
        <DT><A HREF="https://root2.com">Root2</A>
      </DL>`
      const bs = parseNetscape(html)
      expect(bs).toHaveLength(3)
      const map = Object.fromEntries(bs.map(b => [b.url, b.folderPath]))
      expect(map['https://root.com']).toBeUndefined()
      expect(map['https://sub.com']).toEqual(['Sub'])
      expect(map['https://root2.com']).toBeUndefined()
    })

    it('an empty folder produces no bookmarks and does not error', () => {
      const html = `<DL>
        <DT><H3>Empty</H3>
        <DL></DL>
        <DT><A HREF="https://a.com">A</A>
      </DL>`
      const bs = parseNetscape(html)
      expect(bs).toHaveLength(1)
      expect(bs[0].folderPath).toBeUndefined()
    })

    it('folder with empty name is skipped (bookmarks lifted to parent scope? no — dropped)', () => {
      const html = `<DL>
        <DT><H3></H3>
        <DL>
          <DT><A HREF="https://ghost.com">Ghost</A>
        </DL>
      </DL>`
      const bs = parseNetscape(html)
      expect(bs).toHaveLength(0)
    })

    it('handles the fallback nested-DL pattern (DL inside DT)', () => {
      const html = `<DL>
        <DT><H3>Wrap</H3>
          <DL>
            <DT><A HREF="https://in.com">In</A>
          </DL>
        </DT>
      </DL>`
      const bs = parseNetscape(html)
      expect(bs).toHaveLength(1)
      expect(bs[0].folderPath).toEqual(['Wrap'])
    })
  })
})
