import { useBookmarkStore } from '../store/useBookmarkStore.ts'
import { BookmarkCard } from './BookmarkCard.tsx'

export function BookmarkGrid() {
  const bookmarks = useBookmarkStore(s => s.bookmarks)
  const pendingDeletes = useBookmarkStore(s => s.pendingDeletes)
  const focusedIndex = useBookmarkStore(s => s.focusedIndex)

  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
      {bookmarks.map((b, i) => (
        <BookmarkCard
          key={b.id}
          index={i}
          bookmark={b}
          marked={pendingDeletes.has(b.id)}
          focused={i === focusedIndex}
        />
      ))}
    </div>
  )
}
