import { describe, it, expect, vi, afterEach } from 'vitest'
import { createBookmarkSource } from './createBookmarkSource.ts'
import { createFakeBookmarks } from './fakeChromeBookmarks.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('createBookmarkSource', () => {
  it("reads Chrome's bookmarks inside the extension", async () => {
    vi.stubGlobal('chrome', {
      bookmarks: createFakeBookmarks({ bar: [{ title: 'From Chrome', url: 'https://chrome.example' }] }),
    })

    const { bookmarks } = await createBookmarkSource().load()

    expect(bookmarks.map(b => b.title)).toEqual(['From Chrome'])
  })

  it('reads the sample bookmarks under npm run dev', async () => {
    const { bookmarks } = await createBookmarkSource().load()

    expect(bookmarks.length).toBeGreaterThan(0)
    expect(bookmarks.some(b => b.url.startsWith('javascript:'))).toBe(false)
  })

  it('outside the extension and outside dev, fails saying where to open it', async () => {
    vi.stubEnv('DEV', false)

    await expect(createBookmarkSource().load()).rejects.toThrow(/extension icon/)
  })
})
