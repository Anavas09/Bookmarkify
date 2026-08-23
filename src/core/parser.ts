import type { Bookmark } from './types.ts'

export function parseNetscape(html: string): Bookmark[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const anchors = doc.querySelectorAll('a')
  const bookmarks: Bookmark[] = []

  let index = 0
  for (const a of anchors) {
    const url = a.getAttribute('href') ?? ''
    if (!url || url.startsWith('javascript:')) continue

    const addDateRaw = a.getAttribute('add_date')
    const tagsRaw = a.getAttribute('tags')

    bookmarks.push({
      id: String(index++),
      title: a.textContent?.trim() ?? '',
      url,
      addedAt: addDateRaw ? Number(addDateRaw) * 1000 : undefined,
      tags: tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    })
  }

  return bookmarks
}
