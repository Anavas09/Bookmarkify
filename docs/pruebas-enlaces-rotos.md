# Pruebas manuales: enlaces rotos (paso 19)

Rama `feat/broken-links`. Marca cada casilla al terminar la prueba.

## Preparación

- [ ] Usar un perfil de Chrome aparte, **sin sincronización**, con marcadores importados desde un HTML. Conviene que tenga: algún enlace que devuelva 404 (por ejemplo una página borrada de un sitio real), uno con un dominio que no existe, uno que dé 403 y un marcador `chrome://settings`.
- [ ] Incluir dos marcadores con la misma URL rota (uno con `/` al final).
- [ ] `npm run build`, pulsar ↻ en la tarjeta de Bookmarkify en `chrome://extensions` y recargar la pestaña.
- [ ] En «Detalles» de la extensión, comprobar que al instalar **no** pide acceso a los sitios.
- [ ] Con `npm run dev` (marcadores de ejemplo y comprobador falso) se puede ver el flujo sin red: `broken` da 404, `dead.example` no conecta y `forbidden` da 403.

## 1. Permiso

- [ ] Al abrir la pestaña sale el diálogo «Comprobar enlaces» con el número de enlaces. Pulsar «comprobar» y **rechazar** el permiso: sale «Sin permiso» y no se comprueba nada.
- [ ] Pulsar «comprobar enlaces» en el header y esta vez **permitir**: empieza el escaneo.

## 2. Primer escaneo

- [ ] La barra de progreso avanza («X de N») y `Esc` o un clic fuera no cierran el diálogo.
- [ ] Al acabar: «N enlaces rotos». Las cards rotas llevan el icono de enchufe y el 👍; aparece el chip «rotos · N».
- [ ] El 403 **no** está marcado; el dominio que no existe, sí; `chrome://settings` no se ha comprobado.
- [ ] El chip «rotos» muestra solo las rotas; las dos de la URL duplicada salen.

## 3. No se repite al abrir

- [ ] Cerrar y abrir la pestaña de nuevo: el diálogo **no** sale solo y las marcas siguen.
- [ ] El botón del header sí lo abre siempre; si no hay nada que comprobar, lo dice y solo ofrece cerrar.

## 4. Cancelar a mitad

- [ ] Con muchos marcadores nuevos, pulsar «cancelar» durante el escaneo: sale «Cancelado: se guardaron N resultados» y lo comprobado hasta ahí se conserva.
- [ ] Pulsar «comprobar enlaces» otra vez: solo comprueba lo que faltaba (más los rotos y los antiguos).

## 5. 👍 «no está roto»

- [ ] 👍 en una card rota: desaparece de la vista «rotos» (con animación) y su gemela duplicada también; el chip baja en 2.
- [ ] Ctrl+A en la vista «rotos» y «no están rotos · N» en la barra: las vacía y limpia la selección.
- [ ] Re-escanear (botón del header): el 👍 se conserva aunque la URL siga rota.
- [ ] Recargar la pestaña: el 👍 y los resultados siguen (clave `bookmarkify:links:v1`; el triaje no se toca).

## 6. Sin red

- [ ] Modo avión y «comprobar enlaces»: sale «No se pudo comprobar: parece que no hay conexión» y no queda nada nuevo marcado como roto.

## 7. Aplicar sigue igual

- [ ] Eliminar una card rota y «Aplicar»: se borra como cualquier otra y el chip «rotos» no la cuenta.
