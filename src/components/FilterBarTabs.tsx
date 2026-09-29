import { useMemo, type ReactNode } from 'react'
import {
  Menu,
  MenuButton,
  MenuItem as HuiMenuItem,
  MenuItems,
} from '@headlessui/react'
import { useBookmarkStore } from '../store/useBookmarkStore.ts'
import {
  folderKey,
  selectDomainCounts,
  selectDuplicateCount,
  selectFolderCounts,
  type Filter,
  type Sort,
} from '../store/selectors.ts'
import { cx } from '../lib/cx.ts'

function formatFolder(path: string[]): string {
  return path.length === 0 ? '(root)' : path.join(' / ')
}

function domainLabel(f: Filter): string | null {
  return f?.kind === 'domain' ? f.value : null
}

function folderLabel(f: Filter): string | null {
  return f?.kind === 'folder' ? formatFolder(f.path) : null
}

const SORT_OPTIONS: Array<{ label: string; sort: Sort }> = [
  { label: 'original', sort: null },
  { label: 'title A→Z', sort: { kind: 'title', dir: 'asc' } },
  { label: 'title Z→A', sort: { kind: 'title', dir: 'desc' } },
  { label: 'newest first', sort: { kind: 'date', dir: 'desc' } },
  { label: 'oldest first', sort: { kind: 'date', dir: 'asc' } },
  { label: 'domain A→Z', sort: { kind: 'domain' } },
]

function sortLabel(s: Sort): string {
  if (s === null) return 'original'
  switch (s.kind) {
    case 'title':  return s.dir === 'asc' ? 'title A→Z' : 'title Z→A'
    case 'date':   return s.dir === 'desc' ? 'newest first' : 'oldest first'
    case 'domain': return 'domain A→Z'
  }
}

export function FilterBarTabs() {
  const bookmarks = useBookmarkStore(s => s.bookmarks)
  const activeFilter = useBookmarkStore(s => s.activeFilter)
  const activeSort = useBookmarkStore(s => s.activeSort)
  const setFilter = useBookmarkStore(s => s.setFilter)
  const clearFilter = useBookmarkStore(s => s.clearFilter)
  const setSort = useBookmarkStore(s => s.setSort)
  const clearSort = useBookmarkStore(s => s.clearSort)

  const domainCounts = useMemo(() => selectDomainCounts(bookmarks), [bookmarks])
  const folderCounts = useMemo(() => selectFolderCounts(bookmarks), [bookmarks])
  const duplicateCount = useMemo(() => selectDuplicateCount(bookmarks), [bookmarks])
  const activeSortLabel = sortLabel(activeSort)

  const activeDomain = domainLabel(activeFilter)
  const activeFolder = folderLabel(activeFilter)
  const duplicateActive = activeFilter?.kind === 'duplicate'

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 px-4 py-3 sm:px-8 lg:px-12 font-mono text-[12px] bg-paper/95 backdrop-blur-sm border-b border-edge">
      <span className="text-ink-mute tracking-wide mr-1">filter</span>

      <Chip
        label={`all · ${bookmarks.length}`}
        active={activeFilter === null}
        onClick={clearFilter}
      />

      <ChipDropdown label={activeDomain ?? 'domain'} active={activeDomain !== null}>
        {domainCounts.length === 0 ? (
          <MenuEmpty>no domains</MenuEmpty>
        ) : (
          domainCounts.map(d => (
            <MenuItem
              key={d.domain}
              selected={activeDomain === d.domain}
              count={d.count}
              onClick={() => setFilter({ kind: 'domain', value: d.domain })}
            >
              {d.domain}
            </MenuItem>
          ))
        )}
      </ChipDropdown>

      <ChipDropdown label={activeFolder ?? 'folder'} active={activeFolder !== null}>
        {folderCounts.length === 0 ? (
          <MenuEmpty>no folders</MenuEmpty>
        ) : (
          folderCounts.map(f => (
            <MenuItem
              key={folderKey(f.path)}
              selected={activeFolder === formatFolder(f.path)}
              count={f.count}
              onClick={() => setFilter({ kind: 'folder', path: f.path })}
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
        }}
      />

      <span className="text-ink-mute tracking-wide ml-2 mr-1">sort</span>
      <ChipDropdown
        label={activeSort === null ? 'original' : activeSortLabel}
        active={activeSort !== null}
      >
        {SORT_OPTIONS.map(opt => (
          <MenuItem
            key={opt.label}
            selected={activeSortLabel === opt.label}
            onClick={() => {
              if (opt.sort === null) clearSort()
              else setSort(opt.sort)
            }}
          >
            {opt.label}
          </MenuItem>
        ))}
      </ChipDropdown>
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
  children: ReactNode
}

function ChipDropdown({ label, active, children }: ChipDropdownProps) {
  return (
    <Menu as="div" className="relative">
      <MenuButton
        className={cx(
          'flex items-center gap-1 px-3 py-1 rounded-sm border transition-colors focus:outline-none data-focus:border-ink-mute',
          active
            ? 'border-ink bg-ink text-paper'
            : 'border-edge bg-paper-card text-ink-soft hover:border-ink-mute',
        )}
      >
        <span className="truncate max-w-[180px]">{label}</span>
        <span aria-hidden="true" className="text-[10px] leading-none">▾</span>
      </MenuButton>
      <MenuItems
        anchor={{ to: 'bottom start', gap: 4 }}
        className="min-w-[220px] max-h-64 overflow-y-auto rounded-sm border border-edge bg-paper-card shadow-sm z-30 focus:outline-none"
      >
        {children}
      </MenuItems>
    </Menu>
  )
}

interface MenuItemProps {
  selected: boolean
  count?: number
  onClick: () => void
  children: ReactNode
}

function MenuItem({ selected, count, onClick, children }: MenuItemProps) {
  return (
    <HuiMenuItem>
      {({ focus }) => (
        <button
          type="button"
          onClick={onClick}
          className={cx(
            'w-full flex items-baseline justify-between gap-4 px-3 py-1.5 text-left font-mono text-[12px] transition-colors focus:outline-none',
            selected ? 'text-ink' : 'text-ink-soft',
            (focus || selected) && 'bg-paper-soft',
          )}
        >
          <span className="truncate">{children}</span>
          {count !== undefined && <span className="text-ink-mute shrink-0">{count}</span>}
        </button>
      )}
    </HuiMenuItem>
  )
}

function MenuEmpty({ children }: { children: ReactNode }) {
  return <div className="px-3 py-2 text-ink-mute font-mono text-[12px]">{children}</div>
}
