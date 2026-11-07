# Saturivo 0.1.1 — Enterprise AAAA release tracker

**Public repo:** Drako01/saturivo · **Source PR:** [#5](https://github.com/Drako01/saturivo/pull/5), currently OPEN (not Draft) · **Base:** main a3eaa376 · **Target version:** 0.1.1 · **Publication:** BLOCKED until explicit owner approval.

This document is the **release subset** of [the single current AAAA checklist](ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md). [Master Plan](ENTERPRISE_AAAA_MASTER_PLAN.md) remains the specification, not a statement of completion. Implementation does not equal validation.

## Handoff de release — 2026-11-07

- El estado técnico consolidado y los gates medibles están en [ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md](ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md); este archivo se limita a las condiciones de publicación.
- Actualización técnica: escenario ramp v2 y preview UX, fingerprints y observabilidad de arribo/status, nuevos tests adversariales DNS/archivo/proceso, perfilar Go con cuota, probe WebSocket, métricas runtime Linux, experiencia ES/EN y script real de VSIX upgrade.
- [CI #42411433024](https://github.com/Drako01/saturivo/actions/runs/42411433024) se estaba ejecutando sobre un SHA anterior a este traspaso. **No marcarlo verde sin consultar su resultado y HEAD actual.**
- **Release gate aún abierto:** validar SHA exacto del candidato después de los últimos commits; seguridad adversarial y UX/lectores de pantalla, migración/roundtrip, artefacto VSIX, install/upgrade, audit shipped, SBOM/licencias/notices, checksum/provenance.
- Repositorio fuente público, pero **no hay autorización de publicación**. El cambio de estado Draft → Open no autoriza merge, tag ni deploy.
- El propietario debe revisar y aprobar merge/publicación en decisiones separadas. No ejecutar release workflows para simular pruebas de publicación.

## Historical green baseline

PR #5 commit cbd3724 passed [CI 42404881890](https://github.com/Drako01/saturivo/actions/runs/42404881890), 7/7 jobs. Later commits modify functionality, tests, documentation and CI; a final run on their exact SHA must pass before declaring v0.1.1 release-ready.

| Gate | Status | Acceptance still required |
|---|---|---|
| Compatibilidad v0.1.0, TypeScript estricto | PARTIAL | Tests de schema v1/2, historial y artefacto actualizado |
| P1 editor de escenarios HTTP v2 | PARTIAL / CI PENDING | Closed/open/ramp con estudio de escenarios e inspector visual; faltan warm-up/cool-down y migración total |
| P1 fingerprint y métricas de ambiente | PARTIAL | Git SHA y hash env/host, arrival deseada/observada y códigos HTTP; falta warm-up/cool-down |
| P1 repetición 3×3 y piloto local | PARTIAL | Fixtures previas verdes; falta UX del piloto y evidencia de comportamiento bajo degradación/ruido |
| P2 Go race/pprof/timeline/trace | IMPLEMENTED / CI PENDING | Trace/mutex/block y fixture controlada de crecimiento/contención; resta correlación avanzada, overhead/diagnóstico sustentado |
| P3 HTTP Go + Node + Python | IMPLEMENTED / CI PENDING | Matriz real de 3 runtimes con mismo workload k6, resultados y cancelación |
| P3 WebSocket/gRPC/runtime adapter | PARTIAL | WebSocket local y adaptación read-only Node/Java/Python Linux; faltan gRPC/ghz y profiling por lenguaje |
| P4 Control Center en editor, UI ES/EN | PARTIAL / CI PENDING | Workflow guiado, escenario visual, navegador de evidencia, prueba Chromium real y capturas sintéticas; falta WCAG/manual |
| P4 JSON/MD/SARIF, imports/retención | PARTIAL | Importación hostil, anti-symlink y retención configurable; faltan roundtrip host y revisión redacción |
| P5 threat model y SSRF | PARTIAL | [Threat model](THREAT_MODEL.md) creado, casos adversariales reales aún abiertos |
| P5 lockfile, SBOM y licencias | IMPLEMENTED / CI PENDING | Evidencia CI exacta y revisión de avisos/licencias |
| P5 VSIX/security/upgrade | PARTIAL / CI PENDING | Gate real de upgrade 0.1.0→0.1.1 Linux y cuotas/SSRF incorporados; faltan evidencia final y OS remotos |
| Publish OIDC manual y con tag protegido | IMPLEMENTED / NOT EXERCISED | Validar ambientes, Trusted Publisher, credenciales/OIDC y recuperación sin reconstruir VSIX |
| Publicación v0.1.1 | BLOCKED | Owner sign-off y aprobación expresa: no merge/release automático |

## Seguridad y alcance

- Código GitHub **público**; el manifest dejó de declarar private:true. Eso no significa que el VSIX haya sido autorizado para publicación.
- Sin carga automática al abrir Control Center; GET/HEAD, loopback predeterminado, autorización por sesión para remoto, límites finitos y AbortSignal.
- Un audit --omit=dev fue reportado sin vulnerabilidades por el maintainer en una revisión anterior. No se extrapola ese resultado al candidato actual; los advisories moderados de herramientas de desarrollo se gestionan como WARN cuando no afectan código distribuido.
- Los archivos Go trace/pprof son sensibles, locales y no constituyen prueba de causalidad.

## Release sign-off — requisitos pendientes

- [ ] Final CI verde de Linux/Windows/macOS, integración k6 real, HTTP Go/Node/Python, WebSocket RFC6455, Go profiles, VSIX Extension Host y capturas sobre **un mismo SHA**.
- [ ] Pruebas de seguridad adversariales con resultado y entorno documentados; cero fallas críticas propias.
- [ ] Reimportación JSON v1/v2, controles de borrado, navegación de resultados y cancelación real.
- [ ] VSIX exacto instalado y actualizado desde 0.1.0; sha256, SBOM, licencias y procedencia comprobados.
- [ ] Comprobación manual de imágenes README/Marketplace, ES/EN y accesibilidad.
- [ ] Aprobación explícita del propietario para merge y posteriormente publicación.

**Regla:** usar tests por impacto durante desarrollo. No volver a ejecutar suites ya verdes sin cambios salvo gate integral del artefacto final. PASSED solo si existen resultados verificables en el SHA exacto. **Nunca fusionar ni publicar el PR #5 automáticamente.**
