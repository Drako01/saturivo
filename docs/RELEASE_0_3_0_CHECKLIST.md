# Saturivo 0.3.0 — checklist vivo de aceptación

Base: `main@f7320fe1e76cbe012852fe40bc5b1f6d59dc3620` (0.2.2, auditoría 73/100). Upgrade: [PR #9](https://github.com/Drako01/saturivo/pull/9), rama `feat/saturivo-enterprise-aaaa-0.3.0`. Sin merge ni release.

> DONE = código/cambio entregado y evidencia indicada; PARTIAL = validación específica pendiente; BLOCKED = requiere acceso o pruebas ajenas al entorno. Los resultados de CI corresponden **solo al SHA indicado**.

| Fase | Estado | Archivos y evidencia |
|---|---|---|
| 0 · Ejecutables machine-scoped | DONE | `package.json`, `manifest-security.cjs`, `test/vscode-host.ts`; tests reales de Extension Host en [CI 42856082718](https://github.com/Drako01/saturivo/actions/runs/42856082718) |
| 0 · Gobernanza live de entornos | BLOCKED | `verify-release-environments.cjs` y `publish.yml` fallan cerrados; falta habilitar required reviewers y permitir únicamente rama `main` en `marketplace`, `open-vsx`, `github-release` |
| 1 · RunLifecycle y consentimiento | PARTIAL | `run-lifecycle.ts`, `consent-gate.ts`, `extension.ts`, tests; protección contra excepción inicial agregada tras CI 42856082718. Revalidación SHA nuevo pendiente |
| 1 · Límites/UI y evidencia | DONE | `core/limits.ts`, `validation.ts`, `history.ts`, `scenario-editor.ts`, `ui/html.ts`, `websocket.ts`, `version.ts`; CI 42856082718 |
| 2 · Pruebas/coverage | PARTIAL | CI 42856082718: **135 PASS / 0 FAIL / 1 SKIP**, core **91,05 %** (gate 90), lifecycle **100 %** (gate 80); nuevo test lifecycle posterior pendiente de ejecución |
| 2 · Consentimiento/destrucción en host nativo | PARTIAL | Contratos de consentimiento cancelado, borrado y doble ejecución con unit tests; E2E de diálogos nativos de VS Code NO EJECUTADO |
| 3 · Definición CI/rulesets | DONE (fuente), BLOCKED (live) | `protect-main.json` define 7 checks con `strict:true`; `rulesets.mjs` valida contra `REQUIRED_JOBS`. API de GitHub 2026-11-10 todavía muestra **3 checks y strict:false** en ruleset ID 26766004 |
| 3 · Seguridad repo | BLOCKED | Aplicación efectiva de secret scanning, push protection y Dependabot requiere configuración admin y lectura posterior |
| 3 · Screenshot job | DONE (hardening) | `ci.yml` retiró commits automáticos y permisos write del job de captura; la acción manual no genera commits |
| 4 · Documentación y metadatos | DONE (texto) | README, STATUS, CHANGELOG, lockfile, manifest 0.3.0 estable sin Preview, test documental |
| 4 · Capturas nuevas | BLOCKED | Las 4 PNG existentes corresponden al renderer real 0.2.x; para capturas verificables 0.3.0 ejecutar `npm run build && npm run screenshots:readme` con Chrome/Chromium real, revisar y agregar PNGs al PR |
| VSIX y smoke de actualización | PARTIAL | **7/7 checks obligatorios PASS en CI 42856082718**, incl. instalación/upgrade real sobre Windows, macOS y Linux y VSIX audit; último SHA posterior pendiente |

## Evidencia validada del SHA `28d4e9528bc79e50b774b264dd0259eafe83cd11`

- [GitHub Actions 42856082718](https://github.com/Drako01/saturivo/actions/runs/42856082718): 7 jobs obligatorios **success** (3 Verify, k6 real, Go race/pprof, Extension Host, browser). Screenshot manual skipped, **no cuenta como PASS**.
- Verify Ubuntu: unit tests **135 pass, 0 fail, 1 skip**; core **91,05 % / 28 archivos**, RunLifecycle **100 %**.
- Empaquetado VSIX: **57 entradas**, auditoría de contenido **PASS**, `runtimeNpmDependencies = 0`. SHA-256 del VSIX de ese run: `e6a570c604ca5cad1021cdef2452301c47745f38dd8dd9a8801ffecbaa2dc618`.
- Checks posteriores a `28d4e95` deberán ejecutarse sobre el SHA final. Un PASS anterior no se hereda automáticamente.

## Acciones administrativas concretas del owner

1. [Settings → Environments](https://github.com/Drako01/saturivo/settings/environments): configurar `marketplace`, `open-vsx` y `github-release` con al menos un required reviewer y deployment branch solo `main`. Comprobar política real, sin publicar.
2. [Settings → Rulesets](https://github.com/Drako01/saturivo/settings/rules): aplicar la definición versionada de `Protect main` (7 checks, strict true) sin crear un ruleset duplicado. `node scripts/rulesets.mjs --apply --confirm=Drako01/saturivo` necesita `GH_TOKEN` con Administration: write; verificar con `npm run rulesets:status`.
3. [Settings → Code security](https://github.com/Drako01/saturivo/settings/security_analysis): activar secret scanning, push protection y Dependabot; verificar el estado después.
4. Generar capturas nuevas **reales** con Chrome/Chromium y `npm run screenshots:readme` y agregarlas al mismo PR; no usar imágenes simuladas.
5. Completar pruebas manuales obligatorias según alcance (diálogos nativos, WSL/SSH/Containers, lectores de pantalla/zoom, pentest DNS remoto). Las evidencias históricas no certifican esos escenarios.

**Veredicto:** NOT READY hasta cerrar bloqueos y validar el SHA final. No merge, no Bypass, no publicación.
