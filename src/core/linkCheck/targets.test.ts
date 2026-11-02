import { describe, expect, it } from 'vitest'
import type { Bookmark } from '../types.ts'
import type { LinkChecks } from './types.ts'
import { RESCAN_AFTER_DAYS, selectScanTargets } from './targets.ts'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 10, 2)

const bm = (id: string, url: string): Bookmark => ({ id, title: id, url })

describe('selectScanTargets', () => {
  it('uses 30 days as the age after which a link is checked again', () => {
    expect(RESCAN_AFTER_DAYS).toBe(30)
  })

  it('includes a bookmark that was never checked', () => {
    expect(selectScanTargets([bm('1', 'https://a.com/x')], {}, NOW)).toEqual(['https://a.com/x'])
  })

  it('lists a URL once even when two bookmarks share it', () => {
    const bookmarks = [bm('1', 'https://a.com/x'), bm('2', 'https://a.com/x/')]
    expect(selectScanTargets(bookmarks, {}, NOW)).toHaveLength(1)
  })

  it('includes a recent broken link, but not a recent ok one', () => {
    const checks: LinkChecks = {
      'https://a.com/x': { status: 'broken', checkedAt: NOW - DAY },
      'https://b.com/y': { status: 'ok', checkedAt: NOW - DAY },
    }
    const bookmarks = [bm('1', 'https://a.com/x'), bm('2', 'https://b.com/y')]
    expect(selectScanTargets(bookmarks, checks, NOW)).toEqual(['https://a.com/x'])
  })

  it.each(['ok', 'unknown'] as const)('includes a %s link checked 31 days ago', status => {
    const checks: LinkChecks = { 'https://a.com/x': { status, checkedAt: NOW - 31 * DAY } }
    expect(selectScanTargets([bm('1', 'https://a.com/x')], checks, NOW)).toEqual(['https://a.com/x'])
  })

  it('leaves out what the user dismissed, broken or old', () => {
    const checks: LinkChecks = {
      'https://a.com/x': { status: 'broken', checkedAt: NOW - DAY, dismissed: true },
      'https://b.com/y': { status: 'ok', checkedAt: NOW - 90 * DAY, dismissed: true },
    }
    const bookmarks = [bm('1', 'https://a.com/x'), bm('2', 'https://b.com/y')]
    expect(selectScanTargets(bookmarks, checks, NOW)).toEqual([])
  })

  it('skips what is not http(s)', () => {
    const bookmarks = [bm('1', 'chrome://settings'), bm('2', 'javascript:void(0)')]
    expect(selectScanTargets(bookmarks, {}, NOW)).toEqual([])
  })
})
