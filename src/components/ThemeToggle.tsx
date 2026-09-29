import { useTranslation } from 'react-i18next'
import { useTheme } from '../hooks/useTheme.ts'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const { t } = useTranslation()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? t('theme.toLight') : t('theme.toDark')}
      aria-label={isDark ? t('theme.toLightAria') : t('theme.toDarkAria')}
      className="
        flex items-center justify-center w-8 h-8 rounded-sm border border-edge
        bg-paper-card text-ink-soft hover:text-ink hover:border-ink-mute
        transition-colors font-mono text-[14px] leading-none cursor-pointer
      "
    >
      <span aria-hidden="true">{isDark ? '☀' : '☾'}</span>
    </button>
  )
}
