import { useEffect } from 'react'
import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react'

interface Props {
  filename: string
  keptCount: number
  removedCount: number
  onClose: () => void
}

const SHORTCUT_KEYS = new Set([' ', 'j', 'k', 'ArrowLeft', 'ArrowRight'])

export function ExportModal({ filename, keptCount, removedCount, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (SHORTCUT_KEYS.has(e.key)) {
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  return (
    <Dialog open onClose={onClose} className="relative z-30">
      <div
        className="fixed inset-0 bg-ink/40 backdrop-blur-[2px]"
        aria-hidden="true"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-lg rounded-md border border-edge bg-paper-card shadow-lg">
          <header className="px-6 pt-6 pb-4 border-b border-edge">
            <DialogTitle
              as="h2"
              className="font-display text-2xl leading-tight text-ink m-0"
            >
              Export ready
            </DialogTitle>
            <Description
              as="p"
              className="mt-1 font-mono text-[12px] text-ink-mute m-0"
            >
              <span>saved as </span>
              <span className="text-ink-soft">{filename}</span>
            </Description>
            <p className="mt-1 font-mono text-[11px] text-ink-mute m-0">
              {keptCount} kept · {removedCount} removed
            </p>
          </header>

          <div className="px-6 py-5 space-y-5">
            <div className="rounded-sm border border-edge bg-paper-soft p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute m-0 mb-2">
                heads up
              </p>
              <p className="text-[14px] leading-relaxed text-ink-soft m-0">
                Browsers import bookmark HTML{' '}
                <strong className="text-ink">additively</strong>. Reimporting will
                not replace your current bookmarks — the file gets placed in a new{' '}
                <code className="font-mono text-[12px] bg-paper-card px-1 py-[1px] rounded-sm border border-edge">
                  Imported YYYY-MM-DD
                </code>{' '}
                folder inside <em>Other bookmarks</em>. To actually apply the
                triage, delete the discarded ones manually in your browser.
              </p>
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute m-0 mb-2">
                reimport
              </p>
              <ul className="flex flex-col gap-2 font-mono text-[12px] text-ink-soft leading-relaxed list-none p-0 m-0">
                <li>
                  <span className="inline-block w-4 text-ink-mute">→</span>{' '}
                  <strong className="font-medium text-ink">Chrome / Edge / Brave</strong>:{' '}
                  ⋮ · Bookmarks · Bookmarks manager · ⋮ · Import bookmarks
                </li>
                <li>
                  <span className="inline-block w-4 text-ink-mute">→</span>{' '}
                  <strong className="font-medium text-ink">Firefox</strong>:{' '}
                  Library · Bookmarks · Import and Backup · Import Bookmarks from HTML
                </li>
                <li>
                  <span className="inline-block w-4 text-ink-mute">→</span>{' '}
                  <strong className="font-medium text-ink">Safari</strong>:{' '}
                  File · Import From · Bookmarks HTML File
                </li>
              </ul>
            </div>
          </div>

          <footer className="px-6 py-4 border-t border-edge flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-sm border border-ink bg-ink text-paper font-mono text-[12px] tracking-wide transition-colors hover:bg-paper-card hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-mute"
            >
              done
            </button>
          </footer>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
