# Saturivo 0.2.0 — Release Acceptance Tracker

**Estado:** BLOQUEADO. **Fuente:** [PR #5 (Draft)](https://github.com/Drako01/saturivo/pull/5) · rama `feat/enterprise-aaaa-v0.1.1` · versión candidata **0.2.0 sin Preview**. El repo público **no** autoriza publicar la extensión. No crear release, merge ni tag sin aprobación expresa.

**Checklist de implementación actualizado:** [ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md](ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md)  
**Especificación:** [ENTERPRISE_AAAA_MASTER_PLAN.md](ENTERPRISE_AAAA_MASTER_PLAN.md)  
**Criterios de aceptación:** [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md)

## Gates obligatorios de publicación

| Gate | Evidencia existente | Validación final pendiente |
|---|---|---|
| R01 · Versionado/branding | 0.2.0 sin Preview, 23 keywords, cuatro capturas generadas en 6387739 | Revisión visual humana y CI final del SHA poscapturas |
| R02 · Lockfile/CI | npm ci + TypeScript/tests Windows/macOS/Linux, 7/7 PASS #42422983667 en 0d73879 | CI del SHA definitivo PENDING |
| R03 · Tráfico medido | k6 3×3, 64 pruebas ruido sintético, Go/Node/Python/WebSocket/Compose PASS #42422983667 | Variación real multi-host y migración mediante UI |
| R04 · Go/IDE | Go race/pprof/trace/GC y experimento overhead controlado con JSON PASS #42422983667 | Navegación a fuente Go en IDE real, más toolchains |
| R05 · UX/accesibilidad | Centro central ES/EN, foco restaurado, forced colors y Chromium keyboard/acciones PASS | NVDA/VoiceOver, contraste, 200% y diálogos nativos |
| R06 · Seguridad | DNS/SSRF y proxy/redirect local, kill-tree Windows y ZIP hostil PASS #42422983667 | DNS/proxy remoto, WSL procesos y aprobación amenazas |
| R07 · Artifact | VSIX SHA-256/manifest HEAD, SBOM/licencias, notices y shipped inventory PASS | Artifact final, revisión legal y attestation externa |
| R08 · Install/upgrade | Upgrade VSIX 0.1.0→0.2.0 CLI y storage v1/v2 en Windows/macOS/Linux PASS | UI real import/export/reload y remotos BLOCKED |
| R09 · Documentación visual | Cuatro capturas renderer con datos sintéticos commit 6387739, run #42423371472 PASS | Revisión humana y CI poscapturas |
| R10 · Release governance | Política de release protegida sin despliegue PR | Aprobación owner independiente merge, tag y publicadores |

## Procedimiento final (NO ejecutado)

1. Completar los requisitos obligatorios del [checklist maestro](ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md); para opciones no necesarias (gRPC, BYO AI o profilers externos), registrar decisión YAGNI explícita.
2. Congelar código y UX en un commit y ejecutar pruebas reales de integración y seguridad pendientes.
3. **Hecho:** cuatro capturas desde renderer real con datos sintéticos generadas en el commit `6387739` (run `42423371472`). El workflow temporal de captura fue retirado en `b8deb87`; `ci.yml` mantiene gate manual para futuras capturas.
4. Obtener commit SHA definitivo **después** del commit de capturas y verificar CI sin fallas sobre ese mismo SHA (Windows/macOS/Linux, Go, k6, Compose, WebSocket, Chrome, Extension Host, VSIX upgrade).
5. Auditar el VSIX exacto y sus dependencias shipped, checksum SHA-256, provenance/manifest, SBOM, notices/licencias, README/ES y estado del Marketplace.
6. Registrar evidencia con URL de job, SHA, OS, versión de toolchain y responsable que aprueba. Solicitar **autorización expresa** para merge y posteriormente publicar. El estado Draft no cambia por código verde.

## Último estado verificable (2026-11-07)

- [CI #42422983667](https://github.com/Drako01/saturivo/actions/runs/42422983667), SHA `0d73879b63204010f4cccaef329cd611c0e9b48f`: **7/7 PASS**, incluyendo upgrades CLI/almacenamiento Windows/macOS/Linux, Go/k6/Compose/WebSocket, Chromium y VSIX/SBOM/notices.
- Cuatro capturas finales realizadas en [`6387739`](https://github.com/Drako01/saturivo/commit/638773987f894c178621a95e020874eef7dc454f), [workflow #42423371472](https://github.com/Drako01/saturivo/actions/runs/42423371472) PASS. Workflow temporal borrado.
- **CI del nuevo SHA post-imágenes/documentación: PENDING.** No reutilizar PASS de un SHA anterior.
- **BLOCKED:** diálogos E2E VS Code instalados, hosts WSL/SSH/Dev Containers, NVDA/VoiceOver/zoom 200% manual, DNS/proxy remoto, attestation externa, revisión legal de licencias/seguridad y firma del propietario. Ver [REMOTE_VALIDATION.md](REMOTE_VALIDATION.md).
- **No merge, tag, release, Marketplace ni Open VSX sin autorización expresa.**
