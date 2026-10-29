# Pruebas manuales: carpetas por id

Rama `fix/folder-ids` (hallazgos 3, 4 y 5 del [code review](./code-review.md)). Marca cada casilla al terminar la prueba.

## Preparación

- [x] Usar un perfil de Chrome aparte, **sin sincronización y sin iniciar sesión**. El hallazgo 4 (cuenta frente a dispositivo) no se prueba aquí: con tu cuenta de verdad, «Aplicar» borraría marcadores de esa cuenta en todos sus dispositivos (con una cuenta de Google desechable no habría riesgo). Se ve con `npm run dev` (caso 7).
- [x] `npm run build`.
- [x] En `chrome://extensions`, pulsar ↻ en la tarjeta de Bookmarkify y recargar la pestaña de la app.
- [x] En el Administrador de marcadores, crear en la barra de marcadores, cada una con 2–3 marcadores:
  - dos carpetas «Trabajo» hermanas; en la primera, una subcarpeta con algún marcador **entre** sus marcadores (marcador, subcarpeta, marcador);
  - **una** carpeta cuyo nombre sea literalmente «A / B», con la barra inclinada dentro del nombre;
  - **otra** carpeta «A» con una subcarpeta «B» dentro. Esas dos se leen igual en el menú («… / A / B»), y de eso va el caso 1: no hay que repetir ninguna.
- [x] Vaciar o apuntar el contenido de la carpeta de Descargas, para distinguir la copia nueva.

## 1. Etiquetas del menú (hallazgos 3 y 5)

- [x] Abrir el menú «carpeta»: salen «Barra de marcadores / Trabajo» y «Barra de marcadores / Trabajo (2)». La primera, la que está antes en el Administrador, no lleva número. (La barra puede llamarse de otra forma en tu Chrome.)
- [x] Salen dos entradas «Barra de marcadores / A / B»: la carpeta de nombre «A / B» y la «B» dentro de «A». La que esté antes en el Administrador no lleva número y la otra lleva «(2)»; una tercera carpeta que se leyera igual llevaría «(3)».
- [x] Ninguna etiqueta lleva «(cuenta)» ni «(este dispositivo)»: todos los marcadores son locales.

## 2. Elegir una carpeta (hallazgos 3 y 5)

- [x] Elegir «Trabajo (2)»: el grid enseña solo sus marcadores, no los de la otra «Trabajo».
- [x] En el menú, solo esa entrada queda marcada.
- [x] Con el ratón sobre el chip activo, el tooltip enseña la etiqueta completa, con el «(2)».
- [x] Elegir una y luego la otra de las entradas «A / B»: cada una enseña solo lo suyo, y en el menú solo se marca la elegida.

## 3. El filtro guardado vuelve (los ids se mantienen)

- [x] Con una carpeta elegida, recargar la pestaña de la app: sigue elegida la misma carpeta.
- [x] Cerrar Chrome del todo, volver a abrirlo y abrir la app: sigue elegida la misma carpeta.

## 4. Las etiquetas no cambian al eliminar

- [x] Elegir la primera «Trabajo», seleccionar todos sus marcadores (Ctrl+A) y eliminarlos (Supr).
- [x] Volver a «todos» y abrir el menú: la primera «Trabajo» ya no sale y la otra sigue siendo «Trabajo (2)».
- [x] Deshacer (Ctrl+Z mientras se ve el aviso) o restaurarlos desde «eliminados»: la primera «Trabajo» vuelve al menú, y la otra sigue siendo «(2)».

## 5. La copia con carpetas de igual nombre (hallazgo 5)

- [x] Eliminar algún marcador de cada «Trabajo» (en la primera, también el que está dentro de la subcarpeta) y, si quieres, de «A / B» y de «B» dentro de «A». Pulsar «Aplicar» → «borrar N» y permitir la copia.
- [x] Se guarda `bookmarks-AAAA-MM-DD_deleted.html` en Descargas.
- [x] Abrir el HTML en un editor de texto: tiene **dos** `<H3>Trabajo</H3>`, cada una con sus marcadores, y ninguna lleva «(2)».
- [x] En la primera «Trabajo», la subcarpeta sale entre los marcadores, no antes de todos ni después de todos: el orden es el del Administrador.
- [x] Si eliminaste de «A / B» y de «B» dentro de «A»: salen por separado, como `<H3>A / B</H3>` y como `<H3>A</H3>` con `<H3>B</H3>` dentro.
- [ ] (Opcional) Importar la copia en el Administrador de marcadores (⋮ · Importar marcadores). Según el código del importador de Chrome, las dos «Trabajo» vuelven fundidas en **una** sola carpeta, dentro de la carpeta de importación (no es un fallo de la app). Comprueba que no falta ningún marcador y anota aquí cómo queda el orden.

## 6. Migración del filtro guardado (opcional)

Solo se puede ver con una compilación anterior (`main`): hasta esta rama el filtro de carpeta se guardaba como una ruta de nombres.

- [ ] Con `main` compilado y la extensión cargada, elegir una carpeta en el filtro y marcar algún marcador como eliminado.
- [ ] Compilar esta rama, pulsar ↻ y recargar la pestaña: la app abre en «todos», sin errores, y se conservan las marcas de eliminados y el orden.

## 7. Cuenta frente a dispositivo, con `npm run dev` (hallazgo 4)

Hecho por Claude el 28-10-2026 en el navegador de Playwright, con el servidor de `npm run dev`. El ejemplo trae una «Trabajo» de la cuenta, una segunda «Trabajo» del dispositivo y la carpeta «Viajes / Japón 2019» junto a Viajes › Japón 2019.

- [x] El menú pone «(cuenta)» y «(este dispositivo)» en la carpeta del navegador, y salen «Trabajo (2)» y «Viajes / Japón 2019 (2)».
- [x] Al elegir una entrada, solo ella queda marcada y el grid enseña solo sus marcadores (probado con las dos «Trabajo» del dispositivo, la de la cuenta y las dos «Japón 2019»).
- [x] El chip activo lleva el `title` con la etiqueta completa.
- [x] Al eliminar todos los marcadores de una carpeta, las etiquetas de las demás no cambian.
- [x] Un estado guardado en el formato antiguo (`version: 0`, filtro por nombres) abre en «todos», conserva el orden y se reescribe como `version: 1`.

## Comprobaciones finales

- [x] Los textos se ven bien en español y en inglés (cambiar el idioma con el botón).
- [x] Sin errores en la consola de la pestaña de la app (F12), salvo los 404 de favicon, que son esperados (ver las respuestas en «Notas»).

## Notas

Anota aquí lo que falle (qué hiciste, qué esperabas, qué viste):

- 1. Etiquetas del menú (hallazgos 3 y 5): Indica que tegno que ver A / B y A / B (2), entendiendo que tengo que crear 2 veces la carpeta A / B, pero no se indica en el paso anterior. La cree por mi cuenta.
- Si hay una carpeta A con una carpeta B dentro, se muestra como A / B (3)
- 6. Migración del filtro guardado (opcional): No lo probé
- Comprobaciones finales: Los mismos errores ya vistos de 404 de los favicos. Lo tenemos mapeado?

### Respuestas (28-10-2026)

- **Notas 1 y 2 (A / B):** el texto de la preparación era ambiguo y ya está corregido: hay que crear **una** carpeta de nombre «A / B» y **otra** «A» con «B» dentro, sin repetir ninguna. Con las tres carpetas que creaste (dos «A / B» y «A» › «B») hay tres que se leen igual, y la numeración sale como debe: «A / B», «A / B (2)» y «A / B (3)», en el orden del Administrador. No es un fallo, y de paso confirma en Chrome real la tercera etiqueta repetida, que solo estaba probada con tests.
- **Nota 3 (migración):** opcional y sin hacer. La cubren el test del store (`version: 0` con un filtro por nombres abre en «todos» y conserva marcas y orden) y la prueba en Playwright del caso 7.
- **Nota 4 (404 de favicon):** esperado, no es un fallo. Hasta hoy no estaba explicado en ningún sitio, solo apuntado en la nota 2 de la [lista de la copia de seguridad](./pruebas-copia-de-seguridad.md); ahora está en `CLAUDE.md` (paso 9). Lo comprobé el 28-10-2026:
  - Las tarjetas piden el icono a `https://www.google.com/s2/favicons?domain=…`, que redirige a `gstatic.com/faviconV2`. Con un dominio del que Google no tiene icono (probé uno inventado), responde **404 con un PNG genérico de 16×16**; con uno conocido (`react.dev`), 200.
  - Como el cuerpo es una imagen válida, la tarjeta la carga y enseña un icono genérico, así que el `onError` (que oculta la imagen cuando falla de verdad) no salta. Aun así, el navegador apunta el 404 como error en la consola; lo reproduje con una imagen suelta, que cargó y dejó el error igualmente.
  - Cambiarlo exigiría otra fuente de favicons. La de Chrome (`_favicon`) da un globo genérico a los sitios no visitados, y por eso [`eliminar-con-chrome-adapter.md`](./eliminar-con-chrome-adapter.md) dejó los favicons de Google; el favicon sirve para reconocer marcas de un vistazo. No compensa cambiarlo por una línea en la consola.