import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBookmarkStore, useVisibleBookmarks } from '../store/useBookmarkStore.ts'
import { NetscapeAdapter } from '../core/adapters/NetscapeAdapter.ts'
import { buildExportFilename } from '../lib/exportFilename.ts'
import { cx } from '../lib/cx.ts'
import { isMac } from '../lib/platform.ts'
import { FileUpload } from './FileUpload.tsx'
import { ExportModal } from './ExportModal.tsx'
import { ThemeToggle } from './ThemeToggle.tsx'
import { LanguageToggle } from './LanguageToggle.tsx'

const BULK_BTN_CLASS =
  'font-mono text-[11px] text-ink-mute hover:text-ink underline underline-offset-2 ' +
  'decoration-transparent hover:decoration-current transition-colors cursor-pointer'

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
  const { t } = useTranslation()
  const total = useBookmarkStore(s => s.bookmarks.length)
  const marked = useBookmarkStore(s => s.pendingDeletes.size)
  const exportFiltered = useBookmarkStore(s => s.exportFiltered)
  const markAllVisible = useBookmarkStore(s => s.markAllVisible)
  const unmarkAllVisible = useBookmarkStore(s => s.unmarkAllVisible)
  const pendingDeletes = useBookmarkStore(s => s.pendingDeletes)
  const selected = useBookmarkStore(s => s.selected)
  const deleteSelected = useBookmarkStore(s => s.deleteSelected)
  const restoreSelected = useBookmarkStore(s => s.restoreSelected)
  const clearSelection = useBookmarkStore(s => s.clearSelection)
  const visible = useVisibleBookmarks()
  const kept = total - marked
  const mac = isMac()

  const { markedInSelection, unmarkedInSelection } = useMemo(() => {
    let m = 0
    for (const id of selected) if (pendingDeletes.has(id)) m++
    return { markedInSelection: m, unmarkedInSelection: selected.size - m }
  }, [selected, pendingDeletes])

  const { markedInVisible, unmarkedInVisible } = useMemo(() => {
    let m = 0
    for (const b of visible) if (pendingDeletes.has(b.id)) m++
    return { markedInVisible: m, unmarkedInVisible: visible.length - m }
  }, [visible, pendingDeletes])

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
              <span>{t('header.shortcuts.drag')}</span>
            </span>
            <span className="text-edge" aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Key>{mac ? '⌘' : 'ctrl'}</Key>
              <span aria-hidden="true">+</span>
              <span>{t('header.shortcuts.clickAdd')}</span>
            </span>
            <span className="text-edge" aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Key>shift</Key>
              <span aria-hidden="true">+</span>
              <span>{t('header.shortcuts.clickRange')}</span>
            </span>
            <span className="text-edge" aria-hidden="true">·</span>
            <span>{t('header.shortcuts.doubleClickOpen')}</span>
            <span className="text-edge" aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Key>/</Key>
              <span>{t('header.shortcuts.search')}</span>
            </span>
          </p>
        </div>

        <div className="flex flex-col items-end gap-3 pt-2">
          <p className="font-mono text-[13px] tracking-wide text-ink-soft m-0 flex items-baseline gap-1.5 flex-wrap justify-end">
            <span>{t('header.stats.total', { count: total })}</span>
            <span className="text-ink-mute" aria-hidden="true">·</span>
            <span>{t('header.stats.kept', { count: kept })}</span>
            <span className="text-ink-mute" aria-hidden="true">·</span>
            <span className={marked > 0 ? 'text-accent' : undefined}>
              {t('header.stats.marked', { count: marked })}
            </span>
            {unmarkedInVisible > 0 && (
              <>
                <span className="text-ink-mute" aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={markAllVisible}
                  className={BULK_BTN_CLASS}
                  title={t('header.bulk.markAllTitle')}
                >
                  {t('header.bulk.markAll', { count: unmarkedInVisible })}
                </button>
              </>
            )}
            {markedInVisible > 0 && (
              <>
                <span className="text-ink-mute" aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={unmarkAllVisible}
                  className={BULK_BTN_CLASS}
                  title={t('header.bulk.unmarkAllTitle')}
                >
                  {t('header.bulk.unmarkAll', { count: markedInVisible })}
                </button>
              </>
            )}
          </p>
          {selected.size > 0 && (
            <div className="font-mono text-[12px] text-ink-soft flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
              <span>{t('header.selection.count', { count: selected.size })}</span>
              {unmarkedInSelection > 0 && (
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={deleteSelected}
                    className="font-mono text-[12px] tracking-wide px-3 py-1.5 rounded-sm border border-accent text-accent hover:bg-accent hover:text-paper transition-colors cursor-pointer"
                  >
                    {t('header.selection.delete', { count: unmarkedInSelection })}
                  </button>
                  <span className="flex items-center gap-1 text-[11px] text-ink-mute">
                    <span>{t('header.selection.orPress')}</span>
                    <Key>{mac ? '⌫' : t('header.selection.deleteKey')}</Key>
                  </span>
                </span>
              )}
              {markedInSelection > 0 && (
                <button type="button" onClick={restoreSelected} className={BULK_BTN_CLASS}>
                  {t('header.selection.restore', { count: markedInSelection })}
                </button>
              )}
              <button
                type="button"
                onClick={clearSelection}
                className={cx(BULK_BTN_CLASS, 'flex items-center gap-1')}
              >
                <Key>esc</Key>
                <span>{t('header.selection.clear')}</span>
              </button>
            </div>
          )}
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <ThemeToggle />
            <FileUpload variant="button" />
            <button
              type="button"
              onClick={handleExport}
              disabled={exportDisabled}
              title={marked === 0 ? t('header.export.titleDisabled') : t('header.export.titleEnabled')}
              className={cx(
                'font-mono text-[12px] tracking-wide px-3 py-1.5 rounded-sm border transition-colors',
                exportDisabled
                  ? 'border-edge text-ink-mute cursor-not-allowed'
                  : 'border-ink bg-ink text-paper hover:bg-paper-card hover:text-ink',
              )}
            >
              {exporting ? t('header.export.loading') : t('header.export.idle')}
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
