# Saturivo — Enterprise AAAA Upgrade Checklist

**Fecha:** 2026-11-07 · **PR activo:** [#5](https://github.com/Drako01/saturivo/pull/5) · **Rama:** `feat/enterprise-aaaa-v0.1.1` · **Estado observado:** Draft; no autorizado para merge o publicación.

Este es el **único checklist maestro de avance**. [Master Plan](ENTERPRISE_AAAA_MASTER_PLAN.md) define el alcance; [tracker de versión](RELEASE_0_1_1_CHECKLIST.md) registra los gates de release. PASS significa implementación, prueba y evidencia del **SHA indicado**. PARTIAL indica funciones implementadas sin todos los casos o plataformas. NOT RUN nunca equivale a aprobado.




## Engineering block — cancellation and hostile Go evidence (2026-11-07)

**Implemented; CI PENDING for the exact commit.**

- The POSIX process group now escalates to SIGKILL when an aborted/timed-out parent closes, preventing a SIGTERM-resistant descendant from escaping cleanup.
- A Go load/profile correlation owns its load AbortController; an in-flight snapshot failure explicitly aborts the load and awaits its termination instead of allowing work to continue silently.
- Goroutine snapshot reads reject symlinks and oversized files before allocating the content buffer; the Go correlation report also sanitizes untrusted scenario text.
- Focused regressions: stubborn descendant marker, profiling failure abort, malicious snapshots and Markdown injection.
- **Residual:** Windows process-tree cleanup still depends on `taskkill /T /F`; cross-OS hostile descendant and WSL/remote validation remain release blockers. A successful test must not be treated as proof of every process lifecycle behavior.
- **Next:** verify new SHA and CI; continue remaining load-phase measurement, external protocol/runtime and UX/accessibility gates, without declaring Enterprise AAAA complete.

## Engineering block — export privacy and faithful reporting (2026-11-07)

- Markdown reports now preserve ordinary letters and redact URL query values by default, with an explicit statement that the workload fingerprint refers to the original target.
- Lossless JSON export remains available only after a modal privacy disclosure/consent, because redacting the URL without schema/provenance migration would silently change experiment identity.
- JSON import additionally checks actual read size (not only pre-read stat). ES/EN strings cover disclosure and approval.
- Tests target report redaction/preserved characters and bilingual disclosure. **CI: PASS** on `b131d7c2564362e25d973b5f817b8c600e117f2f`: [CI #42412478761](https://github.com/Drako01/saturivo/actions/runs/42412478761), 7/7 successful. Subsequent blocks still require exact-SHA verification.
- Remaining risks: path-based tokens and intentionally exported raw JSON can still carry sensitive values; manual review and release adversarial QA remain mandatory.

## Engineering block — evidence integrity (2026-11-07)

**Verified on `b54f902e3418ef86a545d3aca2452254a486aa0d`: [CI #42412224059](https://github.com/Drako01/saturivo/actions/runs/42412224059) completed SUCCESS (7/7, Linux/Windows/macOS, k6, Go, VS Code Extension Host and screenshots).**

- `src/core/history.ts`: validates v2 scenario SHA, SLO conclusions against the stored metrics and effective request cap, nonzero requests/P95 and HTTP status counts; legacy v1 remains readable.
- `src/core/metrics.ts`: rejects incomplete k6 HTTP summaries rather than converting missing failure rates/P99 into fabricated zeroes.
- `src/core/statistics.ts`: rejects repeated run IDs across 3+3 cohorts and dissimilar or partially missing environment fingerprints; `src/core/comparison.ts` treats one-sided environment evidence as INCONCLUSIVE.
- Focused regression cases added in `test/history.test.ts`, `test/metrics.test.ts`, `test/statistics.test.ts`, `test/comparison.test.ts`.
- **Status:** PASS for the integrity block at `b54f902` with CI #42412224059; this is not release sign-off for subsequent modifications.
- **Next:** exact-SHA CI inspection; then further security/export/release gaps. No automatic load, publication, merge or tag.

## Handoff 2026-11-07 — auditoría de continuación

Este bloque prevalece sobre estados anteriores cuando los commits son más recientes. El checklist se actualiza durante el desarrollo, pero no sustituye una ejecución de pruebas en el SHA exacto.

- **SHA leído antes de esta actualización:** `be4154e4dd8d59ddb685656b23a93c7b9240cda6`. El commit propio de documentación y cualquier push posterior obligan a releer el HEAD.
- **CI al momento de la consulta:** [run #42411433024](https://github.com/Drako01/saturivo/actions/runs/42411433024) — in_progress, conclusión PENDIENTE.
- **Detalle de jobs:** Real Go race and pprof fixture (Linux): in_progress; Verify (macos-latest): success; Capture actual Control Center views for README: success; Verify (ubuntu-latest): success; Real VS Code Extension Host (Linux): success; Verify (windows-latest): success; Local k6 integration (Linux): in_progress.
- **Gobernanza:** repositorio GitHub público; `package.json` sin `private: true`. PR #5 abierto; **NO merge, NO tag, NO publicación Marketplace/Open VSX** sin autorización explícita.
- **Alcance:** Master Plan es contrato técnico, no certificado. `PASS` exige implementación + test + evidencia CI/artefacto para el SHA final; `PARCIAL`, `NOT RUN` y `BLOCKED` no son sinónimos de aprobado.

### Implementaciones adicionales observadas en la rama

1. **UX/UI:** editor central al abrir desde Activity Bar; onboarding guiado que cambia al existir historial, biblioteca de presets con gráficos, custom scenario studio, preview dinámico de etapas/presupuestos, métricas, comparador P95, estados vacíos e indeterminados, ES/EN, foco/keyboard y tablas de datos accesibles. **Pendiente:** auditoría manual visual de cuatro vistas, interacciones Webview E2E, responsive/tema claro/oscuro, contraste WCAG y capturas finales revisadas.
2. **P1:** escenarios `constant-vus`, `constant-arrival-rate` y `ramping-vus` con 2–8 etapas, límites y validación en Extension Host; SHA de escenario, Git SHA opcional, fingerprint host/entorno, tasas solicitada/observada, distribución HTTP, comparador de baseline explícito. **Pendiente:** warm-up/cool-down medidos separadamente, migración formal v1/v2 y regresión robusta con ruido/3+ trials.
3. **P2:** `go test -race`, pprof CPU/heap/goroutine/mutex/block, runtime trace, capturas before/during/after, fixtures de crecimiento/contención, cuota de perfiles (30 archivos/64 MiB). **Pendiente:** GC/allocations correlacionados con latencia, overhead medido, source navigation y pruebas de diagnósticos con fixtures controladas.
4. **P3:** mismos HTTP+k6 reales contra Go, Node y Python; WebSocket RFC6455 en loopback con autorización; adapter opt-in Node/Java/Python basado en procfs Linux, respuesta `NOT_SUPPORTED` cuando no aplica; selección multi-root. **Pendiente:** WSL/SSH/devcontainer/Docker Compose verificados, runtime profiler artifacts y contratos en SO adicionales; gRPC opcional únicamente si aporta valor real.
5. **P4:** JSON/MD/SARIF, historial local con retención configurable, validaciones anti-symlink/JSON malicioso, guardado/limpieza y métricas no causales. **Pendiente:** roundtrip import/export con v1/v2, redacción de secretos y experiencia integral de teclado/screen reader/ES+EN. BYO AI sigue opcional y no implementado.
6. **P5:** threat model, DNS remoto verificado y pinneado (bloquea metadata/private IP), límites de load/process, test de cierre de descendientes, licencias y SBOM, run/cancel en Extension Host, script de upgrade de VSIX 0.1.0→0.1.1. **Pendiente:** proxies/redirects/rebinding adversariales completos, auditar VSIX exacto y provenance, upgrade multi-OS, security sign-off y autorización release.

### Definition of Done verificable (todavía abierta)

- [ ] Cada requisito obligatorio del Master Plan tiene código, prueba, evidencia y documentación en SHA final; opcionales excluidos justificadamente.
- [ ] CI completo Linux/Windows/macOS, Go, k6 real, WebSocket, screenshots, Extension Host y upgrade VSIX en **mismo SHA** sin fallas.
- [ ] Abrir desde Activity Bar → editor central; configurar → previsualizar → ejecutar → cancelar → historial → baseline → exportar/borrar, validado en VS Code real.
- [ ] Escenarios protegidos: SSRF/DNS/proxy/redirect, cuotas VU/RPS/tiempo/archivos, trust, kill-tree y cero ejecución automática.
- [ ] Evidence roundtrip v1/v2, consistencia de estadísticas y SLO, warnings honestos, políticas de retención/redacción y no dependencia de datos sintéticos para PASS.
- [ ] Auditoría visual premium: claro/oscuro, responsive, a11y/teclado, ES/EN, README + 4 capturas de renderer actual sin información engañosa.
- [ ] VSIX exacto con SHA-256, lockfile/SBOM/avisos/licencias, análisis de dependencias shipped, install/upgrade real, provenance y release guardrails comprobados.
- [ ] Criterios de aceptación firmados por maintainer. **PR #5 sin merge ni publicación automática.**

### Premisas para la próxima sesión

Continuar exclusivamente en el PR #5; releer HEAD, CI, Master Plan y este checklist **antes de modificar**. Trabajar por bloques con commits pequeños, tests focalizados por impacto (KISS/DRY/YAGNI/SOLID, TypeScript estricto), actualizar este checklist tras cada bloque y `docs/RELEASE_0_1_1_CHECKLIST.md` en hitos de release. No repetir suites costosas ya verdes salvo nueva superficie afectada o gate final. No declarar `PASS` por simple existencia de código ni hacer publicaciones por cuenta propia.

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
| B04 historia y reportes | PARTIAL | Validación de importación v1/v2, anti-symlink y retención configurable; falta roundtrip integral dentro del host |
| B05 rechazos, presupuesto y cleanup | PARTIAL | DNS remoto pinneado y matriz de IP privada/metadata, cancelación descendientes y cuota de perfiles; faltan proxies/OS hostiles |
| B06 branding/capturas | PARTIAL | 4 capturas sintéticas reales en README; regenerar tras editor v2 y revisión visual final |
| B07 CI Linux/Windows/macOS + k6 + Go | PASS en baseline | CI final del SHA del PR y matriz no redundante |
| P1 escenario v2 editable | PARTIAL | Scenario Studio GET/HEAD closed/open y 2–8 ramp stages, vista previa y validación; faltan warm-up/cool-down excluidos y migraciones exhaustivas |
| P1 fingerprint y métricas comparables | PARTIAL | Git SHA opcional, hash pseudónimo host/entorno, CPU/Node/k6, llegada solicitada/real y distribución HTTP; faltan comparabilidad remota y warm-up |
| P1 3×3/regresión/capacidad | PARTIAL | Fixture real de repetición existente; faltan piloto UI E2E, límites por escenario y cuantificación robusta de variabilidad |
| P2 carreras Go y pprof | PARTIAL | Race/source links y perfiles CPU/heap/goroutine/mutex/block/trace; fixture nueva de contención y crecimiento, CI del SHA pendiente |
| P2 before/during/after | PARTIAL | 3 capturas goroutine y advertencia de overhead; faltan correlación mutex/block/GC/traces con evidencia de fixtures controladas |
| P3 HTTP multilenguaje | PARTIAL | Fixture real Go + Node + Python añadida al CI; sin PASS hasta corrida final |
| P3 WebSocket y adapters | PARTIAL | WebSocket loopback E2E y lectura RSS/hilos de Node/Java/Python en Linux con consentimiento; faltan profiling especializado, ghz/gRPC y remoto |
| P3 WSL/SSH/devcontainer/multi-root | NOT RUN | Selección explícita de host/workspace y ejecución probada, sin descargas ocultas |
| P4 Control Center principal y UI ES/EN | PARTIAL | Workflow guiado, Scenario Studio dinámico, presets personalizables, comparador, tabla accesible y Chromium smoke; falta revisión WCAG manual/zoom/lectores |
| P4 historial/exportación/retención | PARTIAL | JSON/MD/SARIF, validación hostil de importación, borrado y retención 1–1000; faltan roundtrip host y auditoría de redacción |
| P4 IA externa opt-in | NOT RUN | BYO AI con consentimiento, redacción y clasificación de hipótesis; no prometer capacidad existente |
| P5 threat model | PARTIAL | [Modelo de amenazas](THREAT_MODEL.md) documentado; requiere casos adversariales y revisión final |
| P5 seguridad del runtime | PARTIAL | Límites procesos, DNS público pinneado y cuota Go 30 archivos/64 MiB; faltan proxies y cleanup hostil multiplataforma |
| P5 SBOM/audit/licencias/provenance | PARTIAL | SBOM y hash ya incluidos; inventario lockfile incorporado; falta auditar binario exacto y firmar matriz |
| P5 publish OIDC protegido | PARTIAL | Pipeline con mismo VSIX y SHA para ambos registries; falta probar approvals/OIDC y entrega real autorizada |
| P5 install/upgrade/release exacto | PARTIAL / CI PENDING | Prueba real 0.1.0→0.1.1 agregada al CI Linux; falta validar SHA final, Windows/macOS y aprobación expresa |

## Cambios realizados en PR #5 desde el último traspaso

- Centro de Control en pestaña del editor en lugar de panel lateral, preservando launcher en Activity Bar.
- Cuatro capturas README generadas desde el renderizador de producción con datos sintéticos identificados.
- Editor de escenarios v2 GET/HEAD con validación de tipos, límites, consentimiento y persistencia local de formulario; no se autoejecuta ninguna carga.
- Selección manual de ejecución base y comparaciones estadísticas solamente para grupos apropiados.
- Capturas Go de trace, además de goroutine/CPU/heap/mutex/block; perfiles locales con tamaño y timeout.
- Fixture real con mismo workload HTTP k6 en Go, Node y Python; validación integrada a CI.
- Probe WebSocket solo loopback (1 VU/5s/100 sesiones), reporte de handshake y duración de sesión, con fixture RFC6455 real y ejecución manual desde Control Center.
- Fixture Go de contención de mutex y crecimiento acotado de goroutines para verificar señales observables sin afirmar causalidad.
- Inventario de licencias de dependencias de producción/desarrollo y evidencia de release.
- Manifest público sin private:true, preservando barreras de tag protegido/entornos/manual release.
- [Threat model](THREAT_MODEL.md) con riesgos residuales documentados.

## UX/UI profesional — Definition of Done

- [ ] El Control Center abre en una pestaña central y guía configurar → ejecutar → analizar.
- [ ] El usuario puede personalizar un preset sin generar tráfico y observar el perfil de carga y el límite de solicitudes.
- [ ] Los escenarios inválidos quedan bloqueados visualmente y vuelven a validarse en el Extension Host.
- [ ] Chromium comprueba interacciones de rampas válidas/inválidas; capturas README corresponden al renderizador real y muestran datos sintéticos declarados.
- [ ] Revisión manual de contraste, zoom 200%, teclado/lector de pantalla, tema claro/oscuro y movimiento reducido.
- [ ] Running/cancel/empty/error states no inventan porcentajes o causalidad; los cambios de navegación conservan el foco.

## Reglas de aceptación y priorización

1. **P0 — Correctitud y seguridad:** no regressions, no carga implícita, trust obligatorio, límites y cancelación verificables.
2. **P1 — Fase 1 y 2:** cerrar fingerprints/metodología y fixtures de profiling Go de contention/growth/race.
3. **P2 — Fase 3:** completar un protocolo adicional y adapters solo con pruebas reales, nunca demos mock etiquetadas PASS.
4. **P3 — Fase 4:** pulir UX/a11y, historial, comparación visual, ES/EN y exportación segura.
5. **P4 — Fase 5:** pruebas adversariales, VSIX install/upgrade exacto, audit/notice/checksum/attestation y CI final.

**Regla de eficiencia:** pruebas focalizadas cuando cambia código; suite integral sin caché solamente para candidato de release. Vulnerabilidades dev/de terceros pueden documentarse WARN cuando no afectan el artefacto enviado; fallas de seguridad propias no se degradan a WARN.

**Bloqueo de release:** PR #5 permanece Draft y sin merge. No publicar a Marketplace/Open VSX ni crear release sin aprobación explícita del propietario. **Enterprise AAAA aún no cerrado.**
