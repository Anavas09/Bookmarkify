import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
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
import { isEditableTarget } from '../hooks/keyboardShortcuts.ts'
import { cx } from '../lib/cx.ts'

type SortKey =
  | 'original'
  | 'titleAZ'
  | 'titleZA'
  | 'newestFirst'
  | 'oldestFirst'
  | 'domainAZ'

const SORT_OPTIONS: Array<{ key: SortKey; sort: Sort }> = [
  { key: 'original',    sort: null },
  { key: 'titleAZ',     sort: { kind: 'title', dir: 'asc' } },
  { key: 'titleZA',     sort: { kind: 'title', dir: 'desc' } },
  { key: 'newestFirst', sort: { kind: 'date', dir: 'desc' } },
  { key: 'oldestFirst', sort: { kind: 'date', dir: 'asc' } },
  { key: 'domainAZ',    sort: { kind: 'domain' } },
]

function sortToKey(s: Sort): SortKey {
  if (s === null) return 'original'
  switch (s.kind) {
    case 'title':  return s.dir === 'asc' ? 'titleAZ' : 'titleZA'
    case 'date':   return s.dir === 'desc' ? 'newestFirst' : 'oldestFirst'
    case 'domain': return 'domainAZ'
  }
}

function formatFolder(path: string[], rootLabel: string): string {
  return path.length === 0 ? rootLabel : path.join(' / ')
}

function domainLabel(f: Filter): string | null {
  return f?.kind === 'domain' ? f.value : null
}

function folderLabel(f: Filter, rootLabel: string): string | null {
  return f?.kind === 'folder' ? formatFolder(f.path, rootLabel) : null
}

export function FilterBarTabs() {
  const { t } = useTranslation()
  const bookmarks = useBookmarkStore(s => s.bookmarks)
  const activeFilter = useBookmarkStore(s => s.activeFilter)
  const activeSort = useBookmarkStore(s => s.activeSort)
  const setFilter = useBookmarkStore(s => s.setFilter)
  const clearFilter = useBookmarkStore(s => s.clearFilter)
  const setSort = useBookmarkStore(s => s.setSort)
  const clearSort = useBookmarkStore(s => s.clearSort)

  const rootLabel = t('filterBar.folderRoot')
  const domainCounts = useMemo(() => selectDomainCounts(bookmarks), [bookmarks])
  const folderCounts = useMemo(() => selectFolderCounts(bookmarks), [bookmarks])
  const duplicateCount = useMemo(() => selectDuplicateCount(bookmarks), [bookmarks])
  const activeSortKey = sortToKey(activeSort)

  const activeDomain = domainLabel(activeFilter)
  const activeFolder = folderLabel(activeFilter, rootLabel)
  const duplicateActive = activeFilter?.kind === 'duplicate'

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 px-4 py-3 sm:px-8 lg:px-12 font-mono text-[12px] bg-paper/95 backdrop-blur-sm border-b border-edge">
      <SearchInput />

      <span className="text-ink-mute tracking-wide mr-1">{t('filterBar.filter')}</span>

      <Chip
        label={t('filterBar.chipAll', { count: bookmarks.length })}
        active={activeFilter === null}
        onClick={clearFilter}
      />

      <ChipDropdown
        label={activeDomain ?? t('filterBar.chipDomainPlaceholder')}
        active={activeDomain !== null}
      >
        {domainCounts.length === 0 ? (
          <MenuEmpty>{t('filterBar.menuNoDomains')}</MenuEmpty>
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

      <ChipDropdown
        label={activeFolder ?? t('filterBar.chipFolderPlaceholder')}
        active={activeFolder !== null}
      >
        {folderCounts.length === 0 ? (
          <MenuEmpty>{t('filterBar.menuNoFolders')}</MenuEmpty>
        ) : (
          folderCounts.map(f => (
            <MenuItem
              key={folderKey(f.path)}
              selected={activeFolder === formatFolder(f.path, rootLabel)}
              count={f.count}
              onClick={() => setFilter({ kind: 'folder', path: f.path })}
            >
              {formatFolder(f.path, rootLabel)}
            </MenuItem>
          ))
        )}
      </ChipDropdown>

      <Chip
        label={t('filterBar.chipDuplicates', { count: duplicateCount })}
        active={duplicateActive}
        disabled={duplicateCount === 0}
        onClick={() => {
          if (duplicateActive) clearFilter()
          else setFilter({ kind: 'duplicate' })
        }}
      />

      <span className="text-ink-mute tracking-wide ml-2 mr-1">{t('filterBar.sort')}</span>
      <ChipDropdown
        label={t(`filterBar.sortOptions.${activeSortKey}`)}
        active={activeSort !== null}
      >
        {SORT_OPTIONS.map(opt => (
          <MenuItem
            key={opt.key}
            selected={activeSortKey === opt.key}
            onClick={() => {
              if (opt.sort === null) clearSort()
              else setSort(opt.sort)
            }}
          >
            {t(`filterBar.sortOptions.${opt.key}`)}
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

function SearchInput() {
  const { t } = useTranslation()
  const activeFilter = useBookmarkStore(s => s.activeFilter)
  const setFilter = useBookmarkStore(s => s.setFilter)
  const clearFilter = useBookmarkStore(s => s.clearFilter)
  const inputRef = useRef<HTMLInputElement>(null)

  const value = activeFilter?.kind === 'text' ? activeFilter.query : ''

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder={t('filterBar.searchPlaceholder')}
      value={value}
      onChange={e => {
        const q = e.target.value
        if (q === '') clearFilter()
        else setFilter({ kind: 'text', query: q })
      }}
      onKeyDown={e => {
        if (e.key === 'Escape') {
          e.preventDefault()
          if (value !== '') clearFilter()
          inputRef.current?.blur()
        }
      }}
      className="w-56 sm:w-64 px-3 py-1 rounded-sm border border-edge bg-paper-card text-ink-soft placeholder:text-ink-mute focus:outline-none focus:border-ink-mute font-mono text-[12px]"
    />
  )
}
