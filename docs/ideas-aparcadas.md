# Ideas aparcadas

Ideas que se quedaron fuera por YAGNI (el recorte del 12-10-2026 y las que fueron saliendo después), guardadas por si se retoman. El roadmap confirmado el 12-10-2026 es:

- **17:** ChromeAdapter y extensión.
- **18:** retirada de la importación.
- **19:** enlaces rotos.
- **20 (opcional final):** vista de lista o de grid.

Las capturas de referencia estaban en `screens/`, que se borró el 13-10-2026. Lo que mostraba cada una queda resumido en su idea.

## Previsualización

Ver la página en un modal o un panel sin abrirla en otra pestaña.

- **Por qué se aparcó:** muchas webs prohíben mostrarse en un iframe con `X-Frame-Options` o con `frame-ancestors` en su CSP. Comprobado ese día: YouTube, Instagram, LinkedIn, Google Drive y LogRocket, que es el ejemplo de la captura.
- **Qué haría falta:** quitar esas cabeceras con `declarativeNetRequest` (aprovechando el permiso de host que ya pedirá el paso 19), aislar el iframe con `sandbox` y elegir cómo se abre: al pasar el ratón, como en la captura, o con una tecla o un botón. Complejidad media.
- **Mientras tanto:** el clic central en el título abre el enlace en segundo plano.
- **Dónde encajaría:** después del paso 19.

## Carpetas vacías

Una pestaña con las carpetas vacías y la opción de borrarlas.

- **Por qué se aparcó:** en la captura, la única carpeta vacía era la Barra de marcadores, que Chrome no deja borrar. Las carpetas que vacía el triaje ya se borran al aplicar (decisión del paso 17).
- **Qué haría falta:** que el documento incluya las carpetas con su id, y que la UI las muestre como un segundo tipo de elemento, con selección y borrado pendiente propios. Habría que excluir las carpetas raíz, las que tienen `folderType`. Complejidad media.
- **Dónde encajaría:** después del paso 19. Es requisito de «Arrastrar a carpetas».

## Arrastrar a carpetas

Mover marcadores arrastrándolos a una carpeta.

- **Por qué se aparcó:** el gestor de Chrome ya lo hace, también con varios seleccionados, y borra en bloque: se selecciona con Ctrl o Mayús+clic y se deshace con Ctrl+Z. Es el paso más caro de la lista.
- **Qué haría falta:**
  - que arrastrar no choque con el lazo de react-selecto;
  - un panel de carpetas que sirva de destino;
  - movimientos pendientes, con deshacer y persistencia;
  - aplicarlos con `chrome.bookmarks.move()`.

  Necesita las carpetas con id de «Carpetas vacías». Complejidad alta.
- **Dónde encajaría:** al final, después de «Carpetas vacías».

## Pestaña «Sin usar»

Marcadores que nunca se han abierto, según `dateLastUsed` (aparece en todas las capturas).

- **Por qué se aparcó:** en la captura, 117 de 121 marcadores salían como «sin usar», así que el filtro casi no separa nada. Además, Chrome solo da ese dato desde la versión 114 (2023).
- **Qué haría falta:** leer `dateLastUsed` en el ChromeAdapter y añadir un filtro y un orden por último uso. Complejidad baja.
- **Dónde encajaría:** en cualquier momento después del paso 17.

## Virtualizar el grid

Montar solo las cards que se ven (con `@tanstack/react-virtual`) en vez de las 5.000.

- **Por qué se aparcó (30-10-2026):** se consideró YAGNI. Con 5.000 marcadores y los hallazgos 6 y 7 arreglados, cada acción cuesta entre 0,25 s y 1,7 s en el servidor de desarrollo (borrar la primera card 1,2 s; ordenar o deshacer las 5.000, 1,7 s; abrir un menú, 0,4 s), y `Ctrl`+`A` deja el hilo ocupado 4,4 s. Producción sin medir. [Mediciones](./pruebas-rendimiento.md#mediciones-en-chrome-30-10-2026).
- **Qué haría falta:**
  - `useWindowVirtualizer`: se virtualizan filas y las columnas de la rejilla `auto-fill` se calculan a mano, con la altura de la card fija;
  - sustituir el lazo de react-selecto por uno por geometría, o aceptar que solo alcance las cards montadas (`Ctrl`+`A` y `Shift`+clic van por ids y no cambian);
  - rediseñar `gridMotion.ts`, que mide todas las cards del DOM, usa el índice del DOM como hueco y clona nodos para el fundido;
  - que `card-in` no se repita al montar cada card al hacer scroll, y simular el tamaño en los tests de componentes (jsdom no tiene layout).

  Complejidad alta, del tamaño de los pasos 14 y 16.
- **Antes, más barato (cada uno arregla solo una parte, sin probar):** `content-visibility: auto` en las cards, que podría recortar el menú y el layout pero no el coste de React; y numerar con contadores CSS en vez de pasar `index`, para que borrar la primera cueste como borrar la última, aunque no ayuda a ordenar ni a `Ctrl`+`A`. Conviene medir antes la build de producción.
- **Dónde encajaría:** al final, junto al paso 20: los dos reescriben `BookmarkGrid` y una vista de lista es el caso fácil del virtualizador.
- **Aviso para el paso 19:** si el escaneo de enlaces escribe en el store por cada resultado, puede repintar el grid entero en cada uno. Se evita al diseñarlo, agrupando las escrituras o guardando los estados aparte.
