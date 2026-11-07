# Saturivo — Enterprise AAAA Upgrade Checklist

**Fecha:** 2026-11-07 · **PR activo:** [#5](https://github.com/Drako01/saturivo/pull/5) · **Rama:** feat/enterprise-aaaa-v0.1.1 · **Estado:** abierto, Draft.

Este es el **único checklist maestro de avance**. [Master Plan](ENTERPRISE_AAAA_MASTER_PLAN.md) define el alcance; [tracker de versión](RELEASE_0_1_1_CHECKLIST.md) registra los gates de release. PASS significa implementación, prueba y evidencia del **SHA indicado**. PARTIAL indica funciones implementadas sin todos los casos o plataformas. NOT RUN nunca equivale a aprobado.

## Evidencia consolidada

- **Baseline histórico:** PR #5 en SHA cbd3724, [CI #42404881890](https://github.com/Drako01/saturivo/actions/runs/42404881890) — 7/7 PASS: verificación en Linux/Windows/macOS, k6 real, Go, Extension Host Linux y capturas.
- **Cambios posteriores:** editor personalizado v2, selección de baseline, traza Go, matrix HTTP Go/Node/Python, licencias y gobernanza del release. **No reutilizar el PASS de cbd3724 para estos cambios.** Requieren CI final del SHA más reciente.
- **Repositorio:** público. Se eliminó el campo private del manifest. Publicar VSIX sigue separado de hacer público el código y requiere autorización del maintainer.

## Puertas del plan maestro

| Gate | Estado actual | Criterio que falta para cerrar |
|---|---|---|
| B01 lockfile/npm ci/SBOM | PASS en baseline | Verificar inventario de licencias nuevo y audit de release por SHA |
| B02 k6 constant-VUs y arrivals contra loopback | PASS en baseline | Mantener fixtures y confirmar nuevo SHA |
| B03 VSIX instalado en Extension Host | PARTIAL | Test completo en host real: abrir editor, ejecutar y cancelar |
| B04 historia y reportes | PARTIAL | Migración v1→v2, roundtrip, artefactos corruptos e integración UI |
| B05 rechazos, presupuesto y cleanup | PARTIAL | SSRF/DNS/proxies, cancelación con descendientes, cuotas y OS |
| B06 branding/capturas | PARTIAL | 4 capturas sintéticas reales en README; regenerar tras editor v2 y revisión visual final |
| B07 CI Linux/Windows/macOS + k6 + Go | PASS en baseline | CI final del SHA del PR y matriz no redundante |
| P1 escenario v2 editable | PARTIAL | Editor GET/HEAD para modelos closed/open; faltan edición avanzada de rampas, warm-up/cool-down explícitos y migraciones exhaustivas |
| P1 fingerprint y métricas comparables | PARTIAL | Scenario SHA y metadata CPU/Node/k6; faltan Git/entorno completo, target/achieved arrival y estado de carga |
| P1 3×3/regresión/capacidad | PARTIAL | Fixture real de repetición existente; faltan piloto UI E2E, límites por escenario y cuantificación robusta de variabilidad |
| P2 carreras Go y pprof | PARTIAL | Race/source links y CPU/heap/goroutine/mutex/block existentes; traza Go añadida, pendiente CI |
| P2 before/during/after | PARTIAL | 3 capturas goroutine y advertencia de overhead; faltan correlación mutex/block/GC/traces con evidencia de fixtures controladas |
| P3 HTTP multilenguaje | PARTIAL | Fixture real Go + Node + Python añadida al CI; sin PASS hasta corrida final |
| P3 gRPC/WebSocket y adapters | NOT RUN | Un protocolo adicional con fixture E2E y contrato de capacidades de Node/Java/Python |
| P3 WSL/SSH/devcontainer/multi-root | NOT RUN | Selección explícita de host/workspace y ejecución probada, sin descargas ocultas |
| P4 Control Center principal y UI ES/EN | PARTIAL | Editor central, 4 tabs, escenario form, baseline selector, métricas y capturas; falta revisión WCAG/teclado/E2E |
| P4 historial/exportación/retención | PARTIAL | JSON/MD/SARIF, importación y borrado; falta QA de reimport, reglas de retención y redacción |
| P4 IA externa opt-in | NOT RUN | BYO AI con consentimiento, redacción y clasificación de hipótesis; no prometer capacidad existente |
| P5 threat model | PARTIAL | [Modelo de amenazas](THREAT_MODEL.md) documentado; requiere casos adversariales y revisión final |
| P5 seguridad del runtime | PARTIAL | Límites de subproceso y perfiles; pendientes DNS remotos, proxies y cleanup multiplataforma |
| P5 SBOM/audit/licencias/provenance | PARTIAL | SBOM y hash ya incluidos; inventario lockfile incorporado; falta auditar binario exacto y firmar matriz |
| P5 publish OIDC protegido | PARTIAL | Pipeline con mismo VSIX y SHA para ambos registries; falta probar approvals/OIDC y entrega real autorizada |
| P5 install/upgrade/release exacto | NOT RUN | VSIX final, upgrade 0.1.0→0.1.1, Windows/macOS, aprobación expresa |

## Cambios realizados en PR #5 desde el último traspaso

- Centro de Control en pestaña del editor en lugar de panel lateral, preservando launcher en Activity Bar.
- Cuatro capturas README generadas desde el renderizador de producción con datos sintéticos identificados.
- Editor de escenarios v2 GET/HEAD con validación de tipos, límites, consentimiento y persistencia local de formulario; no se autoejecuta ninguna carga.
- Selección manual de ejecución base y comparaciones estadísticas solamente para grupos apropiados.
- Capturas Go de trace, además de goroutine/CPU/heap/mutex/block; perfiles locales con tamaño y timeout.
- Fixture real con mismo workload HTTP k6 en Go, Node y Python; validación integrada a CI.
- Inventario de licencias de dependencias de producción/desarrollo y evidencia de release.
- Manifest público sin private:true, preservando barreras de tag protegido/entornos/manual release.
- [Threat model](THREAT_MODEL.md) con riesgos residuales documentados.

## Reglas de aceptación y priorización

1. **P0 — Correctitud y seguridad:** no regressions, no carga implícita, trust obligatorio, límites y cancelación verificables.
2. **P1 — Fase 1 y 2:** cerrar fingerprints/metodología y fixtures de profiling Go de contention/growth/race.
3. **P2 — Fase 3:** completar un protocolo adicional y adapters solo con pruebas reales, nunca demos mock etiquetadas PASS.
4. **P3 — Fase 4:** pulir UX/a11y, historial, comparación visual, ES/EN y exportación segura.
5. **P4 — Fase 5:** pruebas adversariales, VSIX install/upgrade exacto, audit/notice/checksum/attestation y CI final.

**Regla de eficiencia:** pruebas focalizadas cuando cambia código; suite integral sin caché solamente para candidato de release. Vulnerabilidades dev/de terceros pueden documentarse WARN cuando no afectan el artefacto enviado; fallas de seguridad propias no se degradan a WARN.

**Bloqueo de release:** PR #5 permanece Draft y sin merge. No publicar a Marketplace/Open VSX ni crear release sin aprobación explícita del propietario. **Enterprise AAAA aún no cerrado.**
