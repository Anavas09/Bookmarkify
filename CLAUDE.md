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

Las eliminaciones son **no destructivas**: los IDs marcados se acumulan en un `Set<string>` dentro del store de Zustand. La exportación real los filtra en el momento del commit. Nada se elimina de forma permanente hasta que el usuario dispara una acción explícita de exportación.

```ts
interface BookmarkStore {
  bookmarks: Bookmark[];
  pendingDeletes: Set<string>;
  focusedIndex: number;
  load(source: BookmarkSource): Promise<void>;
  mark(id: string): void;
  unmark(id: string): void;
  moveFocus(delta: number): void;
  exportFiltered(source: BookmarkSource): Promise<void>;
}
```

Atajos de teclado: `j`/`k` mueven el foco, `x` marca el marcador enfocado para eliminarlo, `u` lo desmarca.

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

## Limitación del ciclo web-app pura

Chrome (y otros navegadores) importan HTML de bookmarks de forma **aditiva, no destructiva**: todo lo importado va a una subcarpeta nueva dentro de "Other Bookmarks" (ej. `Imported YYYY-MM-DD`) sin borrar nada del perfil actual. Las raíces `bookmark_bar`, `other` y `synced` ("Mobile Bookmarks") son especiales y no se eliminan aunque el HTML no las incluya.

Consecuencia: el HTML filtrado que exporta la app es una **herramienta de decisión** ("qué borrar"), no de aplicación ("bórralo"). Para aplicar el triaje al perfil real hace falta borrar manualmente los descartados en el navegador o usar el `ChromeAdapter` (extensión) cuando exista.
