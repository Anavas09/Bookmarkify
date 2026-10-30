import type { Bookmark } from '../types.ts'

// What a folder holds, bookmarks and subfolders in the order they came.
interface FolderNode {
  name: string
  children: Array<Bookmark | FolderNode>
  byKey: Map<string, FolderNode>
}

// The backup of the bookmarks about to be deleted, in the format Chrome's
// bookmark manager imports.
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

function makeNode(name: string): FolderNode {
  return { name, children: [], byKey: new Map() }
}

// Folders are told apart by id: two can share a name (siblings, or the bar
// of the account and the bar of the device). Without ids, by name.
function buildTree(bookmarks: Bookmark[]): FolderNode {
  const root = makeNode('')
  for (const b of bookmarks) {
    const path = b.folderPath ?? []
    let node = root
    path.forEach((name, i) => {
      const key = b.folderIds?.[i] ?? `name:${name}`
      let child = node.byKey.get(key)
      if (!child) {
        child = makeNode(name)
        node.byKey.set(key, child)
        node.children.push(child)
      }
      node = child
    })
    node.children.push(b)
  }
  return root
}

/**
 * Emits each folder's children in the order they came, so a subfolder sits
 * where its first bookmark was, as in Chrome.
 */
function emit(node: FolderNode, indent: string, out: string[]): void {
  for (const child of node.children) {
    if ('children' in child) {
      out.push(`${indent}<DT><H3>${escapeText(child.name)}</H3>`)
      out.push(`${indent}<DL><p>`)
      emit(child, indent + '    ', out)
      out.push(`${indent}</DL><p>`)
    } else {
      out.push(bookmarkToLine(child, indent))
    }
  }
}

function bookmarkToLine(b: Bookmark, indent: string): string {
  const attrs = [`HREF="${escapeAttr(b.url)}"`]
  if (b.addedAt !== undefined) {
    attrs.push(`ADD_DATE="${Math.floor(b.addedAt / 1000)}"`)
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
