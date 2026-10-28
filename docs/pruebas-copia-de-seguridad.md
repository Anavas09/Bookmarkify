# Pruebas manuales: copia de seguridad con `chrome.downloads`

Rama `fix/backup-downloads` (hallazgos 1 y 2 del [code review](./code-review.md)). Marca cada casilla al terminar la prueba.

## Preparación

- [x] Usar un perfil de Chrome aparte, **sin sincronización**, con marcadores importados desde un HTML (borrar de verdad no tiene vuelta atrás).
- [x] `npm run build`.
- [x] En `chrome://extensions`, pulsar ↻ en la tarjeta de Bookmarkify y recargar la pestaña de la app.
- [x] Comprobar en «Detalles» de la extensión que, al instalar, **no** pide el permiso de descargas (solo marcadores).
- [x] Vaciar o apuntar el contenido de la carpeta de Descargas, para distinguir las copias nuevas.

## 1. Permiso rechazado

- [x] Eliminar 2–3 marcadores, pulsar «Aplicar» y luego «borrar N».
- [x] Chrome muestra el aviso de permiso de descargas.
- [x] Rechazarlo: sale «Borrar sin copia de seguridad» con el motivo «No diste permiso…».
- [x] En el diálogo de la app (no en el aviso de Chrome), el foco empieza en «cancelar»: Enter cierra sin borrar.
- [x] Pulsar «cancelar»: los marcadores siguen en Chrome (comprobar en el Administrador de marcadores) y siguen marcados como eliminados en la app.
- [x] No hay ningún archivo nuevo en Descargas.

## 2. Permiso concedido

- [x] Repetir «Aplicar» → «borrar N» y esta vez **permitir**.
- [x] Se guarda `bookmarks-AAAA-MM-DD_deleted.html` en Descargas.
- [x] El resumen dice «copia guardada: …» con ese mismo nombre.
- [x] Los marcadores han desaparecido de Chrome y de la app.
- [x] Abrir el HTML: solo tiene los marcadores borrados, con sus carpetas.

## 3. Segunda tanda el mismo día (hallazgo 2)

- [x] Eliminar otros marcadores y aplicar de nuevo, sin borrar la primera copia.
- [x] No vuelve a pedir el permiso.
- [x] El archivo nuevo se llama `… (1).html`.
- [x] El resumen muestra ese nombre con el `(1)`, no el de la primera copia.

## 4. La copia no se guarda (hallazgo 1)

- [x] En `chrome://settings/downloads`, activar «Preguntar dónde guardar cada archivo antes de descargarlo».
- [x] Eliminar marcadores, «Aplicar» → «borrar N» y **cancelar** el cuadro de guardado.
- [x] Sale el aviso «La copia no se pudo guardar y todavía no se ha borrado nada».
- [x] Los marcadores siguen en Chrome.
- [x] «cancelar» cierra sin borrar y deja los marcadores marcados en la app.
- [x] Volver a «Aplicar» → «borrar N», esta vez guardar en el cuadro: se borra y el resumen muestra el nombre guardado.
- [x] Desactivar de nuevo la opción de preguntar dónde guardar.

## 5. Borrar sin copia

- [x] Repetir el caso 1 (o el 4) y esta vez pulsar «borrar sin copia».
- [x] Se borran los marcadores y el resumen **no** muestra la línea de la copia.
- [x] No hay archivo nuevo en Descargas.

## 6. Permiso revocado (no aplicable)

Chrome no deja revocar un permiso opcional ya concedido desde «Detalles». Con `chrome.permissions.remove` desde la consola sí se quita (`contains` pasa a `false`), pero el siguiente `request` lo vuelve a activar sin avisar (`contains` vuelve a `true`) y la copia se guarda con normalidad. Para ver el aviso otra vez hay que reinstalar la extensión.

- [x] Tras reinstalar, el primer «Aplicar» → «borrar N» pide el permiso y los siguientes no.
- [x] Tras `remove` + «Aplicar», el permiso vuelve a estar concedido y la copia se guarda.

## Comprobaciones finales

- [x] Importar una copia en el Administrador de marcadores: los marcadores vuelven dentro de una carpeta nueva.
- [x] Los textos de los diálogos se ven bien en español y en inglés (cambiar el idioma).
- [x] Sin errores en la consola de la pestaña de la app (F12).

## Notas

Anota aquí lo que falle (qué hiciste, qué esperabas, qué viste):

- 1 Esto es lo que dice Permissions verificando el punto 6: Read and change your bookmarks, Manage your downloads. No se puede quitar

- 2 Errores en consola: Solo erroes 404 de favicon

- 3 Cuando dices "El foco empieza en «cancelar»." No se si te refieres al modal de la extensión o al del navegador. Si es el del navegador entonces si, el de la app tiene foco en borrar