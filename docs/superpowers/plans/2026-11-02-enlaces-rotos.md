# Enlaces rotos (paso 19) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Comprobar una vez los enlaces de los marcadores, marcar las cards rotas, juntarlas en un chip «rotos» y poder descartar falsos positivos con 👍.

**Architecture:** Un puerto nuevo `LinkChecker` (permiso + una petición) con adaptador real (`fetch`) y falso. La lógica de escaneo es pura y recibe el puerto: clasifica, reintenta, limita la concurrencia y detecta que no hay red. Los resultados viven en un store de Zustand aparte (`useLinkStore`, clave propia en `localStorage`) y se escriben de una vez al terminar, para no repintar el grid por cada resultado. El filtro `broken` y la marca de la card leen de ese store.

**Tech Stack:** Vite + React + TypeScript, Zustand, HeadlessUI (`Dialog`), Vitest, i18next (`src/locales/es.json` y `en.json`).

**Spec:** `docs/superpowers/specs/2026-11-02-enlaces-rotos-design.md`

## Global Constraints

- Roto = respuesta 404 o 410, o fallo de red que se repite en un segundo intento. 403, 5xx, tiempo agotado y todo lo demás = `unknown`, nunca se marca.
- Solo `http(s)`: `normalizeUrl(url) === null` se omite.
- Permiso `optional_host_permissions: ["<all_urls>"]`, pedido con `chrome.permissions.request` en el clic del diálogo previo, sin `await` antes de la petición.
- Re-escaneo tras **30 días** (`RESCAN_AFTER_DAYS = 30`); el botón comprueba rotos, antiguos y nunca comprobados; los descartados (👍) no se vuelven a comprobar.
- El escaneo no se repite al abrir la pestaña. El diálogo previo sale solo una vez; el botón del header siempre.
- Resultado por URL normalizada, clave `bookmarkify:links:v1` (no se toca `bookmarkify:v2`).
- Fuera de `src/core/adapters/` nadie conoce `chrome.*` (regla de arquitectura de `CLAUDE.md`).
- Código y comentarios en inglés; textos de UI en `src/locales` (es y en); docs en español.
- Commits con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. **Parar tras cada parte** y esperar el visto bueno; actualizar `docs/roadmap.md` al cerrar cada parte.
- Tras `npm run test`, comprobar también `npm run build` y `npm run lint`.

## Review Focus

- Sin conexión (o `navigator.onLine` falso): nada se marca como roto y se avisa → Task 2.
- Cancelar a mitad conserva lo comprobado y cuenta como escaneo hecho → Task 2 y Task 4.
- Duplicados: una URL con dos marcadores se comprueba una vez; las dos cards salen rotas y un 👍 descarta las dos → Tasks 1, 4 y 6.
- El 👍 sobrevive a un re-escaneo, aunque la URL vuelva a salir rota → Task 4.
- `localStorage` con JSON corrupto o vacío: la app arranca sin resultados → Task 4.

---

# Parte 1: núcleo (puerto, escaneo, adaptador, permiso)

### Task 1: Tipos, clasificación y objetivos del escaneo

**Files:**
- Create: `src/core/linkCheck/types.ts`, `src/core/linkCheck/classify.ts`, `src/core/linkCheck/targets.ts`
- Create: `src/core/ports/LinkChecker.ts`
- Test: `src/core/linkCheck/classify.test.ts`, `src/core/linkCheck/targets.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `type LinkStatus = 'ok' | 'broken' | 'unknown'`; `interface LinkCheck { status: LinkStatus; checkedAt: number; dismissed?: boolean }`; `type LinkChecks = Record<string, LinkCheck>` (clave: `normalizeUrl`); `type ProbeOutcome = { kind: 'http'; status: number } | { kind: 'network' } | { kind: 'timeout' }`.
  - `LinkChecker.ts`: `interface LinkChecker { allow(): Promise<boolean>; probe(url: string, signal: AbortSignal): Promise<ProbeOutcome> }`.
  - `classify.ts`: `classify(outcome: ProbeOutcome): LinkStatus | 'network'`.
  - `targets.ts`: `RESCAN_AFTER_DAYS = 30`; `selectScanTargets(bookmarks: Bookmark[], checks: LinkChecks, now: number): string[]` (URLs normalizadas, sin repetir).

- [ ] **Step 1: Tests de `classify`** — `404` y `410` → `'broken'`; `200`, `204`, `301`, `399` → `'ok'`; `403`, `429`, `500`, `503` → `'unknown'`; `{ kind: 'timeout' }` → `'unknown'`; `{ kind: 'network' }` → `'network'`.
- [ ] **Step 2: Tests de `selectScanTargets`** (marcadores mínimos con `id`, `title`, `url`):
  - un marcador sin entrada en `checks` → incluido; dos marcadores con la misma URL (una con `/` final) → una sola URL;
  - `status: 'broken'` reciente → incluido; `'ok'` de hace 1 día → no; `'ok'` de hace 31 días → sí; `'unknown'` de hace 31 días → sí;
  - `dismissed: true` (aunque sea `'broken'` o antiguo) → no;
  - `chrome://settings` y `javascript:void(0)` → no.
- [ ] **Step 3: Run** `npx vitest run src/core/linkCheck` → FAIL (módulos sin crear).
- [ ] **Step 4: Implementar** los cuatro archivos con las firmas de arriba. `selectScanTargets` usa `normalizeUrl` de `src/core/normalizeUrl.ts`.
- [ ] **Step 5: Run** `npx vitest run src/core/linkCheck` → PASS.
- [ ] **Step 6: Commit** `feat: tipos, clasificacion y objetivos del escaneo de enlaces`.

### Task 2: `scanLinks` (reintento, concurrencia, cancelar, sin red)

**Files:**
- Create: `src/core/linkCheck/scanLinks.ts`
- Test: `src/core/linkCheck/scanLinks.test.ts`

**Interfaces:**
- Consumes: `LinkChecker`, `classify`, `LinkChecks`, `ProbeOutcome` (Task 1).
- Produces: `scanLinks(urls: string[], checker: LinkChecker, options: ScanOptions): Promise<ScanOutcome>` con `ScanOptions = { signal: AbortSignal; onProgress(done: number, total: number): void; now?: () => number; concurrency?: number }` y `ScanOutcome = { reason: 'done' | 'cancelled' | 'offline'; checks: LinkChecks }`. Constante exportada `OFFLINE_STREAK = 20`.

- [ ] **Step 1: Tests** con un `LinkChecker` falso que responde según la URL y cuenta las llamadas:
  - `200` → `checks[url].status === 'ok'` con `checkedAt` igual a `now()`; `404` → `'broken'`; `500` → `'unknown'`;
  - un fallo de red seguido de `200` en el segundo intento → `'ok'`; dos fallos de red → `'broken'`;
  - `reason: 'done'` y `onProgress` llamado hasta `(total, total)`;
  - cancelar con `AbortController` a mitad → `reason: 'cancelled'` y `checks` con lo ya comprobado (no vacío, no todo);
  - `navigator.onLine === false` al empezar → `reason: 'offline'`, `checks` vacío y `probe` sin llamar;
  - `OFFLINE_STREAK` dominios distintos seguidos con fallo de red (dos intentos cada uno) → `reason: 'offline'` y **ninguno** de esos aparece como `'broken'`; los que sí respondieron antes se conservan;
  - un `200` entre fallos reinicia la racha (19 fallos, un `200`, 19 fallos → `'done'` y los 38 `'broken'`);
  - la concurrencia no pasa de `options.concurrency` (el falso mide cuántas llamadas hay a la vez).
- [ ] **Step 2: Run** `npx vitest run src/core/linkCheck/scanLinks.test.ts` → FAIL.
- [ ] **Step 3: Implementar `scanLinks`.** Los fallos de red tras dos intentos se acumulan aparte y solo pasan a `'broken'` si el escaneo termina o se cancela sin dispararse la racha; si salta `offline`, se descartan. La racha cuenta hosts distintos (`new URL(url).hostname`). Concurrencia por defecto 8 (valor del constructor; si hace falta, limitar a 2 por host).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: scanLinks con reintento, cancelacion y deteccion de falta de red`.

### Task 3: Adaptador real, falso, creación y manifest

**Files:**
- Create: `src/core/adapters/ChromeLinkChecker.ts`, `src/core/adapters/fakeLinkChecker.ts`, `src/core/adapters/createLinkChecker.ts`
- Modify: `public/manifest.json`
- Test: `src/core/adapters/ChromeLinkChecker.test.ts`, `src/core/adapters/createLinkChecker.test.ts`

**Interfaces:**
- Consumes: `LinkChecker`, `ProbeOutcome` (Task 1).
- Produces: `class ChromeLinkChecker implements LinkChecker` (constructor `(fetchFn: typeof fetch, permissions: Pick<typeof chrome.permissions, 'request'>)`), `createFakeLinkChecker(): LinkChecker`, `createLinkChecker(): LinkChecker`.

- [ ] **Step 1: Tests de `ChromeLinkChecker`** con un `fetch` y `permissions` falsos: `allow()` llama a `request({ origins: ['<all_urls>'] })` y devuelve su resultado; `probe` con `fetch` que responde 404 → `{ kind: 'http', status: 404 }`; `fetch` que lanza `TypeError` → `{ kind: 'network' }`; señal abortada por tiempo → `{ kind: 'timeout' }`; si `HEAD` responde 405 o 501 repite con `GET` y devuelve ese estado; `fetch` se llama con `credentials: 'omit'` y `redirect: 'follow'`.
- [ ] **Step 2: Test de `createLinkChecker`:** sin `globalThis.chrome` y con `import.meta.env.DEV` → el falso; con `chrome.permissions` presente → `ChromeLinkChecker`; sin ninguno y sin DEV → un checker cuyo `allow()` devuelve `false`.
- [ ] **Step 3: Run** `npx vitest run src/core/adapters/ChromeLinkChecker.test.ts src/core/adapters/createLinkChecker.test.ts` → FAIL.
- [ ] **Step 4: Implementar.** Tiempo máximo 15 s con `AbortSignal.timeout` combinado con la señal recibida (distinguir cuál disparó). El falso, determinista y con una pausa corta: una URL que contiene `broken` → 404, host `dead.example` → `network`, `forbidden` → 403, el resto → 200; `allow()` → `true`.
- [ ] **Step 5: `manifest.json`:** añadir `"optional_host_permissions": ["<all_urls>"]`.
- [ ] **Step 6: Run** `npm run test && npm run build && npm run lint` → todo en verde.
- [ ] **Step 7: Commit** `feat: LinkChecker real y falso y permiso opcional de sitios`.
- [ ] **Step 8 (cierre de la parte 1):** marcar la parte en `docs/roadmap.md` y parar para el visto bueno.

---

# Parte 2: store y filtro

### Task 4: `useLinkStore`

**Files:**
- Create: `src/store/useLinkStore.ts`
- Test: `src/store/useLinkStore.test.ts`

**Interfaces:**
- Consumes: `LinkChecks` (Task 1), `normalizeUrl`.
- Produces: `LINKS_PERSIST_KEY = 'bookmarkify:links:v1'`; `useLinkStore` con estado `checks: LinkChecks`, `firstScanPrompted: boolean` y acciones `applyScan(results: LinkChecks): void`, `dismiss(urls: string[]): void`, `markFirstScanPrompted(): void`. Selector `selectBrokenIds(bookmarks: Bookmark[], checks: LinkChecks): Set<string>` (en `src/store/selectors.ts`): ids cuya URL normalizada tiene `status === 'broken'` y no `dismissed`.

- [ ] **Step 1: Tests:**
  - `applyScan` fusiona con lo existente y conserva `dismissed` de la entrada anterior aunque el resultado nuevo sea `'broken'`;
  - `applyScan({})` (cancelar sin nada) no rompe y no borra lo que había;
  - `dismiss([url])` pone `dismissed: true` en la entrada existente; sobre una URL sin entrada no hace nada;
  - `selectBrokenIds` con dos marcadores de la misma URL (una con `/` final) devuelve los dos ids; tras `dismiss` devuelve vacío;
  - persistencia: se guarda en `bookmarkify:links:v1` y no toca `bookmarkify:v2`; con `localStorage` vacío o con JSON corrupto, el store arranca con `checks: {}` y `firstScanPrompted: false` (sin lanzar).
- [ ] **Step 2: Run** `npx vitest run src/store/useLinkStore.test.ts` → FAIL.
- [ ] **Step 3: Implementar** con `persist` de Zustand (`createJSONStorage` envuelto en `try/catch` para el JSON corrupto). Añadir `selectBrokenIds` a `selectors.ts`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: store de resultados de enlaces con persistencia propia`.

### Task 5: Filtro `broken`

**Files:**
- Modify: `src/store/selectors.ts` (tipo `Filter`, `selectVisibleBookmarks`, `selectVisibleSortedBookmarks`), `src/store/useBookmarkStore.ts` (`selectVisible`, `useVisibleBookmarks`), `src/store/animatedActions.ts` (`visibleIds`)
- Test: `src/store/selectors.test.ts`, `src/store/useBookmarkStore.test.ts`

**Interfaces:**
- Consumes: `LinkChecks`, `selectBrokenIds` (Task 4).
- Produces: `Filter` gana `{ kind: 'broken' }`; `selectVisibleBookmarks(bookmarks, pendingDeletes, activeFilter, checks?: LinkChecks)` y `selectVisibleSortedBookmarks(bookmarks, pendingDeletes, activeFilter, activeSort, checks?: LinkChecks)`, con `checks = {}` por defecto; `selectBrokenCount(kept: Bookmark[], checks: LinkChecks): number`.

- [ ] **Step 1: Tests:** con `{ kind: 'broken' }` solo salen los conservados cuya URL está rota y no descartada; un roto en `pendingDeletes` no sale ni cuenta; `selectBrokenCount` cuenta solo conservados; sin `checks` el filtro devuelve vacío; `Ctrl`+`A` (`selectAllVisible`) en la vista `broken` selecciona solo los rotos; `filtersEqual` trata dos `broken` como iguales (activar el chip dos veces no limpia la selección).
- [ ] **Step 2: Run** `npx vitest run src/store` → FAIL.
- [ ] **Step 3: Implementar.** Los llamadores (`selectVisible` en el store, `useVisibleBookmarks`, `visibleIds`) leen `useLinkStore.getState().checks` / `useLinkStore(s => s.checks)` y lo pasan.
- [ ] **Step 4: Run** `npm run test && npm run build && npm run lint` → verde.
- [ ] **Step 5: Commit** `feat: filtro de enlaces rotos`.

### Task 6: Descartar en lote (👍)

**Files:**
- Create: `src/store/linkActions.ts`
- Test: `src/store/linkActions.test.ts`

**Interfaces:**
- Consumes: `useLinkStore.dismiss`, `useBookmarkStore`, `animateGridChange` (`src/lib/gridMotion.ts`, mismo uso que `animatedActions.ts`).
- Produces: `dismissBrokenAnimated(ids: string[]): void` — traduce ids a URLs normalizadas, llama a `dismiss` y, si cambia lo visible, anima como `deleteSelectedAnimated`; `dismissSelectedBrokenAnimated(): void` — lo mismo con `selected`, y vacía la selección.

- [ ] **Step 1: Tests:** descartar un id descarta también la URL gemela; una selección sin rotos no cambia nada (ni anima); tras descartar la selección queda vacía y esos ids salen de la vista `broken`.
- [ ] **Step 2: Run** `npx vitest run src/store/linkActions.test.ts` → FAIL.
- [ ] **Step 3: Implementar** siguiendo el patrón de `animatedActions.ts` (comprobar primero que algo cambia).
- [ ] **Step 4: Run** `npm run test` → PASS.
- [ ] **Step 5: Commit** `feat: descartar enlaces rotos con animacion`.
- [ ] **Step 6 (cierre de la parte 2):** `npm run build && npm run lint`, marcar en `docs/roadmap.md` y parar.

---

# Parte 3: UI de las marcas

### Task 7: Marca y 👍 en la card

**Files:**
- Modify: `src/components/BookmarkGrid.tsx` (calcula `brokenIds` una vez con `useMemo` y pasa `broken={brokenIds.has(b.id)}`), `src/components/BookmarkCard.tsx` (prop `broken`), `src/locales/es.json`, `src/locales/en.json`
- Test: `src/components/BookmarkCard.test.tsx` (si no existe, crearlo con `@testing-library/react` solo si ya está en el proyecto; si no, cubrir la lógica en `selectors`/`linkActions` y comprobarlo a mano en el navegador)

**Interfaces:**
- Consumes: `selectBrokenIds`, `dismissBrokenAnimated` (Tasks 4 y 6).
- Produces: claves i18n `card.brokenAria`, `card.dismissBroken` (es y en).

- [ ] **Step 1: Implementar.** En `BookmarkCard`, si `broken`: icono de enchufe desconectado (SVG propio en línea, con `aria-label={t('card.brokenAria')}`) en la cabecera junto al «№», y un botón pequeño 👍 con `title`/`aria-label={t('card.dismissBroken')}` que llama a `dismissBrokenAnimated([bookmark.id])`. El botón debe parar la propagación del clic y del doble clic (como el `<a>` del título) para no cambiar la selección ni abrir el enlace, y excluirse de `dragCondition` de Selecto igual que los `<a>`.
- [ ] **Step 2: Verificar en el navegador** (lo arranca el usuario, nunca yo): en `npm run dev` hay cards rotas tras el escaneo de la parte 4; hasta entonces, comprobarlo en la parte 4. Aquí: `npm run build && npm run lint && npm run test`.
- [ ] **Step 3: Commit** `feat: marca de enlace roto y boton de descartar en la card`.

### Task 8: Chip «rotos»

**Files:**
- Modify: `src/components/FilterBarTabs.tsx`, `src/locales/es.json`, `src/locales/en.json`

**Interfaces:**
- Consumes: `selectBrokenCount` (Task 5), `Filter { kind: 'broken' }`.
- Produces: clave `filterBar.chipBroken` («rotos · {{count}}» / «broken · {{count}}»).

- [ ] **Step 1: Implementar** junto a los chips de duplicados y eliminados: cuenta con `kept` y `checks`; activo si `activeFilter?.kind === 'broken'`; `disabled={brokenCount === 0 && !brokenActive}`; el clic alterna con `setFilter({ kind: 'broken' })` / `clearFilter()`. El chip no aparece mientras `checks` esté vacío (aún no se ha escaneado nunca).
- [ ] **Step 2: Run** `npm run test && npm run build && npm run lint` → verde.
- [ ] **Step 3: Commit** `feat: chip de enlaces rotos`.

### Task 9: Acción «no están rotos» en la barra de selección

**Files:**
- Modify: `src/components/SelectionBar.tsx`, `src/locales/es.json`, `src/locales/en.json`

**Interfaces:**
- Consumes: `dismissSelectedBrokenAnimated` (Task 6), `selectBrokenIds`.
- Produces: clave `selectionBar.dismissBroken` («no están rotos · {{count}}»).

- [ ] **Step 1: Implementar.** `BarContent` gana `brokenInSelection`; el botón aparece solo si es mayor que 0, con `ACTION_BTN_CLASS`, entre «eliminar» y «restaurar». Calcular `brokenInSelection` con `useMemo` como `deletedInSelection`.
- [ ] **Step 2: Run** `npm run test && npm run build && npm run lint` → verde.
- [ ] **Step 3: Commit** `feat: descartar en lote desde la barra de seleccion`.
- [ ] **Step 4 (cierre de la parte 3):** pasar el agente `i18n-translator` sobre el diff, marcar la parte en `docs/roadmap.md` y parar.

---

# Parte 4: diálogos, arranque, datos de ejemplo y docs

### Task 10: `ScanDialog`

**Files:**
- Create: `src/components/ScanDialog.tsx`
- Test: `src/components/ScanDialog.test.tsx` solo si el proyecto ya prueba componentes; si no, la lógica ya está cubierta en `scanLinks.test.ts`
- Modify: `src/locales/es.json`, `src/locales/en.json`

**Interfaces:**
- Consumes: `LinkChecker`, `scanLinks`, `selectScanTargets`, `useLinkStore.applyScan`, `markFirstScanPrompted`.
- Produces: `ScanDialog({ checker, onClose }: { checker: LinkChecker; onClose: () => void })`, con fases `confirm` (aviso con N enlaces y botón que pide el permiso) → `scanning` (barra «X de N», sin cierre con `Esc` ni fuera, botón «cancelar») → `done` (resumen «N rotos», o aviso de «no se pudo comprobar» si `reason === 'offline'`, o «permiso denegado» si `allow()` da `false`). Mismo patrón y clases que `ApplyDialog`.

- [ ] **Step 1: Implementar.** Al pulsar «comprobar»: `checker.allow()` primero, sin `await` previo; si es `false`, fase de permiso denegado (no se escanea). Los objetivos salen de `selectScanTargets(bookmarks, checks, Date.now())`. El progreso es estado local; los resultados se escriben **una sola vez** con `applyScan(outcome.checks)` al terminar o cancelar (también `reason: 'offline'`: se aplican los que sí respondieron). Cancelar usa un `AbortController`. Si no hay nada que comprobar, el aviso lo dice y no hay botón de empezar.
- [ ] **Step 2: Run** `npm run test && npm run build && npm run lint` → verde.
- [ ] **Step 3: Commit** `feat: dialogo de escaneo de enlaces`.

### Task 11: Botón del header, apertura única y `main.tsx`

**Files:**
- Modify: `src/components/AppHeader.tsx` (botón «comprobar enlaces», `onScan`), `src/App.tsx` (prop `checker`, estado `scanOpen`), `src/main.tsx` (`createLinkChecker()`), `src/locales/es.json`, `src/locales/en.json`

**Interfaces:**
- Consumes: `ScanDialog` (Task 10), `useLinkStore.firstScanPrompted`, `markFirstScanPrompted`, `createLinkChecker`.
- Produces: `App({ source, checker })`.

- [ ] **Step 1: Implementar.** Tras cargar y haber marcadores, si `firstScanPrompted === false` se abre el diálogo y se llama a `markFirstScanPrompted()` en ese momento (no vuelve a salir solo). El botón del header lo abre siempre. Los atajos no actúan con el diálogo abierto (ya es así con cualquier `[role="dialog"]`). Renderizar el diálogo fuera de la rama del grid, como `ApplyDialog`.
- [ ] **Step 2: Run** `npm run test && npm run build && npm run lint` → verde.
- [ ] **Step 3: Commit** `feat: boton del header y primer escaneo al abrir`.

### Task 12: Datos de ejemplo, pruebas manuales y documentación

**Files:**
- Modify: `src/core/adapters/devBookmarks.ts` (4–5 marcadores con `broken`, `dead.example` y `forbidden` en la URL, incluida una pareja duplicada rota), `CLAUDE.md`, `docs/roadmap.md`, `docs/code-review.md` (si procede), `README.md` (permiso nuevo)
- Create: `docs/pruebas-enlaces-rotos.md`

- [ ] **Step 1:** Ejemplos en `devBookmarks.ts` y comprobar que los tests que cuentan los marcadores de ejemplo siguen en verde (ajustar los números si cambian).
- [ ] **Step 2: `docs/pruebas-enlaces-rotos.md`:** lista de pruebas manuales en Chrome (perfil aparte, sin sincronización), con nombres sin ambigüedad: permiso (aceptar y rechazar), primer escaneo, que abrir la pestaña de nuevo no escanea, cancelar a mitad, 👍 en una card y en lote desde el chip, re-escanear conserva el 👍, sin red (modo avión: nada se marca), un 403 no se marca, `chrome://` no se escanea.
- [ ] **Step 3: Documentar** en `CLAUDE.md` el puerto `LinkChecker`, el store de enlaces, el permiso opcional y los criterios de «roto»; actualizar la tabla y la fecha de `docs/roadmap.md` (paso 19 ✅ solo cuando el usuario lo haya probado).
- [ ] **Step 4: Run** `npm run test && npm run build && npm run lint` → verde.
- [ ] **Step 5: Commit** `docs: pruebas y documentacion del paso 19`.
- [ ] **Step 6 (cierre de la parte 4):** pasar el agente `i18n-translator`, informar y parar. Después el usuario prueba en Chrome; revisión de la rama con un solo agente solo si lo pide; PR solo si lo pide.
