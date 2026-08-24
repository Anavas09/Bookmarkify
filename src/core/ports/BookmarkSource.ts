import type { Bookmark } from '../types.ts'

export interface BookmarkSource {
  load(): Promise<Bookmark[]>
  export(bookmarks: Bookmark[]): Promise<void>
}
