# Pruebas manuales: carpetas por id

Rama `fix/folder-ids` (hallazgos 3, 4 y 5 del [code review](./code-review.md)). Marca cada casilla al terminar la prueba.

## Preparación

- [ ] Usar un perfil de Chrome aparte, **sin sincronización y sin iniciar sesión**. El hallazgo 4 (cuenta frente a dispositivo) no se prueba aquí: iniciar sesión con una cuenta borraría marcadores de esa cuenta en todos sus dispositivos. Se ve con `npm run dev` (caso 7).
- [ ] `npm run build`.
- [ ] En `chrome://extensions`, pulsar ↻ en la tarjeta de Bookmarkify y recargar la pestaña de la app.
- [ ] En el Administrador de marcadores, crear en la barra de marcadores, cada una con 2–3 marcadores:
  - dos carpetas «Trabajo» hermanas; en la primera, una subcarpeta con algún marcador **entre** sus marcadores (marcador, subcarpeta, marcador);
  - una carpeta llamada «A / B»;
  - una carpeta «A» con una carpeta «B» dentro.
- [ ] Vaciar o apuntar el contenido de la carpeta de Descargas, para distinguir la copia nueva.

## 1. Etiquetas del menú (hallazgos 3 y 5)

- [ ] Abrir el menú «carpeta»: salen «Barra de marcadores / Trabajo» y «Barra de marcadores / Trabajo (2)». La primera, la que está antes en el Administrador, no lleva número. (La barra puede llamarse de otra forma en tu Chrome.)
- [ ] Salen «Barra de marcadores / A / B» y «Barra de marcadores / A / B (2)»: la carpeta «A / B» y la «B» dentro de «A», la primera en el orden del Administrador sin número.
- [ ] Ninguna etiqueta lleva «(cuenta)» ni «(este dispositivo)»: todos los marcadores son locales.

## 2. Elegir una carpeta (hallazgos 3 y 5)

- [ ] Elegir «Trabajo (2)»: el grid enseña solo sus marcadores, no los de la otra «Trabajo».
- [ ] En el menú, solo esa entrada queda marcada.
- [ ] Con el ratón sobre el chip activo, el tooltip enseña la etiqueta completa, con el «(2)».
- [ ] Elegir «A / B» y luego «A / B (2)»: cada una enseña solo lo suyo, y en el menú solo se marca la elegida.

## 3. El filtro guardado vuelve (los ids se mantienen)

- [ ] Con una carpeta elegida, recargar la pestaña de la app: sigue elegida la misma carpeta.
- [ ] Cerrar Chrome del todo, volver a abrirlo y abrir la app: sigue elegida la misma carpeta.

## 4. Las etiquetas no cambian al eliminar

- [ ] Elegir la primera «Trabajo», seleccionar todos sus marcadores (Ctrl+A) y eliminarlos (Supr).
- [ ] Volver a «todos» y abrir el menú: la primera «Trabajo» ya no sale y la otra sigue siendo «Trabajo (2)».
- [ ] Deshacer (Ctrl+Z mientras se ve el aviso) o restaurarlos desde «eliminados»: la primera «Trabajo» vuelve al menú, y la otra sigue siendo «(2)».

## 5. La copia con carpetas de igual nombre (hallazgo 5)

- [ ] Eliminar algún marcador de cada «Trabajo» (en la primera, también el que está dentro de la subcarpeta) y, si quieres, de «A / B» y de «B» dentro de «A». Pulsar «Aplicar» → «borrar N» y permitir la copia.
- [ ] Se guarda `bookmarks-AAAA-MM-DD_deleted.html` en Descargas.
- [ ] Abrir el HTML en un editor de texto: tiene **dos** `<H3>Trabajo</H3>`, cada una con sus marcadores, y ninguna lleva «(2)».
- [ ] En la primera «Trabajo», la subcarpeta sale entre los marcadores, no antes de todos ni después de todos: el orden es el del Administrador.
- [ ] Si eliminaste de «A / B» y de «B» dentro de «A»: salen por separado, como `<H3>A / B</H3>` y como `<H3>A</H3>` con `<H3>B</H3>` dentro.

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

- [ ] Los textos se ven bien en español y en inglés (cambiar el idioma con el botón).
- [ ] Sin errores en la consola de la pestaña de la app (F12).

## Notas

Anota aquí lo que falle (qué hiciste, qué esperabas, qué viste):

-
