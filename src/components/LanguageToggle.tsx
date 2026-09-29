import { useTranslation } from 'react-i18next'

const LANGS = ['en', 'es'] as const
type Lang = typeof LANGS[number]

function normalize(lng: string | undefined): Lang {
  if (lng && (LANGS as readonly string[]).includes(lng)) return lng as Lang
  return 'en'
}

export function LanguageToggle() {
  const { i18n, t } = useTranslation()
  const current = normalize(i18n.resolvedLanguage)
  const other: Lang = current === 'en' ? 'es' : 'en'
  const otherName = t(`language.${other}`)

  return (
    <button
      type="button"
      onClick={() => void i18n.changeLanguage(other)}
      title={t('language.switchTo', { lang: otherName })}
      aria-label={t('language.switchTo', { lang: otherName })}
      className="
        flex items-center justify-center min-w-8 h-8 px-2 rounded-sm border border-edge
        bg-paper-card text-ink-soft hover:text-ink hover:border-ink-mute
        transition-colors font-mono text-[11px] leading-none cursor-pointer uppercase tracking-wider
      "
    >
      <span aria-hidden="true">{other}</span>
    </button>
  )
}
