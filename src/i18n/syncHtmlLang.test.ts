import { describe, expect, it } from 'vitest'
import { syncHtmlLang, type LangSource } from './syncHtmlLang'

function fakeSource(init: { resolvedLanguage?: string; language?: string }) {
  const listeners: Array<() => void> = []
  const source: LangSource & { resolvedLanguage?: string; language?: string } = {
    ...init,
    on(_event, listener) {
      listeners.push(listener)
    },
  }
  return { source, emit: () => listeners.forEach((l) => l()) }
}

describe('syncHtmlLang', () => {
  it('pone el idioma resuelto al llamar', () => {
    const { source } = fakeSource({ resolvedLanguage: 'es' })
    const root = document.createElement('html')
    syncHtmlLang(source, root)
    expect(root.lang).toBe('es')
  })

  it('usa en si no hay idioma', () => {
    const { source } = fakeSource({})
    const root = document.createElement('html')
    syncHtmlLang(source, root)
    expect(root.lang).toBe('en')
  })

  it('lo actualiza en cada languageChanged', () => {
    const { source, emit } = fakeSource({ resolvedLanguage: 'es' })
    const root = document.createElement('html')
    syncHtmlLang(source, root)
    source.resolvedLanguage = 'en'
    emit()
    expect(root.lang).toBe('en')
  })
})
