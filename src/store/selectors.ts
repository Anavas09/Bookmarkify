import type { Bookmark } from '../core/types.ts'
import { normalizeUrl } from '../core/normalizeUrl.ts'
import { domainOf } from '../lib/domain.ts'

// One collator for every comparison: `localeCompare` with options builds a new
// one each time, which with thousands of bookmarks was most of the sort.
const collator = new Intl.Collator(undefined, { sensitivity: 'base' })

export type Filter =
  | { kind: 'domain'; value: string }
  // `id` is the folder holding the bookmarks; `path` only names it when it is gone.
  | { kind: 'folder'; id: string; path: string[] }
  | { kind: 'duplicate' }
  | { kind: 'text'; query: string }
  | { kind: 'deleted' }
  | null

export type Sort =
  | { kind: 'title'; dir: 'asc' | 'desc' }
  | { kind: 'date'; dir: 'asc' | 'desc' }
  | { kind: 'domain' }
  | null

export interface DomainCount {
  domain: string
  count: number
}

export type FolderStorage = 'account' | 'device'

export interface FolderInfo {
  id: string
  path: string[] // names, root-first, starting with the browser's folder
  storage: FolderStorage | null // null while all the bookmarks are on one side
  ordinal: number // 1 for the first folder with this label, 2 for the next...
}

export interface FolderCount extends FolderInfo {
  count: number
}

export function selectDomainCounts(bookmarks: Bookmark[]): DomainCount[] {
  const counts = new Map<string, number>()
  for (const b of bookmarks) {
    const d = domainOf(b.url)
    counts.set(d, (counts.get(d) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
}

// The folders that hold bookmarks, by id and in the order of Chrome. Names
// repeat: two "Work" side by side, a folder called "A / B" next to B inside A,
// the bar of the account next to the bar of the device. The id tells them
// apart, and `ordinal` numbers the ones that would still read the same in the
// menu. Meant for all the bookmarks, deleted ones included, so that a label
// doesn't change while the user deletes.
export function selectFolders(bookmarks: Bookmark[]): Map<string, FolderInfo> {
  // Only worth telling apart when there are both: otherwise it is just noise.
  const tellApart =
    bookmarks.some(b => b.inAccount === true) && bookmarks.some(b => b.inAccount !== true)
  const folders = new Map<string, FolderInfo>()
  const seen = new Map<string, number>() // reading -> folders that read like that so far
  for (const b of bookmarks) {
    const id = b.folderIds?.at(-1)
    if (id === undefined || folders.has(id)) continue
    const path = b.folderPath ?? []
    const storage: FolderStorage | null = tellApart ? (b.inAccount === true ? 'account' : 'device') : null
    const reading = `${storage ?? ''}|${path.join(' / ')}`
    const ordinal = (seen.get(reading) ?? 0) + 1
    seen.set(reading, ordinal)
    folders.set(id, { id, path, storage, ordinal })
  }
  return folders
}

// `bookmarks` are the ones kept, and `folders` come from all of them.
export function selectFolderCounts(
  bookmarks: Bookmark[],
  folders: Map<string, FolderInfo>,
): FolderCount[] {
  const counts = new Map<string, number>()
  for (const b of bookmarks) {
    const id = b.folderIds?.at(-1)
    if (id !== undefined) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const out: FolderCount[] = []
  for (const folder of folders.values()) {
    const count = counts.get(folder.id)
    if (count !== undefined) out.push({ ...folder, count })
  }
  // Stable: folders with the same count and name keep the order of Chrome.
  return out.sort(
    (a, b) => b.count - a.count || a.path.join(' / ').localeCompare(b.path.join(' / ')),
  )
}

// What the menu and the chip call a folder: its names joined, the browser's
// folder tagged with where it lives, and a number if it still repeats. The
// words of the tag belong to the UI, which passes them in.
export function folderLabel(
  folder: Pick<FolderInfo, 'path' | 'storage' | 'ordinal'>,
  tag: (storage: FolderStorage, name: string) => string,
): string {
  const { path, storage, ordinal } = folder
  const label = path
    .map((name, i) => (i === 0 && storage !== null ? tag(storage, name) : name))
    .join(' / ')
  return ordinal > 1 ? `${label} (${ordinal})` : label
}

export function selectDuplicateGroups(bookmarks: Bookmark[]): Map<string, Bookmark[]> {
  const groups = new Map<string, Bookmark[]>()
  for (const b of bookmarks) {
    const norm = normalizeUrl(b.url)
    if (norm === null) continue
    const arr = groups.get(norm)
    if (arr) arr.push(b)
    else groups.set(norm, [b])
  }
  for (const [k, arr] of groups) {
    if (arr.length < 2) groups.delete(k)
  }
  return groups
}

export function selectDuplicateIds(bookmarks: Bookmark[]): Set<string> {
  const ids = new Set<string>()
  for (const arr of selectDuplicateGroups(bookmarks).values()) {
    for (const b of arr) ids.add(b.id)
  }
  return ids
}

export function selectDuplicateCount(bookmarks: Bookmark[]): number {
  return selectDuplicateIds(bookmarks).size
}

export function selectKeptBookmarks(
  bookmarks: Bookmark[],
  pendingDeletes: Set<string>,
): Bookmark[] {
  if (pendingDeletes.size === 0) return bookmarks
  return bookmarks.filter(b => !pendingDeletes.has(b.id))
}

// Deleted bookmarks are hidden from every view except the 'deleted' one,
// which shows only them so they can be restored.
export function selectVisibleBookmarks(
  bookmarks: Bookmark[],
  pendingDeletes: Set<string>,
  activeFilter: Filter,
): Bookmark[] {
  if (activeFilter?.kind === 'deleted') {
    return bookmarks.filter(b => pendingDeletes.has(b.id))
  }
  const kept = selectKeptBookmarks(bookmarks, pendingDeletes)
  if (!activeFilter) return kept
  switch (activeFilter.kind) {
    case 'domain':
      return kept.filter(b => domainOf(b.url) === activeFilter.value)
    case 'folder':
      return kept.filter(b => b.folderIds?.at(-1) === activeFilter.id)
    case 'duplicate': {
      const dupIds = selectDuplicateIds(kept)
      return kept.filter(b => dupIds.has(b.id))
    }
    case 'text': {
      const q = activeFilter.query.trim().toLowerCase()
      if (q === '') return kept
      return kept.filter(b => {
        if (b.title.toLowerCase().includes(q)) return true
        if (b.url.toLowerCase().includes(q)) return true
        const folder = (b.folderPath ?? []).join(' / ').toLowerCase()
        return folder.includes(q)
      })
    }
  }
}

export function selectVisibleSortedBookmarks(
  bookmarks: Bookmark[],
  pendingDeletes: Set<string>,
  activeFilter: Filter,
  activeSort: Sort,
): Bookmark[] {
  const filtered = selectVisibleBookmarks(bookmarks, pendingDeletes, activeFilter)
  if (activeSort === null) return filtered
  const sorted = [...filtered]
  switch (activeSort.kind) {
    case 'title': {
      const dir = activeSort.dir === 'asc' ? 1 : -1
      sorted.sort((a, b) => dir * collator.compare(a.title, b.title))
      return sorted
    }
    case 'date': {
      const dir = activeSort.dir === 'asc' ? 1 : -1
      sorted.sort((a, b) => {
        if (a.addedAt === undefined && b.addedAt === undefined) return 0
        if (a.addedAt === undefined) return 1
        if (b.addedAt === undefined) return -1
        return dir * (a.addedAt - b.addedAt)
      })
      return sorted
    }
    case 'domain': {
      sorted.sort((a, b) => collator.compare(domainOf(a.url), domainOf(b.url)))
      return sorted
    }
  }
}
