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

const parse = (html: string) => parseNetscape(html).bookmarks

describe('parseNetscape', () => {
  it('returns a BookmarkDocument with bookmarks and meta', () => {
    const doc = parseNetscape(MINIMAL)
    expect(doc.bookmarks).toHaveLength(2)
    // MINIMAL has <H1>Bookmarks</H1>, which is captured as rootTitle
    expect(doc.meta.rootTitle).toBe('Bookmarks')
    expect(doc.meta.specialFolders).toBeUndefined()
  })

  describe('meta.rootTitle', () => {
    it('captures the H1 text (Firefox-style localized title)', () => {
      const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
        <H1>Menú Marcadores</H1>
        <DL><DT><A HREF="https://a.com">A</A></DL>`
      expect(parseNetscape(html).meta.rootTitle).toBe('Menú Marcadores')
    })

    it('leaves rootTitle undefined when H1 is missing or empty', () => {
      expect(parseNetscape('<DL><DT><A HREF="https://a.com">A</A></DL>').meta.rootTitle).toBeUndefined()
      expect(parseNetscape('<H1></H1><DL></DL>').meta.rootTitle).toBeUndefined()
    })
  })

  describe('meta.specialFolders', () => {
    it('captures PERSONAL_TOOLBAR_FOLDER on H3', () => {
      const html = `<DL>
        <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3>
        <DL><DT><A HREF="https://a.com">A</A></DL>
      </DL>`
      const doc = parseNetscape(html)
      expect(doc.meta.specialFolders).toEqual([
        { path: ['Bookmarks bar'], attributes: { PERSONAL_TOOLBAR_FOLDER: 'true' } },
      ])
    })

    it('captures UNFILED_BOOKMARKS_FOLDER on H3', () => {
      const html = `<DL>
        <DT><H3 UNFILED_BOOKMARKS_FOLDER="true">Otros marcadores</H3>
        <DL><DT><A HREF="https://a.com">A</A></DL>
      </DL>`
      const doc = parseNetscape(html)
      expect(doc.meta.specialFolders).toEqual([
        { path: ['Otros marcadores'], attributes: { UNFILED_BOOKMARKS_FOLDER: 'true' } },
      ])
    })

    it('captures multiple special folders at root level (Firefox-style)', () => {
      const html = `<DL>
        <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Barra de marcadores</H3>
        <DL><DT><A HREF="https://a.com">A</A></DL>
        <DT><H3 UNFILED_BOOKMARKS_FOLDER="true">Otros marcadores</H3>
        <DL><DT><A HREF="https://b.com">B</A></DL>
      </DL>`
      const doc = parseNetscape(html)
      expect(doc.meta.specialFolders).toHaveLength(2)
      expect(doc.meta.specialFolders?.[0]).toEqual({
        path: ['Barra de marcadores'],
        attributes: { PERSONAL_TOOLBAR_FOLDER: 'true' },
      })
      expect(doc.meta.specialFolders?.[1]).toEqual({
        path: ['Otros marcadores'],
        attributes: { UNFILED_BOOKMARKS_FOLDER: 'true' },
      })
    })

    it('ignores unrelated H3 attributes (ADD_DATE, LAST_MODIFIED)', () => {
      const html = `<DL>
        <DT><H3 ADD_DATE="1740430074" LAST_MODIFIED="0" PERSONAL_TOOLBAR_FOLDER="true">Bar</H3>
        <DL><DT><A HREF="https://a.com">A</A></DL>
      </DL>`
      const doc = parseNetscape(html)
      expect(doc.meta.specialFolders).toEqual([
        { path: ['Bar'], attributes: { PERSONAL_TOOLBAR_FOLDER: 'true' } },
      ])
    })

    it('leaves specialFolders undefined when no folder has the preserved attrs', () => {
      const html = `<DL>
        <DT><H3>Regular</H3>
        <DL><DT><A HREF="https://a.com">A</A></DL>
      </DL>`
      expect(parseNetscape(html).meta.specialFolders).toBeUndefined()
    })
  })

  it('returns one bookmark per anchor', () => {
    const result = parse(MINIMAL)
    expect(result).toHaveLength(2)
  })

  it('extracts url and title', () => {
    const [first] = parse(MINIMAL)
    expect(first.url).toBe('https://example.com')
    expect(first.title).toBe('Example')
  })

  it('converts ADD_DATE (seconds) to ms', () => {
    const [first] = parse(MINIMAL)
    expect(first.addedAt).toBe(1700000000 * 1000)
  })

  it('parses comma-separated TAGS', () => {
    const [, second] = parse(MINIMAL)
    expect(second.tags).toEqual(['ai', 'research'])
  })

  it('assigns sequential numeric ids', () => {
    const result = parse(MINIMAL)
    expect(result.map(b => b.id)).toEqual(['0', '1'])
  })

  it('skips javascript: urls', () => {
    const html = `<DL>
      <DT><A HREF="javascript:void(0)">Bad</A>
      <DT><A HREF="https://good.com">Good</A>
    </DL>`
    const result = parse(html)
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://good.com')
  })

  it('returns empty array for empty input', () => {
    expect(parse('')).toHaveLength(0)
  })

  it('handles missing ADD_DATE and TAGS gracefully', () => {
    const html = `<DL><DT><A HREF="https://nodates.com">No dates</A></DL>`
    const [b] = parse(html)
    expect(b.addedAt).toBeUndefined()
    expect(b.tags).toBeUndefined()
  })

  describe('ICON attribute', () => {
    it('extracts inline ICON as-is (data URL)', () => {
      const html = `<DL><DT><A HREF="https://a.com" ICON="data:image/png;base64,AAA">A</A></DL>`
      const [b] = parse(html)
      expect(b.icon).toBe('data:image/png;base64,AAA')
    })

    it('leaves icon undefined when the attribute is missing', () => {
      const html = `<DL><DT><A HREF="https://a.com">A</A></DL>`
      const [b] = parse(html)
      expect(b.icon).toBeUndefined()
    })

    it('treats empty and whitespace ICON as undefined', () => {
      const html = `<DL>
        <DT><A HREF="https://a.com" ICON="">A</A>
        <DT><A HREF="https://b.com" ICON="   ">B</A>
      </DL>`
      const [a, bb] = parse(html)
      expect(a.icon).toBeUndefined()
      expect(bb.icon).toBeUndefined()
    })
  })

  describe('folder hierarchy', () => {
    it('root-level bookmarks have no folderPath', () => {
      const [first] = parse(MINIMAL)
      expect(first.folderPath).toBeUndefined()
    })

    it('bookmarks inside a folder get folderPath: [folder name]', () => {
      const html = `<DL>
        <DT><H3>Personal</H3>
        <DL>
          <DT><A HREF="https://a.com">A</A>
        </DL>
      </DL>`
      const [b] = parse(html)
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
      const [b] = parse(html)
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
      const bs = parse(html)
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
      const bs = parse(html)
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
      const bs = parse(html)
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
      const bs = parse(html)
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
      const bs = parse(html)
      expect(bs).toHaveLength(1)
      expect(bs[0].folderPath).toEqual(['Wrap'])
    })
  })
})
