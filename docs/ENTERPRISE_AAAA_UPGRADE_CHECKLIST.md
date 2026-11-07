# Saturivo — Enterprise AAAA Upgrade Checklist

**Última revisión:** 2026-11-07 · **Rama de trabajo:** `feat/enterprise-aaaa-runtime-evidence` · **PR:** [#4](https://github.com/Drako01/saturivo/pull/4)

> Estado verificable, no marketing. `PASS` implica evidencia concreta; `PARTIAL` indica implementación o pruebas incompletas. `NOT RUN` no se considera aprobado. El objetivo Enterprise AAAA continúa abierto.

## Evidencia confirmada en commit a819a894

**CI:** [GitHub Actions #42397266010](https://github.com/Drako01/saturivo/actions/runs/42397266010) — **6/6 jobs PASS**.

| Gate | Estado | Evidencia / condición |
|---|---|---|
| M0 — TypeScript, units, ES/EN, manifest | PASS | Verify jobs Linux, Windows y macOS |
| M0 — Paquete VSIX de preview | PASS | Artefacto del job Linux |
| B01 — Lockfile y `npm ci` | PASS | package-lock.json en repositorio; CI de tres OS |
| B01 — SBOM CycloneDX | PASS | Artefacto CI Linux; **inventario de licencias y auditoría de dependencias** todavía pendientes |
| B02 — k6 real de loopback | PASS | Job real k6, constant-VUs y arrival rate, endpoint descartable |
| B03 — Instalar VSIX y activar VS Code | PASS | Job Extension Host Linux 1.99; CLI instala y la extensión activa |
| B03 — Ejecutar/cancelar carga dentro del host | PARTIAL | El test comprueba comandos y ausencia de tráfico implícito; no cubre todo el flujo interactivo de stress/cancel |
| B04 — Historial, comparación y reportes | PARTIAL | Tests unitarios, retención y exportadores; reimport/migración y UI E2E pendientes |
| B05 — Presupuestos, cancelación y rechazos | PARTIAL | Tests de subprocess, URL y carga; falta matriz completa SSRF, DNS y proceso descendiente |
| B06 — Identidad gráfica | PARTIAL | PNG transparente, manifiesto y VSIX; falta inspección visual de README/Marketplace y capturas finales |
| B07 — CI multi-OS y fixtures | PASS | 6 jobs en el SHA indicado; solo host E2E Linux |
| P1 — SLO P95, fingerprint y comparación | PARTIAL | Implementado y testeado; faltan experimentos 3-vs-3 en condiciones controladas y escenario v2 |
| P2 — Go race y pprof reales | PARTIAL | Job Go real PASS; faltan mutex/block/traces temporales y correlación con ventanas de carga |
| P3 — Otros runtimes y protocolos | NOT RUN | gRPC, WebSockets, Node, Java, Python, WSL, SSH y devcontainers |
| P4 — Control Center y exportación | PARTIAL | UI ES/EN; Markdown/JSON/SARIF; faltan accesibilidad, charts, scenario editor y QA completa |
| P5 — Hardening y distribución | NOT RUN | Threat model, pin SHA Actions, provenance, auditoría, release gate exacto y revisión manual |

## Próximos gates en orden de prioridad

- [ ] **Seguridad P5.** Tests adversariales de redirects, DNS, SSRF, cancelación y árbol de procesos; revisión de trust, secretos y retención de pprof.
- [ ] **Fase 1.** Esquema de escenario v2 editable, calentamiento/enfriamiento, ramps y fingerprints completos (Git SHA/runtime/entorno).
- [ ] **Fase 1.** Experimentación repetida (mínimo 3+3) sobre servicio con latencia inyectada y variabilidad controlada; registrar intervalos y falsos positivos.
- [ ] **Fase 2.** Captura pprof antes/durante/después, perfiles mutex/block, trazas, versión Go y enlaces a evidencia verificable.
- [ ] **Fase 3.** Contrato modular y fixtures HTTP Go + Node + Java/Python; después protocolo gRPC/WebSocket.
- [ ] **Fase 4.** Editor de escenarios, métricas en vivo, UX de comparación, accesibilidad e i18n ES/EN.
- [ ] **Fase 5.** VSIX exacto, pruebas multiplataforma de instalación/upgrade, SBOM/licencias, hash SHA-256, firma/provenance y documentación de release.

## Criterio de cierre de fase

1. Código integrado sin regresiones, arquitectura sencilla y compatibilidad de resultados.
2. Casos positivos y negativos comprobados con fixture aislada, incluyendo aborto/cleanup.
3. CI y logs enlazados al **SHA exacto**; tests faltantes deben figurar como NOT RUN.
4. Riesgos de terceros documentados como WARN cuando no afecten directamente el artefacto distribuido; problemas propios críticos son bloqueantes.
5. README, roadmap, checklist, CHANGELOG, ES/EN y evidencia actualizados en el mismo PR.
6. Sin merge ni publicación automática: aprobación explícita del propietario.

**Última evidencia completa:** `a819a894`. Todo cambio posterior requiere un nuevo CI sobre su SHA exacto antes de declararse verificado.

## Gobernanza del repositorio público

| Control | Estado actual | Prueba requerida |
|---|---|---|
| CODEOWNERS y normas de comunidad | Implementado; último CI pendiente | Archivo propietario + contribution/conduct/support + plantillas válidas |
| Definiciones JSON Protect main + release tags | Versionadas, sin activar | `npm run rulesets:check` en CI |
| Protección real de `main` en GitHub | **NOT APPLIED** | Administrador aplica y valida `npm run rulesets:status` |
| Protección real de tags `v*` | **NOT APPLIED** | Administrador aplica y valida `npm run rulesets:status` |
| Gate de CI y revisión | PENDIENTE DE RULESET | 3 checks Verify + aprobación PR + owner/last push/threads |

No confundir presencia de JSON con políticas activas. [Manual de rulesets](RULESETS.md).
