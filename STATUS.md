# Saturivo — Estado de implementación

Actualizado: **2026-11-07**. Base: PR #4 fusionado, CI de main [#42401614937](https://github.com/Drako01/saturivo/actions/runs/42401614937) PASS. Evolución 0.1.1: rama `feat/enterprise-aaaa-v0.1.1`. El repositorio es público; el manifest 0.1.1 permanece con `private: true` hasta aprobación explícita de publicación. El registro público de la 0.1.0 debe confirmarse por marketplace, independientemente de GitHub Releases.

## Estado ejecutivo

El producto dispone de una base funcional con pruebas locales de carga k6, métricas P95/P99/RPS, objetivos P95 opcionales, historiado de ejecuciones, comparación heurística y comparación experimental 3-vs-3, además de comandos de Go race/bench, capturas locales pprof, diagnósticos de carreras y exportación Markdown/JSON/SARIF.

**El nivel Enterprise AAAA no está alcanzado**: siguen pendientes capacidades y validaciones de las fases 1–5. [Checklist con evidencia](docs/ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md) y [plan maestro](docs/ENTERPRISE_AAAA_MASTER_PLAN.md).

## Evidencia observada

| Check | Resultado | Evidencia |
|---|---|---|
| TypeScript, tests, manifiesto | **PASS** Linux/Windows/macOS | [CI #42397266010](https://github.com/Drako01/saturivo/actions/runs/42397266010) |
| Smoke real k6 y arrival rate | **PASS** | [CI #42397266010](https://github.com/Drako01/saturivo/actions/runs/42397266010) |
| VSIX instalado en VS Code 1.99 (Linux) | **PASS** | [CI #42397266010](https://github.com/Drako01/saturivo/actions/runs/42397266010) |
| Go -race/pprof con fixture real | **PASS** | [CI #42397266010](https://github.com/Drako01/saturivo/actions/runs/42397266010) |
| SBOM CycloneDX | **PASS**, generado como artefacto | [CI #42397266010](https://github.com/Drako01/saturivo/actions/runs/42397266010) |
| Threat model integral, UX y protocolos adicionales | **NOT RUN / pendiente** | [Checklist](docs/ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md) |

Las referencias anteriores corresponden al commit `a819a894`. Cambios posteriores requieren validación propia; no se hereda un PASS para código nuevo.

## Bloqueantes principales

- Matriz avanzada de seguridad, DNS/SSRF, lifecycle, límites de recursos y tratamiento de secretos.
- Captura y comparación temporal de profiles Go; escenarios versionados/ramp y ensayos 3-vs-3 reales.
- Adaptadores runtime/protocolo y compatibilidad multi-root/remote donde corresponda.
- Accesibilidad y UX final, capturas verificadas, pruebas VSIX de upgrade y release gate sobre artefacto exacto.
- Firma/provenance, inventario de licencias, auditoría del artefacto y aprobación explícita del owner.

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
