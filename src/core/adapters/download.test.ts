import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { downloadFile } from './download.ts'

describe('downloadFile', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('downloads the content under the given name and frees the blob', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadFile('backup.html', '<DL><p>\n</DL><p>\n')

    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob
    expect(await blob.text()).toBe('<DL><p>\n</DL><p>\n')
    expect(clickSpy).toHaveBeenCalledOnce()
    expect((clickSpy.mock.contexts[0] as HTMLAnchorElement).download).toBe('backup.html')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })
})
