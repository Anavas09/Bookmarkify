import { LazyMotion, MotionConfig, domMax } from 'motion/react'
import { useBookmarkStore } from './store/useBookmarkStore.ts'
import { useKeyboardShortcuts } from './hooks/keyboardShortcuts.ts'
import { FileUpload } from './components/FileUpload.tsx'
import { AppHeader } from './components/AppHeader.tsx'
import { BookmarkGrid } from './components/BookmarkGrid.tsx'
import { FilterBarTabs } from './components/FilterBarTabs.tsx'
import { SelectionBar } from './components/SelectionBar.tsx'

function App() {
  const hasBookmarks = useBookmarkStore(s => s.bookmarks.length > 0)
  useKeyboardShortcuts()

  // `m` components load only the features in domMax (layout animations
  // included); `strict` throws if a full `motion` component sneaks in.
  // With reduced motion on, Motion skips transforms and keeps the fades.
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen flex flex-col">
          {hasBookmarks ? (
            <>
              <AppHeader />
              <FilterBarTabs />
              {/* Bottom padding leaves room for the floating SelectionBar. */}
              <main className="flex-1 px-4 pt-4 pb-28 sm:px-8 lg:px-12">
                <BookmarkGrid />
              </main>
              <SelectionBar />
            </>
          ) : (
            <main className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-12">
              <FileUpload />
            </main>
          )}
        </div>
      </MotionConfig>
    </LazyMotion>
  )
}

export default App
