import type { Bookmark, BookmarkDocument } from '../types.ts'

// The outcome of a triage: the bookmarks to delete, and nothing else.
export interface BookmarkChange {
  removed: Bookmark[]
}

// `skipped` were not deleted because they changed or disappeared since
// loading; `folders` counts folders left empty and deleted.
export interface CommitResult {
  deleted: number
  skipped: number
  folders: number
  backupFilename: string | null
}

export interface BookmarkSource {
  load(): Promise<BookmarkDocument>
  commit(change: BookmarkChange): Promise<CommitResult>
}
