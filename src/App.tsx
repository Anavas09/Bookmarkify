import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LazyMotion, MotionConfig, domMax } from 'motion/react'
import type { BookmarkSource } from './core/ports/BookmarkSource.ts'
import { useBookmarkStore } from './store/useBookmarkStore.ts'
import { useKeyboardShortcuts } from './hooks/keyboardShortcuts.ts'
import { AppHeader } from './components/AppHeader.tsx'
import { ApplyDialog } from './components/ApplyDialog.tsx'
import { BookmarkGrid } from './components/BookmarkGrid.tsx'
import { FilterBarTabs } from './components/FilterBarTabs.tsx'
import { SelectionBar } from './components/SelectionBar.tsx'

type Startup =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'failed'; message: string }

function App({ source }: { source: BookmarkSource }) {
  const [startup, setStartup] = useState<Startup>({ status: 'loading' })
  const [applyOpen, setApplyOpen] = useState(false)
  const hasBookmarks = useBookmarkStore(s => s.bookmarks.length > 0)
  useKeyboardShortcuts()

  // Every visit reads the bookmarks again; the saved triage (marks, filter
  // and sort) applies to the ones still there.
  useEffect(() => {
    let current = true
    useBookmarkStore.getState().load(source).then(
      () => {
        if (current) setStartup({ status: 'ready' })
      },
      (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        if (current) setStartup({ status: 'failed', message })
      },
    )
    return () => {
      current = false
    }
  }, [source])

  // `m` components load only the features in domMax (layout animations
  // included); `strict` throws if a full `motion` component sneaks in.
  // With reduced motion on, Motion skips transforms and keeps the fades.
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen flex flex-col">
          {startup.status === 'ready' && hasBookmarks ? (
            <>
              <AppHeader onApply={() => setApplyOpen(true)} />
              <FilterBarTabs />
              {/* Bottom padding leaves room for the floating SelectionBar. */}
              <main className="flex-1 px-4 pt-4 pb-28 sm:px-8 lg:px-12">
                <BookmarkGrid />
              </main>
              <SelectionBar />
            </>
          ) : (
            <main className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-12">
              <StartupMessage startup={startup} />
            </main>
          )}
        </div>
        {/* Outside the branch above: applying may delete every bookmark, and
            the summary has to outlive the grid. */}
        {applyOpen && <ApplyDialog source={source} onClose={() => setApplyOpen(false)} />}
      </MotionConfig>
    </LazyMotion>
  )
}

function StartupMessage({ startup }: { startup: Startup }) {
  const { t } = useTranslation()
  if (startup.status === 'loading') {
    return (
      <p className="fade-in-late font-mono text-[12px] text-ink-mute text-center m-0">
        {t('startup.loading')}
      </p>
    )
  }
  return (
    <div className="mx-auto flex max-w-[480px] flex-col items-center gap-3 text-center">
      <h2 className="font-display text-3xl leading-tight text-ink m-0">
        {startup.status === 'failed' ? t('startup.failedTitle') : t('startup.emptyTitle')}
      </h2>
      {startup.status === 'failed' && (
        <p className="font-mono text-xs text-accent break-words m-0">{startup.message}</p>
      )}
    </div>
  )
}

export default App
