import { describe, it, expect } from 'vitest'
import type { Bookmark } from '../core/types.ts'
import {
  selectDomainCounts,
  selectFolderCounts,
  selectDuplicateGroups,
  selectDuplicateIds,
  selectDuplicateCount,
  selectKeptBookmarks,
  selectVisibleBookmarks,
  selectVisibleSortedBookmarks,
} from './selectors.ts'

const B = (id: string, url: string, folderPath?: string[]): Bookmark => ({
  id,
  title: id,
  url,
  ...(folderPath !== undefined && { folderPath }),
})

const NO_DELETES = new Set<string>()

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

describe('selectKeptBookmarks', () => {
  const list = [B('1', 'https://a.com'), B('2', 'https://b.com'), B('3', 'https://c.com')]

  it('leaves out the pending deletes, keeping the original order', () => {
    expect(selectKeptBookmarks(list, new Set(['2'])).map(b => b.id)).toEqual(['1', '3'])
  })

  it('returns the same array when nothing is deleted', () => {
    expect(selectKeptBookmarks(list, NO_DELETES)).toBe(list)
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
    expect(selectVisibleBookmarks(list, NO_DELETES, null).map(b => b.id)).toEqual(['1', '2', '3', '4'])
  })

  describe('with pending deletes', () => {
    const deleted = new Set(['1', '3'])

    it('hides them when no filter is active', () => {
      expect(selectVisibleBookmarks(list, deleted, null).map(b => b.id)).toEqual(['2', '4'])
    })

    it('hides them under any other filter', () => {
      expect(
        selectVisibleBookmarks(list, deleted, { kind: 'domain', value: 'a.com' }).map(b => b.id),
      ).toEqual(['4'])
      expect(
        selectVisibleBookmarks(list, deleted, { kind: 'folder', path: ['Work'] }).map(b => b.id),
      ).toEqual(['2'])
      expect(
        selectVisibleBookmarks(list, deleted, { kind: 'text', query: 'a.com' }).map(b => b.id),
      ).toEqual(['4'])
    })

    it('the deleted filter shows only them, in original order', () => {
      expect(selectVisibleBookmarks(list, deleted, { kind: 'deleted' }).map(b => b.id)).toEqual([
        '1',
        '3',
      ])
    })

    it('the deleted filter shows nothing when nothing is deleted', () => {
      expect(selectVisibleBookmarks(list, NO_DELETES, { kind: 'deleted' })).toEqual([])
    })

    it('a copy stops being a duplicate once its twin is deleted', () => {
      expect(
        selectVisibleBookmarks(list, new Set(['3']), { kind: 'duplicate' }).map(b => b.id),
      ).toEqual([])
    })
  })

  it('filters by domain', () => {
    expect(
      selectVisibleBookmarks(list, NO_DELETES, { kind: 'domain', value: 'a.com' }).map(b => b.id),
    ).toEqual(['1', '3', '4'])
  })

  it('filters by exact folder path (root [] included)', () => {
    expect(
      selectVisibleBookmarks(list, NO_DELETES, { kind: 'folder', path: ['Work'] }).map(b => b.id),
    ).toEqual(['1', '2'])
    expect(
      selectVisibleBookmarks(list, NO_DELETES, { kind: 'folder', path: [] }).map(b => b.id),
    ).toEqual(['4'])
  })

  it('filters by duplicate (only urls that appear more than once)', () => {
    expect(selectVisibleBookmarks(list, NO_DELETES, { kind: 'duplicate' }).map(b => b.id)).toEqual(['3', '4'])
  })

  describe('by text', () => {
    const textList: Bookmark[] = [
      { id: '1', title: 'React docs',      url: 'https://react.dev',          folderPath: ['Dev'] },
      { id: '2', title: 'Django overview', url: 'https://djangoproject.com',  folderPath: ['Dev', 'Python'] },
      { id: '3', title: 'Cooking recipes', url: 'https://foodnetwork.com',    folderPath: ['Personal'] },
    ]

    it('matches on title', () => {
      expect(
        selectVisibleBookmarks(textList, NO_DELETES, { kind: 'text', query: 'react' }).map(b => b.id),
      ).toEqual(['1'])
    })

    it('matches on url', () => {
      expect(
        selectVisibleBookmarks(textList, NO_DELETES, { kind: 'text', query: 'foodnetwork' }).map(b => b.id),
      ).toEqual(['3'])
    })

    it('matches on any segment of folderPath (joined)', () => {
      expect(
        selectVisibleBookmarks(textList, NO_DELETES, { kind: 'text', query: 'python' }).map(b => b.id),
      ).toEqual(['2'])
    })

    it('is case-insensitive', () => {
      expect(
        selectVisibleBookmarks(textList, NO_DELETES, { kind: 'text', query: 'REACT' }).map(b => b.id),
      ).toEqual(['1'])
    })

    it('returns everything when the query is empty or whitespace only', () => {
      expect(
        selectVisibleBookmarks(textList, NO_DELETES, { kind: 'text', query: '' }).map(b => b.id),
      ).toEqual(['1', '2', '3'])
      expect(
        selectVisibleBookmarks(textList, NO_DELETES, { kind: 'text', query: '   ' }).map(b => b.id),
      ).toEqual(['1', '2', '3'])
    })

    it('returns nothing when no bookmark matches', () => {
      expect(
        selectVisibleBookmarks(textList, NO_DELETES, { kind: 'text', query: 'nothingmatches' }).map(b => b.id),
      ).toEqual([])
    })
  })
})

describe('selectVisibleSortedBookmarks', () => {
  const list: Bookmark[] = [
    { id: '1', title: 'Charlie', url: 'https://b.com/c', addedAt: 300 },
    { id: '2', title: 'alpha',   url: 'https://a.com/a', addedAt: 100 },
    { id: '3', title: 'Bravo',   url: 'https://c.com/b', addedAt: 200 },
    { id: '4', title: 'delta',   url: 'https://a.com/d' },
  ]

  it('returns filtered list untouched when sort is null (Original)', () => {
    expect(selectVisibleSortedBookmarks(list, NO_DELETES, null, null).map(b => b.id)).toEqual([
      '1', '2', '3', '4',
    ])
  })

  describe('by title', () => {
    it('asc: A→Z, case-insensitive', () => {
      expect(
        selectVisibleSortedBookmarks(list, NO_DELETES, null, { kind: 'title', dir: 'asc' }).map(b => b.title),
      ).toEqual(['alpha', 'Bravo', 'Charlie', 'delta'])
    })

    it('desc: Z→A', () => {
      expect(
        selectVisibleSortedBookmarks(list, NO_DELETES, null, { kind: 'title', dir: 'desc' }).map(b => b.title),
      ).toEqual(['delta', 'Charlie', 'Bravo', 'alpha'])
    })

    it('preserves original order on ties (stable sort)', () => {
      const ties: Bookmark[] = [
        { id: 'a', title: 'same', url: 'https://x.com/1' },
        { id: 'b', title: 'same', url: 'https://x.com/2' },
        { id: 'c', title: 'same', url: 'https://x.com/3' },
      ]
      expect(
        selectVisibleSortedBookmarks(ties, NO_DELETES, null, { kind: 'title', dir: 'asc' }).map(b => b.id),
      ).toEqual(['a', 'b', 'c'])
    })
  })

  describe('by date', () => {
    it('desc: newest first, undefined addedAt at the end', () => {
      expect(
        selectVisibleSortedBookmarks(list, NO_DELETES, null, { kind: 'date', dir: 'desc' }).map(b => b.id),
      ).toEqual(['1', '3', '2', '4'])
    })

    it('asc: oldest first, undefined addedAt still at the end', () => {
      expect(
        selectVisibleSortedBookmarks(list, NO_DELETES, null, { kind: 'date', dir: 'asc' }).map(b => b.id),
      ).toEqual(['2', '3', '1', '4'])
    })

    it('keeps original order among bookmarks with no addedAt', () => {
      const undated: Bookmark[] = [
        { id: 'x', title: 'X', url: 'https://x.com' },
        { id: 'y', title: 'Y', url: 'https://y.com' },
        { id: 'z', title: 'Z', url: 'https://z.com', addedAt: 50 },
      ]
      expect(
        selectVisibleSortedBookmarks(undated, NO_DELETES, null, { kind: 'date', dir: 'desc' }).map(b => b.id),
      ).toEqual(['z', 'x', 'y'])
    })
  })

  describe('by domain', () => {
    it('sorts A→Z by hostname (without www)', () => {
      expect(
        selectVisibleSortedBookmarks(list, NO_DELETES, null, { kind: 'domain' }).map(b => b.id),
      ).toEqual(['2', '4', '1', '3'])
    })

    it('preserves original order within the same domain (stable sort)', () => {
      const sameDomain: Bookmark[] = [
        { id: 'p', title: 'P', url: 'https://a.com/p' },
        { id: 'q', title: 'Q', url: 'https://a.com/q' },
        { id: 'r', title: 'R', url: 'https://a.com/r' },
      ]
      expect(
        selectVisibleSortedBookmarks(sameDomain, NO_DELETES, null, { kind: 'domain' }).map(b => b.id),
      ).toEqual(['p', 'q', 'r'])
    })
  })

  it('applies filter before sort (pipeline)', () => {
    expect(
      selectVisibleSortedBookmarks(
        list,
        NO_DELETES,
        { kind: 'domain', value: 'a.com' },
        { kind: 'title', dir: 'asc' },
      ).map(b => b.id),
    ).toEqual(['2', '4'])
  })

  it('sorts the deleted view too', () => {
    expect(
      selectVisibleSortedBookmarks(
        list,
        new Set(['1', '2']),
        { kind: 'deleted' },
        { kind: 'title', dir: 'asc' },
      ).map(b => b.id),
    ).toEqual(['2', '1'])
  })

  it('does not mutate the input array', () => {
    const snapshot = list.map(b => b.id)
    selectVisibleSortedBookmarks(list, NO_DELETES, null, { kind: 'title', dir: 'desc' })
    expect(list.map(b => b.id)).toEqual(snapshot)
  })
})
