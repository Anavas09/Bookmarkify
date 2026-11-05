# Roadmap

Estado del plan, actualizado mientras avanzamos. El detalle técnico de cada paso terminado está en [`CLAUDE.md`](../CLAUDE.md#orden-de-implementación).

**Última actualización:** 05-11-2026 (pasos 19 y 20 fusionados en `main`, PR #10 y #11; el plan está completo). Pasos 17 y 18 fusionados en `main` (PR #3 y #4). Antes del paso 19 se cerraron los hallazgos del [code review](./code-review.md): el 1 y el 2 (copia de seguridad, PR #5), el 3, el 4 y el 5 (carpetas por id, PR #6), el 6 y el 7 (rendimiento, PR #7), el 8 (relectura, PR #8) y el 9 y el 10 (URL de Chrome y medición, PR #9). El paso 20 cerró el plan.

## Resumen

| Paso | Qué | Estado |
|---|---|---|
| 1–16 | Web app de triaje: subir el HTML, grid, filtros, orden, selección, eliminar con deshacer y exportar | ✅ hecho |
| 17 | ChromeAdapter y extensión | ✅ hecho |
| 18 | Retirada de la importación | ✅ hecho |
| 19 | Enlaces rotos | ✅ hecho (PR #10) |
| 20 | Vista de lista o de grid (opcional final) | ✅ hecho (PR #11) |

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
5. [x] Fusionar la PR (PR #6, 29-10-2026)

### #6 y #7 — Rendimiento del orden y los contadores (`fix/sort-performance`)

Un `Intl.Collator` compartido para el orden por título y por dominio, y `domainOf` y `normalizeUrl` guardan lo que ya analizaron. Sin cambios en `Bookmark` ni en el puerto.

1. [x] **Tests primero** (29-10-2026): orden con acentos, `www` y URL que no se analizan, y «cada URL se analiza una vez» (fallaban antes del cambio)
2. [x] **Arreglo** (29-10-2026): título de ~195 ms a ~6 ms y dominio de ~215 ms a ~7 ms con 5.000 marcadores; contadores de ~9 ms a ~3 ms
3. [x] **Documentación**: `code-review.md` y este roadmap
4. [x] Medirlo en Chrome con 5.000 marcadores (30-10-2026, automatizado y en el servidor de desarrollo, no en la extensión; [resultados](./pruebas-rendimiento.md#mediciones-en-chrome-30-10-2026)): en una prueba alternada, borrar la primera card pasa de 1,66 s a 1,05 s y deshacer, de 1,58 s a 1,10 s (cifras corregidas el 02-11-2026). Queda lento el render de las cards (fuera de estos hallazgos). La prueba manual con la extensión cargada es opcional
5. [x] Fusionar la PR (PR #7)

### #8 — Si falla la relectura después de aplicar (`fix/refetch-failure`)

`commit` del store ya no pierde el resultado si `load()` falla tras borrar: devuelve `reloadFailed` y el resumen avisa de recargar la pestaña.

1. [x] **Test primero** (02-11-2026): `getTree` falla solo en la relectura (fallaba antes del cambio)
2. [x] **Arreglo y UI** (02-11-2026): `AppliedResult`, aviso en `ApplyDialog` y su texto en español e inglés
3. [x] **Documentación**: `code-review.md` y este roadmap
4. [x] Fusionar la PR (PR #8)

### #9 — Los enlaces `chrome://` y `file://` no se abren (`fix/chrome-urls`)

Las cards abren los marcadores con `chrome.tabs.create` dentro de la extensión; los `http(s)` del título siguen siendo un enlace normal.

1. [x] **Reproducirlo** (02-11-2026): con la extensión real en Chromium 149 sin marca, `chrome://flags` y `file://` no se abrían; `chrome.tabs.create` sí
2. [x] **Arreglo con test** (02-11-2026): `lib/openLink.ts` y su test, en `BookmarkCard`
3. [x] **Comprobarlo** (02-11-2026): los seis casos (doble clic y título, con `chrome://`, `file://` y `https`) abren en la extensión real
4. [x] **Documentación**: `code-review.md` y este roadmap
5. [ ] Fusionar la PR

### #10 — Se borra de uno en uno (medido, sin cambios en el código)

Se midió antes de tocar nada, como acordamos: si era rápido, se dejaba como estaba.

1. [x] **Medirlo** (02-11-2026): con la extensión real en Chromium 149, 5.000 marcadores se borran en 0,6–1,0 s y «Aplicar» entero tarda ~0,9 s ([resultados](./pruebas-rendimiento.md#borrado-real-en-chromium-02-11-2026-hallazgo-10))
2. [x] **Decisión:** se deja como está; el paralelo no gana de forma clara y no compensa la complejidad
3. [x] **Documentación**: `code-review.md`, `pruebas-rendimiento.md` y este roadmap

Con esto terminan los hallazgos del code review; sigue el paso 19.

## Paso 19 — Enlaces rotos

Diseño: [`superpowers/specs/2026-11-02-enlaces-rotos-design.md`](./superpowers/specs/2026-11-02-enlaces-rotos-design.md). Plan: [`superpowers/plans/2026-11-02-enlaces-rotos.md`](./superpowers/plans/2026-11-02-enlaces-rotos.md). Se para tras cada parte.

- Solo cuentan como rotos los 404/410 y los dominios que no responden (dos intentos); el resto no se marca.
- Escaneo la primera vez, con aviso previo y permiso opcional de sitios; el resultado se guarda y no se repite al abrir. El botón re-escanea rotos, antiguos (30 días) y nuevos.
- Marca de enchufe en la card, chip «rotos · N» y 👍 «no está roto» (en la card y en lote) que sobrevive al re-escaneo.

1. [x] **Parte 1, núcleo** (02-11-2026): tipos, `classify`, `selectScanTargets`, `scanLinks` (reintento, cancelar, sin red), puerto `LinkChecker` con adaptador real y falso, y `optional_host_permissions` en el manifest. 251 tests, build y lint en verde.
2. [x] **Parte 2, store y filtro** (02-11-2026): `useLinkStore` (clave `bookmarkify:links:v1`, tolera JSON corrupto), filtro `broken` con `selectBrokenIds`/`selectBrokenCount`, y `dismissBrokenAnimated`/`dismissSelectedBrokenAnimated` (el 👍 afecta también a las URL gemelas). 272 tests, build y lint en verde.
3. [x] **Parte 3, UI de las marcas** (02-11-2026): marca de enchufe y 👍 en la card (el 👍 queda fuera del lazo de Selecto), chip «rotos · N» (solo tras un primer escaneo) y «no están rotos» en la barra de selección. Textos revisados por el agente de traducciones. Sin tests de componentes (no hay testing-library): se comprueba a mano en la parte 4. 272 tests, build y lint en verde.
4. [x] **Parte 4, diálogos y cierre** (02-11-2026): `ScanDialog`, botón del header con el primer escaneo al abrir, ejemplos de `npm run dev` (404, dominio caído, 403 y una pareja duplicada rota), [`pruebas-enlaces-rotos.md`](./pruebas-enlaces-rotos.md), README y `CLAUDE.md`. 272 tests, build y lint en verde.
5. [x] **Pruebas del usuario en Chrome** (03-11-2026): todas las de [`pruebas-enlaces-rotos.md`](./pruebas-enlaces-rotos.md) pasadas (permiso, primer escaneo, no repetir al abrir, cancelar, 👍, sin red y «Aplicar»).
6. [x] **PR #10** fusionada en `main` (03-11-2026, `6a3a9ab`).

## Paso 20 (opcional final) — Lista o grid

Diseño: [`superpowers/specs/2026-11-03-vista-lista-design.md`](./superpowers/specs/2026-11-03-vista-lista-design.md). Plan: [`superpowers/plans/2026-11-03-vista-lista.md`](./superpowers/plans/2026-11-03-vista-lista.md). Se para tras cada parte.

- Dos botones pegados (4 cuadrados y 3 líneas) a la izquierda del de idioma, con la vista activa marcada. Arranca en grid y la elección se recuerda (`bookmarkify:view`).
- Fila de lista de 32 px y una línea, con los datos de la card, que se maneja igual que el grid. No se virtualiza: se mide con 5.000 marcadores.
- De paso, cinco arreglos aparcados: las observaciones 4–6 de las [traducciones](./observaciones-traducciones.md) (la tecla «Mayús», el `lang` de `<html>` y la descripción de la extensión en español) y dos de la [parte 2 de «Carpetas por id»](./observaciones-traducciones.md#parte-2-de-carpetas-por-id-28-10-2026): el chip de carpeta, que recorta la etiqueta, y el aviso de sincronización del diálogo «Aplicar».

1. [x] **Parte 1, base** (03-11-2026): `useViewStore` (clave `bookmarkify:view`), `formatDate`, `catalogNumber` y el enchufe compartidos con la card, y el botón de vista en el header (aún sin lista detrás). 290 tests, build y lint en verde.
2. [x] **Parte 2, la lista** (03-11-2026): `BookmarkRow` y `BookmarkGrid` con las dos vistas. Comprobado a mano en `npm run dev`: selección (clic, `Ctrl`/`Shift`+clic, lazo, `Ctrl`+`A`, `Esc`), borrar, deshacer y restaurar con fundido y filas que suben (sin movimiento con `prefers-reduced-motion`), vista «eliminados» con tres marcas alineadas, 👍 sin seleccionar ni abrir, filas sin fecha, sin título, con título larguísimo y `chrome://`, ventana de 700 y 600 px, y Selecto sincronizado al cambiar de vista. 290 tests, build y lint en verde.
3. [x] **Parte 3, rendimiento** (04-11-2026): medida con 5.000 marcadores, grid y lista alternados (tres parejas). La lista no es peor que el grid en `Ctrl`+`A`, `Supr` ni abrir un menú, y `Ctrl`+`A` y `Supr` sobre los 5.000 no se congela. La primera versión de la fila tenía una cola de 3,5–5 s tras `Ctrl`+`A` por 5.000 transiciones de fondo a la vez; quitada la transición, se iguala. No se virtualiza. Detalle en [`pruebas-rendimiento.md`](./pruebas-rendimiento.md#vista-de-lista-con-5000-marcadores-04-11-2026-paso-20).
4. [x] **Parte 4, los cinco arreglos «de paso»** (04-11-2026), cada uno en su commit: tecla «Mayús» (`ceb43c1`), `lang` de `<html>` (`676919a`), descripción de la extensión en español (`b5e67ba`), ancho del chip de carpeta activo (`4e8002e`) y aviso de sincronización con la cuenta de Google (`f206859`). 295 tests, build y lint en verde. Falta comprobar en Chrome la descripción en español (lista de la parte 5).
5. [x] **Parte 5, pruebas y documentación** (04-11-2026): [`pruebas-vista-lista.md`](./pruebas-vista-lista.md) (siete bloques, sin marcar), `CLAUDE.md` (paso 20 ✅), README, `ideas-aparcadas.md` y `observaciones-traducciones.md`. 295 tests, build y lint en verde.
6. [x] **Pruebas del usuario en Chrome** (05-11-2026): todas las de [`pruebas-vista-lista.md`](./pruebas-vista-lista.md) pasadas, también «reducir movimiento». Sobre el scroll: el problema real es que el control de vista no está en la barra pegajosa; queda aparcado en [`ideas-aparcadas.md`](./ideas-aparcadas.md#botón-de-vista-en-la-barra-pegajosa). Al pasar el ratón, la fila se oscurece un poco (no se aclara): el código está bien y se corrigió el texto.
7. [x] **PR #11** fusionada en `main` (05-11-2026).
