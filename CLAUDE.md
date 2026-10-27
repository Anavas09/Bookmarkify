# CLAUDE.md

Este archivo ofrece orientación a Claude Code (claude.ai/code) al trabajar con el código de este repositorio.

## Skills

- Antes de actuar, usar Superpowers (`superpowers:using-superpowers`) para buscar la skill que mejor se ajusta a la tarea.
- Para funcionalidades nuevas, empezar por `superpowers:brainstorming`, antes de planificar o escribir código.

# Triaje de marcadores

Extensión de Chrome de triaje visual para limpiar los marcadores. Los lee con `chrome.bookmarks` y, al pulsar «Aplicar», borra de Chrome los que el usuario eliminó. Empezó como web app que subía un HTML en formato Netscape; el paso 18 retiró ese código.

## Stack

Vite + React + TypeScript, empaquetado como extensión de Chrome (Manifest V3). Zustand para el estado. Vitest para los tests. Sin backend.

## Comandos

```bash
npm run dev        # servidor de desarrollo, con un chrome.bookmarks falso y marcadores de ejemplo
npm run build      # comprueba tipos + build: deja la extensión en dist/
npm run test       # ejecuta todos los tests una vez (Vitest)
npm run test:watch # ejecuta los tests en modo watch
npx vitest run src/core/adapters/ChromeAdapter.test.ts   # ejecuta un solo archivo de tests
npm run lint       # ESLint
```

### Cargar la extensión

1. `npm run build`.
2. En `chrome://extensions`, activar el modo desarrollador, pulsar «Cargar descomprimida» y elegir `dist/`.
3. Pulsar el icono de Bookmarkify (en el menú del puzle si no está fijado): la app se abre en su propia pestaña.
4. Tras cada build, pulsar ↻ en la tarjeta de la extensión y recargar la pestaña.

Los marcadores reales se prueban en un perfil de Chrome aparte, sin sincronización, con un HTML de marcadores importado en el Administrador de marcadores: «Aplicar» borra de verdad (ver [Aplicar en Chrome](#aplicar-en-chrome)).

## Estructura de directorios

```
public/
  manifest.json               # Manifest V3: solo pide el permiso bookmarks
  background.js               # service worker: abre la app en su pestaña al pulsar el icono
  theme-init.js               # tema antes de que monte React (la CSP bloquea los scripts inline)
src/
  main.tsx                    # crea la fuente con createBookmarkSource() y se la pasa a <App>
  core/
    ports/
      BookmarkSource.ts       # la interfaz del puerto — lo único que la UI conoce
    adapters/
      ChromeAdapter.ts        # lee y borra con chrome.bookmarks
      createBookmarkSource.ts # elige la fuente: Chrome o, en npm run dev, la de ejemplo
      fakeChromeBookmarks.ts  # chrome.bookmarks en memoria, para los tests y npm run dev
      devBookmarks.ts         # los marcadores de ejemplo de npm run dev
      download.ts             # descarga un archivo (la copia de seguridad)
      serializer.ts           # marcadores → HTML Netscape (puro, testeable), para la copia de seguridad
    types.ts                  # Bookmark, BookmarkDocument, etc.
    normalizeUrl.ts           # normalización de URLs para detectar duplicados
  store/
    useBookmarkStore.ts       # store de Zustand
  components/                 # solo UI — sin conocimiento de adapters ni del formato
```

## Regla de arquitectura (crítica)

Toda lectura y escritura de marcadores pasa por el puerto `BookmarkSource` en `src/core/ports/BookmarkSource.ts`. Ningún archivo fuera de `src/core/adapters/` puede conocer el formato HTML Netscape ni la API `chrome.bookmarks`. Esto desacopla la UI de la fuente de datos: el paso a extensión (paso 17) cambió el adaptador y el arranque, pero no el grid, los filtros ni la selección.

La fuente se elige en un solo sitio, `createBookmarkSource()`: `chrome.bookmarks` dentro de la extensión y, con `npm run dev`, el falso de `fakeChromeBookmarks.ts` con marcadores de ejemplo. `main.tsx` la crea y se la pasa a `<App source>`.

Interfaz `BookmarkSource`:

```ts
interface BookmarkSource {
  load(): Promise<BookmarkDocument>; // BookmarkDocument = { bookmarks }
  commit(change: BookmarkChange): Promise<CommitResult>;
}

// El resultado del triaje: los marcadores que hay que borrar, y nada más.
interface BookmarkChange {
  removed: Bookmark[];
}

interface CommitResult {
  deleted: number;
  skipped: number;               // no borrados: cambiaron o desaparecieron desde la carga
  folders: number;               // carpetas que se quedaron vacías y se borraron
  backupFilename: string | null;
}
```

## Tipos base

```ts
interface Bookmark {
  id: string;            // id del nodo en Chrome
  title: string;
  url: string;
  addedAt?: number;      // ms unix: dateAdded en Chrome
  folderPath?: string[]; // carpetas desde la raíz, empezando por la del navegador
}
```

## Modelo de estado

Las eliminaciones son **no destructivas**: los IDs marcados se acumulan en un `Set<string>` dentro del store de Zustand. Nada se borra de Chrome hasta que el usuario pulsa «Aplicar» y lo confirma: entonces `commit` pasa los eliminados al puerto. Mientras tanto, los eliminados se ocultan del grid y de los contadores; solo aparecen en la vista «eliminados» (paso 15), desde donde se restauran.

Solo se persiste el triaje (`pendingDeletes`, `activeFilter` y `activeSort`), con la clave `bookmarkify:v2` en `localStorage`. Los marcadores se vuelven a leer de la fuente en cada visita, y `load()` descarta las marcas de los que ya no existen.

```ts
interface BookmarkStore {
  bookmarks: Bookmark[];
  pendingDeletes: Set<string>;
  selected: Set<string>;          // selección visual efímera (no se persiste)
  selectionAnchor: string | null; // id del último clic simple, para Shift+clic
  lastDeleted: string[] | null;   // último lote eliminado, para deshacer (efímero)
  load(source: BookmarkSource): Promise<void>; // relee la fuente; conserva las marcas que siguen existiendo
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
  commit(source: BookmarkSource): Promise<CommitResult>; // los eliminados al puerto; después relee la fuente
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
    - ✅ **Barra resaltada** — `.theme-invert` (en `index.css`) le da a `SelectionBar` la paleta del tema contrario para que destaque en claro y en oscuro; la paleta clara está repetida en `.dark .theme-invert` y hay que mantenerla sincronizada con `@theme`. La barra también entra y sale animada (desde el paso 16, con Motion).
16. ✅ Animaciones con **Motion** (rama `feat/motion-cards`) en las cards, que reemplaza `lib/viewTransition.ts`, y en la barra flotante. El modal y los menús no cambian.
    - `lib/gridMotion.ts` mide el grid antes del cambio, lo aplica con `flushSync` e incrementa un `epoch` en un store propio. Cada card va dentro de un `m.div` con `layout="position"` cuyo `layoutDependency` es ese `epoch` solo si la card está a menos de un viewport, o va a ocupar uno de esos huecos (`planGridMotion`, con tests). Así solo se miden y deslizan esas cards; filtrar y ordenar no cambian el `epoch` y el grid salta sin animar.
    - Las cards que salen se animan con un clon fijo que se desvanece donde estaba (`opacity` + `scale 0.94`). Las que vuelven cerca del viewport reutilizan `card-in` sin escalonado.
    - No se usa `AnimatePresence`: su diff de keys es O(n²) y `mode="popLayout"` inyecta un `<style>` por cada card que sale, así que se congela con Ctrl+A → Supr sobre miles de cards.
    - **Barra flotante** — `SelectionBar` decide si se muestra y un `Bar` interno pinta el contenido que recibe por props, dentro de `AnimatePresence`. Al salir, `AnimatePresence` sigue renderizando el último elemento, así que la barra se desvanece con sus contadores en vez de quedarse vacía. `useIsPresent` desactiva los botones mientras sale. Entra con `easeOut` (200 ms) y sale con `easeIn` (160 ms), con `opacity` y `y: 8`. Si vuelve a haber selección durante la salida, la animación se invierte desde donde esté.
    - `LazyMotion` con `domMax` y `strict`, y `MotionConfig reducedMotion="user"`, envuelven la app en `App.tsx`. Con `prefers-reduced-motion`, el grid cambia al instante y la barra solo hace el fundido.
17. ✅ ChromeAdapter y extensión (rama `feat/chrome-adapter`): la app pasa a ser una extensión de Chrome que lee los marcadores con `chrome.bookmarks` y, al pulsar «Aplicar», borra de Chrome los eliminados. Las decisiones están en `docs/roadmap.md`.
    - **Puerto `commit`** — `export(doc)` pasa a `commit({ kept, removed, meta })`, que devuelve un `CommitResult`: `downloaded` si se guardó un archivo y `applied` si cambió la fuente. Cada adaptador usa la lista que necesita. En el store, `commit` sustituye a `exportFiltered` y, tras un `applied`, vuelve a cargar la fuente. La descarga de archivos pasa a `adapters/download.ts`.
    - **Leer** — `ChromeAdapter.load()` recorre `getTree()` en profundidad, en el orden del gestor, con el id de Chrome, `dateAdded` como `addedAt` y un `folderPath` que empieza por la carpeta del navegador (barra de marcadores, otros marcadores o móvil). Deja fuera los bookmarklets (`javascript:`) y lo que gestiona un administrador (`unmodifiable`). `meta` va vacío.
    - **Borrar** — `ChromeAdapter.commit()` borra solo `removed`: nunca calcula «árbol actual − conservados», porque borraría lo añadido en Chrome después de cargar. Vuelve a leer el árbol y salta los que ya no existen o cambiaron de URL; también cuenta como `skipped` lo que Chrome no deja borrar. Antes de borrar descarga la copia de seguridad (`bookmarks-AAAA-MM-DD_deleted.html`, con `serializer.ts` y los datos actuales de Chrome), porque Chrome no lo puede deshacer. Después sube por los padres de lo borrado y quita las carpetas que quedaron vacías. No toca las del navegador (`folderType`, o colgar de la raíz antes de Chrome 134), las gestionadas, las que ya estaban vacías ni las que guardan algo que la app no muestra, como un bookmarklet.
    - **`chrome.bookmarks` falso** — `fakeChromeBookmarks.ts` lo implementa en memoria con las reglas de Chrome: nada cuelga de la raíz, las carpetas del navegador y lo gestionado no se tocan, y solo se borran carpetas vacías. Lo usan los tests y `npm run dev`, que arranca con los marcadores de ejemplo de `devBookmarks.ts`: vuelven completos al recargar y el build no los incluye.
    - **Extensión** — `public/manifest.json` (Manifest V3, solo el permiso `bookmarks`) y `public/background.js`, un service worker que abre `index.html` en una pestaña al pulsar el icono. `npm run build` deja la extensión en `dist/`. El script del tema pasa de `index.html` a `public/theme-init.js`, porque la CSP de las extensiones no ejecuta scripts inline. `createBookmarkSource()` elige la fuente: `chrome.bookmarks` si existe, el falso en desarrollo y, si no hay ninguno (como al servir `dist/` como web), una fuente que falla con un mensaje.
    - **Arranque** — `App` recibe la fuente por props y llama a `load()` en cada visita. Muestra «cargando» (con 300 ms de retraso para no parpadear), el error con su mensaje o «no hay marcadores que revisar». Sustituye a la pantalla de subida del HTML.
    - **«Aplicar»** — sustituye en el header a «exportar» y a «cargar otro archivo», y se desactiva si no hay eliminados. `ApplyDialog` (HeadlessUI) pide confirmación con el foco en «cancelar» y avisa de la copia, de las carpetas vacías y de la sincronización. No se puede cerrar mientras borra. Al acabar resume los borrados, las carpetas, los saltados y el nombre de la copia; si falla, pide recargar la pestaña. Se renderiza fuera de la rama del grid para que el resumen siga a la vista aunque se borre todo. Los atajos no actúan mientras hay un `[role="dialog"]` abierto.
    - **Persistencia** — la clave pasa a `bookmarkify:v2` y guarda solo el triaje: `pendingDeletes`, `activeFilter` y `activeSort`. `v1` también guardaba los marcadores del HTML, cuyos ids no sirven en Chrome, y se deja intacta.
    - `FileUpload`, `ExportModal`, `NetscapeAdapter` y `parser.ts` quedan sin uso hasta el paso 18.
18. ✅ Retirada de la importación (rama `refactor/remove-import`): se borra lo que deja de usarse al ser solo extensión, siguiendo `docs/eliminar-con-chrome-adapter.md`.
    - **UI** — fuera `FileUpload`, `ExportModal`, sus textos y los de «exportar», el CSS de la subida (`.sr-input`, `.progress-bar`) y los restos de la plantilla de Vite.
    - **Núcleo** — fuera `NetscapeAdapter` y `parser.ts`. `Bookmark` pierde `tags` e `icon`, y `BookmarkDocument` pierde `meta`. El puerto pasa a `commit({ removed })` y `CommitResult` pierde `downloaded` y `kind`. El serializer queda solo para la copia de seguridad, y `exportFilename.ts` pasa a `backupFilename.ts`.
    - **Documentación y `npm run preview`** — fuera el script `preview`, que solo mostraba el error de arranque, y el chip «(raíz)» del filtro por carpeta: en Chrome todo cuelga de una carpeta del navegador. Las observaciones de traducción están en `docs/observaciones-traducciones.md`.
19. ⏳ Enlaces rotos: escaneo al abrir la pestaña y botón para volver a escanear. Solo cuentan como rotos los 404/410 y los dominios que no responden, y 👍 «no está roto» descarta los falsos positivos.
20. ⏳ Paso opcional final: elegir si los marcadores se ven como lista o como grid.

## Aplicar en Chrome

«Aplicar» es lo único que borra de verdad, y Chrome no lo puede deshacer:

- Solo se borra lo marcado (`removed`), nunca «árbol actual − conservados»: eso borraría lo que el usuario añadiera en Chrome con la app abierta.
- Antes de borrar se descarga la copia de seguridad. Se recupera importándola en el Administrador de marcadores; como Chrome importa de forma **aditiva**, lo recuperado vuelve dentro de una carpeta nueva, no a su sitio.
- Las carpetas del navegador (barra de marcadores, otros marcadores, móvil) nunca se borran; las del usuario, solo si el triaje las deja vacías.
- Con la sincronización activada, el borrado llega a los demás dispositivos.
