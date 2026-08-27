import { useBookmarkStore } from './store/useBookmarkStore.ts'
import { useKeyboardShortcuts } from './hooks/keyboardShortcuts.ts'
import { FileUpload } from './components/FileUpload.tsx'
import { AppHeader } from './components/AppHeader.tsx'
import { BookmarkGrid } from './components/BookmarkGrid.tsx'
import { FilterBarTabs } from './components/FilterBarTabs.tsx'

function App() {
  const hasBookmarks = useBookmarkStore(s => s.bookmarks.length > 0)
  useKeyboardShortcuts()

  return (
    <div className="min-h-screen flex flex-col">
      {hasBookmarks ? (
        <>
          <AppHeader />
          <FilterBarTabs />
          <main className="flex-1 px-4 pt-4 pb-16 sm:px-8 lg:px-12">
            <BookmarkGrid />
          </main>
        </>
      ) : (
        <main className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-12">
          <FileUpload />
        </main>
      )}
    </div>
  )
}

export default App
