import { describe, it, expect } from 'vitest'
import { serializeNetscape } from './serializer.ts'
import type { Bookmark } from '../types.ts'

// The lines between the outer <DL><p> and its closing tag.
function body(html: string): string[] {
  const lines = html.trimEnd().split('\n')
  return lines.slice(lines.indexOf('<DL><p>') + 1, -1)
}

describe('serializeNetscape', () => {
  it('emits a valid Netscape header and footer', () => {
    const html = serializeNetscape([])
    expect(html).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>')
    expect(html).toContain('<TITLE>Bookmarks</TITLE>')
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

  it('omits ADD_DATE when absent', () => {
    const html = serializeNetscape([
      { id: '0', title: 'X', url: 'https://x.com' },
    ])
    expect(html).not.toContain('ADD_DATE')
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

  it('writes each bookmark on its own line, in order', () => {
    const input: Bookmark[] = [
      { id: 'a', title: 'Example', url: 'https://example.com', addedAt: 1700000000000 },
      { id: 'b', title: 'Undated', url: 'https://undated.com' },
      { id: 'c', title: 'Plain & Simple', url: 'https://plain.com' },
    ]
    expect(body(serializeNetscape(input))).toEqual([
      '    <DT><A HREF="https://example.com" ADD_DATE="1700000000">Example</A>',
      '    <DT><A HREF="https://undated.com">Undated</A>',
      '    <DT><A HREF="https://plain.com">Plain &amp; Simple</A>',
    ])
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

    it('nests each bookmark under its folders, as in Chrome', () => {
      const input: Bookmark[] = [
        { id: 'a', title: 'Work1', url: 'https://work1.com', folderPath: ['Bookmarks bar', 'Work'] },
        { id: 'b', title: 'Nested', url: 'https://nested.com', folderPath: ['Bookmarks bar', 'Work', 'Frontend'] },
        { id: 'c', title: 'Work2', url: 'https://work2.com', folderPath: ['Bookmarks bar', 'Work'] },
        { id: 'd', title: 'Recipes', url: 'https://recipes.com', folderPath: ['Other bookmarks'] },
      ]
      expect(body(serializeNetscape(input))).toEqual([
        '    <DT><H3>Bookmarks bar</H3>',
        '    <DL><p>',
        '        <DT><H3>Work</H3>',
        '        <DL><p>',
        '            <DT><H3>Frontend</H3>',
        '            <DL><p>',
        '                <DT><A HREF="https://nested.com">Nested</A>',
        '            </DL><p>',
        '            <DT><A HREF="https://work1.com">Work1</A>',
        '            <DT><A HREF="https://work2.com">Work2</A>',
        '        </DL><p>',
        '    </DL><p>',
        '    <DT><H3>Other bookmarks</H3>',
        '    <DL><p>',
        '        <DT><A HREF="https://recipes.com">Recipes</A>',
        '    </DL><p>',
      ])
    })

    it('does not emit a folder none of the bookmarks is in', () => {
      // The backup only has the bookmarks about to be deleted, so the
      // folders that keep all of theirs stay out of it.
      const html = serializeNetscape([
        { id: '0', title: 'Gone', url: 'https://g.com', folderPath: ['Trash'] },
      ])
      expect(html).not.toContain('<H3>Keep</H3>')
      expect(html).toContain('<H3>Trash</H3>')
    })
  })
})
