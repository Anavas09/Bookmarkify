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

«Antes» es la misma app con el código anterior de los selectores (comparador con `localeCompare` con opciones y sin caché de `domainOf` ni `normalizeUrl`), reconstruido interceptando esos tres módulos en el navegador, sin tocar el árbol de trabajo. Orden por dominio activo, salvo en las dos primeras filas.

| Acción | Del pulsar al pintado | Hilo ocupado |
|---|---|---|
| Elegir «title A→Z» | 2,44 s → 1,84 s | 3,5 s → 3,0 s |
| Elegir «domain A→Z» | 1,97 s → 1,54 s | 3,1 s → 2,7 s |
| `Supr` en la última card | 0,82 s → 0,25 s | 1,0 s → 0,4 s |
| `Ctrl`+`Z` tras borrar la última | 0,81 s → 0,24 s | 1,6 s → 0,5 s |
| `Supr` en la primera card | 7,47 s → 1,22 s | 7,7 s → 1,4 s |
| `Ctrl`+`Z` tras borrar la primera | 7,82 s → 0,98 s | 8,3 s → 1,3 s |
| `Ctrl`+`A` | 6,13 s → 1,18 s | 6,2 s → 4,4 s |
| `Supr` con las 5.000 | 0,70 s → 0,16 s | 0,6 s → 0,1 s |
| `Ctrl`+`Z` con las 5.000 | 12,77 s → 1,69 s | 14,1 s → 2,7 s |

Un solo cálculo de la lista ordenada, en una página vacía de Chrome (tres repeticiones): por título 679–727 ms → 19 ms; por dominio 1.000–1.053 ms → 22 ms (42 ms la primera vez, con las URL aún sin analizar). Un `new URL()` cuesta 1,8 µs, y cada orden por dominio llama a `domainOf` unas 103.000 veces. Por acción, la lista se calcula 2 veces al ordenar y 3 al eliminar, restaurar o deshacer (en producción, sin StrictMode, serían 1 y 2).

### Lo que sigue lento (no es de los hallazgos 6 y 7)

Con el arreglo, lo que queda es React pintando las 5.000 cards, sin virtualizar:

- **Se renderizan de nuevo todas las cards.** `BookmarkCard` se llama 9.998 veces al borrar la primera (4.999 cards por 2, por StrictMode), 10.000 al ordenar, con `Ctrl`+`A` y al deshacer las 5.000, y solo 86 al borrar la última. Causa probable, leída en el código y sin probarla quitándola: el «№» (`catalogNumber(index)`) cambia en todas las cards que siguen, y `GridItem` está memoizado con `index` entre sus props.
- **Abrir un menú tarda 0,4–0,45 s.** El perfil lo atribuye a `UpdateLayoutTree` (338 ms) dentro de una función de HeadlessUI (`J$1`, en un `useMemo`). No investigué qué lo dispara.
- **`Ctrl`+`A` deja el hilo ocupado 4,4 s**, aunque pinta a 1,2 s.
- **Producción sin medir.** React en desarrollo y StrictMode repiten cada render y añaden trabajo de depuración, así que la extensión (`npm run build`) debería ir más rápida. Lo que hace el navegador (estilos, layout y pintado de 5.000 cards) no cambia.
- Los 385 errores de consola de las pruebas son 404 de favicon de dominios inventados, los esperados.

Cómo se hizo: `addInitScript` con el `chrome.bookmarks` falso, y `PerformanceObserver` de `event` (con `durationThreshold` 16) y de `longtask`. La ordenación se guarda en `localStorage`, así que cada recarga arranca con la última. Los scripts no están en el repositorio.
