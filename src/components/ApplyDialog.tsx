import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import type { BookmarkSource, CommitResult } from '../core/ports/BookmarkSource.ts'
import { useBookmarkStore } from '../store/useBookmarkStore.ts'
import { cx } from '../lib/cx.ts'

type Applied = Extract<CommitResult, { kind: 'applied' }>

type Phase =
  | { kind: 'confirm' }
  | { kind: 'applying' }
  | { kind: 'done'; result: Applied }
  | { kind: 'failed'; message: string }

interface Props {
  source: BookmarkSource
  onClose: () => void
}

const BTN_CLASS =
  'px-4 py-1.5 rounded-sm border font-mono text-[12px] tracking-wide transition-colors ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-mute'

const DONE_BTN_CLASS = cx(BTN_CLASS, 'border-ink bg-ink text-paper hover:bg-paper-card hover:text-ink')

// Asks before deleting from Chrome, deletes, then sums up what happened.
export function ApplyDialog({ source, onClose }: Props) {
  const commit = useBookmarkStore(s => s.commit)
  // Read once: the store reloads right after deleting, and the title must
  // not drop to 0 before the summary shows.
  const [count] = useState(() => useBookmarkStore.getState().pendingDeletes.size)
  const [phase, setPhase] = useState<Phase>({ kind: 'confirm' })

  async function apply() {
    setPhase({ kind: 'applying' })
    try {
      const result = await commit(source)
      if (result.kind === 'applied') setPhase({ kind: 'done', result })
      else onClose()
    } catch (error) {
      setPhase({ kind: 'failed', message: error instanceof Error ? error.message : String(error) })
    }
  }

  // Halfway through deleting is the one moment it can't be closed.
  const close = phase.kind === 'applying' ? () => {} : onClose

  return (
    <Dialog open onClose={close} className="relative z-30">
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-[2px]" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-lg rounded-md border border-edge bg-paper-card shadow-lg">
          {phase.kind === 'done' ? (
            <Summary result={phase.result} onClose={onClose} />
          ) : phase.kind === 'failed' ? (
            <Failure message={phase.message} onClose={onClose} />
          ) : (
            <Confirmation
              count={count}
              applying={phase.kind === 'applying'}
              onApply={apply}
              onCancel={onClose}
            />
          )}
        </DialogPanel>
      </div>
    </Dialog>
  )
}

interface ConfirmationProps {
  count: number
  applying: boolean
  onApply: () => void
  onCancel: () => void
}

function Confirmation({ count, applying, onApply, onCancel }: ConfirmationProps) {
  const { t } = useTranslation()
  return (
    <>
      <header className="px-6 pt-6 pb-4 border-b border-edge">
        <DialogTitle as="h2" className="font-display text-2xl leading-tight text-ink m-0">
          {t('applyDialog.title', { count })}
        </DialogTitle>
        <Description as="p" className="mt-1 font-mono text-[12px] text-ink-mute m-0">
          {t('applyDialog.folders')}
        </Description>
      </header>

      <div className="px-6 py-5 space-y-4">
        <div className="rounded-sm border border-edge bg-paper-soft p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute m-0 mb-2">
            {t('applyDialog.headsUpLabel')}
          </p>
          <p className="text-[14px] leading-relaxed text-ink-soft m-0">{t('applyDialog.headsUpBody')}</p>
        </div>
        <p className="text-[14px] leading-relaxed text-ink-soft m-0">{t('applyDialog.sync')}</p>
      </div>

      <footer className="px-6 py-4 border-t border-edge flex justify-end gap-3">
        {/* Starts on cancel, so an Enter too many deletes nothing. */}
        <button
          type="button"
          data-autofocus
          onClick={onCancel}
          disabled={applying}
          className={cx(
            BTN_CLASS,
            'border-edge text-ink-soft hover:border-ink-mute hover:text-ink',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-edge',
          )}
        >
          {t('applyDialog.cancel')}
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={applying}
          className={cx(
            BTN_CLASS,
            'border-accent bg-accent text-paper',
            applying ? 'cursor-wait' : 'hover:bg-paper-card hover:text-accent',
          )}
        >
          {applying ? t('applyDialog.applying') : t('applyDialog.confirm', { count })}
        </button>
      </footer>
    </>
  )
}

function Summary({ result, onClose }: { result: Applied; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <>
      <header className="px-6 pt-6 pb-4 border-b border-edge">
        <DialogTitle as="h2" className="font-display text-2xl leading-tight text-ink m-0">
          {t('applyDialog.doneTitle')}
        </DialogTitle>
        {result.backupFilename !== null && (
          <Description as="p" className="mt-1 font-mono text-[12px] text-ink-mute m-0">
            <span>{t('applyDialog.doneBackup')}</span>
            <span className="text-ink-soft">{result.backupFilename}</span>
          </Description>
        )}
      </header>

      <div className="px-6 py-5 space-y-2 text-[14px] leading-relaxed text-ink-soft">
        <p className="m-0">{t('applyDialog.doneDeleted', { count: result.deleted })}</p>
        {result.folders > 0 && (
          <p className="m-0">{t('applyDialog.doneFolders', { count: result.folders })}</p>
        )}
        {result.skipped > 0 && (
          <p className="m-0 text-accent">{t('applyDialog.doneSkipped', { count: result.skipped })}</p>
        )}
      </div>

      <footer className="px-6 py-4 border-t border-edge flex justify-end">
        <button type="button" autoFocus onClick={onClose} className={DONE_BTN_CLASS}>
          {t('applyDialog.done')}
        </button>
      </footer>
    </>
  )
}

function Failure({ message, onClose }: { message: string; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <>
      <header className="px-6 pt-6 pb-4 border-b border-edge">
        <DialogTitle as="h2" className="font-display text-2xl leading-tight text-ink m-0">
          {t('applyDialog.failedTitle')}
        </DialogTitle>
        <Description as="p" className="mt-1 font-mono text-[12px] text-accent m-0 break-words">
          {message}
        </Description>
      </header>

      <div className="px-6 py-5">
        <p className="text-[14px] leading-relaxed text-ink-soft m-0">{t('applyDialog.failedHint')}</p>
      </div>

      <footer className="px-6 py-4 border-t border-edge flex justify-end">
        <button type="button" autoFocus onClick={onClose} className={DONE_BTN_CLASS}>
          {t('applyDialog.close')}
        </button>
      </footer>
    </>
  )
}
