# Paso 19: enlaces rotos — diseño

Fecha: 02-11-2026. Estado: pendiente de aprobación.

## Intención

Al revisar los marcadores en el grid aparece alguno que el usuario no recuerda. Pasa el ratón, ve que el enlace no funciona y lo natural sería borrarlo. La app debe adelantarse: comprobar los enlaces, marcar en la card los que están rotos y juntarlos en una pestaña para borrarlos de una vez, sin tener que probarlos uno a uno.

## Objetivos

- Comprobar los enlaces una vez, guardar el resultado y no repetir el escaneo al abrir la pestaña.
- Marcar las cards rotas con un icono de enchufe desconectado, visible sin pasar el ratón.
- Un chip «rotos · N» en la barra de filtros, como «eliminados · N», para seleccionar y eliminar los rotos juntos.
- Descartar falsos positivos: 👍 «no está roto», en la card y en lote desde el chip.
- Pedir lo que haga falta (permiso, aviso del coste) antes de empezar.

## No objetivos

- No borra nada por su cuenta. Un roto sigue el flujo de siempre: eliminar (pendiente) y solo «Aplicar» borra de Chrome.
- No comprueba el contenido de la página, ni busca copias en archive.org, ni propone el enlace nuevo.
- No escanea en segundo plano ni de forma periódica.
- No virtualiza el grid (aparcado en `ideas-aparcadas.md`).

## Anti-objetivos (lo que sería un fallo aunque «funcione»)

- Marcar como roto un enlace que funciona y que el usuario acabe borrando.
- Repintar el grid entero por cada resultado del escaneo.
- Volver a escanear todo cada vez que se abre la pestaña.
- Dejar al usuario sin salida en un escaneo largo.

## Qué cuenta como roto

Solo tres casos, el resto no se marca:

- **Roto:** respuesta 404 o 410.
- **Roto:** el dominio no responde (el `fetch` falla con error de red) **y falla también en un segundo intento**.
- **Desconocido, no se marca:** 403, 5xx, tiempo agotado, redirecciones sin salida, y cualquier otra cosa. Muchos sitios bloquean a los robots o fallan un rato.
- **Se omiten:** los enlaces que no son `http(s)://` (`chrome://`, `file://`…).

Limitación conocida: `fetch` no distingue un dominio inexistente de un certificado inválido ni de una conexión rechazada; todos llegan como el mismo error de red. Se aceptan como «no responde», y el 👍 sirve para los falsos positivos.

## Permisos (decidido: opcional)

`optional_host_permissions: ["<all_urls>"]` en el manifest. Sin acceso a los sitios, Chrome solo da respuestas opacas, donde un 404 y un 200 no se distinguen. El permiso se pide con `chrome.permissions.request` en el clic de «Comprobar» del diálogo previo (hace falta un gesto del usuario). Si se rechaza, la app funciona igual y no hay detección. Regla general: lo delicado se avisa antes y va como permiso opcional.

## Cuándo se escanea

- **Primera vez** (aún no hay ningún escaneo guardado): al abrir la pestaña aparece el diálogo previo. Si el usuario lo cierra sin empezar, no vuelve a salir solo; queda el botón del header.
- **Aperturas siguientes:** nunca se escanea. Solo se enseña lo guardado.
- **Botón de re-escanear** (header): comprueba tres grupos: los rotos, los que tienen más de **30 días** desde su última comprobación y los que nunca se comprobaron (marcadores nuevos; decisión mía, para que lo añadido después no quede sin comprobar). Los descartados con 👍 no se vuelven a comprobar.
- Antes de empezar se comprueba la conexión: sin `navigator.onLine` no se empieza. Si durante el escaneo fallan seguidos muchos dominios distintos, se detiene sin marcar nada como roto y avisa de que no pudo comprobar.

## Qué ve el usuario

1. **Diálogo previo.** Dice cuántos enlaces se van a comprobar, que puede tardar unos minutos y que se hace una petición a cada sitio. Lleva el botón que pide el permiso.
2. **Diálogo de progreso.** Barra global «1.240 de 5.000», como `ApplyDialog`: no se cierra con `Esc` ni fuera. Tiene un botón **«cancelar»** que se queda con lo ya comprobado.
3. **Al terminar o cancelar.** Resumen («37 rotos») y los resultados se escriben **de una vez**: aparecen a la vez el chip y las marcas de las cards. No hay barra por card.
4. **Card rota.** Icono de enchufe desconectado y, junto a él, un botón 👍 «no está roto». Al pulsarlo, la card pierde la marca y sale del chip.
5. **Chip «rotos · N».** Cuenta solo los conservados y no descartados, como los demás contadores. Dentro de la vista, `Ctrl`+`A` y eliminar funcionan como siempre, y la `SelectionBar` añade la acción **«no están rotos»** para descartar la selección en lote.
6. **El 👍 sobrevive al re-escaneo** (decidido).

## Datos y arquitectura

- **Resultado por URL normalizada** (`normalizeUrl`), no por id: los duplicados comparten resultado. Forma orientativa: `{ status: 'ok' | 'broken' | 'unknown', checkedAt: number, dismissed?: boolean }`.
- **Persistencia propia** en `localStorage`, con una clave aparte del triaje (por ejemplo `bookmarkify:links:v1`), para no engordar `bookmarkify:v2`. Sin permisos nuevos. Si crece demasiado, pasar a `chrome.storage.local` pediría el permiso `storage`.
- **Regla de arquitectura:** ningún archivo fuera de `src/core/adapters/` conoce `chrome.*`. El escaneo va tras un puerto nuevo (por ejemplo `LinkChecker`, con la comprobación y la petición del permiso), con adaptador real y falso para los tests y `npm run dev`. Dónde se elige la implementación, igual que `createBookmarkSource()`.
- **Rendimiento:** los resultados no entran en el estado que repinta cada card por cada escritura. Se escriben en un solo `set` al final (o en lotes grandes) y cada card lee solo su entrada. Es lo que dejaron anotado los hallazgos 6 y 7.

## Lo que queda al constructor

Valores y detalles que no cambian lo que se construye: concurrencia total y por dominio, tiempo máximo por petición, `HEAD` con vuelta a `GET` si el servidor no lo admite, el icono concreto (clavija/enchufe desconectado), el nombre exacto del chip en es/en (lo revisa el agente i18n), los tamaños de lote de escritura, el umbral de «muchos dominios seguidos fallan», y cómo se reparte el trabajo en partes (propuesta: núcleo y permiso, store y filtros, UI, diálogos y docs; parar tras cada parte).

## Decisiones mías, por revisar

- Cuenta como caído un dominio que falla dos veces (no una).
- Los enlaces no `http(s)` se omiten.
- Los marcadores nuevos entran en el re-escaneo.
- El diálogo previo sale solo una vez, y el botón del header queda siempre.
- Resultado en `localStorage` con clave propia, por URL normalizada.
- Los descartados con 👍 no se comprueban de nuevo.
