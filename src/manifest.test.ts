import { describe, expect, it } from 'vitest'
import manifest from '../public/manifest.json'
import en from '../public/_locales/en/messages.json'
import es from '../public/_locales/es/messages.json'

const catalogs: Record<string, Record<string, { message: string }>> = { en, es }

describe('manifest', () => {
  it('usa el idioma por defecto y la descripcion traducida', () => {
    expect(manifest.default_locale).toBe('en')
    expect(manifest.description).toBe('__MSG_extDescription__')
  })

  it('cada __MSG_x__ existe, con texto, en todos los idiomas', () => {
    const keys = [...JSON.stringify(manifest).matchAll(/__MSG_(\w+)__/g)].map((m) => m[1])
    expect(keys.length).toBeGreaterThan(0)
    for (const [locale, catalog] of Object.entries(catalogs)) {
      for (const key of keys) {
        expect(catalog[key]?.message, `${locale}:${key}`).toBeTruthy()
      }
    }
  })
})
