# Saturivo 0.3.0 — checklist vivo de aceptación

Base: `main@f7320fe1e76cbe012852fe40bc5b1f6d59dc3620` (0.2.2, auditoría 73/100). Upgrade: [PR #9](https://github.com/Drako01/saturivo/pull/9), rama `feat/saturivo-enterprise-aaaa-0.3.0`. Sin merge ni release.

> DONE = código/cambio entregado y evidencia indicada; PARTIAL = validación específica pendiente; BLOCKED = requiere acceso o pruebas ajenas al entorno. Los resultados de CI corresponden **solo al SHA indicado**.

| Fase | Estado | Archivos y evidencia |
|---|---|---|
| 0 · Ejecutables machine-scoped | DONE | `package.json`, `manifest-security.cjs`, `test/vscode-host.ts`; tests reales de Extension Host en [CI 42856082718](https://github.com/Drako01/saturivo/actions/runs/42856082718) |
| 0 · Gobernanza live de entornos | BLOCKED | `verify-release-environments.cjs` y `publish.yml` fallan cerrados; falta habilitar required reviewers y permitir únicamente rama `main` en `marketplace`, `open-vsx`, `github-release` |
| 1 · RunLifecycle y consentimiento | PARTIAL | `run-lifecycle.ts`, `consent-gate.ts`, `extension.ts`, tests; protección contra excepción inicial agregada tras CI 42856082718. Revalidación SHA nuevo pendiente |
| 1 · Límites/UI y evidencia | DONE | `core/limits.ts`, `validation.ts`, `history.ts`, `scenario-editor.ts`, `ui/html.ts`, `websocket.ts`, `version.ts`; CI 42856082718 |
| 2 · Pruebas/coverage | DONE para SHA `62cbbd6`; nuevo CI pendiente | [CI 42857123274](https://github.com/Drako01/saturivo/actions/runs/42857123274): **136 PASS / 0 FAIL / 1 SKIP**, core **91,05 %** (gate 90), lifecycle **100 %** (gate 80); posterior cambio de capturas/documentos requiere nuevo CI |
| 2 · Consentimiento/destrucción en host nativo | PARTIAL | Contratos de consentimiento cancelado, borrado y doble ejecución con unit tests; E2E de diálogos nativos de VS Code NO EJECUTADO |
| 3 · Definición CI/rulesets | DONE (fuente), PARTIAL (live) | `protect-main.json` define 7 checks con `strict:true` y `rulesets.mjs` valida nombres. API de GitHub del 10/11/2026 confirma `strict:true`, pero el ruleset activo ID 26766004 **solo exige 3/7 checks** |
| 3 · Seguridad repo | BLOCKED | Aplicación efectiva de secret scanning, push protection y Dependabot requiere configuración admin y lectura posterior |
| 3 · Screenshot job | DONE (hardening) | `ci.yml` retiró commits automáticos y permisos write del job de captura; la acción manual no genera commits |
| 4 · Documentación y metadatos | DONE (texto) | README, STATUS, CHANGELOG, lockfile, manifest 0.3.0 estable sin Preview, test documental |
| 4 · Capturas nuevas | DONE | [Chromium PASS #42865237314](https://github.com/Drako01/saturivo/actions/runs/42865237314): cuatro capturas **reales del renderer 0.3.0**, 1480 × 960, con fixture sintético. [Commit `184dcf1`](https://github.com/Drako01/saturivo/commit/184dcf14ea815d956c906ea7630930669545f745), incluidas en README bajo `control-center-0.3.0-{overview,load,history,diagnostics}.png`. Las cuatro históricas 0.2.x se preservaron |
| VSIX y smoke de actualización | DONE para `62cbbd6`, nuevo CI pendiente | **7/7 checks obligatorios PASS en [CI 42857123274](https://github.com/Drako01/saturivo/actions/runs/42857123274)**, incluida instalación/upgrade real sobre Windows, macOS y Linux y auditoría VSIX. Validar el SHA posterior a capturas/documentación antes del merge |

## Evidencia validada del SHA `28d4e9528bc79e50b774b264dd0259eafe83cd11`

- [GitHub Actions 42856082718](https://github.com/Drako01/saturivo/actions/runs/42856082718): 7 jobs obligatorios **success** (3 Verify, k6 real, Go race/pprof, Extension Host, browser). Screenshot manual skipped, **no cuenta como PASS**.
- Verify Ubuntu: unit tests **135 pass, 0 fail, 1 skip**; core **91,05 % / 28 archivos**, RunLifecycle **100 %**.
- Empaquetado VSIX: **57 entradas**, auditoría de contenido **PASS**, `runtimeNpmDependencies = 0`. SHA-256 del VSIX de ese run: `e6a570c604ca5cad1021cdef2452301c47745f38dd8dd9a8801ffecbaa2dc618`.
- Checks posteriores a `28d4e95` deberán ejecutarse sobre el SHA final. Un PASS anterior no se hereda automáticamente.

## Acciones administrativas concretas del owner

1. [Settings → Environments](https://github.com/Drako01/saturivo/settings/environments): configurar `marketplace`, `open-vsx` y `github-release` con al menos un required reviewer y deployment branch solo `main`. Comprobar política real, sin publicar.
2. [Settings → Rulesets](https://github.com/Drako01/saturivo/settings/rules): aplicar la definición versionada de `Protect main` (7 checks, strict true) sin crear un ruleset duplicado. `node scripts/rulesets.mjs --apply --confirm=Drako01/saturivo` necesita `GH_TOKEN` con Administration: write; verificar con `npm run rulesets:status`.
3. [Settings → Code security](https://github.com/Drako01/saturivo/settings/security_analysis): activar secret scanning, push protection y Dependabot; verificar el estado después.
4. Capturas 0.3.0 completadas en [Actions 42865237314](https://github.com/Drako01/saturivo/actions/runs/42865237314); revisar el render final del README como control de documentación.
5. Completar pruebas manuales obligatorias según alcance (diálogos nativos, WSL/SSH/Containers, lectores de pantalla/zoom, pentest DNS remoto). Las evidencias históricas no certifican esos escenarios.

**Veredicto:** NOT READY hasta cerrar bloqueos y validar el SHA final. No merge, no Bypass, no publicación.

## Capturas reales — cierre de la evidencia

El [job #42864931204](https://github.com/Drako01/saturivo/actions/runs/42864931204) generó cuatro PNG correctos, pero falló por intentar hacer `git rm` sobre archivos antiguos modificados localmente por Chromium. El [job corregido #42865237314](https://github.com/Drako01/saturivo/actions/runs/42865237314) **PASS**: restauró las imágenes históricas 0.2.x, agregó únicamente los cuatro PNG nuevos, los subió al PR y archivó el artefacto reproducible. El workflow temporal con permiso de escritura fue retirado en el commit documental posterior. La captura se efectuó en el renderer 0.3.0, no mediante una imagen reconstruida o inventada.
