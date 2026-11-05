export interface LangSource {
  resolvedLanguage?: string
  language?: string
  on(event: 'languageChanged', listener: () => void): unknown
}

// El lector de pantalla elige la voz según html[lang]: debe seguir al idioma de la app.
export function syncHtmlLang(instance: LangSource, root: HTMLElement): void {
  const apply = () => {
    root.lang = instance.resolvedLanguage ?? instance.language ?? 'en'
  }
  apply()
  instance.on('languageChanged', apply)
}
