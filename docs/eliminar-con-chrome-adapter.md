# Qué se elimina al tener el ChromeAdapter

Lista viva: se irá ampliando mientras avanzamos. Se aplica en el paso 18, ahora que la extensión ya carga y aplica el triaje en Chrome. Lo que el paso 17 ya adelantó está al final, en [Adelantado en el paso 17](#adelantado-en-el-paso-17).

## Supuesto

La app pasa a ser solo una extensión de Chrome: lee los marcadores con `chrome.bookmarks` y aplica el triaje directamente en el perfil. Desaparecen la versión web, la subida del HTML y la exportación con reimportación. Edge y Brave, basados en Chromium, deberían poder cargarla (sin probar); Firefox y Safari quedan fuera.

## Archivos que se borran

| Archivo | Qué hace hoy | Tests que se van |
|---|---|---|
| `src/components/FileUpload.tsx` | Nada: era la pantalla para soltar el HTML, y nadie la importa desde el paso 17 | — |
| `src/components/ExportModal.tsx` | Nada: era el modal tras exportar, y nadie lo importa desde el paso 17 | — |
| `src/core/adapters/NetscapeAdapter.ts` | Lee el archivo subido y descarga el HTML filtrado. Solo lo usa `FileUpload` | 3 |
| `src/core/parser.ts` | HTML Netscape → marcadores. Solo lo usan `NetscapeAdapter` y los tests del serializer | 27 |

## Lo que se recorta

- **`src/core/types.ts`**
  - `Bookmark.tags`: venía del atributo `TAGS` de Firefox. Chrome no tiene etiquetas.
  - `Bookmark.icon`: venía del atributo `ICON` del HTML. La API de Chrome no da el favicon.
  - `DocumentMeta` y `SpecialFolder` (`rootTitle`, `specialFolders`): solo servían para reconstruir el HTML. `BookmarkDocument` pierde `meta`.
- **`src/core/ports/BookmarkSource.ts`**: `BookmarkChange` se queda solo con `removed`, sin `kept` ni `meta`, y `CommitResult` pierde `downloaded`.
- **`src/core/serializer.ts`**: se queda solo para la copia de seguridad de los marcadores borrados. Pierde `ICON`, `TAGS`, `rootTitle` y `specialFolders`, y con ellos sus tests. Los tests de ida y vuelta con `parseNetscape` hay que reescribirlos sin el parser.
- **`src/store/useBookmarkStore.ts`**
  - `meta`: estado, `getInitialState` y lo que `commit` pasa al puerto.
  - `commit`: deja de repartir en conservados y eliminados; le bastan los eliminados.
  - Tests: el `meta` del `FakeSource` y el que comprueba que `commit` pasa los conservados y el `meta`.
- **`src/components/ApplyDialog.tsx`**: la rama que cierra el diálogo cuando el resultado es `downloaded`.
- **`src/components/BookmarkCard.tsx`**: las etiquetas del pie (`bookmark.tags`) y `bookmark.icon ?? faviconUrl(...)`, que queda en `faviconUrl(...)`.
- **`src/lib/exportFilename.ts`**: `buildExportFilename` (`bookmarks-AAAA-MM-DD_edited.html`) y sus 2 tests. Se queda `buildBackupFilename`, y el archivo puede pasar a llamarse `backupFilename.ts`.
- **`src/index.css`**: `.sr-input` y `.progress-bar` (con `@keyframes progressSlide`), que solo usa `FileUpload`. `.progress-bar` podría servir para el progreso del escaneo de enlaces; se decide al llegar a ese paso.
- **`src/locales/es.json` y `en.json`**: `fileUpload.*` (11 claves), `exportModal.*` (10) y `header.export.*` (4). «Aplicar» ya tiene las suyas en `header.apply.*`.
- **`package.json`**: el script `preview`, si no le ves uso. Sirve `dist/` como web, donde no hay `chrome.bookmarks`, así que solo muestra el error de arranque.

## Documentación

Lo que queda para el paso 18; el resto se hizo en el 17.

- **`CLAUDE.md`**: `NetscapeAdapter.ts` y `parser.ts` en la estructura, `tags` en «Tipos base», `kept`, `meta` y `downloaded` en la interfaz del puerto, y las notas «se retira en el paso 18». El historial de los pasos 1–17 se queda como historia.
- **`README.md`** y **`CLAUDE.md`**: `npm run preview`, si se quita el script.

## Lo que se queda (no borrar por error)

- **Puerto `BookmarkSource`**: lo implementa `ChromeAdapter`, y los tests usan un `FakeSource`.
- **`createBookmarkSource.ts`, `fakeChromeBookmarks.ts` y `devBookmarks.ts`**: eligen la fuente al arrancar y dan un `chrome.bookmarks` falso a los tests y a `npm run dev`.
- **`download.ts`**: descarga la copia de seguridad.
- **`serializer.ts`**: genera la copia de seguridad de los borrados.
- **`normalizeUrl.ts`**: detección de duplicados.
- **`faviconUrl.ts`**: favicons de Google. Los locales de Chrome (`_favicon`) devuelven un globo genérico para los sitios no visitados.
- **`folderPath`, el filtro por carpeta y el orden por fecha**: la fecha sale de `dateAdded`.
- **`jsdom`**: lo necesitan los tests del store por `localStorage`.
- **`public/favicon.svg`**: icono de la pestaña.

## Restos sin relación con el adaptador (se pueden quitar ya)

- `src/assets/hero.png`, `react.svg` y `vite.svg`: vienen de la plantilla de Vite y nadie los importa.
- `public/icons.svg`: sin referencias.
- `SHORTCUT_KEYS` en `ExportModal.tsx` (espacio, `j`, `k` y flechas): frena atajos del paso 5 que ya no existen desde el paso 14. Se va con el modal.

## Orden de retirada

1. **UI**: `FileUpload`, `ExportModal`, la rama `downloaded` de `ApplyDialog`, las claves de i18n y el CSS.
2. **Núcleo**: `NetscapeAdapter`, `parser`, `meta`, `tags` e `icon` en los tipos, y el recorte del puerto, del store y del serializer.
3. **Documentación**: lo que queda en CLAUDE.md y, si se quita `preview`, en el README.

Tras cada bloque, `npm run build`, `npm test` y `npm run lint` en verde.

## Adelantado en el paso 17

La extensión necesitaba parte de la lista antes de la retirada:

- **Puerto `BookmarkSource`**: `export(doc)` pasó a `commit({ kept, removed, meta })`.
- **`index.html`**: el script inline del tema pasó a `public/theme-init.js`, porque la CSP de Manifest V3 no ejecuta JavaScript inline.
- **`src/App.tsx`**: el arranque que carga de Chrome (cargando, error o perfil sin marcadores) sustituyó a la rama que mostraba `FileUpload`.
- **`src/components/AppHeader.tsx`**: «aplicar» sustituyó a «cargar otro archivo» y a «exportar», con `handleExport`, `ExportedInfo` y `new NetscapeAdapter(...)`.
- **`src/store/useBookmarkStore.ts`**: `commit` sustituyó a `exportFiltered`. Solo se guarda el triaje (`bookmarkify:v2`), y `load()` conserva las marcas de los marcadores que siguen existiendo.
- **`src/lib/exportFilename.ts`**: ganó `buildBackupFilename`, para la copia de seguridad.
- **Documentación**: el README y CLAUDE.md describen la extensión. Se quitaron la sección «Reimportar en el navegador» del README y «Limitación del ciclo web-app pura» de CLAUDE.md.

## Candidatos para más adelante

- La copia de seguridad, y con ella `serializer.ts`, si con el tiempo no la usas.
