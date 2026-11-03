import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import type { LinkChecker } from '../core/ports/LinkChecker.ts'
import { scanLinks, type ScanOutcome } from '../core/linkCheck/scanLinks.ts'
import { selectScanTargets } from '../core/linkCheck/targets.ts'
import { selectKeptBookmarks } from '../store/selectors.ts'
import { useBookmarkStore } from '../store/useBookmarkStore.ts'
import { useLinkStore } from '../store/useLinkStore.ts'
import { cx } from '../lib/cx.ts'

type Phase =
  | { kind: 'confirm' }
  | { kind: 'scanning'; done: number; total: number }
  | { kind: 'denied' }
  | { kind: 'done'; reason: ScanOutcome['reason']; checked: number; broken: number }
  | { kind: 'failed'; message: string }

interface Props {
  checker: LinkChecker
  onClose: () => void
}

const BTN_CLASS =
  'px-4 py-1.5 rounded-sm border font-mono text-[12px] tracking-wide transition-colors ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-mute'

const CANCEL_BTN_CLASS = cx(BTN_CLASS, 'border-edge text-ink-soft hover:border-ink-mute hover:text-ink')
const MAIN_BTN_CLASS = cx(BTN_CLASS, 'border-ink bg-ink text-paper hover:bg-paper-card hover:text-ink')

// Asks before checking the links, scans them, then sums up what it found.
export function ScanDialog({ checker, onClose }: Props) {
  const { t } = useTranslation()
  // Read once: a scan changes the results, and the number asked about must not.
  const [targets] = useState(() => {
    const { bookmarks, pendingDeletes } = useBookmarkStore.getState()
    return selectScanTargets(selectKeptBookmarks(bookmarks, pendingDeletes), useLinkStore.getState().checks, Date.now())
  })
  const [phase, setPhase] = useState<Phase>({ kind: 'confirm' })
  const controller = useRef<AbortController | null>(null)

  // The permission prompt needs the click's user gesture, so asking is the
  // first thing the click does, before anything is awaited.
  async function start() {
    const allowed = checker.allow()
    try {
      if (!(await allowed)) {
        setPhase({ kind: 'denied' })
        return
      }
      const abort = new AbortController()
      controller.current = abort
      setPhase({ kind: 'scanning', done: 0, total: targets.length })
      const outcome = await scanLinks(targets, checker, {
        signal: abort.signal,
        onProgress: (done, total) => setPhase({ kind: 'scanning', done, total }),
      })
      // One write at the end (or on cancelling), so the grid doesn't repaint per result.
      useLinkStore.getState().applyScan(outcome.checks)
      const results = Object.values(outcome.checks)
      setPhase({
        kind: 'done',
        reason: outcome.reason,
        checked: results.length,
        broken: results.filter(c => c.status === 'broken').length,
      })
    } catch (error) {
      setPhase({ kind: 'failed', message: error instanceof Error ? error.message : String(error) })
    }
  }

  // Esc and a click outside would leave the scan running unseen: only «cancel» stops it.
  const close = phase.kind === 'scanning' ? () => {} : onClose

  return (
    <Dialog open onClose={close} className="relative z-30">
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-[2px]" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-lg rounded-md border border-edge bg-paper-card shadow-lg">
          {phase.kind === 'confirm' ? (
            <Confirmation count={targets.length} onStart={start} onCancel={onClose} />
          ) : phase.kind === 'scanning' ? (
            <Progress done={phase.done} total={phase.total} onCancel={() => controller.current?.abort()} />
          ) : (
            <Result
              title={t(phase.kind === 'denied' ? 'scanDialog.deniedTitle' : phase.kind === 'failed' ? 'scanDialog.failedTitle' : 'scanDialog.doneTitle')}
              onClose={onClose}
            >
              {phase.kind === 'denied' && <p className="m-0">{t('scanDialog.deniedBody')}</p>}
              {phase.kind === 'failed' && <p className="m-0 text-accent break-words">{phase.message}</p>}
              {phase.kind === 'done' && <Summary phase={phase} />}
            </Result>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  )
}

function Confirmation({ count, onStart, onCancel }: { count: number; onStart: () => void; onCancel: () => void }) {
  const { t } = useTranslation()
  return (
    <>
      <header className="px-6 pt-6 pb-4 border-b border-edge">
        <DialogTitle as="h2" className="font-display text-2xl leading-tight text-ink m-0">
          {t('scanDialog.title')}
        </DialogTitle>
        <Description as="p" className="mt-1 font-mono text-[12px] text-ink-mute m-0">
          {count === 0 ? t('scanDialog.nothing') : t('scanDialog.count', { count })}
        </Description>
      </header>

      {count > 0 && (
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-sm border border-edge bg-paper-soft p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute m-0 mb-2">
              {t('scanDialog.headsUpLabel')}
            </p>
            <p className="text-[14px] leading-relaxed text-ink-soft m-0">{t('scanDialog.headsUpBody')}</p>
          </div>
          <p className="text-[14px] leading-relaxed text-ink-soft m-0">{t('scanDialog.criteria')}</p>
        </div>
      )}

      <footer className="px-6 py-4 border-t border-edge flex justify-end gap-3">
        <button type="button" data-autofocus onClick={onCancel} className={CANCEL_BTN_CLASS}>
          {count === 0 ? t('scanDialog.close') : t('scanDialog.cancel')}
        </button>
        {count > 0 && (
          <button type="button" onClick={onStart} className={MAIN_BTN_CLASS}>
            {t('scanDialog.start')}
          </button>
        )}
      </footer>
    </>
  )
}

function Progress({ done, total, onCancel }: { done: number; total: number; onCancel: () => void }) {
  const { t } = useTranslation()
  return (
    <>
      <header className="px-6 pt-6 pb-4 border-b border-edge">
        <DialogTitle as="h2" className="font-display text-2xl leading-tight text-ink m-0">
          {t('scanDialog.scanningTitle')}
        </DialogTitle>
        <Description as="p" className="mt-1 font-mono text-[12px] text-ink-mute m-0">
          {t('scanDialog.progress', { done, total })}
        </Description>
      </header>

      <div className="px-6 py-5">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          className="h-1.5 w-full overflow-hidden rounded-full bg-paper-soft"
        >
          <div
            className="h-full bg-ink transition-[width] duration-150"
            style={{ width: `${total === 0 ? 0 : (done / total) * 100}%` }}
          />
        </div>
      </div>

      <footer className="px-6 py-4 border-t border-edge flex justify-end">
        <button type="button" data-autofocus onClick={onCancel} className={CANCEL_BTN_CLASS}>
          {t('scanDialog.cancel')}
        </button>
      </footer>
    </>
  )
}

function Summary({ phase }: { phase: Extract<Phase, { kind: 'done' }> }) {
  const { t } = useTranslation()
  return (
    <>
      {phase.reason === 'offline' && <p className="m-0 text-accent">{t('scanDialog.offline')}</p>}
      {phase.reason === 'cancelled' && <p className="m-0">{t('scanDialog.cancelled', { count: phase.checked })}</p>}
      <p className="m-0">{t('scanDialog.broken', { count: phase.broken })}</p>
    </>
  )
}

function Result({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <>
      <header className="px-6 pt-6 pb-4 border-b border-edge">
        <DialogTitle as="h2" className="font-display text-2xl leading-tight text-ink m-0">
          {title}
        </DialogTitle>
      </header>

      <div className="px-6 py-5 space-y-2 text-[14px] leading-relaxed text-ink-soft">{children}</div>

      <footer className="px-6 py-4 border-t border-edge flex justify-end">
        <button type="button" autoFocus onClick={onClose} className={MAIN_BTN_CLASS}>
          {t('scanDialog.done')}
        </button>
      </footer>
    </>
  )
}
