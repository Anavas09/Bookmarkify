# Pruebas manuales: rendimiento del orden y los contadores

Rama `fix/sort-performance` (hallazgos 6 y 7 del [code review](./code-review.md)). En Node ya está medido (título ~195 → ~6 ms, dominio ~215 → ~7 ms, contadores ~9 → ~3 ms con 5.000 marcadores); aquí se mira en Chrome. Marca cada casilla al terminar la prueba. Las [mediciones automáticas en Chrome](#mediciones-en-chrome-30-10-2026) están al final.

## Preparación

- [x] Usar un perfil de Chrome aparte, **sin sincronización y sin iniciar sesión**: «Aplicar» borra de verdad.
- [x] `npm run build`, pulsar ↻ en la tarjeta de Bookmarkify en `chrome://extensions` y recargar la pestaña de la app.
- [x] Importar `marcadores-5000.html` en el Administrador de marcadores (⋮ › Importar marcadores). Son 5.000 marcadores en 20 carpetas («Carpeta 1»…«Carpeta 20»), con títulos con acentos, dominios con y sin `www`, y un marcador de cada 25 con la URL repetida. Se genera con el script `gen.mjs` del scratchpad; si hace falta otra vez, pídemelo.
- [x] Abrir la app. Con 5.000 marcadores, el «cargando» y el primer pintado pueden tardar: eso no es de esta rama.

## 1. Orden por título (hallazgo 6)

- [x] Elegir «Título A→Z»: el grid cambia sin pausa que se note. Salen primero los «alpha …» y después «Árbol …» y «arbol …» mezclados (los acentos y las mayúsculas no cuentan).
- [x] Cambiar a «Título Z→A» y volver a «Original»: igual de rápido, y «Original» recupera el orden de Chrome.

## 2. Orden por dominio (hallazgo 6)

- [x] Elegir «Dominio A→Z»: sin pausa. Los dominios salen como texto, sin tener en cuenta el `www` (`sitio0.example`, `sitio1.example`, `sitio10.example`…, aunque unos lleven `www.`).

## 3. Borrar con un orden activo (hallazgo 6)

Es el caso que más recalculaba: la lista se ordenaba dos veces en cada eliminar, restaurar o deshacer.

- [x] Con «Dominio A→Z» activo, seleccionar un marcador y pulsar Supr: desaparece sin pausa. Repetir con «Título A→Z».
- [x] `Ctrl`+`A` y Supr con el orden activo: los 5.000 se eliminan sin congelar la pestaña. Pulsar «deshacer» (o `Ctrl`+`Z`): vuelven sin congelarla.
- [x] Pulsar «restaurar» desde la vista «eliminados».

## 4. Contadores (hallazgo 7)

- [x] Los chips de dominio, de carpeta y de «duplicados» se actualizan al eliminar un marcador sin pausa. El de «duplicados» cuenta 200 al principio (5.000 ÷ 25) y baja al eliminar una copia.
- [x] Eliminar una copia y comprobar que su gemela deja de contar como duplicado (el comportamiento no ha cambiado).

## 5. Medir con el perfil de rendimiento (opcional)

- [ ] En DevTools › Rendimiento, grabar mientras se pulsa «Dominio A→Z» (o se elimina con ese orden activo) y mirar el tiempo de Scripting de esa tarea. En Node, el cálculo del orden va por los 7 ms; lo demás es React pintando.
- [ ] Anotar aquí el tiempo: ______ ms (orden), ______ ms (borrar un marcador).

## 6. Línea de base para el hallazgo 10 (opcional)

No es de esta rama, pero ya hay 5.000 marcadores cargados y el #10 («se borra de uno en uno») pide cronometrar «Aplicar».

- [ ] Eliminar 1.000 marcadores, pulsar «Aplicar», confirmar y cronometrar el «borrando…». Tiempo: ______ s.
- [ ] Importar otra vez el archivo y repetir con los 5.000. Tiempo: ______ s.

## Resultado

- [ ] Todo lo anterior se ve instantáneo, sin congelar la pestaña. Si algo se nota lento, apuntar qué y con cuántos marcadores.

## Mediciones en Chrome (30-10-2026)

Hechas por Claude con el navegador de Playwright (Chrome 156, 20 núcleos), **no con la extensión**: servidor de desarrollo (`npm run dev`, con React en modo desarrollo y StrictMode, que repite cada render) y un `chrome.bookmarks` falso con los 5.000 marcadores de `marcadores-5000.html`, inyectado antes de que cargue la app (70.074 nodos en el DOM). «Del pulsar al pintado» es la duración del evento (Event Timing) y «hilo ocupado», el tiempo hasta la última tarea larga (más de 50 ms). Cada cifra es una sola medición, sin traza ni DevTools abierto: con ellos la sobrecarga multiplica los tiempos por tres o más.

**Corrección (02-11-2026):** las cifras de la primera versión de esta sección estaban mal. Los «antes» salieron de una ventana en que el equipo iba lento (el equipo fluctúa 4–5× entre ventanas) y las de un cálculo suelto, de una micro-prueba en una página vacía que no vale. Lo que sigue son las cifras repetidas dentro de la app, alternando antes y después (ABABAB). Las cifras absolutas son orientativas.

«Antes» es la misma app con el código anterior de los selectores (comparador con `localeCompare` con opciones y sin caché de `domainOf` ni `normalizeUrl`), reconstruido interceptando esos tres módulos en el navegador, sin tocar el árbol de trabajo. Orden por dominio activo.

| Acción (prueba alternada ABABAB) | Antes | Ahora |
|---|---|---|
| `Supr` en la primera card | 1,66 s | 1,05 s |
| `Ctrl`+`Z` tras borrar la primera | 1,58 s | 1,10 s |

Es una mejora de 0,5–0,6 s (31–37 %). Con la referencia estable, abrir un menú tarda ~0,42 s.

Un solo cálculo de la lista ordenada, medido dentro de la app: por título ~103 ms → ~3 ms; por dominio ~180 ms → ~5 ms (los contadores, de ~10 a ~1,5 ms). Node ya había dado 189 y 215 ms, así que no subestimó el problema. Un `new URL()` cuesta 1,8 µs, y cada orden por dominio llama a `domainOf` unas 103.000 veces. Por acción, la lista se calcula 2 veces al ordenar y 3 al eliminar, restaurar o deshacer (en producción, sin StrictMode, serían 1 y 2).

### Lo que sigue lento (no es de los hallazgos 6 y 7)

Con el arreglo, lo que queda es React pintando las 5.000 cards, sin virtualizar:

- **Se renderizan de nuevo todas las cards.** `BookmarkCard` se llama 9.998 veces al borrar la primera (4.999 cards por 2, por StrictMode), 10.000 al ordenar, con `Ctrl`+`A` y al deshacer las 5.000, y solo 86 al borrar la última. Causa probable, leída en el código y sin probarla quitándola: el «№» (`catalogNumber(index)`) cambia en todas las cards que siguen, y `GridItem` está memoizado con `index` entre sus props.
- **Abrir un menú tarda 0,4–0,45 s.** El perfil lo atribuye a `UpdateLayoutTree` (338 ms) dentro de una función de HeadlessUI (`J$1`, en un `useMemo`). No investigué qué lo dispara.
- **`Ctrl`+`A` deja el hilo ocupado 4,4 s**, aunque pinta a 1,2 s.
- **Producción sin medir.** React en desarrollo y StrictMode repiten cada render y añaden trabajo de depuración, así que la extensión (`npm run build`) debería ir más rápida. Lo que hace el navegador (estilos, layout y pintado de 5.000 cards) no cambia.
- Los 385 errores de consola de las pruebas son 404 de favicon de dominios inventados, los esperados.

Cómo se hizo: `addInitScript` con el `chrome.bookmarks` falso, y `PerformanceObserver` de `event` (con `durationThreshold` 16) y de `longtask`. La ordenación se guarda en `localStorage`, así que cada recarga arranca con la última. Los scripts no están en el repositorio.

## Borrado real en Chromium (02-11-2026, hallazgo 10)

Hechas por Claude con la **extensión real** (`dist/` cargado en Chromium 149 sin marca, sin ventana, perfil temporal vacío y sin sincronización) desde un script de Node con `playwright-core`; el Chrome de marca del MCP de Playwright no carga extensiones. Los marcadores se siembran con la API real en 20 carpetas. Alterné secuencial y paralelo tres veces cada uno, porque el equipo fluctúa.

`chrome.bookmarks.remove` aislado (en el service worker), borrando todos los marcadores:

| Marcadores | Secuencial (como `ChromeAdapter`) | Paralelo (`Promise.all`) |
|---|---|---|
| 1.000 | 0,16–0,28 s | 0,055–0,10 s |
| 5.000 | 0,63–0,98 s | 0,59–0,94 s |

Con 5.000, `getTree` tarda 60–95 ms y la limpieza de carpetas vacías 10–20 ms.

«Aplicar» entero en la UI de la extensión (seleccionar todo, eliminar, apply y confirmar, hasta que sale el resumen), con la copia de seguridad incluida: 0,88 s con 1.000 marcadores y 0,93 s con 5.000, y 0 marcadores en Chrome después. Para pasar el diálogo en modo sin ventana hubo que usar una copia temporal de `dist/` con `downloads` como permiso obligatorio: el aviso nativo del permiso opcional no se puede aceptar.

**Conclusión:** la estimación del review (1,5–5 s) estaba sobreestimada entre 3 y 5 veces, y el paralelo no gana de forma clara a 5.000, así que el borrado se deja como está. Sin cubrir: el Chrome real del usuario (sincronización, otras extensiones, perfil grande). Los scripts no están en el repositorio.

## Comprobar enlaces con 5.000 marcadores (03-11-2026, paso 19)

Hechas por Claude con la **extensión real** (`dist/` en Chromium 149 sin marca, sin ventana, perfil temporal), con 5.000 marcadores sintéticos en 20 carpetas, 1.000 dominios `hN.sim.test` y ~200 duplicados. Las respuestas se simulan con `context.route` de Playwright (sin servidor): 30 ms de latencia, 1 de cada 50 da 404, 1 de cada 71 da 403 y 1 de cada 97 no conecta; salen 150 rotos. Para pasar el escaneo en modo sin ventana se usó una copia de `dist/` con `<all_urls>` como permiso obligatorio. **No mide la red real**: el tiempo de un escaneo de verdad lo manda la latencia de los sitios (aprox. 5.000 ÷ 8 × la latencia media).

| Medida (5.000 marcadores) | Resultado |
|---|---|
| Línea base: las mismas 5.000 peticiones desde la página, sin app | 29 s, 0 tareas largas |
| Escaneo antes del arreglo | 62–75 s, 400–620 tareas largas (30–49 s) |
| Escaneo después del arreglo | 36–40 s, 86–146 tareas largas (8–13 s) |
| Chip «rotos»: pulsar → 150 cards | 0,27–0,30 s |
| `Ctrl`+`A` y «no están rotos · 150» → grid vacío | 0,07–0,10 s, sin tareas largas |
| Resultados guardados (`bookmarkify:links:v1`) | ~359 KB |
| Arranque con resultados guardados frente a sin ellos | sin diferencia apreciable (5,1–5,8 s los dos; el arranque con 5.000 cards ya era lento) |

**Qué pasaba:** durante el escaneo el diálogo actualizaba la barra de progreso en cada resultado (~60 veces por segundo), con una transición CSS de 150 ms. Cada actualización pide un fotograma nuevo de la página que hay detrás, y con 5.000 cards sin virtualizar un fotograma cuesta ~28 ms (`IntersectionObserver` de las 5.000 imágenes `loading="lazy"`, `Layerize`, `Paint` y `Layout`). El hilo principal se saturaba y el escaneo tardaba más del doble que la línea base. Con el grid oculto (`display:none`) tardaba 30,5 s, igual que la línea base; el desenfoque de fondo del diálogo no influía. **Arreglo:** la barra se actualiza como mucho cada 250 ms y sin transición.

**Lo que fue un error de medición:** la primera vez sondeé el diálogo con `waitForFunction` en cada fotograma, que por sí solo generaba cientos de tareas largas; con `polling: 1000` desaparecieron. Y con 2.000 marcadores el efecto casi no se ve (17 s frente a 12 s de la línea base): la cifra depende del tamaño de la página. Comparación antes/después con 2–5 repeticiones por lado, no alternadas una a una: lo medido de «antes» se repitió a lo largo de la sesión con resultados parecidos (62–75 s).

**Sin cubrir:** el Chrome real del usuario, sitios reales (CORS, redirecciones, tiempos agotados), el permiso de «sitios específicos» y la memoria del escaneo. Los scripts no están en el repositorio.
