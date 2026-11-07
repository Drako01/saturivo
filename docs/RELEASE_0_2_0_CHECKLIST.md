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
| R03 · Tráfico medido | k6/Go/Node/Python/WebSocket/Compose PASS en e8f8efa | Noise probe nuevo CI pendiente; host real y migración UI E2E abiertos |
| R04 · Go/IDE | Race/pprof/trace/GC/navegación PASS en e8f8efa; experimento overhead agregado | Medidas nuevas CI pendiente, fuente IDE E2E por comprobar |
| R05 · UX/accesibilidad | Centro de Control editor, formularios/inspector, ES/EN y Chromium keyboard smoke | NVDA/VoiceOver, contraste, zoom 200%, light/dark, flujos host y foco |
| R06 · Seguridad | DNS/SSRF IPv6, no-follow, kill-tree y trap k6 proxy/302 real PASS en e8f8efa | DNS/proxy remoto, procesos hostiles Windows/WSL y sign-off |
| R07 · Artifact | ZIP audit/SHA-256/HEAD/SBOM/licencias PASS en e8f8efa; notices obligatorios agregados | Audit shipped, attestation externa y firma del VSIX definitivo |
| R08 · Install/upgrade | VS Code 1.99 Extension Host Linux y VSIX 0.1.0→0.2.0 PASS en e8f8efa | Persistencia/roundtrip UI y plataformas remotas BLOCKED sin host |
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

- [CI #42420415145](https://github.com/Drako01/saturivo/actions/runs/42420415145), SHA `e8f8efa7fb255d125b05188f8aca26403c462f2b`: siete jobs PASS, screenshot job skipped. La instalación/upgrade del VSIX y el test proxy/redirect local estuvieron incluidos.
- Commits posteriores: overhead Go con JSON, statistical noise probe y `THIRD_PARTY_NOTICES.md` auditado. **No** heredar PASS hasta concluir CI del HEAD nuevo.
- **BLOCKED:** WSL/SSH/Dev Containers, NVDA/VoiceOver y 200% manual, procesos Windows/WSL hostiles, pruebas DNS/proxy remoto, attestation externa y aprobación del owner. [Instrucciones de prueba](REMOTE_VALIDATION.md).
- **NO MERGE, TAG, MARKETPLACE u OPEN VSX.** El PR permanece Draft.

