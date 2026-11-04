# Vista de lista o de grid (paso 20) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poder elegir entre ver los marcadores como grid (como hoy) o como lista de filas de 32 px, y cerrar de paso los cinco arreglos de textos y UI que el roadmap deja en este paso.

**Architecture:** La vista (`'grid' | 'list'`) es una preferencia en un store de Zustand mínimo (`useViewStore`, clave `bookmarkify:view`), fuera del triaje. `BookmarkGrid` sigue siendo el único sitio con el lazo (Selecto) y el movimiento; según la vista cambia el contenedor y pinta `BookmarkCard` o la nueva `BookmarkRow`. No se tocan `src/core/`, los puertos ni `useBookmarkStore`.

**Tech Stack:** Vite + React + TypeScript, Zustand, Tailwind v4, Motion, react-selecto, Vitest (jsdom), i18next (`src/locales/es.json` y `en.json`).

**Spec:** `docs/superpowers/specs/2026-11-03-vista-lista-design.md`. Rama: `feat/list-view` (ya creada).

## Global Constraints

- Vista `'grid' | 'list'`, arranca en grid, clave `bookmarkify:view`; cualquier valor que no sea `'list'` o `'grid'` vale como `'grid'`. Fuera del store del triaje: `bookmarkify:v2` no se toca.
- Control: dos botones de 32×32 px pegados, a la izquierda del botón de idioma; primero grid y luego lista, iconos de 16 px. Activo con `aria-pressed="true"` y **nunca** `disabled`; fondo `paper-soft`, borde e icono en `accent`. El grupo lleva nombre accesible y cada botón, `aria-label` y tooltip.
- Fila de 32 px de alto y una sola línea con los datos de la card (№, favicon, título, dominio, fecha, marcas). Sin carpeta, sin URL completa, sin cabecera de columnas.
- Cambiar de vista conserva la selección, es instantáneo y no conserva el scroll.
- Sin virtualizar; «lenta» quiere decir peor que el grid en la misma acción. Sin tocar `src/core/`, los puertos ni `useBookmarkStore`. Sin permisos nuevos.
- Código y comentarios en inglés; textos de UI en `src/locales` (es y en); docs en español. Commits en español sin tildes, con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- **Parar tras cada parte** y esperar el visto bueno; marcar la parte en `docs/roadmap.md` al cerrarla. En las partes que toquen la UI, pasar el agente `i18n-translator` sobre el diff.
- Al cerrar cada tarea con código: `npm run test && npm run build && npm run lint` en verde.
- El servidor de desarrollo lo arranca el usuario (puerto 5173): no levantarlo desde aquí. No abrir la PR salvo que el usuario la pida.

## Review Focus

- `localStorage` con un valor basura, vacío o que lanza al leer: arranca en grid sin romper → Task 1.
- Cambiar de vista con una selección activa: la selección sigue y `Ctrl`+clic o el lazo siguen sumando sobre ella (Selecto re-sincronizado) → Task 5.
- Fila con datos incompletos: sin fecha, sin título, título larguísimo, URL `chrome://…`; altura de 32 px y columnas alineadas → Tasks 2 y 5.
- Vista «eliminados» con una fila rota y eliminada a la vez (tres marcas), y filtro sin resultados → Task 5.
- 5.000 marcadores: `Ctrl`+`A` y eliminar → Task 6; `prefers-reduced-motion` → Task 5.

---

# Parte 1: base (estado, piezas compartidas y control)

### Task 1: Estado de la vista

**Files:**
- Create: `src/store/useViewStore.ts`
- Test: `src/store/useViewStore.test.ts`

**Interfaces:**
- Produces: `type View = 'grid' | 'list'`; `VIEW_STORAGE_KEY = 'bookmarkify:view'`; `readStoredView(): View`; `useViewStore` con estado `{ view: View; setView(view: View): void }`.

- [ ] **Step 1: Tests** (`beforeEach`: `localStorage.clear()` y `useViewStore.setState({ view: 'grid' })`; `afterEach`: `vi.restoreAllMocks()`):
  - `readStoredView()` → `'grid'` con el almacenamiento vacío; `'list'` si hay `'list'`; `'grid'` si hay `'grid'`, `''`, `'LIST'` o `'banana'`.
  - `readStoredView()` → `'grid'` si `Storage.prototype.getItem` lanza (`vi.spyOn`).
  - `setView('list')` deja `useViewStore.getState().view === 'list'` y `localStorage.getItem('bookmarkify:view') === 'list'`; después `setView('grid')` deja `'grid'` en los dos.
  - `setView('list')` con `Storage.prototype.setItem` lanzando: no lanza y el estado queda en `'list'`.
- [ ] **Step 2: Run** `npx vitest run src/store/useViewStore.test.ts` → FAIL (módulo sin crear).
- [ ] **Step 3: Implementar** `src/store/useViewStore.ts` con las firmas de arriba. Sin `persist`: cadena simple en `localStorage`, como `bookmarkify:theme`, con `try/catch` en la lectura y en la escritura. El estado inicial es `readStoredView()`.
- [ ] **Step 4: Run** el mismo comando → PASS.
- [ ] **Step 5: Commit** `feat(list-view): estado de la vista con preferencia guardada`.

### Task 2: Piezas compartidas entre la card y la fila

**Files:**
- Create: `src/lib/bookmarkFormat.ts`, `src/components/UnplugIcon.tsx`
- Modify: `src/components/BookmarkCard.tsx`
- Test: `src/lib/bookmarkFormat.test.ts`

**Interfaces:**
- Produces: `formatDate(ms: number | undefined): string | null`; `catalogNumber(index: number): string`; `UnplugIcon({ label }: { label: string })`. Los tres salen de `BookmarkCard.tsx` sin cambiar su comportamiento.

- [ ] **Step 1: Tests de `bookmarkFormat`:** `formatDate(undefined)` → `null`; `formatDate(new Date(2024, 2, 8, 12).getTime())` → `'2024·03·08'`; `formatDate(new Date(2019, 11, 31, 23, 59).getTime())` → `'2019·12·31'`; `catalogNumber(0)` → `'№001'`; `catalogNumber(41)` → `'№042'`; `catalogNumber(1234)` → `'№1235'`.
- [ ] **Step 2: Run** `npx vitest run src/lib/bookmarkFormat.test.ts` → FAIL.
- [ ] **Step 3: Mover** `formatDate` y `catalogNumber` a `src/lib/bookmarkFormat.ts` y `UnplugIcon` a `src/components/UnplugIcon.tsx`, tal cual; `BookmarkCard.tsx` los importa.
- [ ] **Step 4: Run** `npm run test && npm run build && npm run lint` → verde. La card se ve igual.
- [ ] **Step 5: Commit** `refactor(list-view): compartir formatDate, catalogNumber y el enchufe entre card y fila`.

### Task 3: Control de vista en el header

**Files:**
- Create: `src/components/ViewToggle.tsx`
- Modify: `src/components/AppHeader.tsx`, `src/locales/es.json`, `src/locales/en.json`

**Interfaces:**
- Consumes: `useViewStore`, `View` (Task 1).
- Produces: `ViewToggle(): JSX.Element`, sin props.

- [ ] **Step 1: Textos.** Claves nuevas `view.group`, `view.grid` y `view.list`, entre `theme` y `header`. Propuesta (la revisa el agente): es «vista», «vista en cuadrícula», «vista en lista»; en «view», «grid view», «list view».
- [ ] **Step 2: Implementar `ViewToggle`.** Contenedor `role="group"` con `aria-label={t('view.group')}`. Dos `button type="button"` (grid primero) de 32×32 px con el borde compartido (`-ml-px` en el segundo; esquinas `rounded-sm` solo en los extremos). `aria-label` y `title` = `view.grid` / `view.list`; `aria-pressed` = si esa es la vista actual; `onClick={() => setView(...)}`, sin `disabled`.
  - Activo: `border-accent bg-paper-soft text-accent`, encima del vecino (`relative z-10`) y `cursor-default`. Inactivo: como `LanguageToggle` (`border-edge bg-paper-card text-ink-soft hover:text-ink hover:border-ink-mute`).
  - Iconos SVG de 16 px, `viewBox="0 0 16 16"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.5"`: grid = cuatro `rect` de 5×5 con `rx="1"` en (2,2), (9,2), (2,9) y (9,9); lista = `path d="M2 4h12M2 8h12M2 12h12"` con `stroke-linecap="round"`. Con `aria-hidden="true"`.
- [ ] **Step 3: `AppHeader`:** `<ViewToggle />` como primer elemento de la fila de botones, antes de `<LanguageToggle />`.
- [ ] **Step 4: Run** `npm run test && npm run build && npm run lint` → verde.
- [ ] **Step 5: Comprobar a mano** en `npm run dev` (5173): el grupo sale a la izquierda de «ES»; arranca con grid activo; pulsar lista marca lista, sigue sin cambiar el contenido (la lista llega en la parte 2) y `localStorage['bookmarkify:view']` pasa a `'list'`; recargar lo conserva; ambos botones se enfocan con `Tab` y `aria-pressed` cambia; «aplicar» sigue siendo el único con relleno oscuro.
- [ ] **Step 6:** pasar el agente `i18n-translator` sobre el diff y aplicar lo que diga.
- [ ] **Step 7: Commit** `feat(list-view): boton de vista (grid o lista) en el header`.
- [ ] **Step 8 (cierre de la parte 1):** marcar la parte en `docs/roadmap.md` y parar para el visto bueno.

---

# Parte 2: la lista

### Task 4: `BookmarkRow`

**Files:**
- Create: `src/components/BookmarkRow.tsx`

**Interfaces:**
- Consumes: `formatDate`, `catalogNumber`, `UnplugIcon` (Task 2); `domainOf`, `faviconUrl`, `isWebUrl`, `openLink`, `cx`, `dismissBrokenAnimated` (los de `BookmarkCard`).
- Produces: `BookmarkRow(props: { bookmark: Bookmark; index: number; stagger: number; marked: boolean; selected: boolean; broken: boolean })`, con las mismas props que `BookmarkCard`.

No hay tests de componentes en el repo (sin testing-library): se comprueba en la Task 5.

- [ ] **Step 1: Implementar `BookmarkRow`** con estos valores del diseño:
  - Raíz `<article>` con `aria-selected={selected}`, doble clic = `openLink(bookmark.url)`, la variable `--i` leída una vez como en la card (`Math.min(stagger, 24)`) y clases `card-in relative flex h-8 items-center gap-3 border-b border-edge px-3 select-none cursor-default transition-colors duration-150`.
  - Fondo por prioridad: seleccionada → `bg-accent/10 outline outline-2 -outline-offset-2 outline-accent` (el contorno va hacia dentro: la fila no cambia de tamaño); eliminada → `bg-paper-soft`; si no, `bg-paper-card hover:bg-paper-soft`.
  - Columnas, en este orden: **№** (`catalogNumber(index)`, `w-10`, mono 0,7 rem, `text-ink-mute`); **favicon** de 14 px con el mismo fallback que la card, dejando un hueco vacío de 14 px si falta o falla; **título** (`<a>` flexible, `min-w-0 flex-1 truncate`, `font-display`, 14 px); **dominio** (`hidden sm:block w-[170px] truncate`, mono 0,72 rem, `text-ink-soft`); **fecha** (`hidden md:block w-[76px]`, mono 0,68 rem, `text-ink-mute`, `formatDate(...)`; el `span` se pinta siempre aunque no haya fecha, para que las columnas sigan alineadas); **marcas** (`w-16`, alineadas a la derecha, `gap-2`).
  - Título: texto `bookmark.title || domain`, atributo `title` con ese mismo texto, y el mismo `<a>` que la card (`href`, `target="_blank"`, `rel`, `draggable={false}`, `onDoubleClick` con `stopPropagation`, las URL no web se abren con `openLink`). Eliminada: `line-through decoration-accent`; si no, `hover:underline underline-offset-2 decoration-edge`.
  - Eliminada: las columnas del № a la fecha al `opacity-55`; la de marcas, a opacidad completa.
  - Marcas: rota → `<UnplugIcon label={t('card.brokenAria')} />` y el botón 👍 idéntico al de la card (mismas clases, `stopPropagation` en clic y doble clic, `dismissBrokenAnimated([bookmark.id])`); eliminada → `⨯` en `text-accent` con `aria-label={t('card.markedAria')}`.
  - **Mi llamada, para el usuario:** la columna de marcas mide 64 px y no los 44 de la maqueta, porque en la vista «eliminados» una fila puede llevar tres marcas (enchufe, 👍 y ⨯) y con 44 px no cabrían ni alinearían.
- [ ] **Step 2: Run** `npm run build && npm run lint` → verde.
- [ ] **Step 3: Commit** `feat(list-view): fila de la lista con sus estados`.

### Task 5: `BookmarkGrid` pinta las dos vistas

**Files:**
- Modify: `src/components/BookmarkGrid.tsx`

**Interfaces:**
- Consumes: `useViewStore`, `View` (Task 1); `BookmarkRow` (Task 4).

- [ ] **Step 1: Implementar.** `BookmarkGrid` no se renombra y sigue siendo el único con Selecto y el movimiento:
  - Lee `const view = useViewStore(s => s.view)`.
  - Contenedor de la lista: `overflow-hidden rounded-md border-x border-t border-edge bg-paper-card` (la última fila pone el borde de abajo). El del grid no cambia.
  - `GridItem` recibe `view` y pinta `BookmarkRow` o `BookmarkCard` con el resto de props. La `key` de cada item pasa a `` `${view}:${b.id}` ``: así los envoltorios de Motion se vuelven a montar y no arrastran posiciones del otro layout.
  - El efecto que sincroniza Selecto con el store añade `view` a sus dependencias (la trampa del diseño).
  - El mensaje de «sin resultados» se queda antes del contenedor, igual para las dos vistas.
- [ ] **Step 2: Run** `npm run test && npm run build && npm run lint` → verde.
- [ ] **Step 3: Comprobar a mano** en `npm run dev` (con el navegador de Playwright si hace falta). Los puntos 3 a 5 con un `chrome.bookmarks` falso inyectado que incluya un marcador sin `dateAdded`, uno con título vacío, uno con título larguísimo y uno `chrome://settings`:
  1. Sin la clave `bookmarkify:view` arranca en grid; en lista, las filas miden 32 px (`article.offsetHeight === 32`), el № es consecutivo y el título largo se recorta con puntos y tooltip.
  2. Clic, `Ctrl`/`Shift`+clic y lazo seleccionan filas con el contorno hacia dentro; `Ctrl`+`A`, `Esc`, `Supr` (las filas salen con fundido y las demás suben), vista «eliminados» (atenuadas, tachadas, con ⨯), restaurar y `Ctrl`+`Z` dentro de los 6 s.
  3. **Selecto:** seleccionar 3 en el grid, pasar a lista, `Ctrl`+clic en una cuarta → 4 seleccionadas; `Esc` → 0. Lo mismo de lista a grid.
  4. Rotas (botón «comprobar enlaces» con el comprobador falso): enchufe y 👍 en la fila; el 👍 no selecciona ni abre. En «eliminados», una fila rota y eliminada muestra las tres marcas sin descolocar columnas.
  5. Filas incompletas: sin fecha, con título vacío (sale el dominio) y `chrome://settings` mantienen 32 px y la alineación.
  6. Ventana de 700 px: sin fecha; de 600 px: sin fecha ni dominio; el título y las marcas siempre se ven.
  7. Filtro sin resultados: sale «Ningún marcador coincide con el filtro.» en las dos vistas.
  8. Con `prefers-reduced-motion: reduce` emulado, eliminar es instantáneo; la vista elegida se conserva al recargar.
  Si el movimiento no encaja en la lista (clon del fundido mal pintado, saltos), arreglarlo en `src/lib/gridMotion.ts` con un test de `planGridMotion` si cambia la lógica; si no se puede, la lista cambia al instante y se anota en el diseño.
- [ ] **Step 4:** pasar el agente `i18n-translator` sobre el diff de la parte.
- [ ] **Step 5: Commit** `feat(list-view): la lista como segunda vista del grid`.
- [ ] **Step 6 (cierre de la parte 2):** marcar la parte en `docs/roadmap.md` y parar para el visto bueno.

---

# Parte 3: rendimiento

### Task 6: Medir la lista con 5.000 marcadores

**Files:**
- Modify: `docs/pruebas-rendimiento.md` (sección nueva «Vista de lista (paso 20)»)
- Modify, solo si la lista sale más lenta: `src/components/BookmarkGrid.tsx` o `src/components/BookmarkRow.tsx`

- [ ] **Step 1: Preparar la medición** (el script va en el scratchpad y no se versiona) con el método de [`pruebas-rendimiento.md`](../../pruebas-rendimiento.md#mediciones-en-chrome-30-10-2026): navegador de Playwright contra el servidor del usuario (5173), `chrome.bookmarks` falso con `addInitScript` y 5.000 marcadores (20 carpetas, uno de cada 25 con la URL repetida), Event Timing y `longtask`, sin trazas largas del MCP de DevTools.
- [ ] **Step 2: Medir alternando** grid y lista (ABABAB, al menos 3 pares en la misma sesión; el equipo fluctúa 4–5×), en cada vista: `Supr` con la primera card o fila seleccionada, `Ctrl`+`A` (hilo ocupado), abrir el menú «ordenar». Y cambiar de vista, que se compara con montar el grid al cargar.
- [ ] **Step 3: Criterio.** La lista pasa si no es peor que el grid en ninguna de las cuatro. Si pasa, no se virtualiza: anotar la tabla en `docs/pruebas-rendimiento.md` (servidor de desarrollo, cifras orientativas) y seguir.
- [ ] **Step 4: Si no pasa,** añadir `content-visibility: auto` con `contain-intrinsic-size: auto 2rem` al envoltorio de cada fila en la vista de lista, comprobar que no recorta el menú ni el movimiento, y repetir la medición.
- [ ] **Step 5: Si sigue sin pasar, parar y avisar al usuario.** La virtualización es de complejidad alta y se decide aparte, con su propio diseño.
- [ ] **Step 6: Commit** `docs(list-view): medicion de la lista con 5.000 marcadores` (con el cambio de código en el mismo commit si lo hubo).
- [ ] **Step 7 (cierre de la parte 3):** marcar la parte en `docs/roadmap.md` y parar para el visto bueno.

---

# Parte 4: los cinco arreglos «de paso»

Cada uno en su commit. Detalle en [`observaciones-traducciones.md`](../../observaciones-traducciones.md).

### Task 7: Tecla «Mayús» (obs. 4)

**Files:**
- Modify: `src/components/AppHeader.tsx`, `src/locales/es.json`, `src/locales/en.json`

- [ ] **Step 1:** clave `header.shortcuts.shiftKey` (es «Mayús», en «Shift») y `<Key>shift</Key>` pasa a `<Key>{t('header.shortcuts.shiftKey')}</Key>`. El resto de teclas (`ctrl`, `esc`, `Supr`) no se tocan.
- [ ] **Step 2: Run** `npm run test && npm run build && npm run lint` → verde; comprobar los dos idiomas en el header.
- [ ] **Step 3:** pasar `i18n-translator` y hacer el **Commit** `fix(i18n): rotular la tecla Mayus en espanol`.

### Task 8: `lang` de `<html>` (obs. 5)

**Files:**
- Create: `src/i18n/syncHtmlLang.ts`
- Modify: `src/i18n/index.ts`
- Test: `src/i18n/syncHtmlLang.test.ts`

**Interfaces:**
- Produces: `syncHtmlLang(instance: LangSource, root: HTMLElement): void`, con `interface LangSource { resolvedLanguage?: string; language?: string; on(event: 'languageChanged', listener: () => void): unknown }`. Pone `root.lang` ya y en cada `languageChanged`, con `instance.resolvedLanguage ?? instance.language ?? 'en'`.

- [ ] **Step 1: Tests** con un `LangSource` falso que guarda los oyentes: pone `root.lang === 'es'` al llamar con `resolvedLanguage: 'es'`; sin `resolvedLanguage` ni `language` pone `'en'`; al cambiar `resolvedLanguage` a `'en'` y disparar el oyente, `root.lang` pasa a `'en'`.
- [ ] **Step 2: Run** `npx vitest run src/i18n/syncHtmlLang.test.ts` → FAIL.
- [ ] **Step 3: Implementar** `syncHtmlLang` y llamarla en `src/i18n/index.ts` tras `init`: `syncHtmlLang(i18n, document.documentElement)` (i18next también emite `languageChanged` al terminar de iniciar).
- [ ] **Step 4: Run** `npm run test && npm run build && npm run lint` → verde; a mano, cambiar de idioma y ver `document.documentElement.lang`.
- [ ] **Step 5: Commit** `fix(i18n): actualizar lang de html al cambiar de idioma`.

### Task 9: Descripción de la extensión en español (obs. 6)

**Files:**
- Create: `public/_locales/en/messages.json`, `public/_locales/es/messages.json`
- Modify: `public/manifest.json`
- Test: `src/manifest.test.ts`

- [ ] **Step 1: Test** que importa `../public/manifest.json` y los dos `messages.json`: `manifest.default_locale === 'en'`; `manifest.description === '__MSG_extDescription__'`; cada `__MSG_<clave>__` que aparezca en `JSON.stringify(manifest)` existe, con `message` no vacío, en `en` y en `es`. (Chrome no carga la extensión si falta una.)
- [ ] **Step 2: Run** `npx vitest run src/manifest.test.ts` → FAIL.
- [ ] **Step 3: Crear** `extDescription` en los dos idiomas: en = la descripción actual del manifest; es = «Triaje visual de tus marcadores: revísalos en un grid, marca los que ya no necesitas y bórralos de Chrome.» En el manifest: `"default_locale": "en"` y `"description": "__MSG_extDescription__"`.
- [ ] **Step 4: Run** `npm run test && npm run build && npm run lint` → verde; `dist/_locales/es/messages.json` existe tras el build.
- [ ] **Step 5:** pasar `i18n-translator` sobre el texto en español.
- [ ] **Step 6: Commit** `feat(i18n): descripcion de la extension en espanol`. La comprobación en Chrome (con la interfaz en español, `chrome://extensions` muestra la descripción en español) la hace el usuario con la lista de la Task 12.

### Task 10: Chip de carpeta activo (parte 2 de «Carpetas por id», n.º 1)

**Files:**
- Modify: `src/components/FilterBarTabs.tsx`

- [ ] **Step 1:** `ChipDropdown` gana `wide?: boolean`; con `wide` la etiqueta usa `max-w-[28rem]` en lugar de `max-w-[180px]`. El chip de carpeta pasa `wide={activeFolder !== null}`; el de dominio no cambia. Actualizar el comentario que habla de los 180 px.
- [ ] **Step 2: Run** `npm run test && npm run build && npm run lint` → verde; a mano, con el ejemplo de `npm run dev`, elegir «Barra de marcadores (cuenta) / Trabajo»: la etiqueta se ve entera, también un «(2)» final.
- [ ] **Step 3: Commit** `fix(filters): ancho del chip de carpeta activo`.

### Task 11: Aviso de sincronización (parte 2 de «Carpetas por id», n.º 3)

**Files:**
- Modify: `src/locales/es.json`, `src/locales/en.json` (`applyDialog.sync`), `CLAUDE.md` (última línea de «Aplicar en Chrome»)

- [ ] **Step 1: Textos.** es «Si tus marcadores se sincronizan con tu cuenta de Google, el borrado también llega a tus otros dispositivos.»; en «If your bookmarks sync with your Google account, the deletion also reaches your other devices.» En `CLAUDE.md`: «Si los marcadores se sincronizan con la cuenta de Google, el borrado llega a los demás dispositivos.» Solo la redacción: no se muestra según `inAccount`.
- [ ] **Step 2: Run** `npm run test && npm run build && npm run lint` → verde; pasar `i18n-translator`.
- [ ] **Step 3: Commit** `fix(i18n): aviso de sincronizacion con la cuenta de Google`.
- [ ] **Step 4 (cierre de la parte 4):** marcar la parte en `docs/roadmap.md` y parar para el visto bueno.

---

# Parte 5: pruebas y documentación

### Task 12: Pruebas a mano y documentación

**Files:**
- Create: `docs/pruebas-vista-lista.md`
- Modify: `CLAUDE.md`, `README.md`, `docs/roadmap.md`, `docs/ideas-aparcadas.md`, `docs/observaciones-traducciones.md`

- [ ] **Step 1: `docs/pruebas-vista-lista.md`**, con casillas y el formato de `pruebas-enlaces-rotos.md`: preparación (perfil de Chrome aparte, `npm run build`, ↻ y recargar); 1 el control; 2 la lista y sus estados; 3 selección y atajos; 4 eliminar, restaurar y deshacer con movimiento; 5 cambiar de vista con selección (y **anotar cuánto molesta que se pierda el scroll**, decisión pendiente del diseño); 6 ventana estrecha; 7 los cinco arreglos (la descripción de la extensión se mira en `chrome://extensions` con Chrome en español).
- [ ] **Step 2: `CLAUDE.md`:** paso 20 a ✅ con el resumen en el estilo del 19 (estado, control, fila, `BookmarkGrid` pinta las dos vistas, medición, cinco arreglos); `useViewStore.ts` en la estructura de `store/`; un párrafo en «Modelo de estado»: la vista no es triaje y vive en `bookmarkify:view`.
- [ ] **Step 3: `README.md`** (la sección de funciones y «Estado»), **`docs/roadmap.md`** (paso 20 ✅, partes y fecha de la última actualización), **`docs/ideas-aparcadas.md`** (la entrada de virtualizar, con lo medido en la Task 6) y **`docs/observaciones-traducciones.md`** (4–6 y los dos de la parte 2 como hechos, con sus commits).
- [ ] **Step 4: Run** `npm run test && npm run build && npm run lint` → verde.
- [ ] **Step 5: Commit** `docs(list-view): pruebas, CLAUDE.md, README y roadmap del paso 20`.
- [ ] **Step 6 (cierre del paso):** parar. La revisión de la rama con un revisor y la PR, solo si el usuario las pide.
