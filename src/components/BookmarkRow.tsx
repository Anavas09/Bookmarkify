import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Bookmark } from '../core/types.ts'
import { domainOf } from '../lib/domain.ts'
import { faviconUrl } from '../lib/faviconUrl.ts'
import { catalogNumber, formatDate } from '../lib/bookmarkFormat.ts'
import { isWebUrl, openLink } from '../lib/openLink.ts'
import { cx } from '../lib/cx.ts'
import { dismissBrokenAnimated } from '../store/linkActions.ts'
import { UnplugIcon } from './UnplugIcon.tsx'

interface Props {
  bookmark: Bookmark
  index: number
  stagger: number // place in the entrance stagger; 0 fades in without delay
  marked: boolean
  selected: boolean
  broken: boolean // the link answered 404/410 or does not exist anymore
}

// One line of the list view: the data of a BookmarkCard in 32px.
export function BookmarkRow({ bookmark, index, stagger, marked, selected, broken }: Props) {
  const { t } = useTranslation()
  const domain = domainOf(bookmark.url)
  const date = formatDate(bookmark.addedAt)
  const favicon = faviconUrl(bookmark.url)
  const [faviconBroken, setFaviconBroken] = useState(false)
  // Read once: changing the delay of a card-in already under way replays it.
  const [entranceStep] = useState(Math.min(stagger, 24))
  const rowStyle = { '--i': entranceStep } as CSSProperties
  const label = bookmark.title || domain
  // A deleted row fades its columns, not the marks, so the ⨯ stays readable.
  // It is not done on the row itself: card-in animates its opacity.
  const dim = marked && 'opacity-55'

  function open() {
    openLink(bookmark.url)
  }

  return (
    <article
      aria-selected={selected}
      onDoubleClick={open}
      style={rowStyle}
      className={cx(
        // No color transition on purpose: Ctrl+A would start one on every row at
        // once, and with 5,000 rows the frames of those 150ms kept the thread busy.
        'card-in relative flex h-8 items-center gap-3 border-b border-edge px-3 select-none cursor-default',
        // The outline goes inward so selecting never changes the row's size.
        selected
          ? 'bg-accent/10 outline outline-2 -outline-offset-2 outline-accent'
          : marked
            ? 'bg-paper-soft'
            : 'bg-paper-card hover:bg-paper-soft',
      )}
    >
      <span className={cx('w-10 shrink-0 font-mono text-[0.7rem] tracking-wider text-ink-mute', dim)}>
        {catalogNumber(index)}
      </span>

      {favicon && !faviconBroken ? (
        <img
          src={favicon}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className={cx('h-3.5 w-3.5 shrink-0 rounded-[3px]', dim)}
          onError={() => setFaviconBroken(true)}
        />
      ) : (
        // Keeps the columns aligned when there is no icon.
        <span className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}

      {/* The link is only the text: the empty space of the row selects it. */}
      <span className={cx('min-w-0 flex-1 truncate font-display text-[0.875rem]', dim)}>
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          title={label}
          draggable={false}
          onDoubleClick={e => e.stopPropagation()}
          onClick={e => {
            // A plain link can't open chrome:// or file:// from the extension.
            if (isWebUrl(bookmark.url)) return
            e.preventDefault()
            openLink(bookmark.url)
          }}
          className={cx(
            'text-ink cursor-pointer',
            marked
              ? 'line-through decoration-accent'
              : 'no-underline hover:underline underline-offset-2 decoration-edge',
          )}
        >
          {label}
        </a>
      </span>

      <span
        className={cx(
          'hidden sm:block w-[170px] shrink-0 truncate font-mono text-[0.72rem] text-ink-soft',
          dim,
        )}
      >
        {domain}
      </span>

      {/* Always rendered, even without a date, so the columns stay aligned. */}
      <span
        className={cx(
          'hidden md:block w-[76px] shrink-0 whitespace-nowrap font-mono text-[0.68rem] text-ink-mute',
          dim,
        )}
      >
        {date}
      </span>

      {/* 64px: a deleted broken link carries three marks. */}
      <span className="flex w-16 shrink-0 items-center justify-end gap-2">
        {broken && (
          <>
            <UnplugIcon label={t('card.brokenAria')} />
            <button
              type="button"
              title={t('card.dismissBroken')}
              aria-label={t('card.dismissBroken')}
              // Not a click on the row (selection) nor a double click (open).
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
    </article>
  )
}
