import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { useViewStore, type View } from '../store/useViewStore.ts'
import { cx } from '../lib/cx.ts'

const ICON_PROPS = {
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  'aria-hidden': true,
  className: 'h-4 w-4',
} as const

function GridIcon() {
  return (
    <svg {...ICON_PROPS} strokeLinejoin="round">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg {...ICON_PROPS} strokeLinecap="round">
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  )
}

const OPTIONS: Array<{ view: View; Icon: () => ReactElement; labelKey: string }> = [
  { view: 'grid', Icon: GridIcon, labelKey: 'view.grid' },
  { view: 'list', Icon: ListIcon, labelKey: 'view.list' },
]

// Two joined buttons: the current view is marked as pressed, not disabled, so
// it stays reachable with the keyboard and doesn't read as unavailable.
export function ViewToggle() {
  const { t } = useTranslation()
  const view = useViewStore(s => s.view)
  const setView = useViewStore(s => s.setView)

  return (
    <div role="group" aria-label={t('view.group')} className="flex">
      {OPTIONS.map(({ view: option, Icon, labelKey }, i) => {
        const active = view === option
        return (
          <button
            key={option}
            type="button"
            onClick={() => setView(option)}
            aria-pressed={active}
            aria-label={t(labelKey)}
            title={t(labelKey)}
            className={cx(
              'relative flex h-8 w-8 items-center justify-center border transition-colors',
              i === 0 ? 'rounded-l-sm' : '-ml-px rounded-r-sm',
              active
                ? 'z-10 cursor-default border-accent bg-paper-soft text-accent'
                : 'cursor-pointer border-edge bg-paper-card text-ink-soft hover:z-10 hover:border-ink-mute hover:text-ink',
            )}
          >
            <Icon />
          </button>
        )
      })}
    </div>
  )
}
