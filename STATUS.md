# Saturivo 0.2.0 — Estado verificable (2026-11-07)

**Repositorio:** [Drako01/saturivo](https://github.com/Drako01/saturivo) · **PR #5 Draft** · rama `feat/enterprise-aaaa-v0.1.1` · versión candidata **0.2.0 sin Preview**. El repositorio público no autoriza publicar la extensión.

## Evidencias por commit

| Gate | Resultado | Evidencia |
|---|---|---|
| TS estricto, tests/manifiesto Linux/Windows/macOS | PASS | [CI #42422983667](https://github.com/Drako01/saturivo/actions/runs/42422983667), SHA `0d73879` |
| Extension Host VS Code 1.99 Linux, ejecución/cancelación k6 real | PASS | Mismo CI `0d73879` |
| VSIX 0.1.0→0.2.0 instalado por CLI y migración/reload/borrado de historial v1/v2 a nivel almacenamiento, tres OS | PASS | Mismo CI `0d73879` |
| HTTP Go/Node/Python, WebSocket, Docker Compose, k6 3×3 y 64 controles de ruido sintético | PASS | Mismo CI `0d73879` |
| Go race/pprof/trace/GC, overhead real controlado, Windows kill-tree y proxy/redirect local adversarial | PASS para fixtures declarados | Mismo CI `0d73879` |
| Control Center central, ES/EN en host, teclado/foco, CSS forced-colors y Chromium | PASS para pruebas automatizadas | Mismo CI `0d73879` |
| SBOM/licencias/notices, inventario shipped, SHA-256/manifest | PASS automatizado | Mismo CI `0d73879` |
| Cuatro capturas del renderer real con datos sintéticos | Generadas | [Commit `6387739`](https://github.com/Drako01/saturivo/commit/638773987f894c178621a95e020874eef7dc454f), [run #42423371472](https://github.com/Drako01/saturivo/actions/runs/42423371472) |
| CI del SHA final posterior a capturas y documentación | PENDING | No reutilizar resultados anteriores |

## Bloqueantes de aceptación

- **BLOCKED:** E2E de import/export/delete/reload y navegación Go desde diálogos de VS Code instalado. Los tests Chromium y storage-level no sustituyen diálogos nativos.
- **BLOCKED:** pruebas reales WSL2, Remote-SSH y Dev Containers con host explícito, toolchains y limpieza de procesos. [Comandos y evidencias](docs/REMOTE_VALIDATION.md).
- **BLOCKED:** NVDA/VoiceOver, zoom 200% real, contraste light/dark y gestión del foco con lector de pantalla.
- **BLOCKED:** DNS/rebinding/proxy remoto, procesos adversariales WSL, attestation externa de provenance, revisión legal de licencias/vulnerabilidades y firma del threat model.
- **BLOCKED:** revisión visual humana de las cuatro capturas y aprobación independiente del responsable para merge, Git tag y publicación.

**Diferido por YAGNI (no incluido):** gRPC/ghz, profilers específicos de Node/Java/Python, Vegeta/Fortio e IA BYO. Las observaciones Go no demuestran causalidad, ausencia de races ni capacidad sostenible en producción.

**Estado de release: NO APROBADO.** PR #5 sigue Draft; sin merge, tag, GitHub Release, Marketplace ni Open VSX.

Fuente de verdad: [checklist de seis fases](docs/ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md), [release tracker](docs/RELEASE_0_2_0_CHECKLIST.md), [Master Plan](docs/ENTERPRISE_AAAA_MASTER_PLAN.md) y [threat model](docs/THREAT_MODEL.md).
