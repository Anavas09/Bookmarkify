# Bookmarkify

App de triaje visual para limpiar los marcadores del navegador. Sube un archivo `.html` en formato Netscape (la exportación de Chrome, Firefox, Edge, Safari o cualquier otro navegador), revisa tus marcadores en un grid de tarjetas, selecciona los que ya no te sirvan, elimínalos y descarga un `.html` filtrado.

Las eliminaciones son **no destructivas**: los marcadores eliminados se ocultan, pero puedes restaurarlos en cualquier momento, y tu exportación original no cambia. Sobre cómo aplicar el resultado al navegador, mira la sección [Reimportar en el navegador](#reimportar-en-el-navegador): hay una limitación importante.

## Características

- **Importación** de exportaciones HTML Netscape de cualquier navegador mayoritario, con su jerarquía de carpetas.
- **Grid de tarjetas** con favicon, dominio, fecha y etiquetas de cada marcador.
- **Selección estilo Explorador de Windows**: clic, `Ctrl`/`Cmd`+clic, `Shift`+clic para rangos y lazo arrastrando con el ratón.
- **Eliminar, restaurar y deshacer** desde una barra flotante. Los eliminados desaparecen del grid y se pueden recuperar en la vista «eliminados».
- **Filtros** por dominio, carpeta y URL duplicada (normalizada), y búsqueda por título, URL o carpeta.
- **Orden** original, por título, por fecha o por dominio.
- **Exportación** del conjunto filtrado como HTML Netscape válido, con instrucciones de reimportación para cada navegador.
- **Progreso guardado** en el navegador: si cierras la pestaña, el triaje sigue donde lo dejaste.
- **Tema claro y oscuro**, e interfaz en **español e inglés**.
- **Animaciones** al eliminar y restaurar. Con «reducir movimiento» activado en el sistema, los cambios son instantáneos.

### Atajos de teclado

| Atajo | Acción |
| --- | --- |
| `Supr` / `⌫` | Eliminar la selección |
| `Esc` | Limpiar la selección |
| `Ctrl`/`Cmd` + `A` | Seleccionar todos los visibles |
| `Ctrl`/`Cmd` + `Z` | Deshacer el último borrado (mientras se ve el aviso) |
| `/` | Ir a la búsqueda |

Doble clic en una tarjeta, o clic en su título, abre el enlace.

## Puesta en marcha

Requiere Node.js 20.19 o superior (o 22.12 o superior).

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
    adapters/        # NetscapeAdapter (archivo .html)
    parser.ts        # HTML Netscape → marcadores tipados (puro y testeable)
    serializer.ts    # marcadores tipados → HTML Netscape (puro y testeable)
    normalizeUrl.ts  # normalización de URLs para detectar duplicados
    types.ts         # Bookmark y tipos relacionados
  store/             # store de Zustand, selectores y acciones animadas
  components/        # solo UI — sin conocimiento del formato subyacente
  hooks/             # atajos de teclado y tema
  lib/               # utilidades (animación del grid, favicons, dominios…)
  i18n/, locales/    # configuración de i18next y textos en español e inglés
```

## Arquitectura

Toda lectura y escritura de marcadores pasa por el puerto `BookmarkSource`, definido en `src/core/ports/BookmarkSource.ts`. La UI nunca toca directamente el formato HTML Netscape ni la API `chrome.bookmarks`: ese conocimiento queda confinado en `src/core/adapters/`. Así, la misma UI puede distribuirse hoy como web app y mañana como extensión de Chrome sin cambios.

Consulta [`CLAUDE.md`](./CLAUDE.md) para el detalle completo del diseño, los invariantes y el modelo de estado.

## Stack técnico

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Zustand](https://zustand-demo.pmnd.rs/) para la gestión de estado, con persistencia en `localStorage`
- [Tailwind CSS v4](https://tailwindcss.com/) para los estilos
- [Headless UI](https://headlessui.com/) para el modal y los menús desplegables
- [react-selecto](https://github.com/daybrush/selecto) para la selección con lazo
- [Motion](https://motion.dev/) para las animaciones
- [i18next](https://www.i18next.com/) para la traducción
- [Vitest](https://vitest.dev/) con jsdom para los tests
- ESLint

## Reimportar en el navegador

Chrome (y los navegadores basados en él) importan HTML de marcadores de forma **aditiva, no destructiva**. Cuando reimportas el `.html` filtrado que exporta la app:

- Chrome no borra tus marcadores actuales: **añade** los del archivo dentro de una subcarpeta nueva en *Otros marcadores*, con un nombre como `Imported YYYY-MM-DD`.
- Las carpetas raíz de Chrome (*Barra de marcadores*, *Otros marcadores*, *Marcadores del móvil*) son especiales y **no se eliminan** aunque el archivo importado no las incluya.
- Firefox y Safari se comportan de forma similar.

Es decir, el archivo filtrado es una **herramienta de decisión** («qué borrar»), no de aplicación automática («bórralo»). Para aplicar el triaje a tu perfil real tienes dos vías:

1. Borrar manualmente en el navegador los marcadores que descartaste, usando el archivo filtrado como referencia.
2. Esperar a la versión como extensión de Chrome, que usará `chrome.bookmarks.remove()` para aplicar los cambios directamente, sin pasar por HTML.

## Estado

La web app está completa: los 16 pasos del plan están hechos (ver [`CLAUDE.md`](./CLAUDE.md#orden-de-implementación)).

Pendiente: el build como extensión de Chrome con un `ChromeAdapter` que aplique el triaje directamente al perfil del navegador.

## Licencia

Proyecto privado — sin licencia otorgada.
