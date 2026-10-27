# Observaciones de traducción

Lo que encontró el agente de traducciones (`.claude/agents/i18n-translator.md`) al revisar las partes 1 y 2 del paso 18, el 25-10-2026. Nada de esto lo causó el paso 18. Decidido el 26-10-2026 (ver [Decisión](#decisión)).

## Solo textos (`src/locales`)

1. **«1 conservados»**: `header.stats.kept` no tiene plural, así que la cabecera dice «1 conservados». `AppHeader` ya pasa `count`, de modo que basta con los JSON:
   - es: `kept_one` «{{count}} conservado» y `kept_other` «{{count}} conservados».
   - en: `kept_one` y `kept_other`, los dos «{{count}} kept».
2. **Carpetas borradas**: `applyDialog.doneFolders_*` puede leerse como que la carpeta sigue ahí («También 1 carpeta que se quedó vacía», «Also 1 folder left empty»). Propuesta:
   - es: «También se borró {{count}} carpeta que se quedó vacía.» / «También se borraron {{count}} carpetas que se quedaron vacías.»
   - en: «Also deleted {{count}} folder left empty.» / «Also deleted {{count}} folders left empty.»
3. **Nombre del administrador**: `applyDialog.headsUpBody` dice «gestor de marcadores», y es justo donde hay que ir para recuperar la copia. Mejor con el nombre que usa Chrome: «Administrador de marcadores» / «Bookmark manager», como en la [ayuda de Google](https://support.google.com/chrome/answer/188842?hl=es).

## Con cambio de código

4. **Tecla `shift`** escrita a mano en `src/components/AppHeader.tsx`. En España se rotula «Mayús», igual que «Supr» ya sale de `selectionBar.deleteKey`. Propuesta: una clave `header.shortcuts.shiftKey` con «Mayús» / «Shift». Hoy conviven «Supr» y «Del» con mayúscula y «ctrl», «shift» y «esc» en minúscula; se podría unificar.
5. **`lang` fijo**: `index.html` pone `<html lang="en">` y nada lo cambia al pasar a español, porque `src/i18n/index.ts` no escucha `languageChanged`. Un lector de pantalla lee el español con pronunciación inglesa.
6. **Descripción de la extensión**: la de `public/manifest.json` solo está en inglés. Chrome la traduce con `default_locale` y `_locales/<idioma>/messages.json`, un sistema aparte de i18next.

## Para el paso 18

7. **Chip «(raíz)»**: `filterBar.folderRoot` solo servía para los marcadores sueltos en la raíz de un HTML. En Chrome todo cuelga de una carpeta del navegador, así que ya nunca se veía. Se quitó (`6df5de6`): la rama de ruta vacía de `formatFolder` en `src/components/FilterBarTabs.tsx` y la clave de los dos JSON, en el mismo cambio.

## Vistas y descartadas

- El error de arranque de `createBookmarkSource.ts` está solo en inglés, pero solo sale fuera de la extensión.
- El español tiene plural `many` para los millones exactos; con marcadores no pasa en la práctica.

## Decisión

- ✅ Los tres textos (1–3), en un commit pequeño: hechos en `f816231`. El agente de traducciones lo revisó y no hizo falta tocar nada más.
- ✅ «(raíz)» (7): hecho en la parte 3 del paso 18 (`6df5de6`).
- ⏳ El resto (4–6), al paso opcional final (paso 20).
