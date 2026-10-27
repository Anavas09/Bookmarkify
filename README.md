# Bookmarkify

Extensión de Chrome para hacer triaje visual de tus marcadores: los revisas en un grid de tarjetas, seleccionas los que ya no te sirven, los eliminas y, al pulsar «Aplicar», se borran de Chrome.

Hasta ese momento, eliminar es **no destructivo**: los marcadores eliminados se ocultan, pero puedes restaurarlos o deshacer el borrado. Antes de borrar de Chrome, la extensión guarda una copia de seguridad con los que se van. Más detalles en [Aplicar en Chrome](#aplicar-en-chrome).

## Características

- **Tus marcadores de Chrome**, con sus carpetas, leídos directamente del navegador.
- **Grid de tarjetas** con favicon, dominio y fecha de cada marcador.
- **Selección estilo Explorador de Windows**: clic, `Ctrl`/`Cmd`+clic, `Shift`+clic para rangos y lazo arrastrando con el ratón.
- **Eliminar, restaurar y deshacer** desde una barra flotante. Los eliminados desaparecen del grid y se pueden recuperar en la vista «eliminados».
- **Filtros** por dominio, carpeta y URL duplicada (normalizada), y búsqueda por título, URL o carpeta.
- **Orden** original, por título, por fecha o por dominio.
- **Aplicar en Chrome**: borra los eliminados y las carpetas que se queden vacías, tras confirmar y con una copia de seguridad.
- **Progreso guardado**: si cierras la pestaña, los eliminados, el filtro y el orden siguen ahí al volver.
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

## Instalación

Requiere Node.js 20.19 o superior (o 22.12 o superior) y Google Chrome.

```bash
npm install
npm run build
```

1. Abre `chrome://extensions` y activa el **modo desarrollador**.
2. Pulsa **Cargar descomprimida** y elige la carpeta `dist/`.
3. Pulsa el icono de Bookmarkify (en el menú del puzle si no está fijado): la app se abre en su propia pestaña.

Tras cada `npm run build`, pulsa ↻ en la tarjeta de la extensión y recarga la pestaña.

> **Ojo:** «Aplicar» borra de verdad y, con la sincronización activada, el borrado llega a tus otros dispositivos. Para probar sin riesgo, usa un perfil de Chrome aparte, sin sincronización, e importa en él un HTML con tus marcadores (⋮ · Marcadores · Administrador de marcadores · ⋮ · Importar marcadores).

## Desarrollo

```bash
npm run dev
```

Abre la URL que imprima Vite (normalmente `http://localhost:5173`). Fuera de la extensión no existe `chrome.bookmarks`, así que la app usa uno falso en memoria con marcadores de ejemplo, que vuelven a estar completos al recargar.

## Scripts

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo de Vite con HMR y marcadores de ejemplo. |
| `npm run build` | Comprueba tipos y genera la extensión en `dist/`. |
| `npm run test` | Ejecuta la suite de Vitest una vez. |
| `npm run test:watch` | Ejecuta Vitest en modo watch. |
| `npm run lint` | Ejecuta ESLint sobre el proyecto. |

Para ejecutar un solo archivo de tests:

```bash
npx vitest run src/core/adapters/ChromeAdapter.test.ts
```

## Estructura del proyecto

```
public/
  manifest.json      # manifiesto de la extensión (Manifest V3)
  background.js      # abre la app en su pestaña al pulsar el icono
  theme-init.js      # aplica el tema antes de que monte React
src/
  core/
    ports/           # BookmarkSource — el único contrato que conoce la UI
    adapters/        # ChromeAdapter (chrome.bookmarks), su versión falsa para desarrollo y tests, y el serializer (HTML Netscape de la copia de seguridad)
    normalizeUrl.ts  # normalización de URLs para detectar duplicados
    types.ts         # Bookmark y tipos relacionados
  store/             # store de Zustand, selectores y acciones animadas
  components/        # solo UI — sin conocimiento de la fuente de los marcadores
  hooks/             # atajos de teclado y tema
  lib/               # utilidades (animación del grid, favicons, dominios…)
  i18n/, locales/    # configuración de i18next y textos en español e inglés
```

## Arquitectura

Toda lectura y escritura de marcadores pasa por el puerto `BookmarkSource`, definido en `src/core/ports/BookmarkSource.ts`. La UI nunca toca directamente la API `chrome.bookmarks` ni el formato HTML Netscape: ese conocimiento queda confinado en `src/core/adapters/`. Por eso la app pudo pasar de web app a extensión de Chrome cambiando el adaptador y el arranque, sin tocar el grid, los filtros ni la selección.

Consulta [`CLAUDE.md`](./CLAUDE.md) para el detalle completo del diseño, los invariantes y el modelo de estado.

## Stack técnico

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- Extensión de Chrome con Manifest V3 y la API [`chrome.bookmarks`](https://developer.chrome.com/docs/extensions/reference/api/bookmarks)
- [Zustand](https://zustand-demo.pmnd.rs/) para la gestión de estado, con persistencia en `localStorage`
- [Tailwind CSS v4](https://tailwindcss.com/) para los estilos
- [Headless UI](https://headlessui.com/) para el diálogo de «Aplicar» y los menús desplegables
- [react-selecto](https://github.com/daybrush/selecto) para la selección con lazo
- [Motion](https://motion.dev/) para las animaciones
- [i18next](https://www.i18next.com/) para la traducción
- [Vitest](https://vitest.dev/) con jsdom para los tests
- ESLint

## Aplicar en Chrome

Al pulsar **Aplicar** y confirmar, la extensión:

1. Guarda una copia de seguridad, `bookmarks-AAAA-MM-DD_deleted.html`, solo con los marcadores que va a borrar. Para ello Chrome te pide el permiso de descargas (opcional, puedes revocarlo); si lo rechazas, o la copia no se guarda, no se borra nada salvo que elijas borrar sin copia.
2. Borra de Chrome los marcadores que eliminaste, y solo esos: lo que añadas en Chrome mientras tienes la app abierta no se toca. Si alguno cambió de URL o ya no existe, lo salta.
3. Borra las carpetas que se hayan quedado vacías. Las del navegador (*Barra de marcadores*, *Otros marcadores*, *Marcadores del móvil*) nunca se borran.

Chrome no puede deshacerlo. Si te arrepientes, importa la copia en el Administrador de marcadores: Chrome importa de forma aditiva, así que los marcadores vuelven, pero dentro de una carpeta nueva y no en su sitio.

## Estado

Los 18 primeros pasos del plan están hechos: la app es solo una extensión de Chrome y ya no queda código de la importación por HTML. Lo siguiente es detectar los enlaces rotos (paso 19). El plan está en [`docs/roadmap.md`](./docs/roadmap.md) y el detalle de cada paso, en [`CLAUDE.md`](./CLAUDE.md#orden-de-implementación).

## Licencia

Proyecto privado — sin licencia otorgada.
