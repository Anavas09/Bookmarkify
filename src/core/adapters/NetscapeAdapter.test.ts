import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NetscapeAdapter } from './NetscapeAdapter.ts'

const HTML = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
  <DT><A HREF="https://example.com" ADD_DATE="1700000000">Example</A>
  <DT><A HREF="https://openai.com" TAGS="ai">OpenAI</A>
</DL>`

describe('NetscapeAdapter', () => {
  it('load() reads the file and returns parsed bookmarks', async () => {
    const file = new File([HTML], 'bookmarks.html', { type: 'text/html' })
    const adapter = new NetscapeAdapter(file)
    const bookmarks = await adapter.load()

    expect(bookmarks).toHaveLength(2)
    expect(bookmarks[0].url).toBe('https://example.com')
    expect(bookmarks[1].tags).toEqual(['ai'])
  })

  it('load() throws when constructed without a file', async () => {
    const adapter = new NetscapeAdapter(null, 'out.html')
    await expect(adapter.load()).rejects.toThrow(/without a file/i)
  })

  describe('export()', () => {
    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => 'blob:mock')
      URL.revokeObjectURL = vi.fn()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('triggers a download with the serialized HTML', async () => {
      const file = new File([''], 'in.html')
      const adapter = new NetscapeAdapter(file, 'out.html')
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

      await adapter.export([{ id: '0', title: 'X', url: 'https://x.com' }])

      expect(URL.createObjectURL).toHaveBeenCalledOnce()
      const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob
      const text = await blob.text()
      expect(text).toContain('HREF="https://x.com"')
      expect(clickSpy).toHaveBeenCalledOnce()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    })
  })
})
