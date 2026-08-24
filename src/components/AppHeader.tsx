import { useBookmarkStore } from '../store/useBookmarkStore.ts'
import { FileUpload } from './FileUpload.tsx'

function Key({ children }: { children: string }) {
  return (
    <kbd className="font-mono text-[10.5px] leading-none px-1.5 py-[3px] rounded-sm border border-edge bg-paper-card text-ink-soft">
      {children}
    </kbd>
  )
}

export function AppHeader() {
  const total = useBookmarkStore(s => s.bookmarks.length)
  const marked = useBookmarkStore(s => s.pendingDeletes.size)
  const kept = total - marked

  return (
    <header className="flex flex-wrap items-start justify-between gap-8 px-4 pt-10 pb-6 sm:px-8 lg:px-12">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl sm:text-5xl leading-none tracking-tight text-ink m-0">
          Bookmarkify
        </h1>
        <span className="h-px w-12 bg-ink" aria-hidden="true" />
        <p className="mt-1 font-mono text-[11px] text-ink-mute m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="flex items-center gap-1">
            <Key>j</Key>
            <Key>k</Key>
            <span>move</span>
          </span>
          <span className="text-edge" aria-hidden="true">·</span>
          <span className="flex items-center gap-1">
            <Key>x</Key>
            <span>mark</span>
          </span>
          <span className="text-edge" aria-hidden="true">·</span>
          <span className="flex items-center gap-1">
            <Key>u</Key>
            <span>unmark</span>
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
        <FileUpload variant="button" />
      </div>
    </header>
  )
}
