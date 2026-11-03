import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Bookmark } from '../core/types.ts'
import { domainOf } from '../lib/domain.ts'
import { faviconUrl } from '../lib/faviconUrl.ts'
import { isWebUrl, openLink } from '../lib/openLink.ts'
import { cx } from '../lib/cx.ts'
import { dismissBrokenAnimated } from '../store/linkActions.ts'

interface Props {
  bookmark: Bookmark
  index: number
  stagger: number // place in the entrance stagger; 0 fades in without delay
  marked: boolean
  selected: boolean
  broken: boolean // the link answered 404/410 or does not exist anymore
}

function formatDate(ms: number | undefined): string | null {
  if (ms === undefined) return null
  const d = new Date(ms)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}·${mm}·${dd}`
}

// A disconnected plug: the page does not answer.
function UnplugIcon({ label }: { label: string }) {
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 24 24"
      className="h-4 w-4 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>{label}</title>
      <path d="M9 2v4M15 2v4M7 6h10v4a5 5 0 0 1-10 0V6ZM12 15v3a3 3 0 0 0 3 3h2" />
      <path d="M3 3l18 18" />
    </svg>
  )
}

function catalogNumber(index: number): string {
  return '№' + String(index + 1).padStart(3, '0')
}

export function BookmarkCard({ bookmark, index, stagger, marked, selected, broken }: Props) {
  const { t } = useTranslation()
  const domain = domainOf(bookmark.url)
  const date = formatDate(bookmark.addedAt)
  const favicon = faviconUrl(bookmark.url)
  const [faviconBroken, setFaviconBroken] = useState(false)
  // Read once: changing the delay of a card-in already under way replays it.
  const [entranceStep] = useState(Math.min(stagger, 24))
  const cardStyle = { '--i': entranceStep } as CSSProperties

  function open() {
    openLink(bookmark.url)
  }

  return (
    <article
      aria-selected={selected}
      onDoubleClick={open}
      style={cardStyle}
      className={cx(
        'card-in relative flex h-full min-h-[170px] flex-col rounded-md border p-4 select-none cursor-default',
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
        <span className="flex items-center gap-2">
          {broken && (
            <>
              <UnplugIcon label={t('card.brokenAria')} />
              <button
                type="button"
                title={t('card.dismissBroken')}
                aria-label={t('card.dismissBroken')}
                // Not a click on the card (selection) nor a double click (open).
                onClick={e => {
                  e.stopPropagation()
                  dismissBrokenAnimated([bookmark.id])
                }}
                onDoubleClick={e => e.stopPropagation()}
                className="cursor-pointer text-[0.8rem] leading-none opacity-60 hover:opacity-100 transition-opacity"
              >
                👍
              </button>
            </>
          )}
          {marked && (
            <span
              className="font-mono text-[0.95rem] leading-none text-accent"
              aria-label={t('card.markedAria')}
            >
              ⨯
            </span>
          )}
        </span>
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
            onClick={e => {
              // A plain link can't open chrome:// or file:// from the extension.
              if (isWebUrl(bookmark.url)) return
              e.preventDefault()
              openLink(bookmark.url)
            }}
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
        <div className="flex items-baseline font-mono text-[0.68rem] text-ink-mute">
          {date && <span className="whitespace-nowrap">{date}</span>}
        </div>
      </footer>
    </article>
  )
}
