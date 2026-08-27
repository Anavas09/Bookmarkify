import type { Bookmark } from '../types.ts'
import type { BookmarkSource } from '../ports/BookmarkSource.ts'
import { parseNetscape } from '../parser.ts'
import { serializeNetscape } from '../serializer.ts'

const DEFAULT_FILENAME = 'bookmarks.html'

export class NetscapeAdapter implements BookmarkSource {
  private readonly file: File | null
  private readonly downloadName: string

  constructor(file: File | null, downloadName: string = DEFAULT_FILENAME) {
    this.file = file
    this.downloadName = downloadName
  }

  async load(): Promise<Bookmark[]> {
    if (this.file === null) {
      throw new Error('NetscapeAdapter was constructed without a file; cannot load')
    }
    const html = await this.file.text()
    return parseNetscape(html)
  }

  async export(bookmarks: Bookmark[]): Promise<void> {
    const html = serializeNetscape(bookmarks)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    try {
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = this.downloadName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}
