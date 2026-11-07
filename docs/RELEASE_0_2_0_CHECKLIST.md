# Saturivo 0.2.0 — Release Acceptance Tracker

**Estado:** BLOQUEADO. **Fuente:** [PR #5 (Draft)](https://github.com/Drako01/saturivo/pull/5) · rama `feat/enterprise-aaaa-v0.1.1` · versión candidata **0.2.0 sin Preview**. El repo público **no** autoriza publicar la extensión. No crear release, merge ni tag sin aprobación expresa.

**Checklist de implementación actualizado:** [ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md](ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md)  
**Especificación:** [ENTERPRISE_AAAA_MASTER_PLAN.md](ENTERPRISE_AAAA_MASTER_PLAN.md)  
**Criterios de aceptación:** [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md)

## Gates obligatorios de publicación

| Gate | Evidencia existente | Validación final pendiente |
|---|---|---|
| R01 · Versionado/branding | Manifest 0.2.0, sin `preview`, 23 keywords, íconos, README/ES | Revisar screenshots finales después de finalizar código/UX |
| R02 · Lockfile/CI | `npm ci` y TypeScript estricto Linux/Windows/macOS; [CI #42419518364](https://github.com/Drako01/saturivo/actions/runs/42419518364) PASS en SHA `18b5069` | Volver a ejecutar únicamente sobre el SHA final congelado |
| R03 · Tráfico medido | k6 closed/open/ramp, fases v2, Go/Node/Python, WebSocket, Docker Compose; [CI #42419034596](https://github.com/Drako01/saturivo/actions/runs/42419034596) PASS | Revisar regresiones estadísticas/noise y migración E2E |
| R04 · Go/IDE | Race/pprof/trace/GC/stack timeline y navegación de race a archivo-línea implementada | Validación CI exacta de source navigation, overhead inducido e IDE E2E |
| R05 · UX/accesibilidad | Centro de Control editor, formularios/inspector, ES/EN y Chromium keyboard smoke | NVDA/VoiceOver, contraste, zoom 200%, light/dark, flujos host y foco |
| R06 · Seguridad | Threat model, DNS pinning, SSRF IPv6, no-follow, quotas, kill-tree, audit VSIX; **nuevo: trap real k6 proxy/302 local, CI pendiente** | DNS/proxy/rebinding remoto y procesos hostiles multi-OS, revisión |
| R07 · Artifact | VSIX ZIP audit, hash SHA-256, manifest exact git HEAD, SBOM/licencias. [CI #42417954563](https://github.com/Drako01/saturivo/actions/runs/42417954563) PASS | Revisar el VSIX final exacto, notices/shipped audit y attestation |
| R08 · Install/upgrade | VS Code 1.99 Extension Host Linux, VSIX 0.1.0→0.2.0 en Linux CI | E2E de persistencia/roundtrip y plataformas remotas soportadas |
| R09 · Documentación visual | Render de producción y Chrome `--verify-only` sin crear imágenes | Generar y revisar **cuatro capturas únicamente al final** del PR |
| R10 · Release governance | CI con checkout SHA del PR, pipeline protegido y sin deploy en PR | Firma maintainer y autorización independiente de merge / tag / Marketplace / Open VSX |

## Procedimiento final (NO ejecutado)

1. Completar los requisitos obligatorios del [checklist maestro](ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md); para opciones no necesarias (gRPC, BYO AI o profilers externos), registrar decisión YAGNI explícita.
2. Congelar código y UX en un commit y ejecutar pruebas reales de integración y seguridad pendientes.
3. Regenerar las **cuatro capturas README** usando el workflow `workflow_dispatch` / `capture_screenshots=true` solo en la rama del PR #5, tras revisar visualmente las cuatro vistas (no datos reales ni secretos).
4. Obtener commit SHA definitivo **después** del commit de capturas y verificar CI sin fallas sobre ese mismo SHA (Windows/macOS/Linux, Go, k6, Compose, WebSocket, Chrome, Extension Host, VSIX upgrade).
5. Auditar el VSIX exacto y sus dependencias shipped, checksum SHA-256, provenance/manifest, SBOM, notices/licencias, README/ES y estado del Marketplace.
6. Registrar evidencia con URL de job, SHA, OS, versión de toolchain y responsable que aprueba. Solicitar **autorización expresa** para merge y posteriormente publicar. El estado Draft no cambia por código verde.

## Último estado verificable (2026-11-07)

- Último SHA de CI **verde conocido** antes del bloque de navegación Go: `18b50695f1e40b41b8b37d3db0bb9ac7f0c5b0e0`, [run #42419518364](https://github.com/Drako01/saturivo/actions/runs/42419518364), 7 jobs PASS y screenshots SKIPPED deliberadamente.
- Código nuevo de navegación Go: implementado en PR #5, **CI SHA exacto pendiente**, nunca asumir PASS hasta verificar el job.
- Publicación: **BLOCKED**. Ningún tag, release, merge o despliegue fue autorizado.

