# Pruebas manuales: vista de lista (paso 20)

Rama `feat/list-view`. Marca cada casilla al terminar la prueba.

## Preparación

- [x] Usar un perfil de Chrome aparte, **sin sincronización**, con marcadores importados desde un HTML. Conviene que tenga: carpetas anidadas, dos carpetas hermanas con el mismo nombre, algún título larguísimo, un marcador sin título y un marcador `chrome://settings`.
- [x] `npm run build`, pulsar ↻ en la tarjeta de Bookmarkify en `chrome://extensions` y recargar la pestaña.
- [x] Con `npm run dev` (marcadores de ejemplo) se pueden ver casi todos los pasos sin tocar Chrome. Los del paso 7 que dependen del navegador real se hacen con la extensión cargada.

## 1. El control

- [x] A la izquierda del botón de idioma hay dos botones pegados: 4 cuadrados (grid) y 3 líneas (lista). La primera vez arranca en grid, con ese botón marcado.
- [x] Pulsar el de lista cambia la vista y lo marca; pulsar el que ya está activo no hace nada y no pierde el foco del teclado.
- [x] Cerrar y abrir la pestaña: la vista elegida se recuerda (`bookmarkify:view`).
- [x] Con `localStorage['bookmarkify:view']` puesto a un valor raro (`"xyz"`), la app arranca en grid.
- [x] Los botones tienen nombre y tooltip en los dos idiomas («Vista», «Vista de grid», «Vista de lista»), y «Aplicar» sigue siendo el único botón con relleno oscuro.

## 2. La lista y sus estados

- [x] Cada fila mide 32 px y una línea: número, favicon, título, dominio, fecha y marcas. Los textos largos se recortan con puntos suspensivos y el título completo sale en un tooltip.
- [x] Una fila seleccionada lleva el contorno de 2 px hacia dentro y un tinte del acento, **sin cambiar de tamaño** ni mover el resto.
- [x] Una eliminada (vista «eliminados») sale atenuada, con el título tachado y la ⨯ al final.
- [x] Una rota (tras «comprobar enlaces») lleva el enchufe y el 👍. El 👍 no selecciona la fila, no arranca el lazo ni abre el enlace.
- [x] Una fila sin fecha, una sin título y la de `chrome://settings` se ven bien y alineadas con las demás.
- [x] Doble clic en la fila abre el enlace; clic en el texto del título, también. El resto de la fila no es un enlace.
- [x] Al pasar el ratón, el fondo de la fila cambia a un tono suave (en realidad se oscurece un poco, en claro y en oscuro).

## 3. Selección y atajos

- [x] Clic selecciona; `Ctrl`/`Cmd`+clic suma o quita; `Shift`+clic selecciona el rango desde el ancla.
- [x] Arrastrar dibuja el lazo y selecciona las filas que toca; llegar al borde de la ventana hace scroll.
- [x] `Ctrl`/`Cmd`+`A` selecciona todos los visibles, `Esc` limpia la selección, `Supr` elimina y `/` enfoca la búsqueda.
- [x] Filtros, búsqueda y orden funcionan igual que en el grid, y los contadores de los chips coinciden en las dos vistas.

## 4. Eliminar, restaurar y deshacer

- [x] Eliminar una fila: se desvanece y las de abajo suben. El clon que se desvanece no se ve cortado por el borde del recuadro ni por el separador.
- [x] «Deshacer» (barra o `Ctrl`/`Cmd`+`Z`) la devuelve a su sitio; restaurar desde «eliminados» también.
- [x] Eliminar muchas a la vez (`Ctrl`+`A` y `Supr`) no congela la pestaña.
- [x] Con «reducir movimiento» activado en el sistema, los cambios son instantáneos. (Es un ajuste de accesibilidad del sistema operativo; en Windows 11: Configuración · Accesibilidad · Efectos visuales · Efectos de animación, desactivado. Sin tocar el sistema se simula en DevTools: ⋮ · Más herramientas · Renderizado · «Emular la función multimedia CSS prefers-reduced-motion» · reduce.)

## 5. Cambiar de vista con selección

- [x] Seleccionar varias en el grid, pasar a lista y volver: la selección se conserva en las dos y la barra flotante sigue con el mismo número.
- [x] Tras cambiar de vista, el lazo y `Shift`+clic siguen funcionando (Selecto no se queda apuntando a nodos que ya no están).
- [x] El triaje en curso (eliminados) no cambia al cambiar de vista.
- [x] **Anotar cuánto molesta que el scroll no se conserve.** Decisión pendiente del diseño: hoy el marcador que estaba arriba no se queda arriba al cambiar de vista. Si molesta, se añade un `scrollTo`.

## 6. Ventana estrecha

- [x] Estrechar la ventana: primero se oculta la fecha, luego el dominio. El título y las marcas se ven siempre.
- [x] A 600 px no hay scroll horizontal ni se solapan columnas, en lista y en grid.
- [x] La barra flotante no tapa la última fila (hay hueco abajo).

## 7. Los cinco arreglos

- [x] **Tecla «Mayús»:** en el header, la ayuda de `Shift`+clic dice «Mayús» en español y «Shift» en inglés.
- [x] **`lang` de `<html>`:** en las herramientas de desarrollo, `document.documentElement.lang` es `es` o `en` según el idioma, y cambia al pulsar el botón de idioma.
- [x] **Descripción de la extensión:** con Chrome en español, `chrome://extensions` muestra «Triaje visual de tus marcadores…»; con Chrome en inglés, la descripción en inglés.
- [x] **Chip de carpeta:** con el ejemplo de `npm run dev`, elegir «Barra de marcadores (cuenta) / Trabajo»: la etiqueta se ve entera, también un «(2)» final. El chip de dominio sigue limitado a unos 180 px. Con nombres larguísimos se corta, pero el tooltip enseña la ruta entera.
- [x] **Aviso de sincronización:** al pulsar «Aplicar», el diálogo dice «Si tus marcadores se sincronizan con tu cuenta de Google, el borrado también llega a tus otros dispositivos.» (y su versión en inglés).

## Notas
- Al pasar el mouse sobre la linéa diría que se oscurece, no se aclara. Igual está perfecto
- No se a que te refieres cuando hablas de "reducir movimiento activado en el sistema"
- Molestia del scroll: En el sticky topbar no está la opción de cambiar de lista a grid; es decir, si estoy haciendo mucho scroll hacía abajo, tengo que subir para poder cambiar de lista a grid. Así que de momento seguimos con eso pendiente.
