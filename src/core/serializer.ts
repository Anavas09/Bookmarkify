import type { Bookmark } from './types.ts'

export function serializeNetscape(bookmarks: Bookmark[]): string {
  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
    ...bookmarks.map(bookmarkToLine),
    '</DL><p>',
  ]
  return lines.join('\n') + '\n'
}

function bookmarkToLine(b: Bookmark): string {
  const attrs = [`HREF="${escapeAttr(b.url)}"`]
  if (b.addedAt !== undefined) {
    attrs.push(`ADD_DATE="${Math.floor(b.addedAt / 1000)}"`)
  }
  if (b.tags && b.tags.length > 0) {
    attrs.push(`TAGS="${escapeAttr(b.tags.join(','))}"`)
  }
  return `    <DT><A ${attrs.join(' ')}>${escapeText(b.title)}</A>`
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
