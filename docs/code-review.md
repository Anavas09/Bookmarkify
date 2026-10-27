# Code review del paso 18

Review de la rama `refactor/remove-import` contra `main` (`git diff main...HEAD`, PR #4), hecho el 27-10-2026 con la skill `code-review` a nivel max. Diez búsquedas desde ángulos distintos dejaron 18 hallazgos. El review se cortó por el límite de uso con 9 verificados; los otros 9 los verifiqué a mano el mismo día, leyendo el código y midiendo cuando hacía falta. Al verificarlos salió uno más, el 6. Arreglados en la PR #4: el 11, el 12, el 13 y el 14 (ver [Antes de fusionar la PR #4](#antes-de-fusionar-la-pr-4)); el resto sigue sin arreglar.

**En resumen:** 19 hallazgos: 10 confirmados, 5 probables y 4 descartados. Del paso 18 solo vienen tres (11, 15 y 17), y ninguno rompe nada. Los fallos de verdad ya estaban en `main`: lo más serio es que la copia de seguridad no está garantizada (1 y 2).

- **Confirmado:** el fallo existe y se puede provocar.
- **Probable:** el mecanismo es real, pero el disparador es incierto o el impacto, discutible.
- **Descartado:** no es un fallo o no se puede alcanzar.

| # | Hallazgo | Veredicto | Origen |
|---|---|---|---|
| 1 | La copia de seguridad no se confirma antes de borrar | Confirmado | anterior |
| 2 | El nombre de la copia puede no ser el del archivo guardado | Confirmado | anterior |
| 3 | Dos carpetas distintas con la misma etiqueta | Confirmado | anterior |
| 4 | Las barras de marcadores de cuenta y locales se juntan | Confirmado | anterior |
| 5 | Las carpetas hermanas con el mismo nombre se funden | Confirmado | anterior |
| 6 | Ordenar por título o dominio con miles de marcadores | Confirmado | anterior |
| 7 | Los contadores se recalculan en cada borrado | Probable | anterior |
| 8 | Si falla la relectura después de aplicar | Probable | anterior |
| 9 | Los enlaces `chrome://` y `file://` no se abren | Probable | anterior |
| 10 | Se borra de uno en uno | Probable | anterior |
| 11 | Documentación desactualizada | Confirmado | paso 18 |
| 12 | Un test que no puede fallar | Confirmado | anterior |
| 13 | La regla de arquitectura no coincide con el código | Confirmado | anterior |
| 14 | El revisor propuesto relaja la regla | Confirmado | docs de hoy |
| 15 | La etiqueta de la raíz, vacía | Descartado | paso 18 |
| 16 | El texto de los saltados | Descartado | anterior |
| 17 | `FakeSource` frente a `ChromeAdapter` | Descartado | paso 18 |
| 18 | El conjunto de eliminados se calcula en dos sitios | Probable, menor | anterior |
| 19 | El campo `args` del hook | Descartado | docs de hoy |

«Anterior» quiere decir que ya estaba en `main`; «docs de hoy», que está en `docs/recomendaciones-claude-code.md`, sin commitear.

## La copia de seguridad

### 1. La copia no se confirma antes de borrar

**Confirmado.** `src/core/adapters/ChromeAdapter.ts:45-61`, `src/core/adapters/download.ts`, `src/components/ApplyDialog.tsx:139-143`.

`commit` llama a `this.download(...)`, que hace clic en un `<a download>` y vuelve sin saber si el archivo se guardó, y acto seguido empieza a borrar. La página no recibe ninguna señal de la descarga, y el manifest no pide el permiso `downloads`.

Con «Preguntar dónde guardar cada archivo antes de descargarlo» activado en Chrome, se abre el diálogo de guardar y los marcadores se borran igualmente. Si se cancela ese diálogo, no queda copia, y el resumen dice «copia descargada: …». Pasa lo mismo si una política bloquea las descargas o el disco está lleno. `CLAUDE.md` promete «Antes de borrar se descarga la copia de seguridad».

**Arreglo posible:** descargar con `chrome.downloads.download` y esperar a que termine antes de borrar. Pide el permiso `downloads`, que muestra un aviso al instalar. Sin permiso nuevo, como mínimo: avisar en el diálogo y no afirmar en el resumen lo que no se comprueba.

### 2. El nombre de la copia puede no ser el del archivo guardado

**Confirmado.** `ChromeAdapter.ts:46`, `src/lib/backupFilename.ts`, `ApplyDialog.tsx:142`.

El nombre solo lleva la fecha: `bookmarks-AAAA-MM-DD_deleted.html`. Si se aplica dos veces el mismo día y la primera copia sigue en Descargas, Chrome guarda la segunda como `bookmarks-AAAA-MM-DD_deleted (1).html`, pero el resumen muestra el nombre sin `(1)`, que es el archivo de la primera tanda. Con «Preguntar dónde guardar», si se sobrescribe, la primera copia se pierde.

**Arreglo posible:** el del 1, porque `chrome.downloads` da el nombre final. Sin permiso nuevo, añadir la hora al nombre.

## Las carpetas se identifican por su nombre

La ruta de cada marcador (`folderPath`) se construye con los nombres de sus carpetas (`ChromeAdapter.ts:103`), y el filtro (`src/store/selectors.ts:52-64`), el menú (`src/components/FilterBarTabs.tsx:129`) y la copia (`src/core/adapters/serializer.ts:31-47`) las distinguen por esos nombres. El borrado no se ve afectado, porque va por id. Los tres hallazgos tienen un arreglo común: que cada `Bookmark` lleve los ids de sus carpetas para identificarlas y los nombres solo para mostrarlas.

### 3. Dos carpetas distintas con la misma etiqueta

**Confirmado.** Una carpeta llamada «A / B» y otra «A» con una «B» dentro dan la misma etiqueta: «Bookmarks bar / A / B». El filtro las separa bien, pero el menú marca las dos como seleccionadas, porque `FilterBarTabs.tsx:129` compara etiquetas. Arreglo suelto: comparar con `samePath` o `folderKey`.

### 4. Las barras de marcadores de cuenta y locales se juntan

**Confirmado.** Desde que Chrome separa los marcadores de la cuenta de los locales (campos desde Chrome 134, despliegue desde junio de 2025), `getTree()` puede devolver dos «Barra de marcadores», una con `syncing: true` y otra con `syncing: false`. Sus marcadores se juntan en una sola carpeta en el filtro y en la copia, y lo mismo sus subcarpetas con el mismo nombre. El falso solo tiene un juego de carpetas (`fakeChromeBookmarks.ts:40`, `syncing` siempre `false`), así que los tests no lo cubren. Las dos barras tienen `folderType`, así que `isUserFolder` nunca las borra.

### 5. Las carpetas hermanas con el mismo nombre se funden

**Confirmado, leve.** Chrome permite dos carpetas «Trabajo» en el mismo sitio, y el falso tampoco lo impide. El filtro las muestra como una sola, y la copia las funde en un único `<H3>`: al restaurarla, sus marcadores vuelven mezclados en una carpeta. No se pierde ningún marcador. Además, la copia escribe las subcarpetas antes que los marcadores (`adapters/serializer.ts:54-64`), así que el orden dentro de cada carpeta no es el de Chrome.

## Rendimiento con miles de marcadores

### 6. Ordenar por título o dominio con miles de marcadores

**Confirmado, medido.** Hallazgo nuevo, salido al verificar el 7. `src/store/selectors.ts:144-165`, `src/store/useBookmarkStore.ts:258-267`, `src/store/animatedActions.ts:8-12`, `src/lib/gridMotion.ts:112`.

El orden por título llama a `localeCompare` con opciones en cada comparación, y el de dominio, además, analiza las dos URL en cada comparación (`domainOf`, que hace `new URL`). Con una ordenación activa, la lista se recalcula en cada eliminar, restaurar o deshacer, dos veces: en `useVisibleBookmarks` y en `animateGridChange` (`visibleIds()`).

Medido en Node 24 con los selectores reales y 5.000 marcadores sintéticos, por cálculo:

| Orden | Ahora | Con el arreglo |
|---|---|---|
| Título | 189 ms | 3 ms, con un `Intl.Collator` compartido |
| Dominio | 119-790 ms, según las URL | 17 ms, con el dominio calculado antes de ordenar |

Con 2.000 marcadores, el orden por dominio tarda unos 50 ms. En Chrome no lo he medido.

### 7. Los contadores se recalculan en cada borrado

**Probable, marginal.** `FilterBarTabs.tsx:71-79`. Cada cambio de `pendingDeletes` recalcula los contadores de dominios, carpetas y duplicados sobre todos los conservados, analizando cada URL. Medido en Node: unos 9 ms con 5.000 marcadores, 4 ms con 2.000 y 1 ms con 500. Lo confirmaría un perfil de rendimiento en Chrome con 5.000. Si para el 6 se calculan el dominio y la URL normalizada una vez por marcador al cargar, esto se arregla de paso.

### 10. Se borra de uno en uno

**Probable.** `ChromeAdapter.ts:52-61` y `69-85`. Cada `remove` espera al anterior. Los borrados son independientes (`deleted` y `touched` no dependen del orden, y las carpetas van después), así que se podrían lanzar a la vez con `Promise.allSettled`: Chrome los procesa en serie igualmente, pero se solaparían las esperas. Sin medir: el review estimó entre 1,5 y 5 s en «borrando…» con 5.000 marcadores. Lo confirmaría cronometrar «Aplicar» con 1.000 y 5.000 marcadores en un perfil de prueba.

## Otros fallos anteriores

### 8. Si falla la relectura después de aplicar

**Probable.** `src/store/useBookmarkStore.ts:202-209`, `ApplyDialog.tsx:33-40`.

`commit` espera a `source.commit` y después a `load()`, sin proteger la relectura. Si `load()` falla, se pierde el resultado: el diálogo dice «No se pudo aplicar» aunque Chrome ya borró, las marcas viejas siguen y «Aplicar» sigue activo. Un segundo «Aplicar» devolvería `deleted: 0, skipped: N`.

El disparador es incierto: `getTree()` tendría que fallar justo después de haber funcionado. Lo confirmaría un test cuyo `getTree` falle solo en la relectura. **Arreglo posible:** atrapar el error de la relectura y devolver el resultado igualmente, con un aviso de recargar.

### 9. Los enlaces `chrome://` y `file://` no se abren

**Probable, sin reproducir.** `src/components/BookmarkCard.tsx:39-41` y `79-88`. `ChromeAdapter.ts:108` solo deja fuera los `javascript:`, así que estos marcadores salen en el grid.

Las cards abren el enlace con `window.open` o con un `<a target="_blank">`. Según la documentación de extensiones, para abrir URL `chrome://` desde una extensión hay que usar `chrome.tabs.create`, que no pide permisos; los enlaces normales pueden quedar bloqueados. Los `file://` necesitan además que se active «Permitir acceso a URLs de archivo» en la extensión, también con `chrome.tabs.create`. Lo confirmaría hacer doble clic en la card de un marcador a `chrome://flags` con la extensión cargada.

## Antes de fusionar la PR #4

### 11. Documentación desactualizada

**Confirmado. Arreglado** en el commit de documentación de la PR #4. Documentos de esta misma rama que dan por pendiente lo que ya está hecho:

- `docs/observaciones-traducciones.md`, sección «Decisión»: «⏳ «(raíz)» (7), dentro de la parte 3 del paso 18». El commit `6df5de6` ya lo quitó, y el roadmap lo marca hecho. La sección «Para el paso 18» también lo cuenta en futuro.
- `docs/eliminar-con-chrome-adapter.md:3`: «Lista viva: se irá ampliando… Se aplica en el paso 18». Y en la línea 57, «Restos sin relación con el adaptador (se pueden quitar ya)», con archivos que esta rama ya borró.
- `docs/roadmap.md:5` y `:13`: «pendiente de PR», con la PR #4 ya abierta.

### 12. Un test que no puede fallar

**Confirmado. Arreglado** en `63af43d`: el test de la carpeta hermana `Keep` está en `ChromeAdapter.test.ts`. `src/core/serializer.test.ts:160` comprueba `not.toContain('<H3>Keep</H3>')`, pero la única entrada está en `['Trash']` y nada se llama «Keep»: pasa siempre. En `main` pasaba lo mismo con otros nombres. Ningún test comprueba que la copia deje fuera una carpeta hermana que se conserva entera; `ChromeAdapter.test.ts:147` solo mira una URL. Quien decide qué entra en la copia es el adaptador, así que el test útil va en `ChromeAdapter.test.ts`, con esa carpeta hermana en el fixture.

### 13. La regla de arquitectura no coincide con el código

**Confirmado, leve. Arreglado** en `a263f32`: `serializer.ts` se movió a `src/core/adapters/` y se alinearon `CLAUDE.md` y el README. `CLAUDE.md` («Regla de arquitectura») y `README.md:96` dicen que solo `src/core/adapters/` conoce el formato Netscape, pero `src/core/serializer.ts` lo genera (`<!DOCTYPE NETSCAPE-Bookmark-file-1>`). Solo lo importa `ChromeAdapter.ts`, así que la UI sigue desacoplada: falla el texto de la regla, no el diseño. Ya era así en `main`.

**A decidir:** mover `serializer.ts` a `adapters/` o cambiar la regla a «fuera de `src/core/`». Después, alinear `CLAUDE.md`, el README y el 14.

### 14. El revisor propuesto relaja la regla

**Confirmado. Arreglado** con el 13: el revisor ya cita `src/core/adapters/`. En `docs/recomendaciones-claude-code.md`, el subagente `revisor-aplicar` comprueba que `chrome.bookmarks` y el formato Netscape «no salen de `src/core/`», sin avisar de que eso es más laxo que la regla de `CLAUDE.md`. Se arregla con la decisión del 13.

## Sin acción

### 15. La etiqueta de la raíz, vacía

**Descartado: inalcanzable.** Al quitar «(raíz)», `formatFolder([])` devuelve `''`, y un marcador sin carpeta daría un chip en blanco (`FilterBarTabs.tsx:48-58` y `119-121`). Pero ninguna fuente produce rutas vacías: en Chrome, de la raíz solo cuelgan sus carpetas, así que `ChromeAdapter.ts:94` siempre empieza la ruta por una; el falso no deja crear nada en la raíz (`fakeChromeBookmarks.ts:126`); y `bookmarkify:v2` nació en el paso 17, cuando ya no había importación, así que no puede guardar un filtro con ruta vacía. Opcional: hacer `folderPath` obligatorio en el tipo.

### 16. El texto de los saltados

**Descartado en la práctica.** `skipped` junta los marcadores que cambiaron desde la carga con los que Chrome se negó a borrar (`ChromeAdapter.ts:55-56` y `63`), y el resumen dice «no se borró porque cambió en Chrome mientras tanto». Pero `remove()` solo falla con un marcador que pasó el filtro si alguien lo borra o lo cambia durante el borrado, que es justo lo que dice el texto. Solo engañaría si una política lo bloqueara a mitad.

### 17. `FakeSource` frente a `ChromeAdapter`

**Descartado.** El `FakeSource` de `src/store/useBookmarkStore.test.ts:6-35` siempre devuelve `backup.html` y cuenta como borrados los ids que no tiene, y `ChromeAdapter` no. Pero el store no decide nada con el resultado: lo devuelve tal cual. Esos caminos ya tienen tests en `ChromeAdapter.test.ts`: lo desaparecido o cambiado desde la carga (línea 150) y la copia que no se guarda cuando no queda nada (líneas 250-258). Lo que no tiene ningún test es `ApplyDialog`.

### 18. El conjunto de eliminados se calcula en dos sitios

**Probable, menor.** El mismo filtro está en `selectors.ts:109` y en `useBookmarkStore.ts:204`. Son dos usos de una línea, ya así en `main`. Un `selectDeletedBookmarks` sería opcional.

### 19. El campo `args` del hook

**Descartado.** Según la referencia de hooks, `args` es un campo válido de los hooks de tipo `command`, así que el borrador de `docs/recomendaciones-claude-code.md` está bien escrito.

## Cómo se hizo

- **Búsqueda:** diez ángulos sobre el diff: línea a línea, comportamiento eliminado, trazado entre archivos, trampas del lenguaje, adaptadores, reutilización, simplificación, eficiencia, altura y convenciones de `CLAUDE.md`.
- **Verificación:** un agente por hallazgo. Terminaron 9 (2-4, 8, 12-14, 18 y 19); los demás se cortaron por el límite de uso y los verifiqué a mano, junto con el 6, que salió al verificar el 7. La pasada final en busca de lo que se hubiera escapado se omitió: se cortó sin encontrar nada.
- **Medidas:** Node 24 importando directamente los `.ts` del repo (selectores, `domainOf`), con marcadores sintéticos y la mediana de varias pasadas tras calentar. Chrome puede dar otros números.

## Fuentes

- Chrome for Developers, «Update your extensions ahead of upcoming bookmark sync changes» (17-06-2025), citado por la verificación del 4.
- [Extensions FAQ — Chrome for Developers](https://developer.chrome.com/docs/extensions/mv2/faq)
- [Restricting use of file: URLs in tabs and windows APIs — chromium-extensions](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/ZtCvVISQU54/m/tOjjlzkfAgAJ)
- [Hooks reference — Claude Code](https://code.claude.com/docs/en/hooks)
