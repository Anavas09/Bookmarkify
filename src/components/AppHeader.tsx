import { useTranslation } from 'react-i18next'
import { useBookmarkStore } from '../store/useBookmarkStore.ts'
import { cx } from '../lib/cx.ts'
import { isMac } from '../lib/platform.ts'
import { ThemeToggle } from './ThemeToggle.tsx'
import { LanguageToggle } from './LanguageToggle.tsx'
import { Key } from './Key.tsx'

interface Props {
  onApply: () => void
}

export function AppHeader({ onApply }: Props) {
  const { t } = useTranslation()
  const total = useBookmarkStore(s => s.bookmarks.length)
  const deleted = useBookmarkStore(s => s.pendingDeletes.size)
  const kept = total - deleted
  const mac = isMac()
  const applyDisabled = deleted === 0

  return (
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
          <span className={deleted > 0 ? 'text-accent' : undefined}>
            {t('header.stats.deleted', { count: deleted })}
          </span>
        </p>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <ThemeToggle />
          <button
            type="button"
            onClick={onApply}
            disabled={applyDisabled}
            title={applyDisabled ? t('header.apply.titleDisabled') : t('header.apply.titleEnabled')}
            className={cx(
              'font-mono text-[12px] tracking-wide px-3 py-1.5 rounded-sm border transition-colors',
              applyDisabled
                ? 'border-edge text-ink-mute cursor-not-allowed'
                : 'border-ink bg-ink text-paper hover:bg-paper-card hover:text-ink',
            )}
          >
            {t('header.apply.idle')}
          </button>
        </div>
      </div>
    </header>
  )
}
