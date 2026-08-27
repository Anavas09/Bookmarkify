import { describe, it, expect } from 'vitest'
import type { Bookmark } from '../core/types.ts'
import {
  selectDomainCounts,
  selectFolderCounts,
  selectDuplicateGroups,
  selectDuplicateIds,
  selectDuplicateCount,
  selectVisibleBookmarks,
} from './selectors.ts'

const B = (id: string, url: string, folderPath?: string[]): Bookmark => ({
  id,
  title: id,
  url,
  ...(folderPath !== undefined && { folderPath }),
})

describe('selectDomainCounts', () => {
  it('counts occurrences by hostname (without www)', () => {
    const list = [
      B('1', 'https://a.com/one'),
      B('2', 'https://a.com/two'),
      B('3', 'https://www.a.com/three'),
      B('4', 'https://b.com/'),
    ]
    expect(selectDomainCounts(list)).toEqual([
      { domain: 'a.com', count: 3 },
      { domain: 'b.com', count: 1 },
    ])
  })

  it('sorts descending by count, then alphabetically', () => {
    const list = [
      B('1', 'https://z.com'),
      B('2', 'https://a.com'),
      B('3', 'https://m.com'),
    ]
    expect(selectDomainCounts(list).map(d => d.domain)).toEqual(['a.com', 'm.com', 'z.com'])
  })
})

describe('selectFolderCounts', () => {
  it('groups by full folder path', () => {
    const list = [
      B('1', 'https://x.com/1', ['Work']),
      B('2', 'https://x.com/2', ['Work']),
      B('3', 'https://x.com/3', ['Work', 'Docs']),
      B('4', 'https://x.com/4'),
    ]
    const counts = selectFolderCounts(list)
    expect(counts).toEqual([
      { path: ['Work'], count: 2 },
      { path: [], count: 1 },
      { path: ['Work', 'Docs'], count: 1 },
    ])
  })

  it('treats undefined folderPath as root []', () => {
    const list = [B('1', 'https://a.com'), B('2', 'https://b.com')]
    expect(selectFolderCounts(list)).toEqual([{ path: [], count: 2 }])
  })
})

describe('selectDuplicateGroups', () => {
  it('groups by normalized url and drops groups of size 1', () => {
    const list = [
      B('1', 'https://a.com/x'),
      B('2', 'https://A.com/x/'),           // dupe of 1 after normalize
      B('3', 'https://a.com/x?utm_source=q'), // dupe of 1 after normalize
      B('4', 'https://b.com/only'),          // unique
    ]
    const groups = selectDuplicateGroups(list)
    expect(groups.size).toBe(1)
    const [only] = [...groups.values()]
    expect(only.map(b => b.id).sort()).toEqual(['1', '2', '3'])
  })

  it('ignores bookmarks whose url cannot be normalized', () => {
    const list = [B('bad', 'not-a-url'), B('bad2', 'not-a-url')]
    expect(selectDuplicateGroups(list).size).toBe(0)
  })
})

describe('selectDuplicateIds / selectDuplicateCount', () => {
  it('exposes all ids inside duplicate groups', () => {
    const list = [
      B('1', 'https://a.com'),
      B('2', 'https://a.com/'),
      B('3', 'https://b.com'),
    ]
    expect(selectDuplicateIds(list)).toEqual(new Set(['1', '2']))
    expect(selectDuplicateCount(list)).toBe(2)
  })
})

describe('selectVisibleBookmarks', () => {
  const list: Bookmark[] = [
    B('1', 'https://a.com', ['Work']),
    B('2', 'https://b.com', ['Work']),
    B('3', 'https://a.com/dup', ['Personal']),
    B('4', 'https://a.com/dup/'),
  ]

  it('returns everything when no filter is active', () => {
    expect(selectVisibleBookmarks(list, null).map(b => b.id)).toEqual(['1', '2', '3', '4'])
  })

  it('filters by domain', () => {
    expect(
      selectVisibleBookmarks(list, { kind: 'domain', value: 'a.com' }).map(b => b.id),
    ).toEqual(['1', '3', '4'])
  })

  it('filters by exact folder path (root [] included)', () => {
    expect(
      selectVisibleBookmarks(list, { kind: 'folder', path: ['Work'] }).map(b => b.id),
    ).toEqual(['1', '2'])
    expect(
      selectVisibleBookmarks(list, { kind: 'folder', path: [] }).map(b => b.id),
    ).toEqual(['4'])
  })

  it('filters by duplicate (only urls that appear more than once)', () => {
    expect(selectVisibleBookmarks(list, { kind: 'duplicate' }).map(b => b.id)).toEqual(['3', '4'])
  })
})
