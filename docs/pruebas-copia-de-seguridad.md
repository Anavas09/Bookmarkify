# Pruebas manuales: copia de seguridad con `chrome.downloads`

Rama `fix/backup-downloads` (hallazgos 1 y 2 del [code review](./code-review.md)). Marca cada casilla al terminar la prueba.

## Preparación

- [ ] Usar un perfil de Chrome aparte, **sin sincronización**, con marcadores importados desde un HTML (borrar de verdad no tiene vuelta atrás).
- [ ] `npm run build`.
- [ ] En `chrome://extensions`, pulsar ↻ en la tarjeta de Bookmarkify y recargar la pestaña de la app.
- [ ] Comprobar en «Detalles» de la extensión que, al instalar, **no** pide el permiso de descargas (solo marcadores).
- [ ] Vaciar o apuntar el contenido de la carpeta de Descargas, para distinguir las copias nuevas.

## 1. Permiso rechazado

- [ ] Eliminar 2–3 marcadores, pulsar «Aplicar» y luego «borrar N».
- [ ] Chrome muestra el aviso de permiso de descargas.
- [ ] Rechazarlo: sale «Borrar sin copia de seguridad» con el motivo «No diste permiso…».
- [ ] El foco empieza en «cancelar».
- [ ] Pulsar «cancelar»: los marcadores siguen en Chrome (comprobar en el Administrador de marcadores) y siguen marcados como eliminados en la app.
- [ ] No hay ningún archivo nuevo en Descargas.

## 2. Permiso concedido

- [ ] Repetir «Aplicar» → «borrar N» y esta vez **permitir**.
- [ ] Se guarda `bookmarks-AAAA-MM-DD_deleted.html` en Descargas.
- [ ] El resumen dice «copia guardada: …» con ese mismo nombre.
- [ ] Los marcadores han desaparecido de Chrome y de la app.
- [ ] Abrir el HTML: solo tiene los marcadores borrados, con sus carpetas.

## 3. Segunda tanda el mismo día (hallazgo 2)

- [ ] Eliminar otros marcadores y aplicar de nuevo, sin borrar la primera copia.
- [ ] No vuelve a pedir el permiso.
- [ ] El archivo nuevo se llama `… (1).html`.
- [ ] El resumen muestra ese nombre con el `(1)`, no el de la primera copia.

## 4. La copia no se guarda (hallazgo 1)

- [ ] En `chrome://settings/downloads`, activar «Preguntar dónde guardar cada archivo antes de descargarlo».
- [ ] Eliminar marcadores, «Aplicar» → «borrar N» y **cancelar** el cuadro de guardado.
- [ ] Sale el aviso «La copia no se pudo guardar y todavía no se ha borrado nada».
- [ ] Los marcadores siguen en Chrome.
- [ ] «cancelar» cierra sin borrar y deja los marcadores marcados en la app.
- [ ] Volver a «Aplicar» → «borrar N», esta vez guardar en el cuadro: se borra y el resumen muestra el nombre guardado.
- [ ] Desactivar de nuevo la opción de preguntar dónde guardar.

## 5. Borrar sin copia

- [ ] Repetir el caso 1 (o el 4) y esta vez pulsar «borrar sin copia».
- [ ] Se borran los marcadores y el resumen **no** muestra la línea de la copia.
- [ ] No hay archivo nuevo en Descargas.

## 6. Permiso revocado

- [ ] En `chrome://extensions` → Detalles de Bookmarkify → permisos, quitar el de descargas (si Chrome ofrece la opción).
- [ ] El siguiente «Aplicar» → «borrar N» vuelve a pedirlo.

## Comprobaciones finales

- [ ] Importar una copia en el Administrador de marcadores: los marcadores vuelven dentro de una carpeta nueva.
- [ ] Los textos de los diálogos se ven bien en español y en inglés (cambiar el idioma).
- [ ] Sin errores en la consola de la pestaña de la app (F12).

## Notas

Anota aquí lo que falle (qué hiciste, qué esperabas, qué viste):

-
