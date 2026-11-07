# Saturivo — Estado de implementación

Actualizado: **2026-11-07**. Base: PR #4 fusionado. Evolución 0.2.0 (sin etiqueta Preview): [PR #5](https://github.com/Drako01/saturivo/pull/5), rama `feat/enterprise-aaaa-v0.1.1`. El repositorio GitHub **es público**; el campo `private: true` fue eliminado del manifest. La publicación de una extensión requiere tag protegido, aprobaciones de entornos y autorización separada del propietario.

## Estado ejecutivo

**Versionado del PR #5:** objetivo `0.2.0`, extensión instalada sin etiqueta Marketplace Preview. El nombre legado de rama `feat/enterprise-aaaa-v0.1.1` se conserva para mantener PR, enlaces y CI. Este cambio de presentación **no cierra** los gates Enterprise AAAA ni autoriza publicar.

El producto dispone de una base funcional con pruebas locales de carga k6, métricas P95/P99/RPS, objetivos P95 opcionales, historiado de ejecuciones, comparación heurística y comparación experimental 3-vs-3, además de comandos de Go race/bench, capturas locales pprof, diagnósticos de carreras y exportación Markdown/JSON/SARIF.

Se agregaron en PR #5 un Centro de Control en pestaña central con capturas, editor HTTP v2, selección de baseline, traza Go local, matriz k6 HTTP Go/Node/Python, inventario de licencias y un modelo de amenazas. **El nivel Enterprise AAAA no está alcanzado**: siguen pendientes capacidades y validaciones de las fases 1–5. [Checklist con evidencia](docs/ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md) y [plan maestro](docs/ENTERPRISE_AAAA_MASTER_PLAN.md).

El PR #5 incorpora además un rediseño UX orientado a la experiencia del desarrollador: flujo guiado, Scenario Studio con vista previa dinámica, presets personalizables sin carga automática, tabla accesible de mediciones y validación Chromium. Se suman retención de historial, cuota para perfiles Go y verificación DNS para endpoints remotos. Estos cambios requieren evidencia del SHA final y revisión visual/a11y manual; **el PR permanece Draft**.

## Evidencia observada

| Check | Resultado | Evidencia |
|---|---|---|
| TypeScript, tests, manifiesto | **PASS** Linux/Windows/macOS | [CI #42397266010](https://github.com/Drako01/saturivo/actions/runs/42397266010) |
| Smoke real k6 y arrival rate | **PASS** | [CI #42397266010](https://github.com/Drako01/saturivo/actions/runs/42397266010) |
| VSIX instalado en VS Code 1.99 (Linux) | **PASS** | [CI #42397266010](https://github.com/Drako01/saturivo/actions/runs/42397266010) |
| Go -race/pprof con fixture real | **PASS** | [CI #42397266010](https://github.com/Drako01/saturivo/actions/runs/42397266010) |
| SBOM CycloneDX | **PASS**, generado como artefacto | [CI #42397266010](https://github.com/Drako01/saturivo/actions/runs/42397266010) |
| Threat model, editor v2, trace Go y HTTP cross-language | **PARTIAL / CI SHA actual pendiente** | [Checklist](docs/ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md) y [amenazas](docs/THREAT_MODEL.md) |

La matriz anterior corresponde al commit histórico `a819a894`; además, [CI #42404881890](https://github.com/Drako01/saturivo/actions/runs/42404881890) pasó 7/7 sobre el SHA `cbd3724` del PR #5. Todo cambio posterior exige CI de su propio SHA; no se hereda un PASS.

## Avance en seguridad e integridad del candidato 0.2.0

El PR #5 incorporó verificaciones de integridad de evidencias v2, independencia de comparaciones y manejo de métricas incompletas; CI [#42412224059](https://github.com/Drako01/saturivo/actions/runs/42412224059) verificó 7/7 el commit `b54f902`. Se añadieron privacidad de exportaciones y cancelación defensiva durante correlación Go; **la versión completa aún no está aprobada** y cada bloque posterior requiere su propio SHA y CI.

## Bloqueantes principales

- Matriz avanzada de seguridad, DNS/SSRF, lifecycle, límites de recursos y tratamiento de secretos.
- Completar correlación de perfiles Go (trace/mutex/block/GC), warm-up, fixtures adversariales y fingerprints de entorno.
- Adaptadores runtime/protocolo y compatibilidad multi-root/remote donde corresponda.
- Auditoría UX de contraste, teclado, zoom, lectores, modo claro/oscuro y capturas finales; gate de upgrade VSIX sobre artefacto exacto.
- Auditoría de dependencias del paquete exacto, revisión de licencias, install/upgrade multiplataforma y aprobación del owner.

## Regla de ingeniería

No marcar funciones como completas por figurar en el plan. Evidencia medible, implementación sin regresión, higiene del repositorio, seguridad y validación por impacto. No repetir suites pesadas si los archivos no cambiaron, salvo gate final de release.

## Gobernanza del repositorio público

- [x] CODEOWNERS, CODE_OF_CONDUCT, CONTRIBUTING, SUPPORT, SECURITY y plantillas de Issues/PR preparados en PR #4 (comprobación CI del último SHA pendiente).
- [x] Definiciones de rulesets versionadas a partir de las políticas activas de Probato PR / Indizivo / Orquestivo.
- [x] Reglas activas en GitHub: **SÍ**, confirmadas por lectura de GitHub API el 2026-11-07: [Protect main](https://github.com/Drako01/saturivo/rules/26766004) y [Protect release tags](https://github.com/Drako01/saturivo/rules/26766025). Configuraciones comparadas con Orquestivo.
- [ ] `rulesets:status` autenticado después de aplicar las dos políticas.

Ver [docs/RULESETS.md](docs/RULESETS.md).

## Descubrimiento de capacidad local (piloto)

- [x] Motor de exploración creciente con SLO P95, límites de VUs/tiempo/solicitudes y corte ante fallo o datos inconclusos.
- [x] Acción manual ES/EN en Control Center, consentimiento y telemetría solo en output local.
- [ ] Fixture real específico de varios escalones con latencia inyectada y validación de límites/abortos.
- [ ] Descubrimiento estadísticamente defendible e instrumentos de profiling correlacionados.

La medición es local y específica del escenario; **no es capacidad certificada de producción**. Validación CI del último commit pendiente.
