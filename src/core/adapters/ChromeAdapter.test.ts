import { describe, it, expect, vi } from 'vitest'
import { ChromeAdapter, type BookmarksApi } from './ChromeAdapter.ts'
import { createFakeBookmarks, type FakeTree } from './fakeChromeBookmarks.ts'
import { BackupFailedError, type BookmarkChange } from '../ports/BookmarkSource.ts'
import type { BackupSaver } from './chromeBackup.ts'

// Ids count up as in Chrome: "0" is the root; "1", "2" and "3" are the
// bookmarks bar, other bookmarks and mobile bookmarks; the seed starts at "4".

const WITH_COPY = { backup: true }

// A saver that reports the file as saved under the name it was given.
function fakeSaver(save: BackupSaver['save'] = filename => Promise.resolve(filename)) {
  return { allow: vi.fn(() => Promise.resolve(true)), save: vi.fn(save) }
}

function setup(tree: FakeTree) {
  const fake = createFakeBookmarks(tree)
  const backup = fakeSaver()
  return { fake, backup, adapter: new ChromeAdapter(fake, backup) }
}

// Loads, then marks for deletion the bookmarks with these titles.
async function loadAndMark(adapter: ChromeAdapter, ...titles: string[]): Promise<BookmarkChange> {
  const { bookmarks } = await adapter.load()
  return { removed: bookmarks.filter(b => titles.includes(b.title)) }
}

// Every title left in Chrome, depth-first, without the root's.
async function titlesIn(api: BookmarksApi): Promise<string[]> {
  const out: string[] = []
  const visit = (node: chrome.bookmarks.BookmarkTreeNode) => {
    out.push(node.title)
    node.children?.forEach(visit)
  }
  const [root] = await api.getTree()
  root.children?.forEach(visit)
  return out
}

describe('ChromeAdapter', () => {
  describe('load()', () => {
    it("reads each bookmark with its Chrome id, date and folders, in the manager's order", async () => {
      const { adapter } = setup({
        bar: [
          { title: 'React', url: 'https://react.dev', dateAdded: 1000 },
          { title: 'Work', children: [{ title: 'Vite', url: 'https://vite.dev', dateAdded: 2000 }] },
          { title: 'MDN', url: 'https://developer.mozilla.org', dateAdded: 3000 },
        ],
        other: [{ title: 'Recipes', url: 'https://recipes.example', dateAdded: 4000 }],
      })

      const { bookmarks } = await adapter.load()

      expect(bookmarks).toEqual([
        {
          id: '4',
          title: 'React',
          url: 'https://react.dev',
          addedAt: 1000,
          folderPath: ['Bookmarks bar'],
          folderIds: ['1'],
          inAccount: false,
        },
        {
          id: '6',
          title: 'Vite',
          url: 'https://vite.dev',
          addedAt: 2000,
          folderPath: ['Bookmarks bar', 'Work'],
          folderIds: ['1', '5'],
          inAccount: false,
        },
        {
          id: '7',
          title: 'MDN',
          url: 'https://developer.mozilla.org',
          addedAt: 3000,
          folderPath: ['Bookmarks bar'],
          folderIds: ['1'],
          inAccount: false,
        },
        {
          id: '8',
          title: 'Recipes',
          url: 'https://recipes.example',
          addedAt: 4000,
          folderPath: ['Other bookmarks'],
          folderIds: ['2'],
          inAccount: false,
        },
      ])
    })

    it("tells the account's bookmarks from the device's, and sibling folders with one name apart by id", async () => {
      const { adapter } = setup({
        bar: [
          { title: 'Work', children: [{ title: 'first', url: 'https://first.example' }] },
          { title: 'Work', children: [{ title: 'second', url: 'https://second.example' }] },
        ],
        account: { bar: [{ title: 'Work', children: [{ title: 'synced', url: 'https://synced.example' }] }] },
      })

      const { bookmarks } = await adapter.load()

      // Two "Bookmarks bar" (ids 1 and 8), and three "Work" folders (4, 6 and 11).
      expect(bookmarks.map(b => [b.title, b.folderIds, b.inAccount])).toEqual([
        ['first', ['1', '4'], false],
        ['second', ['1', '6'], false],
        ['synced', ['8', '11'], true],
      ])
      expect(bookmarks.map(b => b.folderPath)).toEqual([
        ['Bookmarks bar', 'Work'],
        ['Bookmarks bar', 'Work'],
        ['Bookmarks bar', 'Work'],
      ])
    })

    it('leaves out bookmarklets and the bookmarks an administrator set up', async () => {
      const { adapter } = setup({
        bar: [
          { title: 'Kept', url: 'https://kept.example' },
          { title: 'Bookmarklet', url: 'javascript:void(0)' },
        ],
        managed: [{ title: 'Intranet', url: 'https://intranet.example' }],
      })

      const { bookmarks } = await adapter.load()

      expect(bookmarks.map(b => b.title)).toEqual(['Kept'])
    })
  })

  describe('commit()', () => {
    it('deletes the removed bookmarks and nothing else, not even what was added later', async () => {
      const { fake, adapter } = setup({
        bar: [
          { title: 'a', url: 'https://a.example' },
          { title: 'b', url: 'https://b.example' },
          { title: 'c', url: 'https://c.example' },
        ],
      })
      const change = await loadAndMark(adapter, 'b')
      await fake.create({ parentId: '1', title: 'added later', url: 'https://later.example' })

      const result = await adapter.commit(change, WITH_COPY)

      expect(result).toEqual({
        deleted: 1,
        skipped: 0,
        folders: 0,
        backupFilename: expect.stringMatching(/^bookmarks-\d{4}-\d{2}-\d{2}_deleted\.html$/),
      })
      expect(await titlesIn(fake)).toEqual([
        'Bookmarks bar', 'a', 'c', 'added later',
        'Other bookmarks',
        'Mobile bookmarks',
      ])
    })

    it('saves a copy with only the doomed bookmarks before deleting anything', async () => {
      const fake = createFakeBookmarks({
        bar: [
          { title: 'Kept', url: 'https://kept.example' },
          { title: 'Work', children: [{ title: 'Gone', url: 'https://gone.example' }] },
          // After "Work", so the ids the removes check stay the same.
          { title: 'Keep', children: [{ title: 'Stays', url: 'https://stays.example' }] },
        ],
      })
      const order: string[] = []
      const backup = fakeSaver((filename, content) => {
        order.push(`save ${filename} (${content.length} chars)`)
        return Promise.resolve(filename)
      })
      const adapter = new ChromeAdapter(
        {
          ...fake,
          remove: id => {
            order.push(`remove ${id}`)
            return fake.remove(id)
          },
        },
        backup,
      )
      const change = await loadAndMark(adapter, 'Gone')

      const result = await adapter.commit(change, WITH_COPY)

      expect(order[0]).toMatch(/^save /)
      expect(order.slice(1)).toEqual(['remove 6', 'remove 5'])
      const [filename, html] = backup.save.mock.calls[0]
      expect(filename).toBe(result.backupFilename)
      expect(html).toContain('<H3>Bookmarks bar</H3>')
      expect(html).toContain('<H3>Work</H3>')
      expect(html).toContain('HREF="https://gone.example"')
      expect(html).not.toContain('kept.example')
      // A sibling folder that keeps everything has no place in the copy.
      expect(html).not.toContain('<H3>Keep</H3>')
      expect(html).not.toContain('stays.example')
    })

    it('keeps sibling folders with the same name apart in the copy', async () => {
      const { backup, adapter } = setup({
        bar: [
          { title: 'Work', children: [{ title: 'a', url: 'https://a.example' }] },
          { title: 'Work', children: [{ title: 'b', url: 'https://b.example' }] },
        ],
        account: { bar: [{ title: 'c', url: 'https://c.example' }] },
      })
      const change = await loadAndMark(adapter, 'a', 'b', 'c')

      await adapter.commit(change, WITH_COPY)

      const html = backup.save.mock.calls[0][1]
      expect(html.match(/<H3>Work<\/H3>/g)).toHaveLength(2)
      // The account's own bar is another folder, even with the same name.
      expect(html.match(/<H3>Bookmarks bar<\/H3>/g)).toHaveLength(2)
    })

    it("writes the copy in Chrome's order, whatever the order of the change", async () => {
      const { backup, adapter } = setup({
        bar: [
          { title: 'x', url: 'https://x.example' },
          { title: 'Sub', children: [{ title: 's', url: 'https://s.example' }] },
          { title: 'y', url: 'https://y.example' },
        ],
      })
      const { removed } = await loadAndMark(adapter, 'x', 's', 'y')

      await adapter.commit({ removed: removed.toReversed() }, WITH_COPY)

      const html = backup.save.mock.calls[0][1]
      const at = (text: string) => html.indexOf(text)
      expect(at('>x</A>')).toBeLessThan(at('<H3>Sub</H3>'))
      expect(at('>s</A>')).toBeLessThan(at('>y</A>'))
    })

    it('leaves alone what was deleted or got another url in Chrome since loading', async () => {
      const { fake, backup, adapter } = setup({
        bar: [
          { title: 'deleted meanwhile', url: 'https://a.example' },
          { title: 'edited', url: 'https://b.example' },
          { title: 'renamed', url: 'https://c.example' },
        ],
      })
      const change = await loadAndMark(adapter, 'deleted meanwhile', 'edited', 'renamed')
      await fake.remove('4')
      await fake.update('5', { url: 'https://b.example/new' })
      await fake.update('6', { title: 'renamed in Chrome' })

      const result = await adapter.commit(change, WITH_COPY)

      // Same url, so the renamed one goes, and the copy has its new title.
      expect(result).toMatchObject({ deleted: 1, skipped: 2 })
      expect(await titlesIn(fake)).toEqual(['Bookmarks bar', 'edited', 'Other bookmarks', 'Mobile bookmarks'])
      const html = backup.save.mock.calls[0][1]
      expect(html).toContain('>renamed in Chrome</A>')
      expect(html).not.toContain('b.example')
    })

    it('deletes the folders it leaves empty, climbing up', async () => {
      const { fake, adapter } = setup({
        bar: [
          { title: 'Work', children: [{ title: 'Old', children: [{ title: 'x', url: 'https://x.example' }] }] },
          { title: 'keep', url: 'https://keep.example' },
        ],
        other: [
          {
            title: 'Trash',
            children: [
              { title: 'Deeper', children: [{ title: 'y', url: 'https://y.example' }] },
              { title: 'z', url: 'https://z.example' },
            ],
          },
        ],
      })
      const change = await loadAndMark(adapter, 'x', 'y', 'z')

      const result = await adapter.commit(change, WITH_COPY)

      expect(result).toMatchObject({ deleted: 3, skipped: 0, folders: 4 })
      expect(await titlesIn(fake)).toEqual(['Bookmarks bar', 'keep', 'Other bookmarks', 'Mobile bookmarks'])
    })

    it("keeps folders with something left, folders that were empty already and the browser's own", async () => {
      const { fake, adapter } = setup({
        bar: [{ title: 'the only one', url: 'https://one.example' }],
        other: [
          {
            title: 'With a bookmarklet',
            children: [
              { title: 'a', url: 'https://a.example' },
              { title: 'tool', url: 'javascript:void(0)' },
            ],
          },
          {
            title: 'With a kept one',
            children: [
              { title: 'b', url: 'https://b.example' },
              { title: 'kept', url: 'https://kept.example' },
            ],
          },
          { title: 'Empty from before', children: [] },
        ],
      })
      const change = await loadAndMark(adapter, 'the only one', 'a', 'b')

      const result = await adapter.commit(change, WITH_COPY)

      expect(result).toMatchObject({ deleted: 3, folders: 0 })
      expect(await titlesIn(fake)).toEqual([
        'Bookmarks bar',
        'Other bookmarks', 'With a bookmarklet', 'tool', 'With a kept one', 'kept', 'Empty from before',
        'Mobile bookmarks',
      ])
    })

    it('counts a deletion Chrome refuses as skipped and carries on', async () => {
      const fake = createFakeBookmarks({
        bar: [
          { title: 'a', url: 'https://a.example' },
          { title: 'b', url: 'https://b.example' },
          { title: 'c', url: 'https://c.example' },
        ],
      })
      const adapter = new ChromeAdapter(
        { ...fake, remove: id => (id === '5' ? Promise.reject(new Error('refused')) : fake.remove(id)) },
        fakeSaver(),
      )
      const change = await loadAndMark(adapter, 'a', 'b', 'c')

      const result = await adapter.commit(change, WITH_COPY)

      expect(result).toMatchObject({ deleted: 2, skipped: 1 })
      expect(await titlesIn(fake)).toEqual(['Bookmarks bar', 'b', 'Other bookmarks', 'Mobile bookmarks'])
    })

    it('saves no copy when nothing is left to delete', async () => {
      const { fake, backup, adapter } = setup({ bar: [{ title: 'a', url: 'https://a.example' }] })
      const change = await loadAndMark(adapter, 'a')
      await fake.remove('4')

      const result = await adapter.commit(change, WITH_COPY)

      expect(result).toEqual({ deleted: 0, skipped: 1, folders: 0, backupFilename: null })
      expect(backup.save).not.toHaveBeenCalled()
    })

    it('reports the name the copy was saved under, which Chrome may have changed', async () => {
      const fake = createFakeBookmarks({ bar: [{ title: 'a', url: 'https://a.example' }] })
      const adapter = new ChromeAdapter(fake, fakeSaver(() => Promise.resolve('bookmarks-2026-10-27_deleted (1).html')))
      const change = await loadAndMark(adapter, 'a')

      const result = await adapter.commit(change, WITH_COPY)

      expect(result.backupFilename).toBe('bookmarks-2026-10-27_deleted (1).html')
    })

    it('deletes nothing when the copy could not be saved', async () => {
      const fake = createFakeBookmarks({ bar: [{ title: 'a', url: 'https://a.example' }] })
      const adapter = new ChromeAdapter(fake, fakeSaver(() => Promise.reject(new Error('USER_CANCELED'))))
      const change = await loadAndMark(adapter, 'a')

      await expect(adapter.commit(change, WITH_COPY)).rejects.toBeInstanceOf(BackupFailedError)

      expect(await titlesIn(fake)).toEqual(['Bookmarks bar', 'a', 'Other bookmarks', 'Mobile bookmarks'])
    })

    it('deletes without a copy when told to', async () => {
      const { fake, backup, adapter } = setup({ bar: [{ title: 'a', url: 'https://a.example' }] })
      const change = await loadAndMark(adapter, 'a')

      const result = await adapter.commit(change, { backup: false })

      expect(result).toEqual({ deleted: 1, skipped: 0, folders: 0, backupFilename: null })
      expect(backup.save).not.toHaveBeenCalled()
      expect(await titlesIn(fake)).toEqual(['Bookmarks bar', 'Other bookmarks', 'Mobile bookmarks'])
    })
  })

  describe('allowBackup()', () => {
    it('asks the saver for what it needs', async () => {
      const { backup, adapter } = setup({})

      expect(await adapter.allowBackup()).toBe(true)
      expect(backup.allow).toHaveBeenCalledOnce()
    })
  })
})
