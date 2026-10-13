import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NetscapeAdapter } from './NetscapeAdapter.ts'

const HTML = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
  <DT><A HREF="https://example.com" ADD_DATE="1700000000">Example</A>
  <DT><A HREF="https://openai.com" TAGS="ai">OpenAI</A>
</DL>`

describe('NetscapeAdapter', () => {
  it('load() reads the file and returns a document with parsed bookmarks', async () => {
    const file = new File([HTML], 'bookmarks.html', { type: 'text/html' })
    const adapter = new NetscapeAdapter(file)
    const { bookmarks, meta } = await adapter.load()

    expect(bookmarks).toHaveLength(2)
    expect(bookmarks[0].url).toBe('https://example.com')
    expect(bookmarks[1].tags).toEqual(['ai'])
    expect(meta).toEqual({})
  })

  it('load() throws when constructed without a file', async () => {
    const adapter = new NetscapeAdapter(null, 'out.html')
    await expect(adapter.load()).rejects.toThrow(/without a file/i)
  })

  describe('commit()', () => {
    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => 'blob:mock')
      URL.revokeObjectURL = vi.fn()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('downloads the kept bookmarks as HTML and leaves the removed ones out', async () => {
      const file = new File([''], 'in.html')
      const adapter = new NetscapeAdapter(file, 'out.html')
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

      const result = await adapter.commit({
        kept: [{ id: '0', title: 'X', url: 'https://x.com' }],
        removed: [{ id: '1', title: 'Y', url: 'https://y.com' }],
        meta: {},
      })

      expect(result).toEqual({ kind: 'downloaded', filename: 'out.html' })
      expect(URL.createObjectURL).toHaveBeenCalledOnce()
      const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob
      const text = await blob.text()
      expect(text).toContain('HREF="https://x.com"')
      expect(text).not.toContain('https://y.com')
      expect(clickSpy).toHaveBeenCalledOnce()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    })
  })
})
