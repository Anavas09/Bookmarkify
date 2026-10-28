import type { Bookmark, BookmarkDocument } from '../types.ts'
import {
  BackupFailedError,
  type BookmarkChange,
  type BookmarkSource,
  type CommitOptions,
  type CommitResult,
} from '../ports/BookmarkSource.ts'
import { serializeNetscape } from './serializer.ts'
import { buildBackupFilename } from '../../lib/backupFilename.ts'
import type { BackupSaver } from './chromeBackup.ts'

type Node = chrome.bookmarks.BookmarkTreeNode

// The part of chrome.bookmarks the adapter uses. Tests and `npm run dev`
// pass an in-memory copy instead (fakeChromeBookmarks.ts).
export interface BookmarksApi {
  getTree(): Promise<Node[]>
  getChildren(id: string): Promise<Node[]>
  remove(id: string): Promise<void>
}

export class ChromeAdapter implements BookmarkSource {
  private readonly api: BookmarksApi
  private readonly backup: BackupSaver

  constructor(api: BookmarksApi, backup: BackupSaver) {
    this.api = api
    this.backup = backup
  }

  allowBackup(): Promise<boolean> {
    return this.backup.allow()
  }

  async load(): Promise<BookmarkDocument> {
    return { bookmarks: collectBookmarks(await this.api.getTree()) }
  }

  // Deletes the removed bookmarks and nothing else. Diffing the tree against
  // the kept ones would also delete whatever was added in Chrome after loading.
  async commit({ removed }: BookmarkChange, { backup }: CommitOptions): Promise<CommitResult> {
    const tree = await this.api.getTree()
    const current = new Map(collectBookmarks(tree).map(b => [b.id, b]))
    // One deleted or edited in Chrome since loading is no longer what the
    // user decided on, so it is left alone.
    const doomed = removed.flatMap(b => {
      const now = current.get(b.id)
      return now !== undefined && now.url === b.url ? [now] : []
    })
    if (doomed.length === 0) {
      return { deleted: 0, skipped: removed.length, folders: 0, backupFilename: null }
    }

    // Chrome has no undo for this, so the copy is saved, and confirmed on
    // disk, before anything goes. Without one, the caller already agreed.
    let backupFilename: string | null = null
    if (backup) {
      try {
        backupFilename = await this.backup.save(buildBackupFilename(new Date()), serializeNetscape(doomed))
      } catch (error) {
        throw new BackupFailedError(error)
      }
    }

    const nodes = indexNodes(tree)
    const touched = new Set<string>()
    let deleted = 0
    for (const b of doomed) {
      try {
        await this.api.remove(b.id)
      } catch {
        continue // counted as skipped: it stays in Chrome, and marked in the app
      }
      deleted++
      const parentId = nodes.get(b.id)?.parentId
      if (parentId !== undefined) touched.add(parentId)
    }
    const folders = await this.removeEmptiedFolders(touched, nodes)
    return { deleted, skipped: removed.length - deleted, folders, backupFilename }
  }

  // Climbs from each folder that lost bookmarks, deleting it while it is
  // empty. Folders that were empty already, or hold something the app does
  // not show (a bookmarklet), stay.
  private async removeEmptiedFolders(touched: Set<string>, nodes: Map<string, Node>): Promise<number> {
    const gone = new Set<string>()
    for (const id of touched) {
      let folder = nodes.get(id)
      while (folder !== undefined && !gone.has(folder.id) && isUserFolder(folder, nodes)) {
        try {
          if ((await this.api.getChildren(folder.id)).length > 0) break
          await this.api.remove(folder.id)
        } catch {
          break
        }
        gone.add(folder.id)
        folder = folder.parentId === undefined ? undefined : nodes.get(folder.parentId)
      }
    }
    return gone.size
  }
}

// Depth-first, so the bookmarks come in the order the manager shows them.
// The root holds the browser's folders (bookmarks bar, other, mobile), and
// folderPath starts with them, as in the manager.
function collectBookmarks(tree: Node[]): Bookmark[] {
  const out: Bookmark[] = []
  for (const root of tree) {
    for (const top of root.children ?? []) collect(top, [], out)
  }
  return out
}

function collect(node: Node, path: string[], out: Bookmark[]): void {
  // Set up by an administrator: Chrome won't let them be deleted.
  if (node.unmodifiable !== undefined) return
  if (node.url === undefined) {
    const inside = [...path, node.title]
    for (const child of node.children ?? []) collect(child, inside, out)
    return
  }
  // Bookmarklets run code instead of opening a page.
  if (node.url.startsWith('javascript:')) return
  out.push({
    id: node.id,
    title: node.title,
    url: node.url,
    addedAt: node.dateAdded,
    folderPath: path,
  })
}

function indexNodes(tree: Node[]): Map<string, Node> {
  const nodes = new Map<string, Node>()
  const visit = (node: Node) => {
    nodes.set(node.id, node)
    node.children?.forEach(visit)
  }
  tree.forEach(visit)
  return nodes
}

// The browser's folders hang from the root and can't be deleted. Since
// Chrome 134 they carry a `folderType`; their place under the root covers
// older versions.
function isUserFolder(node: Node, nodes: Map<string, Node>): boolean {
  if (node.url !== undefined || node.folderType !== undefined || node.unmodifiable !== undefined) {
    return false
  }
  const parent = node.parentId === undefined ? undefined : nodes.get(node.parentId)
  return parent?.parentId !== undefined
}
