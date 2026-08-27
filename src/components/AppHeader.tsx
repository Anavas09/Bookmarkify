import { useState } from 'react'
import { useBookmarkStore } from '../store/useBookmarkStore.ts'
import { NetscapeAdapter } from '../core/adapters/NetscapeAdapter.ts'
import { buildExportFilename } from '../lib/exportFilename.ts'
import { cx } from '../lib/cx.ts'
import { FileUpload } from './FileUpload.tsx'
import { ExportModal } from './ExportModal.tsx'

function Key({ children }: { children: string }) {
  return (
    <kbd className="font-mono text-[10.5px] leading-none px-1.5 py-[3px] rounded-sm border border-edge bg-paper-card text-ink-soft">
      {children}
    </kbd>
  )
}

interface ExportedInfo {
  filename: string
  kept: number
  removed: number
}

export function AppHeader() {
  const total = useBookmarkStore(s => s.bookmarks.length)
  const marked = useBookmarkStore(s => s.pendingDeletes.size)
  const exportFiltered = useBookmarkStore(s => s.exportFiltered)
  const kept = total - marked

  const [exporting, setExporting] = useState(false)
  const [lastExport, setLastExport] = useState<ExportedInfo | null>(null)

  async function handleExport() {
    if (marked === 0 || exporting) return
    const filename = buildExportFilename(new Date())
    const adapter = new NetscapeAdapter(null, filename)
    setExporting(true)
    try {
      await exportFiltered(adapter)
      setLastExport({ filename, kept, removed: marked })
    } finally {
      setExporting(false)
    }
  }

  const exportDisabled = marked === 0 || exporting

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-8 px-4 pt-10 pb-6 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl sm:text-5xl leading-none tracking-tight text-ink m-0">
            Bookmarkify
          </h1>
          <span className="h-px w-12 bg-ink" aria-hidden="true" />
          <p className="mt-1 font-mono text-[11px] text-ink-mute m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="flex items-center gap-1">
              <Key>←</Key>
              <Key>→</Key>
              <span>move</span>
            </span>
            <span className="text-edge" aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Key>space</Key>
              <span>toggle mark</span>
            </span>
          </p>
        </div>

        <div className="flex flex-col items-end gap-3 pt-2">
          <p className="font-mono text-[13px] tracking-wide text-ink-soft m-0 flex items-baseline gap-1.5">
            <span>{total} total</span>
            <span className="text-ink-mute" aria-hidden="true">·</span>
            <span>{kept} kept</span>
            <span className="text-ink-mute" aria-hidden="true">·</span>
            <span className={marked > 0 ? 'text-accent' : undefined}>
              {marked} marked
            </span>
          </p>
          <div className="flex items-center gap-4">
            <FileUpload variant="button" />
            <button
              type="button"
              onClick={handleExport}
              disabled={exportDisabled}
              title={marked === 0 ? 'mark at least one to export' : 'download filtered HTML'}
              className={cx(
                'font-mono text-[12px] tracking-wide px-3 py-1.5 rounded-sm border transition-colors',
                exportDisabled
                  ? 'border-edge text-ink-mute cursor-not-allowed'
                  : 'border-ink bg-ink text-paper hover:bg-paper-card hover:text-ink',
              )}
            >
              {exporting ? 'exporting…' : 'export'}
            </button>
          </div>
        </div>
      </header>

      {lastExport && (
        <ExportModal
          filename={lastExport.filename}
          keptCount={lastExport.kept}
          removedCount={lastExport.removed}
          onClose={() => setLastExport(null)}
        />
      )}
    </>
  )
}
