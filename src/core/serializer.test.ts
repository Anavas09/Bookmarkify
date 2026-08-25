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

  it('round-trips flat bookmarks through parseNetscape', () => {
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

  describe('folder hierarchy', () => {
    it('emits root-level bookmarks without wrapping H3', () => {
      const html = serializeNetscape([
        { id: '0', title: 'Root', url: 'https://root.com' },
      ])
      expect(html).not.toContain('<H3>')
      expect(html).toContain('>Root</A>')
    })

    it('emits a bookmark inside a folder as <H3> + nested <DL>', () => {
      const html = serializeNetscape([
        { id: '0', title: 'Inside', url: 'https://in.com', folderPath: ['Personal'] },
      ])
      expect(html).toContain('<H3>Personal</H3>')
      expect(html).toMatch(/<H3>Personal<\/H3>[\s\S]*<DL><p>[\s\S]*Inside[\s\S]*<\/DL><p>/)
    })

    it('nests folders when folderPath has multiple segments', () => {
      const html = serializeNetscape([
        { id: '0', title: 'Deep', url: 'https://d.com', folderPath: ['Work', 'Frontend'] },
      ])
      expect(html).toContain('<H3>Work</H3>')
      expect(html).toContain('<H3>Frontend</H3>')
      // Frontend should appear after Work in the output
      const workIdx = html.indexOf('<H3>Work</H3>')
      const feIdx = html.indexOf('<H3>Frontend</H3>')
      expect(workIdx).toBeLessThan(feIdx)
    })

    it('groups bookmarks sharing the same folder path under one <H3>', () => {
      const html = serializeNetscape([
        { id: '0', title: 'A', url: 'https://a.com', folderPath: ['Shared'] },
        { id: '1', title: 'B', url: 'https://b.com', folderPath: ['Shared'] },
      ])
      const occurrences = html.match(/<H3>Shared<\/H3>/g)
      expect(occurrences).toHaveLength(1)
      expect(html).toContain('>A</A>')
      expect(html).toContain('>B</A>')
    })

    it('escapes special characters in folder names', () => {
      const html = serializeNetscape([
        { id: '0', title: 'X', url: 'https://x.com', folderPath: ['A & B <weird>'] },
      ])
      expect(html).toContain('<H3>A &amp; B &lt;weird&gt;</H3>')
    })

    it('emits subfolders before root-level bookmarks at each level', () => {
      const html = serializeNetscape([
        { id: '0', title: 'RootBookmark', url: 'https://r.com' },
        { id: '1', title: 'SubBookmark', url: 'https://s.com', folderPath: ['Sub'] },
      ])
      const subIdx = html.indexOf('<H3>Sub</H3>')
      const rootIdx = html.indexOf('>RootBookmark</A>')
      expect(subIdx).toBeLessThan(rootIdx)
    })

    it('round-trips folder hierarchy through parseNetscape', () => {
      const input: Bookmark[] = [
        { id: 'a', title: 'Root', url: 'https://root.com' },
        { id: 'b', title: 'Work1', url: 'https://work1.com', folderPath: ['Work'] },
        { id: 'c', title: 'Work2', url: 'https://work2.com', folderPath: ['Work'] },
        { id: 'd', title: 'Nested', url: 'https://nested.com', folderPath: ['Work', 'Frontend'] },
        { id: 'e', title: 'Personal1', url: 'https://p1.com', folderPath: ['Personal'] },
      ]
      const output = parseNetscape(serializeNetscape(input))
      expect(output).toHaveLength(input.length)
      const byUrl = Object.fromEntries(output.map(b => [b.url, b.folderPath]))
      expect(byUrl['https://root.com']).toBeUndefined()
      expect(byUrl['https://work1.com']).toEqual(['Work'])
      expect(byUrl['https://work2.com']).toEqual(['Work'])
      expect(byUrl['https://nested.com']).toEqual(['Work', 'Frontend'])
      expect(byUrl['https://p1.com']).toEqual(['Personal'])
    })

    it('does not emit a folder that has no bookmarks (empty-after-filter case)', () => {
      // Simulate: user marked all bookmarks in "TrashMe" for deletion and
      // exportFiltered stripped them — the resulting array has nothing at
      // that path, so the folder must not appear in the output.
      const html = serializeNetscape([
        { id: '0', title: 'Kept', url: 'https://k.com', folderPath: ['Keep'] },
      ])
      expect(html).not.toContain('<H3>TrashMe</H3>')
      expect(html).toContain('<H3>Keep</H3>')
    })
  })
})
