# Bookmarktify

App de triaje visual para limpiar los marcadores del navegador. Sube un archivo `.html` en formato Netscape (exportación de Chrome, Firefox, Edge, Safari o cualquier otro navegador), revisa tus marcadores en un grid de tarjetas navegable con el teclado, marca los que ya no valgan y descarga un `.html` filtrado.

Las eliminaciones son **no destructivas**: no se borra nada de tu exportación hasta que confirmes y descargues el archivo filtrado. Sobre cómo aplicar el resultado al navegador, ver la sección [Reimportar en el navegador](#reimportar-en-el-navegador) — hay una limitación importante.

## Características

- Importación de exportaciones HTML Netscape de cualquier navegador mayoritario.
- Grid de tarjetas con navegación por teclado (`j` / `k` para mover, `x` para marcar, `u` para deshacer).
- Detección de duplicados por URL normalizada.
- Filtro por dominio.
- Exportación del conjunto filtrado como HTML Netscape válido, listo para reimportar.
- Previsto: build como extensión de Chrome compartiendo el mismo core y previsualización perezosa de `og:image`.

## Puesta en marcha

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

Después abre la URL que imprima Vite (normalmente `http://localhost:5173`).

## Scripts

| Script | Descripción |
| --- | --- |
| `npm run dev` | Arranca el servidor de desarrollo de Vite con HMR. |
| `npm run build` | Comprueba tipos y genera un build de producción. |
| `npm run preview` | Sirve el build de producción en local. |
| `npm run test` | Ejecuta la suite de Vitest una vez. |
| `npm run test:watch` | Ejecuta Vitest en modo watch. |
| `npm run lint` | Ejecuta ESLint sobre el proyecto. |

Para ejecutar un solo archivo de tests:

```bash
npx vitest run src/core/parser.test.ts
```

## Estructura del proyecto

```
src/
  core/
    ports/           # BookmarkSource — el único contrato que conoce la UI
    adapters/        # NetscapeAdapter (archivo), ChromeAdapter (extensión)
    parser.ts        # HTML Netscape → marcadores tipados (puro y testeable)
    serializer.ts    # marcadores tipados → HTML Netscape (puro y testeable)
    normalizeUrl.ts  # normalización de URLs para detectar duplicados
    types.ts         # Bookmark y tipos relacionados
  store/             # store de Zustand
  components/        # solo UI — sin conocimiento del formato subyacente
```

## Arquitectura

Toda lectura y escritura de marcadores pasa por el puerto `BookmarkSource` definido en `src/core/ports/BookmarkSource.ts`. La UI nunca toca directamente el formato HTML Netscape ni la API `chrome.bookmarks` — ese conocimiento queda confinado en `src/core/adapters/`. Esto permite que la misma UI se distribuya hoy como web app y mañana como extensión de Chrome sin cambios.

Consulta [`CLAUDE.md`](./CLAUDE.md) para el detalle completo del diseño, los invariantes y el modelo de estado.

## Stack técnico

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Zustand](https://zustand-demo.pmnd.rs/) para la gestión de estado
- [Tailwind CSS v4](https://tailwindcss.com/) para los estilos
- [Vitest](https://vitest.dev/) con jsdom para los tests
- ESLint

## Reimportar en el navegador

Chrome (y navegadores derivados) importan HTML de bookmarks de forma **aditiva, no destructiva**. Cuando reimportas el `.html` filtrado que exporta la app:

- Chrome no borra tus bookmarks actuales; **añade** los del archivo dentro de una subcarpeta nueva en *Other Bookmarks* llamada algo tipo `Imported YYYY-MM-DD`.
- Las carpetas raíz de Chrome (`Bookmarks Bar`, `Other Bookmarks`, `Mobile Bookmarks`) son especiales y **no se eliminan** aunque el archivo importado no las incluya.
- Firefox y Safari se comportan de forma similar.

Es decir, el archivo filtrado es una **herramienta de decisión** ("qué borrar"), no de aplicación automática ("bórralo"). Para aplicar el triaje al perfil real tienes dos vías:

1. Borrar manualmente en el navegador los marcadores que descartaste (usa el archivo filtrado como referencia).
2. Esperar a la versión como extensión de Chrome, que usará `chrome.bookmarks.remove()` para aplicar los cambios directamente sin pasar por HTML.

## Estado

Progreso actual (ver [`CLAUDE.md`](./CLAUDE.md#orden-de-implementación) para el plan completo):

1. Tipos base + parser de Netscape con tests de Vitest — **hecho**
2. Puerto `BookmarkSource` + `NetscapeAdapter` — **hecho**
3. Store de Zustand — **hecho**
4. Grid de tarjetas + subida de archivo — **hecho**
5. Navegación por teclado + deshacer — **hecho**
6. Jerarquía de carpetas (parser + serializer + metadata en UI) — pendiente
7. Filtros por dominio, duplicados y carpeta — pendiente
8. Exportación de HTML Netscape filtrado + modal con instrucciones de reimportación — pendiente
9. Previsualización con `og:image` — pendiente
10. **Opcional** — refinamientos aplazados (favicon inline, preservar atributos de carpetas raíz, `<H1>` localizado)

## Licencia

Proyecto privado — sin licencia otorgada.
