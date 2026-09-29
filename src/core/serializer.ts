import type { Bookmark } from './types.ts'

interface FolderNode {
  subfolders: Map<string, FolderNode>
  bookmarks: Bookmark[]
}

export function serializeNetscape(bookmarks: Bookmark[]): string {
  const root = buildTree(bookmarks)
  const body: string[] = []
  emit(root, '    ', body)

  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
    ...body,
    '</DL><p>',
  ]
  return lines.join('\n') + '\n'
}

function makeNode(): FolderNode {
  return { subfolders: new Map(), bookmarks: [] }
}

function buildTree(bookmarks: Bookmark[]): FolderNode {
  const root = makeNode()
  for (const b of bookmarks) {
    const path = b.folderPath ?? []
    let node = root
    for (const segment of path) {
      let child = node.subfolders.get(segment)
      if (!child) {
        child = makeNode()
        node.subfolders.set(segment, child)
      }
      node = child
    }
    node.bookmarks.push(b)
  }
  return root
}

/**
 * Emits subfolders first, then bookmarks. Preserves insertion order within
 * each level (Map preserves insertion order in JS, so subfolders come out
 * in the order the first bookmark referenced them).
 */
function emit(node: FolderNode, indent: string, out: string[]): void {
  for (const [name, sub] of node.subfolders) {
    out.push(`${indent}<DT><H3>${escapeText(name)}</H3>`)
    out.push(`${indent}<DL><p>`)
    emit(sub, indent + '    ', out)
    out.push(`${indent}</DL><p>`)
  }
  for (const b of node.bookmarks) {
    out.push(bookmarkToLine(b, indent))
  }
}

function bookmarkToLine(b: Bookmark, indent: string): string {
  const attrs = [`HREF="${escapeAttr(b.url)}"`]
  if (b.addedAt !== undefined) {
    attrs.push(`ADD_DATE="${Math.floor(b.addedAt / 1000)}"`)
  }
  if (b.tags && b.tags.length > 0) {
    attrs.push(`TAGS="${escapeAttr(b.tags.join(','))}"`)
  }
  if (b.icon) {
    attrs.push(`ICON="${escapeAttr(b.icon)}"`)
  }
  return `${indent}<DT><A ${attrs.join(' ')}>${escapeText(b.title)}</A>`
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
