# Paso 20: vista de lista o de grid — diseño

Fecha: 03-11-2026. Estado: aprobado por el usuario el 03-11-2026. Tamaño: proyecto pequeño (un componente nuevo, una preferencia y un botón), más cinco arreglos de textos y UI que el roadmap ya dejaba «de paso» en este paso.

## Intención

Triar es ver muchos marcadores, seleccionar los que sobran y eliminarlos. Hoy solo hay grid: cada card ocupa al menos 170 px de alto (más 16 de hueco) y 220 de ancho. Una lista de filas de una línea enseña más marcadores a la vez en ventanas estrechas, y así se selecciona y se elimina más en cada pasada.

Es una estimación sacada del CSS, sin medir: con filas de 32 px, la lista enseña más cuando el grid tiene menos de 6 columnas (ventana de menos de unos 1.500 px de ancho; en media pantalla, casi el doble). En ventanas anchas el grid ya enseña tantos o más (en 1920 px, unos 35 marcadores frente a unos 29), y ahí la lista gana solo en lectura: columnas alineadas. Por eso la fila es compacta.

## Objetivos

- Un control para elegir entre **grid** (el de hoy, y la vista con la que arranca la primera vez) y **lista**.
- La elección se recuerda entre visitas.
- La lista se maneja igual que el grid: nada de lo que se puede hacer en uno falta en el otro.
- Con 5.000 marcadores, la lista no es más lenta que el grid.

## No objetivos

- Ningún dato nuevo en la fila: sin carpeta ni URL completa. Es lo que enseña la card.
- Sin cabecera de columnas ni columnas ordenables: el orden sigue en el menú de siempre.
- Sin densidad configurable ni tercera vista.
- Sin atajo de teclado para cambiar de vista.
- No virtualiza (decisión del usuario, 03-11-2026): se mide primero. Ver [Rendimiento](#rendimiento).
- No toca los puertos ni `src/core/`: es UI y una preferencia.

## Anti-objetivos (lo que sería un fallo aunque «funcione»)

- La lista más lenta que el grid con los mismos 5.000 marcadores.
- Una fila de más de 32 px, que gasta justo lo que la vista quiere ahorrar.
- Perder en la lista algo del grid: lazo, `Shift`/`Ctrl`+clic, 👍, deshacer, el aviso de eliminados.
- Que cambiar de vista pierda la selección o el triaje en curso.
- Que la fila cambie de tamaño al seleccionarla (el contorno va hacia dentro) o que salte el layout.
- Que el grupo de vista parezca un botón de acción: «Aplicar» es el único con relleno oscuro.

## Qué ve el usuario

### El control

Dos botones de 32×32 px pegados, con el borde compartido, a la **izquierda del botón de idioma**, en la fila de botones del header. Primero el de grid (4 cuadrados redondeados), luego el de lista (3 líneas), iconos de 16 px.

- **Activo:** fondo suave (`paper-soft`), borde e icono en el acento. Se marca como pulsado (`aria-pressed="true"`); **no** va `disabled` (se vería como no disponible y saldría del foco del teclado). Pulsarlo no hace nada.
- **Inactivo:** como los botones de idioma y tema, con su hover.
- El grupo lleva nombre accesible («Vista») y cada botón, `aria-label` y tooltip, en es y en en.

### La fila

32 px de alto y una sola línea, con los datos de la card:

| Columna | Detalle |
|---|---|
| № | `№001`, mono 0,7 rem, apagado, 40 px |
| Favicon | 14 px, con el mismo fallback que la card |
| Título | flexible, 14 px, recortado con puntos suspensivos; enlace que abre como en la card |
| Dominio | 170 px, mono 0,72 rem, recortado |
| Fecha | 76 px, mono 0,68 rem, `AAAA·MM·DD` |
| Marcas | 44 px, a la derecha |

Las filas van dentro de un único recuadro con borde y esquinas redondeadas, separadas por una línea de 1 px (`edge`). Estados, los de hoy:

- **Seleccionada:** contorno de 2 px en el acento **hacia dentro** y un fondo con un tinte del acento.
- **Eliminada:** fondo `paper-soft`, contenido atenuado y título tachado; la ⨯ del acento al final.
- **Rota:** enchufe (16 px, acento) y 👍 «no está roto». El 👍 no cuenta como clic en la fila, ni arranca el lazo, ni abre el enlace, igual que en la card.
- **Doble clic en la fila** abre el enlace, como en la card.

### Cómo se comporta

- Selección, lazo, `Ctrl`/`Cmd`+`A`, `Supr`, `Esc`, `/`, barra flotante, deshacer, filtros, orden y chips: **igual que en el grid**, con el mismo estado del store.
- Al eliminar o restaurar, las filas que salen se desvanecen y las demás suben, reutilizando el movimiento del grid (`gridMotion.ts`). Si no encaja, el cambio es instantáneo y se anota.
- Cambiar de vista conserva la selección (como el orden) y es un cambio instantáneo; las filas entran con la animación de entrada de siempre.
- La lista cabe en el mismo `<main>`, con el mismo padding y el mismo hueco abajo para la barra flotante.

## Datos y arquitectura

- **Estado de la vista:** `'grid' | 'list'`, compartido entre el control del header y el contenido, fuera del store del triaje: es una preferencia, no triaje. Persistida con clave propia (`bookmarkify:view`), como el tema (`bookmarkify:theme`). Cualquier valor que no sea `'list'` o `'grid'` vale como `'grid'`.
- **Sin cambios en `useBookmarkStore`, los selectores ni los puertos.** `useVisibleBookmarks` alimenta las dos vistas.
- **Plomería compartida:** el lazo (Selecto), la sincronización con el store y el movimiento son los mismos para las dos vistas; solo cambian el contenedor y el elemento. Si se comparten o se separan en dos componentes lo decide el constructor.
- **Trampa conocida:** Selecto solo vuelve a sincronizar sus elementos seleccionados cuando cambian `selected` o `visible`. Al cambiar de vista hay que forzarlo, o su estado interno queda apuntando a nodos que ya no están.
- **Movimiento:** `gridMotion.ts` mide los elementos con `[data-bookmark-id]`, usa su posición en el DOM como hueco y clona el nodo para el fundido; nada de eso depende de que sea una rejilla. A comprobar: que el clon de una fila (que sale del recuadro y de su separador) se vea bien.
- **Compartir lo que ya existe:** `formatDate`, `catalogNumber` y el icono del enchufe están hoy dentro de `BookmarkCard`; la fila no los copia.

## Rendimiento

Antes de dar la parte por buena se mide la lista con 5.000 marcadores con el mismo método que el grid ([`pruebas-rendimiento.md`](../../pruebas-rendimiento.md#mediciones-en-chrome-30-10-2026)): eliminar la primera fila, `Ctrl`+`A`, abrir un menú y cambiar de vista (esta última se compara con montar el grid al cargar, porque el grid no tiene equivalente).

- **«Lenta» quiere decir peor que el grid** en la misma acción. Si no lo es, no se virtualiza.
- Si lo es, primero lo barato: `content-visibility: auto` con `contain-intrinsic-size` en las filas, y comprobar que no recorta el menú ni el movimiento.
- La virtualización ([`ideas-aparcadas.md`](../../ideas-aparcadas.md#virtualizar-el-grid), complejidad alta, del tamaño de los pasos 14 y 16) **no entra sola**: si la medición la pide, se para y se decide aparte, con su diseño.
- El resultado se anota en `pruebas-rendimiento.md` y en la entrada de `ideas-aparcadas.md`.

## De paso: cinco arreglos que el roadmap deja en este paso

Cada uno en su commit, aparte de la lista. Detalle y números en [`observaciones-traducciones.md`](../../observaciones-traducciones.md).

1. **Tecla «Mayús»** (obs. 4): `AppHeader` escribe `shift` a mano. Una clave `header.shortcuts.shiftKey` con «Mayús» / «Shift». No se unifica el resto de teclas.
2. **`lang` de `<html>`** (obs. 5): hoy fijo en `en`; `src/i18n/index.ts` no escucha `languageChanged`.
3. **Descripción de la extensión en español** (obs. 6): `default_locale` y `_locales/<idioma>/messages.json`, sistema aparte de i18next. Se prueba cargando la extensión en Chrome.
4. **Chip de carpeta** (parte 2, n.º 1): `max-w-[180px]` recorta antes del nombre de la carpeta y se pierde el «(2)». Remedio de código o CSS.
5. **Aviso de sincronización** (parte 2, n.º 3): la salida barata, solo la redacción de `applyDialog.sync` en los dos JSON y la última línea de «Aplicar en Chrome» en `CLAUDE.md`. No se muestra según `inAccount`.

## Verificación

- Pruebas de Vitest para lo puro: la lectura de la preferencia (valor ausente, inválido o válido) y todo lo que se extraiga y sea puro. `planGridMotion` no cambia y sus tests siguen valiendo.
- No hay tests de componentes (no hay testing-library): lo visual y la interacción se comprueban a mano con `npm run dev` y en Chrome, con una lista de pasos nueva en `docs/pruebas-vista-lista.md`, como la del paso 19.
- Medición de rendimiento, arriba.
- El agente de traducciones revisa el diff de cada parte que toque la UI.
- `npm run build`, `npm run lint` y `npm run test` en verde al cerrar cada parte.
- Al cerrar: `CLAUDE.md` (paso 20), `README.md`, `docs/roadmap.md`, `ideas-aparcadas.md` y las observaciones resueltas.

## Lo que queda al constructor

El tamaño de componentes y dónde vive el estado de la vista; los colores y tamaños exactos con los tokens de `index.css` (los números de arriba salen de la maqueta, que no se versiona); si la fila tacha el título con `strike-mark` o con `line-through`; los puntos de corte en ventanas estrechas; los trazos exactos de los dos iconos; el texto en es/en («Vista», «Vista de grid», «Vista de lista»…), que revisa el agente de traducciones; y cómo se reparte el trabajo en partes (propuesta: el estado y el control con la lista en bruto, la fila y sus estados, el movimiento y la medición, los cinco arreglos, y las pruebas y la documentación; parar tras cada parte).

## Decisiones mías, por revisar

Las seis primeras llamadas (posición, «pulsado» sin `disabled`, recordar la vista, comportamiento igual, movimiento reutilizado y no virtualizar de entrada) las aprobó el usuario el 03-11-2026. Estas son nuevas:

- Cambiar de vista **no conserva el scroll**: la página queda donde la deje el navegador. El usuario lo valorará al probarlo; si molesta, se añade que el marcador que estaba arriba siga arriba (un `scrollTo` al cambiar de vista).
- Al pasar el ratón, la fila se aclara (fondo suave); el título lleva el título completo en un tooltip, porque se recorta.
- En ventanas estrechas se ocultan primero la fecha y luego el dominio; el título y las marcas se ven siempre.
- «Lenta» es peor que el grid, y la virtualización se decide aparte aunque salga lenta.
- De los cinco arreglos, solo la tecla «Mayús» (sin unificar el resto) y el aviso de sincronización con la salida barata.
- La clave de la preferencia, `bookmarkify:view`.
