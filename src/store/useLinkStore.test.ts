import { describe, it, expect, beforeEach } from 'vitest'
import { useLinkStore, LINKS_PERSIST_KEY } from './useLinkStore.ts'
import { selectBrokenIds } from './selectors.ts'
import { PERSIST_KEY } from './useBookmarkStore.ts'
import type { Bookmark } from '../core/types.ts'

const bm = (id: string, url: string): Bookmark => ({ id, title: id, url })

beforeEach(() => {
  localStorage.clear()
  useLinkStore.setState({ checks: {}, firstScanPrompted: false })
})

describe('applyScan', () => {
  it('merges with what was there', () => {
    useLinkStore.setState({ checks: { 'https://a.com/': { status: 'ok', checkedAt: 1 } } })
    useLinkStore.getState().applyScan({ 'https://b.com/': { status: 'broken', checkedAt: 2 } })
    expect(Object.keys(useLinkStore.getState().checks).sort()).toEqual(['https://a.com/', 'https://b.com/'])
  })

  it('keeps dismissed even when the new result is broken', () => {
    useLinkStore.setState({
      checks: { 'https://a.com/': { status: 'broken', checkedAt: 1, dismissed: true } },
    })
    useLinkStore.getState().applyScan({ 'https://a.com/': { status: 'broken', checkedAt: 9 } })
    expect(useLinkStore.getState().checks['https://a.com/']).toEqual({
      status: 'broken',
      checkedAt: 9,
      dismissed: true,
    })
  })

  it('an empty scan changes nothing', () => {
    const checks = { 'https://a.com/': { status: 'ok' as const, checkedAt: 1 } }
    useLinkStore.setState({ checks })
    useLinkStore.getState().applyScan({})
    expect(useLinkStore.getState().checks).toEqual(checks)
  })
})

describe('dismiss', () => {
  it('flags an existing entry', () => {
    useLinkStore.setState({ checks: { 'https://a.com/': { status: 'broken', checkedAt: 1 } } })
    useLinkStore.getState().dismiss(['https://a.com/'])
    expect(useLinkStore.getState().checks['https://a.com/']?.dismissed).toBe(true)
  })

  it('does nothing for a URL without an entry', () => {
    useLinkStore.getState().dismiss(['https://nope.com/'])
    expect(useLinkStore.getState().checks).toEqual({})
  })
})

describe('selectBrokenIds', () => {
  const bookmarks = [bm('1', 'https://a.com/x'), bm('2', 'https://a.com/x/'), bm('3', 'https://b.com/')]

  it('returns every bookmark of a broken URL, trailing slash or not', () => {
    const checks = { 'https://a.com/x': { status: 'broken' as const, checkedAt: 1 } }
    expect(selectBrokenIds(bookmarks, checks)).toEqual(new Set(['1', '2']))
  })

  it('is empty once dismissed', () => {
    const checks = { 'https://a.com/x': { status: 'broken' as const, checkedAt: 1, dismissed: true } }
    expect(selectBrokenIds(bookmarks, checks).size).toBe(0)
  })
})

describe('persistence', () => {
  it('saves under its own key and leaves the triage alone', () => {
    useLinkStore.getState().applyScan({ 'https://a.com/': { status: 'broken', checkedAt: 1 } })
    expect(localStorage.getItem(LINKS_PERSIST_KEY)).toContain('https://a.com/')
    expect(localStorage.getItem(PERSIST_KEY)).toBeNull()
  })

  it('starts empty with no saved data', async () => {
    await useLinkStore.persist.rehydrate()
    expect(useLinkStore.getState().checks).toEqual({})
    expect(useLinkStore.getState().firstScanPrompted).toBe(false)
  })

  it('starts empty with corrupt JSON', async () => {
    localStorage.setItem(LINKS_PERSIST_KEY, '{not json')
    await expect(useLinkStore.persist.rehydrate()).resolves.not.toThrow()
    expect(useLinkStore.getState().checks).toEqual({})
    expect(useLinkStore.getState().firstScanPrompted).toBe(false)
  })
})
