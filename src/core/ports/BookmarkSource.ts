import type { Bookmark, BookmarkDocument } from '../types.ts'

// The outcome of a triage: the bookmarks to delete, and nothing else.
export interface BookmarkChange {
  removed: Bookmark[]
}

export interface CommitOptions {
  // Save a copy of what is deleted first. Without it, nothing is saved.
  backup: boolean
}

// `skipped` were not deleted because they changed or disappeared since
// loading; `folders` counts folders left empty and deleted.
// `backupFilename` is the name the copy was saved under, or null if none was.
export interface CommitResult {
  deleted: number
  skipped: number
  folders: number
  backupFilename: string | null
}

// The copy could not be saved, so nothing was deleted.
export class BackupFailedError extends Error {
  constructor(cause?: unknown) {
    super('The backup could not be saved.')
    this.name = 'BackupFailedError'
    this.cause = cause
  }
}

export interface BookmarkSource {
  load(): Promise<BookmarkDocument>
  // Asks for whatever saving a copy needs. Call it straight from the click
  // that confirms: browsers only show a permission prompt for a user gesture.
  allowBackup(): Promise<boolean>
  commit(change: BookmarkChange, options: CommitOptions): Promise<CommitResult>
}
