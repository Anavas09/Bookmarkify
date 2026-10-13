import type { Bookmark, BookmarkDocument, DocumentMeta } from '../types.ts'

// The outcome of a triage. Each adapter takes the list it needs: a file
// keeps `kept`, while a live source deletes `removed` and nothing else.
export interface BookmarkChange {
  kept: Bookmark[]
  removed: Bookmark[]
  meta: DocumentMeta
}

export type CommitResult =
  // A filtered copy was saved; the source itself did not change.
  | { kind: 'downloaded'; filename: string }
  // The source changed. `skipped` were not deleted because they changed or
  // disappeared since loading; `folders` counts folders left empty and deleted.
  | {
      kind: 'applied'
      deleted: number
      skipped: number
      folders: number
      backupFilename: string | null
    }

export interface BookmarkSource {
  load(): Promise<BookmarkDocument>
  commit(change: BookmarkChange): Promise<CommitResult>
}
