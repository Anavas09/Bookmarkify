import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Bookmark } from '../core/types.ts'
import { domainOf } from '../lib/domain.ts'
import { faviconUrl } from '../lib/faviconUrl.ts'
import { cx } from '../lib/cx.ts'

interface Props {
  bookmark: Bookmark
  index: number
  marked: boolean
  selected: boolean
}

function formatDate(ms: number | undefined): string | null {
  if (ms === undefined) return null
  const d = new Date(ms)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}·${mm}·${dd}`
}

function catalogNumber(index: number): string {
  return '№' + String(index + 1).padStart(3, '0')
}

export function BookmarkCard({ bookmark, index, marked, selected }: Props) {
  const { t } = useTranslation()
  const domain = domainOf(bookmark.url)
  const date = formatDate(bookmark.addedAt)
  const favicon = bookmark.icon ?? faviconUrl(bookmark.url)
  const [faviconBroken, setFaviconBroken] = useState(false)
  const cardStyle = { '--i': Math.min(index, 24) } as CSSProperties

  function open() {
    window.open(bookmark.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <article
      data-bookmark-id={bookmark.id}
      aria-selected={selected}
      onDoubleClick={open}
      style={cardStyle}
      className={cx(
        'card-in relative flex min-h-[170px] flex-col rounded-md border p-4 select-none cursor-default',
        'transition-[border-color,transform,opacity,background-color] duration-150 ease-out',
        marked
          ? 'border-edge bg-paper-soft opacity-55 hover:opacity-75'
          : 'border-edge bg-paper-card hover:-translate-y-px hover:border-ink-mute',
        selected && 'outline outline-2 outline-offset-4 outline-accent',
      )}
    >
      <header className="mb-2 flex items-start justify-between">
        <span className="font-mono text-[0.7rem] tracking-wider text-ink-mute">
          {catalogNumber(index)}
        </span>
        {marked && (
          <span
            className="font-mono text-[0.95rem] leading-none text-accent"
            aria-label={t('card.markedAria')}
          >
            ⨯
          </span>
        )}
      </header>

      <div className="flex-1">
        <h3
          className={cx(
            'font-display text-[1.0625rem] leading-tight text-ink m-0 mb-2',
            'line-clamp-3 break-words',
            marked && 'strike-mark',
          )}
        >
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            draggable={false}
            onDoubleClick={e => e.stopPropagation()}
            className="text-inherit no-underline hover:underline underline-offset-2 decoration-edge cursor-pointer"
          >
            {bookmark.title || domain}
          </a>
        </h3>
        <p className="font-mono text-[0.72rem] text-ink-soft m-0 flex items-center gap-1.5 min-w-0">
          {favicon && !faviconBroken && (
            <img
              src={favicon}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="h-3.5 w-3.5 shrink-0 rounded-[3px]"
              onError={() => setFaviconBroken(true)}
            />
          )}
          <span className="truncate">{domain}</span>
        </p>
      </div>

      <footer className="mt-3 flex flex-col gap-2">
        <span className="block h-px bg-edge" aria-hidden="true" />
        <div className="flex items-baseline justify-between gap-3 font-mono text-[0.68rem] text-ink-mute">
          {date && <span className="whitespace-nowrap">{date}</span>}
          {bookmark.tags && bookmark.tags.length > 0 && (
            <span className="min-w-0 truncate text-right text-ink-mute">
              {bookmark.tags.map((tag, i) => (
                <span key={tag}>
                  {i > 0 && <span className="text-edge"> · </span>}
                  {tag}
                </span>
              ))}
            </span>
          )}
        </div>
      </footer>
    </article>
  )
}
