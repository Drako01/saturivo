# Saturivo — Estado de implementación

Actualizado: **2026-11-07**. PR de evolución: [#4](https://github.com/Drako01/saturivo/pull/4), rama `feat/enterprise-aaaa-runtime-evidence`. El repositorio continúa **privado**, la extensión **sin publicar** y el PR **Draft**.

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
