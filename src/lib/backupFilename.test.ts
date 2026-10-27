import { describe, it, expect } from 'vitest'
import { buildBackupFilename } from './backupFilename.ts'

describe('buildBackupFilename', () => {
  it('formats as bookmarks-YYYY-MM-DD_deleted.html', () => {
    expect(buildBackupFilename(new Date(2026, 9, 2))).toBe('bookmarks-2026-10-02_deleted.html')
  })

  it('pads month and day with leading zero', () => {
    expect(buildBackupFilename(new Date(2026, 0, 3))).toBe('bookmarks-2026-01-03_deleted.html')
  })
})
