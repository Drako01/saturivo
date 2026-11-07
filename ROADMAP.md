# Saturivo — Product Roadmap

**0.2.0 non-preview, todavía no publicado:** [PR #5 Draft](https://github.com/Drako01/saturivo/pull/5). Los estados exactos por SHA se mantienen en el [checklist Enterprise AAAA](docs/ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md); este roadmap no implica certificación.

## Base 0.1.0

- [x] TypeScript estricto, extensión VS Code, Webview CSP, ES/EN, k6 acotado, Go race/bench e historial básico.

## 0.2.0 — Código implementado y verificado en CI #42422983667 (SHA 0d73879)

- [x] Control Center en editor principal, Scenario Studio GET/HEAD cerrado/abierto/ramp, modelos v2 con warm-up/medición/cool-down, presets y SLO.
- [x] Fingerprints, historial, baseline seleccionable, comparaciones 3×3 e incertidumbre; 64 controles de ruido sintético.
- [x] Migración explícita v1/v2, validación de integridad y persistencia de historial entre VSIX 0.1.0→0.2.0 por CLI en Linux/Windows/macOS.
- [x] Go race con hallazgos verificables archivo/línea, pprof CPU/heap/goroutine/mutex/block, trace, GC, snapshots y overhead controlado con JSON.
- [x] k6 real contra HTTP Go/Node/Python, WebSocket RFC6455, Docker Compose aislado y proceso runtime Linux read-only.
- [x] Controles SSRF/DNS, bloqueo de proxy/redirect local, kill-tree POSIX/Windows, cuotas, ZIP audit, SBOM, licencias, notices e inventario shipped.
- [x] ES/EN del host, teclado/foco y CSS forced-colors responsive probados en Chromium.
- [x] Cuatro capturas README nuevas del renderer real con datos sintéticos: commit `6387739`, [run #42423371472](https://github.com/Drako01/saturivo/actions/runs/42423371472).

## Pendientes de aceptación obligatoria

- [ ] CI del SHA definitivo **posterior** a imágenes y documentación y revisión visual humana de las cuatro capturas.
- [ ] E2E UI real en VS Code instalado de importar/exportar/borrar/reload/navegar Go y cambios de baseline.
- [ ] WSL, Remote-SSH y Dev Containers con selección de host y cleanup real; [runbook](docs/REMOTE_VALIDATION.md).
- [ ] NVDA/VoiceOver, zoom 200%, light/dark, alto contraste, teclado-only y estados de error.
- [ ] DNS/proxy/rebinding remoto, procesos WSL adversariales, attestation externa y revisión legal/manual de amenazas y artefacto.
- [ ] Firma del responsable y permisos independientes para merge, tag, Marketplace y Open VSX.

## Diferido por YAGNI

gRPC/ghz, Vegeta/Fortio, profilers especializados de Node/Java/Python e IA BYO. No anunciar capacidades no probadas ni atribuir causalidad a correlaciones de runtime.

[Master Plan](docs/ENTERPRISE_AAAA_MASTER_PLAN.md) · [Criterios medibles](docs/ACCEPTANCE_CRITERIA.md) · [Release tracker](docs/RELEASE_0_2_0_CHECKLIST.md).
