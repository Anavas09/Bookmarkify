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
6. Jerarquía de carpetas: parser recorre el árbol `<DL>/<H3>` y añade `folderPath?: string[]` a cada `Bookmark`; el serializer reconstruye la jerarquía al exportar y omite carpetas que queden vacías tras el filtrado
7. Filtros: por dominio, por URL duplicada (normalizada), por carpeta
8. Exportar (generar HTML Netscape filtrado y disparar la descarga) + modal post-export con instrucciones de reimportación por navegador y aviso de que Chrome importa de forma aditiva (no reemplaza)
9. Metadatos externos (og:image) — usando IntersectionObserver con una cola de fetch de máximo 5 requests concurrentes
10. **Opcional (refinamientos aplazados)** — favicon inline (`ICON=data:…`) leído del HTML y mostrado en la card; preservar atributos de carpetas raíz (`PERSONAL_TOOLBAR_FOLDER`, `UNFILED_BOOKMARKS_FOLDER`) al reserializar; preservar `<H1>` raíz localizado del archivo original; dark mode toggle (sol/luna) con paleta derivada de minimal-nordic, respetando `prefers-color-scheme` en el primer load y persistiendo en `localStorage`

## Limitación del ciclo web-app pura

Chrome (y otros navegadores) importan HTML de bookmarks de forma **aditiva, no destructiva**: todo lo importado va a una subcarpeta nueva dentro de "Other Bookmarks" (ej. `Imported YYYY-MM-DD`) sin borrar nada del perfil actual. Las raíces `bookmark_bar`, `other` y `synced` ("Mobile Bookmarks") son especiales y no se eliminan aunque el HTML no las incluya.

Consecuencia: el HTML filtrado que exporta la app es una **herramienta de decisión** ("qué borrar"), no de aplicación ("bórralo"). Para aplicar el triaje al perfil real hace falta borrar manualmente los descartados en el navegador o usar el `ChromeAdapter` (extensión) cuando exista.
