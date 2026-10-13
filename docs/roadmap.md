# Roadmap

Estado del plan, actualizado mientras avanzamos. El detalle técnico de cada paso terminado está en [`CLAUDE.md`](../CLAUDE.md#orden-de-implementación).

**Última actualización:** 13-10-2026. Paso 17 hecho en la rama `feat/chrome-adapter`, que falta subir y fusionar en `main` con un PR. Siguiente: el paso 18.

## Resumen

| Paso | Qué | Estado |
|---|---|---|
| 1–16 | Web app de triaje: subir el HTML, grid, filtros, orden, selección, eliminar con deshacer y exportar | ✅ hecho |
| 17 | ChromeAdapter y extensión | ✅ hecho |
| 18 | Retirada de la importación | ⏳ pendiente |
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

## Paso 19 — Enlaces rotos

- Escaneo al abrir la pestaña y botón para volver a escanear.
- Solo cuentan como rotos los 404/410 y los dominios que no responden.
- 👍 «no está roto» para descartar los falsos positivos.

## Paso 20 (opcional final) — Lista o grid

Elegir si los marcadores se ven como lista o como grid.
