import { describe, it, expect } from 'vitest'
import { createFakeBookmarks } from './fakeChromeBookmarks.ts'

describe('createFakeBookmarks', () => {
  it("lays out the root and the browser's folders as Chrome does", async () => {
    const [root] = await createFakeBookmarks().getTree()

    expect(root.id).toBe('0')
    expect(root.children?.map(f => [f.id, f.title, f.folderType])).toEqual([
      ['1', 'Bookmarks bar', 'bookmarks-bar'],
      ['2', 'Other bookmarks', 'other'],
      ['3', 'Mobile bookmarks', 'mobile'],
    ])
  })

  it("adds the account's own set of browser folders, marked as syncing along with what they hold", async () => {
    const fake = createFakeBookmarks({
      bar: [{ title: 'local', url: 'https://local.example' }],
      account: { bar: [{ title: 'Work', children: [{ title: 'synced', url: 'https://synced.example' }] }] },
    })

    const [root] = await fake.getTree()

    // The account's folders come after the local seed, so the ids of tests without one don't move.
    expect(root.children?.map(f => [f.id, f.title, f.folderType, f.syncing])).toEqual([
      ['1', 'Bookmarks bar', 'bookmarks-bar', false],
      ['2', 'Other bookmarks', 'other', false],
      ['3', 'Mobile bookmarks', 'mobile', false],
      ['5', 'Bookmarks bar', 'bookmarks-bar', true],
      ['6', 'Other bookmarks', 'other', true],
      ['7', 'Mobile bookmarks', 'mobile', true],
    ])
    const [work] = root.children?.[3].children ?? []
    expect([work.title, work.syncing]).toEqual(['Work', true])
    expect(work.children?.map(c => [c.title, c.syncing])).toEqual([['synced', true]])
    expect(root.children?.[0].children?.map(c => c.syncing)).toEqual([false])
  })

  it("refuses to remove the account's browser folders, as with the local ones", async () => {
    const fake = createFakeBookmarks({ account: {} })

    await expect(fake.remove('4')).rejects.toThrow(/root/)
  })

  it("refuses to remove the browser's folders, a folder with something inside and an administrator's bookmarks", async () => {
    const fake = createFakeBookmarks({
      bar: [{ title: 'Folder', children: [{ title: 'a', url: 'https://a.example' }] }],
      managed: [{ title: 'Intranet', url: 'https://intranet.example' }],
    })

    await expect(fake.remove('0')).rejects.toThrow(/root/)
    await expect(fake.remove('1')).rejects.toThrow(/root/)
    await expect(fake.remove('4')).rejects.toThrow(/non-empty/)
    await expect(fake.remove('7')).rejects.toThrow(/managed/)
  })

  it('removes a bookmark or an empty folder and moves up the ones after it', async () => {
    const fake = createFakeBookmarks({
      bar: [
        { title: 'Empty', children: [] },
        { title: 'a', url: 'https://a.example' },
      ],
    })

    await fake.remove('4')

    const children = await fake.getChildren('1')
    expect(children.map(c => [c.title, c.index])).toEqual([['a', 0]])
  })
})
