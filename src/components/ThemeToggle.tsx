import { useTheme } from '../hooks/useTheme.ts'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? 'switch to light' : 'switch to dark'}
      aria-label={isDark ? 'switch to light theme' : 'switch to dark theme'}
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
