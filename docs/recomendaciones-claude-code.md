# Recomendaciones de Claude Code

Análisis del 27-10-2026 con la skill `claude-code-setup:claude-automation-recommender`, en la rama `refactor/remove-import` con el paso 18 terminado. Son recomendaciones: no se ha aplicado ninguna.

## Perfil del proyecto

- **Tipo:** extensión de Chrome con Manifest V3, en TypeScript. 47 archivos en `src/`, 12 de ellos de tests.
- **Stack:** React 19, Vite 8, Zustand 5, Tailwind 4, Motion 13, HeadlessUI 2, react-selecto e i18next 26. Tests con Vitest 4 y jsdom, y lint con ESLint 10. Sin Prettier ni CI.
- **Claude Code hoy:** los plugins Superpowers, frontend-design, claude-code-setup, commit-commands, context7 y typescript-lsp (con `typescript-language-server` 6.0.2 instalado en global), el MCP de Playwright (configurado fuera del proyecto) y el agente `i18n-translator`. El proyecto no tiene hooks ni `.claude/settings.json` compartido.

Tiempos medidos llamando a `node` directamente. Con `npx`, el mismo `tsc -b` tardó 7,6 s.

| Comprobación | Tiempo |
|---|---|
| `tsc -b` (incremental) | 1,7 s |
| ESLint de un archivo | 1,0 s |
| `eslint .` | 4,3 s |
| `vitest run` (171 tests) | 4,2 s |

## MCP

### Playwright con la extensión cargada

**Por qué:** Claude prueba la app con `npm run dev`, que usa el `chrome.bookmarks` falso. Lo que solo pasa en la extensión real (la CSP, el manifest, `chrome.bookmarks` de verdad) lo pruebas tú a mano. El paso 19 lo agrava: desde una página de `localhost`, CORS no deja leer el estado de una URL ajena, y desde la extensión depende de los permisos de host del manifest. Comprobar enlaces solo se puede probar en la extensión.

**Cómo:** un segundo servidor de Playwright MCP, para no tocar el que usas, con un archivo de configuración que abra el Chromium de Playwright con `dist/` cargada. Google Chrome y Edge retiraron los flags para cargar extensiones descomprimidas; el Chromium que trae Playwright los mantiene.

```json
{
  "browser": {
    "browserName": "chromium",
    "launchOptions": {
      "channel": "chromium",
      "args": [
        "--disable-extensions-except=C:/Users/angel/OneDrive/Documentos/React/Bookmarktify/dist",
        "--load-extension=C:/Users/angel/OneDrive/Documentos/React/Bookmarktify/dist"
      ]
    }
  }
}
```

```bash
claude mcp add playwright-ext -- npx @playwright/mcp@latest --config <ruta del json>
```

- Es un perfil propio, sin marcadores ni sincronización: «Aplicar» solo borra marcadores de prueba. Claude puede crearlos con `chrome.bookmarks.create()` desde la pestaña de la app (`browser_evaluate`).
- La página es `chrome-extension://<id>/index.html`. El id aparece en `chrome://extensions` y no cambia mientras no cambie la ruta de `dist/`.
- Sin `userDataDir`, el perfil se guarda fuera del repo. Mejor así: dentro de la carpeta de OneDrive se sincronizaría.
- Tras cada `npm run build`, hay que recargar la extensión.
- Sin probar: comprobarlo una vez antes de depender de él.

### context7

**Por qué:** el plugin está instalado, pero solo expone sus herramientas de autenticación (`authenticate` y `complete_authentication`). Parece que nunca se autenticó, y Claude no puede consultar documentación. El proyecto usa versiones mayores recientes (Vite 8, Vitest 4, ESLint 10, TypeScript 6, i18next 26, Motion 13), y en las APIs que cambian entre versiones es donde Claude más falla de memoria.

**Cómo:** `/mcp`, elegir context7 y autenticar.

## Hooks

Los dos van en el mismo script, como un hook `PreToolUse` de Bash y PowerShell en `.claude/settings.json`. Los hooks de proyecto necesitan que la carpeta sea de confianza.

### Puerta antes de `git commit`

**Por qué:** Vitest no comprueba tipos, así que los tests pasan con errores que luego rompen `npm run build`. Ya pasó con `erasableSyntaxOnly`. Hoy lo recuerda una nota de la memoria. Un hook lo comprueba siempre, también cuando commitea un subagente.

**Qué hace:** antes de cada `git commit`, ejecuta `tsc -b`, `eslint .` y `vitest run`, unos 10 s en total. Si algo falla, bloquea el commit y le pasa el error a Claude.

### Sin servidores

**Por qué:** tú arrancas `npm run dev` a mano y Claude nunca debe hacerlo. Hoy lo sostienen una memoria y las instrucciones de `i18n-translator`. El hook lo bloquea siempre, también en los subagentes, que no leen la memoria.

**Qué hace:** bloquea `npm run dev`, `npx vite` y `vite` al principio de un comando. Deja pasar `vite build` y `vitest`.

### Borrador (sin probar)

`.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|PowerShell",
        "hooks": [
          {
            "type": "command",
            "command": "node",
            "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/guard-shell.mjs"],
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

`.claude/hooks/guard-shell.mjs`:

```js
// PreToolUse de Bash y PowerShell: ni servidores ni commits con el build roto.
import { execFileSync } from 'node:child_process'

let input = ''
for await (const chunk of process.stdin) input += chunk
const command = JSON.parse(input).tool_input?.command ?? ''

if (/\bnpm\s+(?:run\s+)?dev\b|(?:^|[;&|]\s*|\bnpx\s+)vite\b(?!\s+build)/m.test(command)) {
  console.error('No arranques servidores: el usuario lanza `npm run dev` a mano.')
  process.exit(2)
}

// Vitest no comprueba tipos: sin tsc, un build roto pasa los tests.
if (/\bgit\s+commit\b/.test(command)) {
  const checks = [
    ['node_modules/typescript/bin/tsc', '-b'],
    ['node_modules/eslint/bin/eslint.js', '.'],
    ['node_modules/vitest/vitest.mjs', 'run'],
  ]
  for (const args of checks) {
    try {
      execFileSync(process.execPath, args, {
        cwd: process.env.CLAUDE_PROJECT_DIR,
        encoding: 'utf8',
        stdio: 'pipe',
      })
    } catch (error) {
      console.error(`No se commitea: falla ${args.join(' ')}\n${error.stdout ?? ''}${error.stderr ?? ''}`)
      process.exit(2)
    }
  }
}
```

Llama a `node` directamente: con `npx`, cada comprobación tardaría unos 6 s más.

## Skills

### `cerrar-parte`

**Por qué:** al cerrar cada parte se repiten los mismos pasos, repartidos hoy en cuatro memorias: comprobar con `npm run build` además de los tests, pasar `i18n-translator` si cambió la UI, actualizar las casillas y la fecha de `docs/roadmap.md`, y parar a esperar tu confirmación. En una skill se cumplen en orden, sin depender de que Claude recuerde cada memoria.

**Dónde:** `.claude/skills/cerrar-parte/SKILL.md`.
**Invocación:** los dos: Claude al terminar una parte y tú con `/cerrar-parte`.

```markdown
---
name: cerrar-parte
description: Usar al terminar una parte de un paso del roadmap. Comprueba tests, build y lint, pasa i18n-translator si cambió la UI, actualiza docs/roadmap.md y CLAUDE.md, e informa antes de seguir.
---

1. `npm run test`, `npm run build` y `npm run lint`. Los tests no comprueban tipos: el build es obligatorio.
2. Si el diff toca la UI (`src/components/`, `src/App.tsx`, `src/hooks/`, `src/locales/`), pasar `i18n-translator` sobre ese diff. Sus observaciones las decide el usuario.
3. En `docs/roadmap.md`, marcar las casillas de la parte y actualizar «Última actualización».
4. En `CLAUDE.md`, actualizar el paso en «Orden de implementación» y lo que haya cambiado: estructura, comandos o puerto.
5. Informar y esperar confirmación antes de commitear o de seguir con la siguiente parte. Formato del commit: `tipo: paso N (k/n) — descripción`.
```

## Subagentes

### `revisor-aplicar`

**Por qué:** «Aplicar» es lo único que borra de verdad, y Chrome no lo puede deshacer. Sus reglas están en `CLAUDE.md` («Aplicar en Chrome» y la regla de arquitectura), pero nada las comprueba en cada cambio. El paso 19 tocará el manifest, por los permisos de host, y seguramente el puerto. Un revisor centrado en esas reglas haría con el borrado lo que `i18n-translator` hace con los textos.

**Dónde:** `.claude/agents/revisor-aplicar.md`, con herramientas de solo lectura.

```markdown
---
name: revisor-aplicar
description: Revisa los cambios que tocan el borrado real de marcadores (src/core/, el commit del store, ApplyDialog y public/manifest.json) contra las reglas de «Aplicar en Chrome» y la regla de arquitectura de CLAUDE.md. Úsalo antes de cada PR que toque esas zonas. Solo informa; no edita.
tools: Read, Grep, Glob, Bash
model: inherit
---
```

Qué comprueba:

- Solo se borra `removed`, nunca «árbol actual − conservados».
- La copia de seguridad se descarga antes de borrar, con los datos actuales de Chrome.
- Lo que desapareció o cambió de URL desde la carga se salta y cuenta como `skipped`.
- Nunca se borran las carpetas del navegador, lo gestionado (`unmodifiable`), las carpetas que ya estaban vacías ni las que guardan algo que la app no muestra.
- `chrome.bookmarks` y el formato Netscape no salen de `src/core/adapters/`, como dice la regla de `CLAUDE.md`. Hoy solo los usan `ChromeAdapter.ts`, el falso y `serializer.ts`, que solo importa el adaptador.
- Los permisos nuevos de `public/manifest.json`: cuáles y por qué.
- Cada cambio en `commit` llega con tests sobre `fakeChromeBookmarks`.

## Plugins

Ninguno nuevo. El que más encaja, `typescript-lsp`, ya está activo en los ajustes de usuario, con `typescript-language-server` instalado. La primera versión de este informe lo recomendaba por error.

## Más

Para ver más opciones de una categoría, pídelas: por ejemplo, «más hooks» o «más servidores MCP».

## Fuentes

- [Chrome extensions — Playwright](https://playwright.dev/docs/chrome-extensions)
- [Playwright MCP — README](https://github.com/microsoft/playwright-mcp)
- [Hooks reference — Claude Code](https://code.claude.com/docs/en/hooks)
