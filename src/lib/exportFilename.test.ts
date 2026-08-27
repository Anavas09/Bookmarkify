import { describe, it, expect } from 'vitest'
import { buildExportFilename } from './exportFilename.ts'

describe('buildExportFilename', () => {
  it('formats as bookmarks-YYYY-MM-DD_edited.html', () => {
    expect(buildExportFilename(new Date(2026, 7, 27))).toBe('bookmarks-2026-08-27_edited.html')
  })

  it('pads month and day with leading zero', () => {
    expect(buildExportFilename(new Date(2026, 0, 3))).toBe('bookmarks-2026-01-03_edited.html')
  })
})
