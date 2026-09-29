import type { BookmarkDocument } from '../types.ts'

export interface BookmarkSource {
  load(): Promise<BookmarkDocument>
  export(doc: BookmarkDocument): Promise<void>
}
