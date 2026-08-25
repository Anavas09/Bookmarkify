import type { Bookmark } from './types.ts'

export function parseNetscape(html: string): Bookmark[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const rootDL = doc.querySelector('dl')
  const bookmarks: Bookmark[] = []
  if (rootDL) {
    walk(rootDL, [], bookmarks, { i: 0 })
  }
  return bookmarks
}

interface Counter { i: number }

function walk(dl: Element, folderPath: string[], out: Bookmark[], counter: Counter): void {
  for (const dt of directChildren(dl, 'DT')) {
    const h3 = firstChildByTag(dt, 'H3')
    if (h3) {
      const name = (h3.textContent ?? '').trim()
      if (!name) continue
      const contents = findFolderContentsDL(dt)
      if (contents) walk(contents, [...folderPath, name], out, counter)
      continue
    }

    const anchor = firstChildByTag(dt, 'A')
    if (!anchor) continue

    const url = anchor.getAttribute('href') ?? ''
    if (!url || url.startsWith('javascript:')) continue

    const addDateRaw = anchor.getAttribute('add_date')
    const tagsRaw = anchor.getAttribute('tags')

    out.push({
      id: String(counter.i++),
      title: anchor.textContent?.trim() ?? '',
      url,
      addedAt: addDateRaw ? Number(addDateRaw) * 1000 : undefined,
      tags: tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      folderPath: folderPath.length > 0 ? [...folderPath] : undefined,
    })
  }
}

function directChildren(el: Element, tag: string): Element[] {
  const upper = tag.toUpperCase()
  const out: Element[] = []
  for (let c = el.firstElementChild; c; c = c.nextElementSibling) {
    if (c.tagName === upper) out.push(c)
  }
  return out
}

function firstChildByTag(el: Element, tag: string): Element | null {
  const upper = tag.toUpperCase()
  for (let c = el.firstElementChild; c; c = c.nextElementSibling) {
    if (c.tagName === upper) return c
  }
  return null
}

/**
 * The folder's contents DL is normally the next DL sibling of the DT that
 * wraps the H3 (Chrome / Firefox / Safari). Some exports nest it inside the
 * DT instead — try that first as a fallback.
 */
function findFolderContentsDL(dtWithH3: Element): Element | null {
  const nested = firstChildByTag(dtWithH3, 'DL')
  if (nested) return nested
  for (let s = dtWithH3.nextElementSibling; s; s = s.nextElementSibling) {
    if (s.tagName === 'DL') return s
  }
  return null
}
