import type { Bookmark } from '../core/types.ts'
import { normalizeUrl } from '../core/normalizeUrl.ts'
import { domainOf } from '../lib/domain.ts'

export type Filter =
  | { kind: 'domain'; value: string }
  | { kind: 'folder'; path: string[] }
  | { kind: 'duplicate' }
  | { kind: 'text'; query: string }
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

export interface FolderCount {
  path: string[]
  count: number
}

const FOLDER_KEY_SEP = '␟'

export function folderKey(path: string[]): string {
  return path.join(FOLDER_KEY_SEP)
}

export function samePath(a: string[] | undefined, b: string[]): boolean {
  const A = a ?? []
  if (A.length !== b.length) return false
  return A.every((s, i) => s === b[i])
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

export function selectFolderCounts(bookmarks: Bookmark[]): FolderCount[] {
  const counts = new Map<string, FolderCount>()
  for (const b of bookmarks) {
    const path = b.folderPath ?? []
    const key = folderKey(path)
    const prev = counts.get(key)
    if (prev) prev.count++
    else counts.set(key, { path, count: 1 })
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || folderKey(a.path).localeCompare(folderKey(b.path)),
  )
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

export function selectVisibleBookmarks(
  bookmarks: Bookmark[],
  activeFilter: Filter,
): Bookmark[] {
  if (!activeFilter) return bookmarks
  switch (activeFilter.kind) {
    case 'domain':
      return bookmarks.filter(b => domainOf(b.url) === activeFilter.value)
    case 'folder':
      return bookmarks.filter(b => samePath(b.folderPath, activeFilter.path))
    case 'duplicate': {
      const dupIds = selectDuplicateIds(bookmarks)
      return bookmarks.filter(b => dupIds.has(b.id))
    }
    case 'text': {
      const q = activeFilter.query.trim().toLowerCase()
      if (q === '') return bookmarks
      return bookmarks.filter(b => {
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
  activeFilter: Filter,
  activeSort: Sort,
): Bookmark[] {
  const filtered = selectVisibleBookmarks(bookmarks, activeFilter)
  if (activeSort === null) return filtered
  const sorted = [...filtered]
  switch (activeSort.kind) {
    case 'title': {
      const dir = activeSort.dir === 'asc' ? 1 : -1
      sorted.sort((a, b) => dir * a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
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
      sorted.sort((a, b) =>
        domainOf(a.url).localeCompare(domainOf(b.url), undefined, { sensitivity: 'base' }),
      )
      return sorted
    }
  }
}
