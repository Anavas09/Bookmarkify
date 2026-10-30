# Roadmap

Estado del plan, actualizado mientras avanzamos. El detalle técnico de cada paso terminado está en [`CLAUDE.md`](../CLAUDE.md#orden-de-implementación).

**Última actualización:** 29-10-2026. Pasos 17 y 18 fusionados en `main` (PR #3 y #4). En curso, antes del paso 19: los hallazgos del [code review](./code-review.md), el 1 y el 2 (copia de seguridad) fusionados (PR #5), y el 3, el 4 y el 5 (carpetas por id) en la rama `fix/folder-ids`, las tres partes hechas, probadas en Chrome y revisadas con un agente; falta fusionar la PR.

## Resumen

| Paso | Qué | Estado |
|---|---|---|
| 1–16 | Web app de triaje: subir el HTML, grid, filtros, orden, selección, eliminar con deshacer y exportar | ✅ hecho |
| 17 | ChromeAdapter y extensión | ✅ hecho |
| 18 | Retirada de la importación | ✅ hecho |
| 19 | Enlaces rotos | ⏳ pendiente |
| 20 | Vista de lista o de grid (opcional final) | ⏳ pendiente |

## Paso 17 — ChromeAdapter y extensión

La app pasa a ser una extensión de Chrome: lee tus marcadores con `chrome.bookmarks` y, al pulsar «Aplicar», borra de Chrome los que eliminaste.

### Decisiones (12-10-2026)

- **Dónde vive:** en una pestaña propia, que se abre al pulsar el icono de la extensión.
- **Cuándo se borra:** en lote al pulsar «Aplicar», no con Supr. El deshacer y la vista «eliminados» siguen como hasta ahora.
- **Copia de seguridad:** antes de borrar se descarga un HTML solo con los marcadores que se van a borrar.
- **Carpetas:** se borran las que el triaje deja vacías. Las del navegador (barra de marcadores, otros marcadores, móvil) nunca.
- **Qué se borra:** solo lo que marcaste. Nunca se calcula «árbol actual − conservados», porque borraría lo que añadas en Chrome después de abrir la app.
- **Solo extensión:** la importación y la exportación HTML se retiran en el paso 18.
- **Desarrollo:** `npm run dev` usa un `chrome.bookmarks` falso con marcadores de ejemplo. Tus marcadores reales se prueban cargando la extensión en un perfil de Chrome aparte, sin sincronización.

### Partes

1. [x] **Refactor sin cambios visibles**
   - [x] Script del tema en `public/theme-init.js`, porque la CSP de la extensión bloquea los scripts inline
   - [x] Puerto `commit({ kept, removed, meta })` con un resultado, en lugar de `export(doc)`
   - [x] Descarga de archivos en un helper que comparten los adaptadores
2. [x] **`ChromeAdapter`**
   - [x] `chrome.bookmarks` falso en memoria, para los tests y para `npm run dev`
   - [x] Carga: id de Chrome, fecha y carpeta empezando por la del navegador. Deja fuera los bookmarklets y los marcadores gestionados por la empresa
   - [x] Aplicar: comprueba que cada marcador sigue igual, descarga la copia, borra y limpia las carpetas vacías
   - [x] Tests
3. [x] **Extensión y UI**
   - [x] `manifest.json` y service worker que abre la pestaña
   - [x] La fuente se elige al arrancar: Chrome en la extensión, la falsa en `npm run dev`
   - [x] Arranque: cargando, error o perfil sin marcadores
   - [x] Guardado local: solo los eliminados que sigan existiendo, el filtro y el orden
   - [x] Botón «Aplicar» con confirmación, resumen e i18n
   - [x] Probada por ti con la extensión cargada en Chrome
4. [x] **Documentación:** `CLAUDE.md`, README y lista de retirada

### Cómo probar la extensión

1. `npm run build` deja la extensión en `dist/`.
2. Crea un perfil de Chrome aparte, sin sincronización, e importa un HTML de marcadores en el gestor (⋮ · Marcadores · Administrador de marcadores · ⋮ · Importar marcadores).
3. En `chrome://extensions`, activa el modo desarrollador, pulsa «Cargar descomprimida» y elige la carpeta `dist/`.
4. Pulsa el icono de Bookmarkify (desde el menú del puzle si no está fijado): la app se abre en su pestaña.
5. Tras cada `npm run build`, pulsa ↻ en la tarjeta de la extensión y recarga la pestaña.

`npm run dev` ya no pide el archivo: arranca con unos marcadores de ejemplo en memoria, que vuelven a estar completos al recargar.

## Paso 18 — Retirada de la importación

Borrar lo que deja de usarse al ser solo extensión, siguiendo la lista viva de [`eliminar-con-chrome-adapter.md`](./eliminar-con-chrome-adapter.md). Build, tests y lint en verde tras cada bloque.

### Partes

1. [x] **UI**
   - [x] `FileUpload` y `ExportModal`
   - [x] Sus textos en español e inglés, y los de «exportar»
   - [x] El CSS que solo usaba la subida
   - [x] Los restos de la plantilla de Vite: `src/assets/` y `public/icons.svg`
2. [x] **Núcleo**
   - [x] `NetscapeAdapter` y `parser.ts`, con sus tests
   - [x] Tipos sin `tags`, `icon` ni `meta`, y tarjetas sin las etiquetas ni el favicon del HTML
   - [x] Puerto solo con los eliminados, y el store, los adaptadores y `ApplyDialog` al día
   - [x] Serializer y nombre de archivo solo para la copia de seguridad
3. [x] **Documentación y `npm run preview`**
   - [x] `CLAUDE.md` sin la importación
   - [x] Sin `npm run preview`: el script y sus menciones en el README y `CLAUDE.md`
   - [x] Sin el chip «(raíz)»: la rama de ruta vacía de `formatFolder` y la clave `filterBar.folderRoot` (observación 7 de las [traducciones](./observaciones-traducciones.md))

## Hallazgos del code review (antes del paso 19)

Decididos y hechos uno a uno, parando tras cada parte. Detalle en [`code-review.md`](./code-review.md).

### #1 y #2 — Copia de seguridad garantizada (`fix/backup-downloads`)

Permiso `downloads` opcional, pedido al confirmar en el diálogo. Sin permiso, o si la copia no se guarda, no se borra nada y se ofrece cancelar o «borrar sin copia».

1. [x] **Núcleo**: puerto con `allowBackup()` y `commit(change, { backup })`, `chromeBackup.ts` con `chrome.downloads`, `BackupFailedError` y tests
2. [x] **UI**: `ApplyDialog` pide el permiso y avisa si no hay copia, con sus textos en español e inglés
3. [x] **Documentación**: `CLAUDE.md`, README, `code-review.md` y este roadmap
4. [x] Probarlo en Chrome (perfil de prueba), con [`pruebas-copia-de-seguridad.md`](./pruebas-copia-de-seguridad.md)
5. [x] Fusionar la PR (PR #5)

### #3, #4 y #5 — Carpetas por id (`fix/folder-ids`)

Cada marcador lleva los ids de sus carpetas para identificarlas y los nombres solo para mostrarlas. Arregla las carpetas con la misma etiqueta («A / B» frente a «A» + «B»), los marcadores de la cuenta frente a los del dispositivo, y las hermanas con el mismo nombre; la copia además respeta el orden de Chrome.

1. [x] **Núcleo y copia** (28-10-2026): `folderIds` e `inAccount` en `Bookmark`, el falso con el juego de carpetas de la cuenta, y el serializador por id y en el orden de Chrome
2. [x] **Filtro y menú** (28-10-2026): filtro por id, etiquetas con «(cuenta)» / «(este dispositivo)» y «(2)», filtro guardado en el formato antiguo descartado una vez, y el ejemplo de `npm run dev` con los tres casos
3. [x] **Documentación** (28-10-2026): `CLAUDE.md`, `code-review.md`, las observaciones de la parte 2 y [`pruebas-carpetas.md`](./pruebas-carpetas.md)
4. [x] Probarlo en Chrome (perfil de prueba), con [`pruebas-carpetas.md`](./pruebas-carpetas.md) (28-10-2026; la migración, opcional, sin probar)
5. [ ] Fusionar la PR

Siguen sin hacer los hallazgos 6–10.

## Paso 19 — Enlaces rotos

- Escaneo al abrir la pestaña y botón para volver a escanear.
- Solo cuentan como rotos los 404/410 y los dominios que no responden.
- 👍 «no está roto» para descartar los falsos positivos.

## Paso 20 (opcional final) — Lista o grid

Elegir si los marcadores se ven como lista o como grid.

De paso, las observaciones 4–6 de las [traducciones](./observaciones-traducciones.md): la tecla «Mayús», el `lang` de `<html>` y la descripción de la extensión en español. Y dos de la [parte 2 de «Carpetas por id»](./observaciones-traducciones.md#parte-2-de-carpetas-por-id-28-10-2026): el chip de carpeta, que recorta la etiqueta, y el aviso de sincronización del diálogo «Aplicar».
