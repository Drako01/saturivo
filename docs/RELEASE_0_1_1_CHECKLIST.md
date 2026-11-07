# Saturivo 0.1.1 — Enterprise AAAA release tracker

**Public repo:** Drako01/saturivo · **Source PR:** [#5](https://github.com/Drako01/saturivo/pull/5), Draft · **Base:** main a3eaa376 · **Target version:** 0.1.1 · **Publication:** BLOCKED until explicit owner approval.

This document is the **release subset** of [the single current AAAA checklist](ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md). [Master Plan](ENTERPRISE_AAAA_MASTER_PLAN.md) remains the specification, not a statement of completion. Implementation does not equal validation.

## Historical green baseline

PR #5 commit cbd3724 passed [CI 42404881890](https://github.com/Drako01/saturivo/actions/runs/42404881890), 7/7 jobs. Later commits modify functionality, tests, documentation and CI; a final run on their exact SHA must pass before declaring v0.1.1 release-ready.

| Gate | Status | Acceptance still required |
|---|---|---|
| Compatibilidad v0.1.0, TypeScript estricto | PARTIAL | Tests de schema v1/2, historial y artefacto actualizado |
| P1 editor de escenarios HTTP v2 | IMPLEMENTED / CI PENDING | Validator, target desde settings, form persistente, límites, consentimiento; falta ramp editor y prueba host completa |
| P1 fingerprint y métricas de ambiente | PARTIAL | Git SHA/env fingerprint, arrivals reales, stages y exclusión warm-up/cooldown |
| P1 repetición 3×3 y piloto local | PARTIAL | Fixtures previas verdes; falta UX del piloto y evidencia de comportamiento bajo degradación/ruido |
| P2 Go race/pprof/timeline/trace | IMPLEMENTED / CI PENDING | Captura real de trace/mutex/block; fixture de crecimiento goroutines y bloqueos, overhead/diagnóstico sustentado |
| P3 HTTP Go + Node + Python | IMPLEMENTED / CI PENDING | Matriz real de 3 runtimes con mismo workload k6, resultados y cancelación |
| P3 gRPC/WebSocket/runtime adapter | NOT RUN | Un protocolo no HTTP y plugins de runtime verificables; capacidad no soportada debe decir NOT SUPPORTED |
| P4 Control Center en editor, UI ES/EN | PARTIAL | Capturas en README, editor propio, comparador con baseline elegido; completar keyboard/WCAG, charts y E2E |
| P4 JSON/MD/SARIF, imports/retención | PARTIAL | Verificar roundtrip y manejo de datos maliciosos y borrado desde host real |
| P5 threat model y SSRF | PARTIAL | [Threat model](THREAT_MODEL.md) creado, casos adversariales reales aún abiertos |
| P5 lockfile, SBOM y licencias | IMPLEMENTED / CI PENDING | Evidencia CI exacta y revisión de avisos/licencias |
| P5 VSIX/security/upgrade | NOT RUN | Auditoría, revisión de dependencias incluidas, checksum, provenance e instalación/upgrade real en OS soportados |
| Publish OIDC manual y con tag protegido | IMPLEMENTED / NOT EXERCISED | Validar ambientes, Trusted Publisher, credenciales/OIDC y recuperación sin reconstruir VSIX |
| Publicación v0.1.1 | BLOCKED | Owner sign-off y aprobación expresa: no merge/release automático |

## Seguridad y alcance

- Código GitHub **público**; el manifest dejó de declarar private:true. Eso no significa que el VSIX haya sido autorizado para publicación.
- Sin carga automática al abrir Control Center; GET/HEAD, loopback predeterminado, autorización por sesión para remoto, límites finitos y AbortSignal.
- Un audit --omit=dev fue reportado sin vulnerabilidades por el maintainer en una revisión anterior. No se extrapola ese resultado al candidato actual; los advisories moderados de herramientas de desarrollo se gestionan como WARN cuando no afectan código distribuido.
- Los archivos Go trace/pprof son sensibles, locales y no constituyen prueba de causalidad.

## Release sign-off — requisitos pendientes

- [ ] Final CI verde de Linux/Windows/macOS, integración k6 real, HTTP Go/Node/Python, Go profiles, VSIX Extension Host y capturas sobre **un mismo SHA**.
- [ ] Pruebas de seguridad adversariales con resultado y entorno documentados; cero fallas críticas propias.
- [ ] Reimportación JSON v1/v2, controles de borrado, navegación de resultados y cancelación real.
- [ ] VSIX exacto instalado y actualizado desde 0.1.0; sha256, SBOM, licencias y procedencia comprobados.
- [ ] Comprobación manual de imágenes README/Marketplace, ES/EN y accesibilidad.
- [ ] Aprobación explícita del propietario para merge y posteriormente publicación.

**Regla:** usar tests por impacto durante desarrollo. No volver a ejecutar suites ya verdes sin cambios salvo gate integral del artefacto final. PASSED solo si existen resultados verificables en el SHA exacto. **Nunca fusionar ni publicar el PR #5 automáticamente.**
