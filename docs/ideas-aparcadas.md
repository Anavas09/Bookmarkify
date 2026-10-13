# Ideas aparcadas

Ideas que se quedaron fuera en el recorte YAGNI del 12-10-2026, guardadas por si se retoman. El roadmap confirmado ese día es:

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
