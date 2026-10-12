import type { BookmarksApi } from './ChromeAdapter.ts'

type Node = chrome.bookmarks.BookmarkTreeNode

// A bookmark, or a folder when it has `children`.
export type FakeNode =
  | { title: string; url: string; dateAdded?: number }
  | { title: string; children: FakeNode[]; dateAdded?: number }

// What goes inside each of the browser's folders. `managed` is the folder
// an administrator sets up; it only exists when given.
export interface FakeTree {
  bar?: FakeNode[]
  other?: FakeNode[]
  mobile?: FakeNode[]
  managed?: FakeNode[]
}

export interface FakeBookmarks extends BookmarksApi {
  // Chrome's own create and update, so tests can change the tree behind the app's back.
  create(details: { parentId: string; title: string; url?: string }): Promise<Node>
  update(id: string, changes: { title?: string; url?: string }): Promise<Node>
}

const DEFAULT_DATE = Date.UTC(2024, 0, 1)

// An in-memory chrome.bookmarks that follows Chrome's rules: nothing goes
// into the root, the browser's folders and an administrator's bookmarks
// can't be changed, and a folder must be empty to be removed. Ids count up
// from the root's "0", as in Chrome.
export function createFakeBookmarks(seed: FakeTree = {}): FakeBookmarks {
  const byId = new Map<string, Node>()
  let nextId = 0

  function add(parent: Node | null, fields: Omit<Node, 'id' | 'parentId' | 'syncing'>): Node {
    const node: Node = {
      ...fields,
      dateAdded: fields.dateAdded ?? DEFAULT_DATE,
      id: String(nextId++),
      syncing: false,
    }
    if (parent !== null) {
      node.parentId = parent.id
      parent.children?.push(node)
    }
    byId.set(node.id, node)
    return node
  }

  function addSeed(parent: Node, item: FakeNode, managed: boolean): void {
    const flag = managed ? { unmodifiable: 'managed' as const } : {}
    if ('url' in item) {
      add(parent, { ...item, ...flag })
      return
    }
    const folder = add(parent, { title: item.title, dateAdded: item.dateAdded, children: [], ...flag })
    for (const child of item.children) addSeed(folder, child, managed)
  }

  const root = add(null, { title: '', children: [] })
  const filled: Array<[Node, FakeNode[] | undefined]> = [
    [add(root, { title: 'Bookmarks bar', folderType: 'bookmarks-bar', children: [] }), seed.bar],
    [add(root, { title: 'Other bookmarks', folderType: 'other', children: [] }), seed.other],
    [add(root, { title: 'Mobile bookmarks', folderType: 'mobile', children: [] }), seed.mobile],
  ]
  for (const [folder, items] of filled) {
    for (const item of items ?? []) addSeed(folder, item, false)
  }
  if (seed.managed) {
    const folder = add(root, {
      title: 'Managed bookmarks',
      folderType: 'managed',
      unmodifiable: 'managed',
      children: [],
    })
    for (const item of seed.managed) addSeed(folder, item, true)
  }

  function find(id: string): Node {
    const node = byId.get(id)
    if (node === undefined) throw new Error("Can't find bookmark for id.")
    return node
  }

  function assertModifiable(node: Node): void {
    if (node.parentId === undefined || node.folderType !== undefined) {
      throw new Error("Can't modify the root bookmark folders.")
    }
    if (node.unmodifiable !== undefined) throw new Error("Can't modify managed bookmarks.")
  }

  // Copies, as Chrome hands out: changing them doesn't change the tree.
  // Only getTree includes the children.
  function copy(node: Node, deep: boolean): Node {
    const { children, ...fields } = node
    const out: Node = { ...fields }
    if (node.parentId !== undefined) {
      out.index = byId.get(node.parentId)?.children?.indexOf(node)
    }
    if (deep && children !== undefined) out.children = children.map(c => copy(c, true))
    return out
  }

  return {
    async getTree() {
      return [copy(root, true)]
    },

    async getChildren(id) {
      return (find(id).children ?? []).map(c => copy(c, false))
    },

    async remove(id) {
      const node = find(id)
      assertModifiable(node)
      if (node.children !== undefined && node.children.length > 0) {
        throw new Error("Can't remove non-empty folder (use recursive to force).")
      }
      const siblings = byId.get(node.parentId ?? '')?.children ?? []
      siblings.splice(siblings.indexOf(node), 1)
      byId.delete(id)
    },

    async create({ parentId, title, url }) {
      const parent = find(parentId)
      if (parent.parentId === undefined) throw new Error("Can't modify the root bookmark folders.")
      if (parent.unmodifiable !== undefined) throw new Error("Can't modify managed bookmarks.")
      if (parent.children === undefined) throw new Error('Parameter "parentId" does not specify a folder.')
      const node = add(parent, url === undefined ? { title, children: [] } : { title, url })
      return copy(node, false)
    },

    async update(id, changes) {
      const node = find(id)
      assertModifiable(node)
      if (changes.title !== undefined) node.title = changes.title
      if (changes.url !== undefined && node.url !== undefined) node.url = changes.url
      return copy(node, false)
    },
  }
}
