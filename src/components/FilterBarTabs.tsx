import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useBookmarkStore } from '../store/useBookmarkStore.ts'
import {
  folderKey,
  selectDomainCounts,
  selectDuplicateCount,
  selectFolderCounts,
  type Filter,
} from '../store/selectors.ts'
import { cx } from '../lib/cx.ts'

type OpenMenu = 'domain' | 'folder' | null

function formatFolder(path: string[]): string {
  return path.length === 0 ? '(root)' : path.join(' / ')
}

function domainLabel(f: Filter): string | null {
  return f?.kind === 'domain' ? f.value : null
}

function folderLabel(f: Filter): string | null {
  return f?.kind === 'folder' ? formatFolder(f.path) : null
}

export function FilterBarTabs() {
  const bookmarks = useBookmarkStore(s => s.bookmarks)
  const activeFilter = useBookmarkStore(s => s.activeFilter)
  const setFilter = useBookmarkStore(s => s.setFilter)
  const clearFilter = useBookmarkStore(s => s.clearFilter)

  const domainCounts = useMemo(() => selectDomainCounts(bookmarks), [bookmarks])
  const folderCounts = useMemo(() => selectFolderCounts(bookmarks), [bookmarks])
  const duplicateCount = useMemo(() => selectDuplicateCount(bookmarks), [bookmarks])

  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (openMenu === null) return
    function onDocMouseDown(e: MouseEvent) {
      if (!(e.target instanceof Node)) return
      if (containerRef.current?.contains(e.target)) return
      setOpenMenu(null)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenMenu(null)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [openMenu])

  const activeDomain = domainLabel(activeFilter)
  const activeFolder = folderLabel(activeFilter)
  const duplicateActive = activeFilter?.kind === 'duplicate'

  function toggleMenu(next: OpenMenu) {
    setOpenMenu(prev => (prev === next ? null : next))
  }

  return (
    <div
      ref={containerRef}
      className="sticky top-0 z-20 flex flex-wrap items-center gap-2 px-4 py-3 sm:px-8 lg:px-12 font-mono text-[12px] bg-paper/95 backdrop-blur-sm border-b border-edge"
    >
      <span className="text-ink-mute tracking-wide mr-1">filter</span>

      <Chip
        label={`all · ${bookmarks.length}`}
        active={activeFilter === null}
        onClick={() => {
          clearFilter()
          setOpenMenu(null)
        }}
      />

      <ChipDropdown
        label={activeDomain ?? 'domain'}
        active={activeDomain !== null}
        open={openMenu === 'domain'}
        onToggle={() => toggleMenu('domain')}
      >
        {domainCounts.length === 0 ? (
          <MenuEmpty>no domains</MenuEmpty>
        ) : (
          domainCounts.map(d => (
            <MenuItem
              key={d.domain}
              active={activeDomain === d.domain}
              count={d.count}
              onClick={() => {
                setFilter({ kind: 'domain', value: d.domain })
                setOpenMenu(null)
              }}
            >
              {d.domain}
            </MenuItem>
          ))
        )}
      </ChipDropdown>

      <ChipDropdown
        label={activeFolder ?? 'folder'}
        active={activeFolder !== null}
        open={openMenu === 'folder'}
        onToggle={() => toggleMenu('folder')}
      >
        {folderCounts.length === 0 ? (
          <MenuEmpty>no folders</MenuEmpty>
        ) : (
          folderCounts.map(f => (
            <MenuItem
              key={folderKey(f.path)}
              active={activeFolder === formatFolder(f.path)}
              count={f.count}
              onClick={() => {
                setFilter({ kind: 'folder', path: f.path })
                setOpenMenu(null)
              }}
            >
              {formatFolder(f.path)}
            </MenuItem>
          ))
        )}
      </ChipDropdown>

      <Chip
        label={`duplicates · ${duplicateCount}`}
        active={duplicateActive}
        disabled={duplicateCount === 0}
        onClick={() => {
          if (duplicateActive) clearFilter()
          else setFilter({ kind: 'duplicate' })
          setOpenMenu(null)
        }}
      />
    </div>
  )
}

interface ChipProps {
  label: string
  active: boolean
  disabled?: boolean
  onClick: () => void
}

function Chip({ label, active, disabled, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'px-3 py-1 rounded-sm border transition-colors',
        active
          ? 'border-ink bg-ink text-paper'
          : 'border-edge bg-paper-card text-ink-soft hover:border-ink-mute',
        disabled && 'opacity-40 cursor-not-allowed hover:border-edge',
      )}
    >
      {label}
    </button>
  )
}

interface ChipDropdownProps {
  label: string
  active: boolean
  open: boolean
  onToggle: () => void
  children: ReactNode
}

function ChipDropdown({ label, active, open, onToggle, children }: ChipDropdownProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cx(
          'flex items-center gap-1 px-3 py-1 rounded-sm border transition-colors',
          active
            ? 'border-ink bg-ink text-paper'
            : 'border-edge bg-paper-card text-ink-soft hover:border-ink-mute',
        )}
      >
        <span className="truncate max-w-[180px]">{label}</span>
        <span aria-hidden="true" className="text-[10px] leading-none">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-10 min-w-[220px] max-h-64 overflow-y-auto rounded-sm border border-edge bg-paper-card shadow-sm">
          {children}
        </div>
      )}
    </div>
  )
}

interface MenuItemProps {
  active: boolean
  count: number
  onClick: () => void
  children: ReactNode
}

function MenuItem({ active, count, onClick, children }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'w-full flex items-baseline justify-between gap-4 px-3 py-1.5 text-left font-mono text-[12px] transition-colors',
        active ? 'bg-paper-soft text-ink' : 'text-ink-soft hover:bg-paper-soft',
      )}
    >
      <span className="truncate">{children}</span>
      <span className="text-ink-mute shrink-0">{count}</span>
    </button>
  )
}

function MenuEmpty({ children }: { children: ReactNode }) {
  return <div className="px-3 py-2 text-ink-mute font-mono text-[12px]">{children}</div>
}
