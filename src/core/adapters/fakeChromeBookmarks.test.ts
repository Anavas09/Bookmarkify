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
