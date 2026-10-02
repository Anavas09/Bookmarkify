# CLAUDE.md

Este archivo ofrece orientación a Claude Code (claude.ai/code) al trabajar con el código de este repositorio.

# Triaje de marcadores

App de triaje visual para limpiar los marcadores del navegador (archivo HTML en formato Netscape o extensión de Chrome).

## Stack

Vite + React + TypeScript. Zustand para el estado. Vitest para los tests. Sin backend.

## Comandos

```bash
npm run dev        # arranca el servidor de desarrollo
npm run build      # comprueba tipos + build
npm run preview    # sirve el build de producción
npm run test       # ejecuta todos los tests una vez (Vitest)
npm run test:watch # ejecuta los tests en modo watch
npx vitest run src/core/parser.test.ts   # ejecuta un solo archivo de tests
npm run lint       # ESLint
```

## Estructura de directorios

```
src/
  core/
    ports/
      BookmarkSource.ts   # la interfaz del puerto — lo único que la UI conoce
    adapters/
      NetscapeAdapter.ts  # parsea el .html subido (formato Netscape)
      ChromeAdapter.ts    # envuelve chrome.bookmarks para el build de extensión
    types.ts              # Bookmark, BookmarkFolder, etc.
    parser.ts             # HTML Netscape → tipos (puro, testeable)
    serializer.ts         # tipos → HTML Netscape (puro, testeable)
    normalizeUrl.ts       # normalización de URLs para detectar duplicados
  store/
    useBookmarkStore.ts   # store de Zustand
  components/             # solo UI — sin conocimiento de adapters ni del formato
```

## Regla de arquitectura (crítica)

Toda lectura y escritura de marcadores pasa por el puerto `BookmarkSource` en `src/core/ports/BookmarkSource.ts`. Ningún archivo fuera de `src/core/adapters/` puede conocer el formato HTML Netscape ni la API `chrome.bookmarks`. Esto desacopla la UI de la fuente de datos y permite migrar la app a una extensión de Chrome sin reescribir código de UI.

Interfaz `BookmarkSource`:

```ts
interface BookmarkSource {
  load(): Promise<Bookmark[]>;
  export(bookmarks: Bookmark[]): Promise<void>;
}
```

## Tipos base

```ts
interface Bookmark {
  id: string;        // generado (crypto.randomUUID o basado en índice)
  title: string;
  url: string;
  addedAt?: number;  // ms unix, del atributo ADD_DATE
  tags?: string[];   // del atributo TAGS
}
```

## Modelo de estado

Las eliminaciones son **no destructivas**: los IDs marcados se acumulan en un `Set<string>` dentro del store de Zustand. La exportación real los filtra en el momento del commit. Nada se elimina de forma permanente hasta que el usuario dispara una acción explícita de exportación. Mientras tanto, los eliminados se ocultan del grid y de los contadores; solo aparecen en la vista «eliminados» (paso 15), desde donde se restauran.

```ts
interface BookmarkStore {
  bookmarks: Bookmark[];
  pendingDeletes: Set<string>;
  selected: Set<string>;          // selección visual efímera (no se persiste)
  selectionAnchor: string | null; // id del último clic simple, para Shift+clic
  lastDeleted: string[] | null;   // último lote eliminado, para deshacer (efímero)
  load(source: BookmarkSource): Promise<void>;
  mark(id: string): void;
  unmark(id: string): void;
  setSelection(ids: Iterable<string>, anchor?: string | null): void;
  selectRangeTo(id: string): void;
  selectAllVisible(): void;
  clearSelection(): void;
  deleteSelected(): void;   // selected → pendingDeletes; el lote queda en lastDeleted
  restoreSelected(): void;  // saca los seleccionados de pendingDeletes
  undoDelete(): void;       // devuelve el último lote
  dismissUndo(): void;      // olvida el último lote (se cierra el aviso)
  exportFiltered(source: BookmarkSource): Promise<void>;
}
```

Selección estilo Explorador de Windows (paso 14): seleccionar **no** marca. Primero se selecciona y después se elimina o restaura la selección desde la barra flotante inferior (paso 15).

Interacciones: clic selecciona, `Ctrl`/`Cmd`+clic suma o quita, `Shift`+clic selecciona el rango desde el ancla, arrastrar dibuja un lazo, doble clic en la card (o clic en el título) abre el enlace. Atajos: `Supr`/`⌫` eliminan la selección, `Esc` la limpia, `Ctrl`/`Cmd`+`A` selecciona los visibles, `Ctrl`/`Cmd`+`Z` deshace el último borrado mientras se ve el aviso y `/` enfoca la búsqueda.

## Orden de implementación

1. ✅ Tipos base + parser de HTML Netscape + tests con Vitest (sin UI)
2. ✅ Puerto `BookmarkSource` + `NetscapeAdapter`
3. ✅ Store de Zustand
4. ✅ Grid de tarjetas con datos reales (subir archivo → parsear → renderizar)
5. ✅ Navegación por teclado (j/k/x/u) + deshacer
6. ✅ Jerarquía de carpetas: parser recorre el árbol `<DL>/<H3>` y añade `folderPath?: string[]` a cada `Bookmark`; el serializer reconstruye la jerarquía al exportar y omite carpetas que queden vacías tras el filtrado
7. ✅ Filtros: por dominio, por URL duplicada (normalizada), por carpeta
8. ✅ Exportar (generar HTML Netscape filtrado y disparar la descarga) + modal post-export con instrucciones de reimportación por navegador y aviso de que Chrome importa de forma aditiva (no reemplaza)
9. ✅ Favicon por marcador vía Google Favicons (`https://www.google.com/s2/favicons?domain=X&sz=32`) renderizado como `<img loading="lazy">` junto al dominio en la card. Descartado el `fetch` de `og:image` (CORS bloquea en web-app pura) y la infra de IntersectionObserver + cola concurrente (innecesaria con `<img>` nativo y CDN de Google). Fallback: si el favicon falla al cargar, se oculta la imagen y se muestra solo el texto del dominio.
10. ✅ Persistencia local del triaje en curso — `zustand/middleware` `persist` con clave `bookmarkify:v1` en `localStorage`. Se persiste `bookmarks + pendingDeletes + activeFilter` (`focusedIndex` y `anchor` se excluyen vía `partialize`). El `Set<string>` de `pendingDeletes` se serializa como `{ __set: string[] }` con `replacer`/`reviver` en `createJSONStorage`. Cargar un archivo distinto sobrescribe automáticamente (el `load()` ya resetea todo el estado).
11. ✅ Selección en lote — `Shift+Space` extiende el marcado desde un ancla (patrón Gmail): el `toggleFocused` individual guarda `anchor = { index, action }` con el índice visible y la acción hecha (`mark` o `unmark`); `extendMarkFromAnchor` aplica esa acción al rango inclusivo entre el ancla y el foco actual (el ancla se mantiene entre extends sucesivos). Botones "mark all N visible" / "unmark all M visible" en el header actúan sobre los visibles del filtro activo (`markAllVisible` / `unmarkAllVisible` en el store). El ancla se resetea en `load` / `setFilter` / `clearFilter` porque los índices visibles cambian.
12. ✅ Orden configurable por el usuario, ortogonal al filtro (pipeline `filter → sort`: el filtro reduce, el sort reorganiza lo que queda), con opciones: **Original** (orden del HTML, default), **Título A→Z / Z→A**, **Más recientes / más antiguos primero** por `addedAt`, **Dominio A→Z**. El sort se persiste junto con `activeFilter` en `bookmarkify:v1` (paso 10) y el ancla de selección en lote (paso 11) se resetea también al cambiar el sort porque los índices visibles cambian, mismo motivo que en `setFilter`.
13. ✅ Paso opcional final — refinamientos fidelidad HTML + dark mode:
    - **Favicon inline** — parser lee el atributo `ICON` del `<A>` (usualmente un `data:` base64 PNG/SVG) y lo guarda en `Bookmark.icon`; serializer lo emite; `BookmarkCard` prefiere el icon inline sobre Google Favicons, con el mismo fallback `onError` si el `data:` estuviera roto.
    - **`BookmarkDocument`** — refactor del puerto: `BookmarkSource.load(): Promise<BookmarkDocument>` donde `BookmarkDocument = { bookmarks: Bookmark[]; meta: DocumentMeta }`. La UI ve `bookmarks` como antes; los metadatos del HTML viajan junto sin ensuciar `Bookmark`. El store guarda `meta` en el estado, lo persiste y lo pasa en `exportFiltered`.
    - **H1 localizado + atributos de carpeta raíz** — `parser` captura el texto de `<H1>` en `meta.rootTitle` (Chrome: "Bookmarks", Firefox: localizado, ej. "Menú Marcadores") y los atributos `PERSONAL_TOOLBAR_FOLDER` / `UNFILED_BOOKMARKS_FOLDER` en `meta.specialFolders` (por `path`). `serializer` usa `meta.rootTitle` en `<TITLE>` + `<H1>` (fallback "Bookmarks") y aplica los atributos preservados al emitir el `<H3>` correspondiente. Los `specialFolders` cuyo path haya quedado vacío tras el filtrado se descartan (no se emiten en vacío).
    - **Dark mode toggle** — sol/luna en el header, `hooks/useTheme.ts` con estado `'light' | 'dark'`, aplicado poniendo/quitando la clase `.dark` en `<html>`. Persist en `localStorage['bookmarkify:theme']`; sin preferencia guardada respeta `prefers-color-scheme` en el primer load. Script inline en `index.html` corre antes de que React monte para evitar FOUC. Paleta dark **frost-nord** derivada de minimal-nordic (fondo azul-gris profundo cool, texto nácar, accent celeste `#88b8dc` brillante para contraste); los tokens se declaran overrideando las variables del `@theme` dentro de un bloque `.dark` en `index.css`, con `@custom-variant dark (&:where(.dark, .dark *))` para el variant `dark:` de Tailwind v4.
14. ✅ Selección estilo Explorador con **react-selecto**, que reemplaza el teclado de triaje de los pasos 5 y 11 (`j`/`k`/flechas/`Space`/`Shift+Space`, `focusedIndex`, `anchor`). Se eligió frente a DragSelect porque este es GPL-3.0 desde la v3 y trae drag and drop activado por defecto; react-selecto es MIT y solo selecciona.
    - El store tiene una selección efímera (`selected` + `selectionAnchor`) separada de `pendingDeletes`. `deleteSelected` y `restoreSelected` pasan la selección al `Set` no destructivo y la vacían. `setFilter`/`clearFilter`/`load` limpian la selección; el sort la conserva porque los mismos elementos siguen visibles.
    - `BookmarkGrid` sincroniza en ambos sentidos: `onSelectEnd` escribe en el store (Shift+clic lo resuelve `selectRangeTo`, porque Selecto no hace rangos) y un efecto llama a `setSelectedTargets` cuando el store cambia la selección (Esc, Ctrl+A, borrar, filtrar). `dragContainer="main"` evita que los clics en el header limpien la selección. `dragCondition` excluye los `<a>` para que el título abra el enlace. El auto-scroll usa `document.body`, que dragscroll trata como viewport.
    - Header: fila contextual "N seleccionados · eliminar N · o pulsa [Supr] · restaurar M · [esc] limpiar", con `⌫`/`⌘` en Mac (`lib/platform.ts`). El lazo usa los tokens del tema (`.selection-lasso` en `index.css`). En el paso 15 esta fila pasa a una barra flotante.
15. ✅ Eliminar visualmente (rama `feat/visual-delete`): ocultar + deshacer + animar.
    - ✅ **Ocultar** — los selectores reciben `pendingDeletes` y excluyen los eliminados de todas las vistas salvo `{ kind: 'deleted' }`, que muestra solo esos para restaurarlos (chip «eliminados · N»). Los contadores de todos, dominio, carpeta y duplicados cuentan solo los conservados; al eliminar una copia, su gemela deja de ser duplicado. Un chip activo sigue pulsable a 0 para poder salir de su vista. Se quitaron `markAllVisible`/`unmarkAllVisible` y sus botones: `Ctrl`/`Cmd`+`A` y luego Supr o restaurar cubren lo mismo.
    - ✅ **Barra flotante + deshacer** — la fila de selección pasa del header a `SelectionBar`, fija abajo y renderizada fuera de `<main>`: dentro, Selecto (`dragContainer="main"`) tomaría los clics en sus botones como clics en vacío y limpiaría la selección. Tras eliminar muestra «N eliminados · deshacer» durante 6 s, y `Ctrl`/`Cmd`+`Z` deshace mientras dura el aviso. Solo se deshace el último lote (`lastDeleted`, efímero), sin historial ni rehacer. Si hay selección, esta tiene prioridad sobre el aviso.
    - ✅ **Animar** con la View Transitions API nativa, sin dependencias: salida de la card y recolocación del resto. `lib/viewTransition.ts` envuelve el cambio en `document.startViewTransition(() => flushSync(update))`, porque Zustand actualiza vía `useSyncExternalStore` y `<ViewTransition>` de React no lo detecta. Solo se nombran (`bm-<id>`) las cards a menos de un viewport de distancia, y se agrupan con `view-transition-class: card`. Los nombres se limpian al acabar la última transición activa. `store/animatedActions.ts` envuelve eliminar, restaurar y deshacer, y descarta los cambios vacíos, porque una transición vacía bloquea el puntero. Sin soporte o con `prefers-reduced-motion`, el cambio es instantáneo. `scrollbar-gutter: stable` evita el salto del layout cuando desaparece la barra de scroll.
    - ✅ **Barra resaltada** — `.theme-invert` (en `index.css`) le da a `SelectionBar` la paleta del tema contrario para que destaque en claro y en oscuro; la paleta clara está repetida en `.dark .theme-invert` y hay que mantenerla sincronizada con `@theme`. La barra también sale animada (`bar-out`): conserva su último contenido hasta el `animationend`, con los botones inactivos.
16. Animación de las cards con **Motion** (rama `feat/motion-cards`), que reemplaza `lib/viewTransition.ts`. Solo afecta a las cards; la barra, el modal y los menús no cambian.
    - `lib/gridMotion.ts` mide el grid antes del cambio, lo aplica con `flushSync` e incrementa un `epoch` en un store propio. Cada card va dentro de un `m.div` con `layout="position"` cuyo `layoutDependency` es ese `epoch` solo si la card está a menos de un viewport, o va a ocupar uno de esos huecos (`planGridMotion`, con tests). Así solo se miden y deslizan esas cards; filtrar y ordenar no cambian el `epoch` y el grid salta sin animar.
    - Las cards que salen se animan con un clon fijo que se desvanece donde estaba (`opacity` + `scale 0.94`). Las que vuelven cerca del viewport reutilizan `card-in` sin escalonado.
    - No se usa `AnimatePresence`: su diff de keys es O(n²) y `mode="popLayout"` inyecta un `<style>` por cada card que sale, así que se congela con Ctrl+A → Supr sobre miles de cards.
    - `LazyMotion` con `domMax` y `strict` envuelve solo el grid. Con `prefers-reduced-motion`, el cambio es instantáneo.

## Limitación del ciclo web-app pura

Chrome (y otros navegadores) importan HTML de bookmarks de forma **aditiva, no destructiva**: todo lo importado va a una subcarpeta nueva dentro de "Other Bookmarks" (ej. `Imported YYYY-MM-DD`) sin borrar nada del perfil actual. Las raíces `bookmark_bar`, `other` y `synced` ("Mobile Bookmarks") son especiales y no se eliminan aunque el HTML no las incluya.

Consecuencia: el HTML filtrado que exporta la app es una **herramienta de decisión** ("qué borrar"), no de aplicación ("bórralo"). Para aplicar el triaje al perfil real hace falta borrar manualmente los descartados en el navegador o usar el `ChromeAdapter` (extensión) cuando exista.
