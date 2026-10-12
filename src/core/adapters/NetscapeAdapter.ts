import type { BookmarkDocument } from '../types.ts'
import type { BookmarkChange, BookmarkSource, CommitResult } from '../ports/BookmarkSource.ts'
import { parseNetscape } from '../parser.ts'
import { serializeNetscape } from '../serializer.ts'
import { downloadFile } from './download.ts'

const DEFAULT_FILENAME = 'bookmarks.html'

export class NetscapeAdapter implements BookmarkSource {
  private readonly file: File | null
  private readonly downloadName: string

  constructor(file: File | null, downloadName: string = DEFAULT_FILENAME) {
    this.file = file
    this.downloadName = downloadName
  }

  async load(): Promise<BookmarkDocument> {
    if (this.file === null) {
      throw new Error('NetscapeAdapter was constructed without a file; cannot load')
    }
    const html = await this.file.text()
    return parseNetscape(html)
  }

  // A file can't be edited in place: the kept bookmarks go into a new one.
  async commit({ kept, meta }: BookmarkChange): Promise<CommitResult> {
    downloadFile(this.downloadName, serializeNetscape(kept, meta))
    return { kind: 'downloaded', filename: this.downloadName }
  }
}
