import { downloadFile } from './download.ts'

// Where the copy of the deleted bookmarks goes.
export interface BackupSaver {
  // Asks for what saving needs; true if it is available.
  allow(): Promise<boolean>
  // Resolves with the name the file was saved under once it is on disk, and
  // rejects if it was not saved.
  save(filename: string, content: string): Promise<string>
}

// Saves with chrome.downloads, which reports whether the file made it to
// disk and under what name. The permission is optional: it is asked for the
// first time a copy is made.
export function createChromeBackup(): BackupSaver {
  return {
    // No await before the request: the prompt needs the click's user gesture.
    allow: () => chrome.permissions.request({ permissions: ['downloads'] }),

    async save(filename, content) {
      const url = URL.createObjectURL(new Blob([content], { type: 'text/html;charset=utf-8' }))
      try {
        const id = await chrome.downloads.download({ url, filename, conflictAction: 'uniquify' })
        const item = await finished(id)
        return baseName(item.filename)
      } finally {
        URL.revokeObjectURL(url)
      }
    },
  }
}

// Resolves when the download is complete and rejects if it was interrupted
// (the save dialog cancelled, a full disk, a policy). Listens before it
// looks, so a state change in between is not missed.
function finished(id: number): Promise<chrome.downloads.DownloadItem> {
  return new Promise((resolve, reject) => {
    const settle = (done: () => void) => {
      chrome.downloads.onChanged.removeListener(onChanged)
      done()
    }
    const check = async () => {
      const [item] = await chrome.downloads.search({ id })
      if (item === undefined) settle(() => reject(new Error('The download disappeared.')))
      else if (item.state === 'complete') settle(() => resolve(item))
      else if (item.state === 'interrupted') settle(() => reject(new Error(item.error)))
    }
    const onChanged = (delta: chrome.downloads.DownloadDelta) => {
      if (delta.id === id && delta.state !== undefined) check().catch(reject)
    }
    chrome.downloads.onChanged.addListener(onChanged)
    check().catch(reject)
  })
}

function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

// For `npm run dev`, where there is no chrome.downloads: a link with
// `download`, which says nothing about whether the file was saved.
export function createLinkBackup(): BackupSaver {
  return {
    allow: () => Promise.resolve(true),
    save(filename, content) {
      downloadFile(filename, content)
      return Promise.resolve(filename)
    },
  }
}
