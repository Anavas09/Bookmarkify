import { useTranslation } from 'react-i18next'
import { useBookmarkStore, useVisibleBookmarks } from '../store/useBookmarkStore.ts'
import { BookmarkCard } from './BookmarkCard.tsx'

export function BookmarkGrid() {
  const { t } = useTranslation()
  const visible = useVisibleBookmarks()
  const pendingDeletes = useBookmarkStore(s => s.pendingDeletes)
  const focusedIndex = useBookmarkStore(s => s.focusedIndex)

  if (visible.length === 0) {
    return (
      <p className="font-mono text-[12px] text-ink-mute px-1 py-8">
        {t('grid.empty')}
      </p>
    )
  }

  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
      {visible.map((b, i) => (
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
