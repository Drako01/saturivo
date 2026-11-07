# Saturivo — Enterprise AAAA Implementation Checklist

**Actualizado:** 2026-11-07 · **Versión objetivo:** 0.2.0 (non-preview)
**Repositorio:** [Drako01/saturivo](https://github.com/Drako01/saturivo)
**PR en desarrollo:** [#5](https://github.com/Drako01/saturivo/pull/5) · Rama `feat/enterprise-aaaa-v0.1.1` · **Ready for review — owner autorizó merge y publicar 0.2.0 tras CI final PASS, con QA manual posterior aún NOT RUN**.
**Especificación contractual:** [ENTERPRISE_AAAA_MASTER_PLAN.md](ENTERPRISE_AAAA_MASTER_PLAN.md). **Release:** [RELEASE_0_2_0_CHECKLIST.md](RELEASE_0_2_0_CHECKLIST.md). **Criterios cuantificables:** [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md).

> **Regla de estado:** `[x]` = implementación comprobada por el CI citado o incorporada con prueba específica; `[ ]` = requisito abierto. Para un código recién incorporado sin CI del SHA exacto se indica **CI PENDING**. Una prueba anterior verde **no valida** cambios posteriores. Enterprise AAAA es objetivo interno de madurez, no certificación externa.

## Resumen de las seis fases

| Fase | Implementado | Pendientes de aceptación | Estado |
|---|---|---|---|
| **0 · Base de release** | CI 7/7, upgrade CLI VSIX y persistencia v1/v2 en los tres OS, cuatro capturas | Diálogos E2E y revisión visual | PARTIAL |
| **1 · Ingeniería de carga** | k6 real, escenarios v2, fingerprint, 3×3 y 64 ensayos sintéticos de ruido | Variación de red real e importación UI E2E | PARTIAL |
| **2 · Concurrencia Go** | Race, pprof/trace, GC, muestras y overhead medido con JSON | Navegación real en IDE y más toolchains Go | PARTIAL |
| **3 · Adaptadores/protocolos** | HTTP Go/Node/Python, WS, Compose, host y multi-root explícitos | WSL/SSH/Dev Containers reales | BLOCKED |
| **4 · UX/UI y evidencias** | Control Center central, ES/EN, foco, Chromium y cuatro capturas nuevas | NVDA/VoiceOver, zoom 200%, contraste y diálogos E2E | PARTIAL |
| **5 · Seguridad/release** | SSRF/proxy/redirect local, tree-kill Windows, SBOM/notices, shipped audit | DNS remoto, WSL adversarial, attestation y firma | PARTIAL |

## Fase 0 · Base de calidad y release

- [x] **B01** Dependencias reproducibles: `package-lock.json`, `npm ci` Linux/Windows/macOS, TypeScript estricto, inventario de licencias y SBOM CycloneDX.
- [x] **B02** k6 real con HTTP loopback sintético: VUs constantes y tasa de arribo, 5–10 segundos, métricas reales y ninguna solicitud al exterior por omisión.
- [x] **B03 (Linux)** VSIX instalado en VS Code 1.99 Extension Host real, Control Center en pestaña central, cero tráfico implícito, ejecución y cancelación comprobadas.
- [x] **B04 (unit)** HistoryStore guarda y lee JSON v1/v2, controla cuotas, corrupción, enlaces simbólicos e importación hostile sin bloquear UI.
- [x] **B05 (base)** Limitaciones y abortos de requests/VUs/duración, rechazo de URL/métodos inseguros y árbol de procesos en unit tests.
- [x] **B06 (assets)** Ícono original PNG/transparencia, ícono monocromático Activity Bar y renderizador real para evidencias README.
- [x] **B07** Jobs Linux/Windows/macOS + Go + k6 + Chrome + Extension Host. Evidencia: [CI #42420415145](https://github.com/Drako01/saturivo/actions/runs/42420415145) 7/7 PASS en `e8f8efa` (capturas SKIPPED).
- [x] **B03/B04 CLI/storage:** VSIX 0.1.0→0.2.0 instalado y datos v1/v2 migrados/releídos/eliminados en Windows/macOS/Linux. [CI #42422983667](https://github.com/Drako01/saturivo/actions/runs/42422983667) PASS en SHA `0d73879`.
- [ ] **B03/B04 nativo:** falta usar diálogo real de abrir/importar/exportar/eliminar/reload en IDE instalado.
- [x] **B06 imágenes:** cuatro PNG del renderer real, con datos sintéticos, generadas al terminar código/UX; commit [`6387739`](https://github.com/Drako01/saturivo/commit/638773987f894c178621a95e020874eef7dc454f) y [captura #42423371472](https://github.com/Drako01/saturivo/actions/runs/42423371472) PASS.
- [x] **B06 CI post-imágenes:** [CI #42424211042](https://github.com/Drako01/saturivo/actions/runs/42424211042) **PASS 7/7** en `e777dda` (los cuatro PNG ya estaban incorporados).
- [ ] **B06 sign-off:** inspección visual humana y CI en el **nuevo SHA definitivo** después de esta actualización de documentos.

## Fase 1 · Motor reproducible de carga

- [x] Escenarios tipados `constant-vus`, `constant-arrival-rate`, `ramping-vus`, límites VU/rate/tiempo/requests y previsualización.
- [x] Ventanas v2 warm-up / medición / cool-down: k6 etiqueta solicitudes y restringe estadísticas SLO/P50/P95/P99 a medición; `dropped_iterations` y presupuestos corresponden a la prueba total.
- [x] Fingerprint versionado `saturivo-scenario-v1..v4`, Git SHA, entorno/host pseudonimizado, Node, CPU y k6; historial legacy conserva sus identidades.
- [x] Reporta tasa solicitada y entregada, buckets HTTP, tasa de errores, throughput y presupuestos agotados.
- [x] Comparación 3×3 por bootstrap determinista, con `INCONCLUSIVE` ante fingerprints/hosts distintos, poca muestra, iteraciones descartadas, SLO inconcluso o presupuesto agotado.
- [x] Piloto local SLO bounded con interrupción temprana; **no** afirma capacidad sostenible de producción.
- [x] Migración **explícita** de evidencia JSON v1 → v2, idempotencia, hashes/SLO recalculados, rechazo de datos contradictorios y preservación de historial v1 existente.
- [ ] E2E real del diálogo de importación/exportación v1/v2 y preservación de datos tras actualización VSIX.
- [x] **Ruido sintético:** 64 comparaciones 3×3 con ruido determinista ±25 ms e inyección de latencia +60 ms y límites de falsa regresión/sensibilidad; [CI #42422983667](https://github.com/Drako01/saturivo/actions/runs/42422983667) PASS.
- [ ] Repetibilidad/variabilidad en redes y hosts reales, con resultados INCONCLUSIVE cuando corresponda.

## Fase 2 · Go concurrency intelligence

- [x] `go test -race`: hallazgos observados, archivo/línea, diagnósticos VS Code, SARIF solo para hallazgos verificados.
- [x] Capturas opt-in pprof CPU, heap, goroutine, mutex, block y runtime trace; URL pprof loopback literal, 4 MB/captura, timeout, cuota 30 archivos/64 MiB y borrado explícito.
- [x] Goroutines before/during/after, estados observados, delta y coste de recolección monotónico; abort de load en falla de captura.
- [x] Contadores `expvar` Go GC/allocations/pausa en las tres fases con allowlist y `NOT_SUPPORTED` cuando no se exponen; correlación observacional, **nunca atribución causal**.
- [x] Fixtures Go de race real, goroutine-growth controlado y contención mutex; [CI #42419034596](https://github.com/Drako01/saturivo/actions/runs/42419034596).
- [x] **CI #42420415145 (`e8f8efa`):** comando `saturivo.navigateRace` desde Control Center → QuickPick de archivo y línea verificados → apertura nativa en editor; realpath y rechazo symlink fuera del workspace; test y manifest ES/EN.
- [x] **Overhead Go controlado:** 3 ventanas control + 3 perfiladas ABBAAB (360 requests y 12 capturas); artefacto JSON P95/RPS/MAD en [CI #42421573031](https://github.com/Drako01/saturivo/actions/runs/42421573031), también [CI #42422983667](https://github.com/Drako01/saturivo/actions/runs/42422983667) PASS. Es observacional, no causal.
- [ ] Más toolchains Go/OS y navegación real a archivos desde Extension Host.
- [ ] Correlación reproducible de bloqueos/GC/mutex/throughput-latencia y navegación de evidencia pprof/trace al origen cuando sea técnicamente sustentable.
- [ ] Matriz de toolchains Go/OS y verificación de hallazgos en IDE con archivo real, no solo parsing.

## Fase 3 · Protocolos y runtimes

- [x] HTTP neutral con mismo perfil contra servicios reales sintéticos Go, Node.js y Python.
- [x] WebSocket RFC6455 local con autorización, presupuesto y fixture real k6; reporta `NOT_SUPPORTED` fuera de los alcances implementados.
- [x] Runtime Node/Java/Python read-only para RSS/hilos bajo `/proc` Linux, sin código ni secretos de procesos.
- [x] Multi-root con selección explícita de workspace; aviso ES/EN del host de ejecución (incluye `vscode.env.remoteName`) y significado de loopback remoto.
- [x] Docker Compose real: Go estático en `FROM scratch`, usuario no-root, puerto loopback aleatorio, k6 real y cleanup. **PASS**: [CI #42419034596](https://github.com/Drako01/saturivo/actions/runs/42419034596).
- [ ] **BLOCKED:** WSL, SSH Remote y Dev Containers requieren host real, instalación, ejecución/cancelación, toolchains y selección de workspace. Comandos exactos y evidencias en [REMOTE_VALIDATION.md](REMOTE_VALIDATION.md).
- [ ] Profilers específicos de Node/Java/Python y gRPC/ghz **solo si se decide incluirlos** después de evidenciar necesidad, compatibilidad y fixture real (YAGNI).

## Fase 4 · UX profesional y evidencia

- [x] Activación desde Activity Bar → **Control Center en área principal del editor**, sin encerrar dashboard en sidebar.
- [x] Scenario Studio personalizado con presets, validación visual y backend de datos, progreso sin porcentajes inventados, cancelación y estados empty/error.
- [x] Historial con inspector individual, P50/P95/P99, distribución HTTP, selección de baseline, visualizaciones y advertencias epistemológicas.
- [x] Exportación JSON validada con consentimiento explícito si contiene query/huellas de host; Markdown con query oculta, caracteres hostiles escapados, SARIF 2.1 solo race findings.
- [x] UI y comandos bilingües ES/EN, CSP por nonce, HTML escapado, `aria-live`, tabs con Arrow/Home/End, skip navigation y Escape para volver al inspector. Chromium verificado sin crear capturas.
- [x] Configuración de retención 1–1000 e historial/capturas Go con eliminación explícita.
- [ ] E2E VS Code instalado para navegación de origen, selección de baseline, importar/exportar/borrar y autorizar múltiples acciones.
- [x] **UX automatizada:** foco preservado entre renders, ES/EN host, CSS forced-colors/responsive, teclado/acciones de historial en Chromium; [CI #42422983667](https://github.com/Drako01/saturivo/actions/runs/42422983667) PASS.
- [ ] **UX manual BLOCKED:** zoom 200%, temas, contraste, NVDA/VoiceOver, foco en diálogos reales y estados error/empty.
- [x] **Cuatro capturas README generadas** al cerrar código/UX: [`6387739`](https://github.com/Drako01/saturivo/commit/638773987f894c178621a95e020874eef7dc454f); [captura #42423371472](https://github.com/Drako01/saturivo/actions/runs/42423371472) PASS. Workflow temporal eliminado.
- [x] CI post-capturas [CI #42424211042](https://github.com/Drako01/saturivo/actions/runs/42424211042) **PASS 7/7** en `e777dda`.
- [ ] Revisión visual humana y CI final después del último commit de documentación.
- [ ] BYO AI opt-in es **opcional** y no debe promocionarse ni introducirse sin justificación, redacción y consentimiento.

## Fase 5 · Seguridad y sign-off de 0.2.0

- [x] Trust requerido antes de ejecutar comandos Go o diagnosticar procesos; carga local sin auto-run; consentimiento para remoto, límite total de solicitudes.
- [x] Validación SSRF: redirecciones deshabilitadas, IPv4/IPv6 especiales (Teredo/6to4/documentación), DNS público pinneado, DNS mixto fail-closed, localhost literal.
- [x] Abort/timeout, output bounded, árbol procesos POSIX/Windows con pruebas dirigidas, cuotas temporales y goroutines/pprof, archivo por descriptor estable + no-follow y rechazo de hardlink.
- [x] Auditor estructural VSIX contra ZIP hostil, duplicados/case, symlink, encriptación y límites compresión; 5 tests.
- [x] Pipeline checkout SHA HEAD del PR (no merge sintético), checksum VSIX, manifest `saturivo.release.json`, licencia/lockfile/SBOM; evidencia [#42417954563](https://github.com/Drako01/saturivo/actions/runs/42417954563) y [#42419034596](https://github.com/Drako01/saturivo/actions/runs/42419034596).
- [x] Upgrade real CLI 0.1.0→0.2.0 y migración/lectura de historial v1/v2 en Windows/macOS/Linux; [CI #42422983667](https://github.com/Drako01/saturivo/actions/runs/42422983667) PASS. No implica prueba de diálogos del IDE.
- [x] **CI #42420415145 (`e8f8efa`):** fixture k6 real con proxy HTTP(S) heredado malicioso y redirección 302 a un *trap* loopback descartable. Prueba que el proxy no se hereda y que no hay seguimiento de redirecciones; verifica distribución 3xx.
- [ ] Pruebas adversariales en proxy/redirect/rebinding **remoto**, IPv6 real, Windows/WSL procesos descendientes maliciosos, archivos/quotas con root hostil y resolución DNS según red. El trap loopback no demuestra seguridad frente a redes remotas.
- [x] `THIRD_PARTY_NOTICES.md` exigido en VSIX e inventario shipped de rutas y `require()` estáticos, licencias/SBOM/SHA/manifest; [CI #42422983667](https://github.com/Drako01/saturivo/actions/runs/42422983667) PASS.
- [ ] Revisión manual legal/vulnerabilidades, attestation externa y firma del artefacto final.
- [ ] VSIX final exacto instalado y actualizado sin pérdida en plataformas soportadas, SHA-256/SBOM/licencias/notices, CI final sin cancelaciones y evidencia manual/automática sobre **mismo SHA**.
- [ ] Firma de matriz de amenazas, revisión UX/screenshots y **aprobación expresa del propietario por separado** para merge, tag y publicar Marketplace/Open VSX.

## Evidencias y reglas de continuidad

- **CI pre-capturas:** [CI #42422983667](https://github.com/Drako01/saturivo/actions/runs/42422983667), SHA `0d73879b63204010f4cccaef329cd611c0e9b48f`: **7/7 PASS** (Linux/Windows/macOS, upgrade, k6/Go/Compose/WebSocket, Chrome, seguridad y shipped inventory). Screenshot job normal omitido por diseño.
- **Capturas:** cuatro PNG únicamente en commit [`6387739`](https://github.com/Drako01/saturivo/commit/638773987f894c178621a95e020874eef7dc454f) y [captura #42423371472](https://github.com/Drako01/saturivo/actions/runs/42423371472) SUCCESS. El workflow one-shot fue retirado en commit `b8deb87`.
- **CI post-imágenes verificado:** [CI #42424211042](https://github.com/Drako01/saturivo/actions/runs/42424211042), SHA `e777ddae314f831c650529c24282c35de43090e0`, 7/7 PASS. **Este cambio documental crea un SHA posterior**, por lo que se exige un nuevo PASS sobre la HEAD definitiva antes del merge.
- **BLOCKED:** diálogos/import-export/delete E2E en VS Code instalado, WSL/SSH/devcontainer, NVDA/VoiceOver/zoom 200%, DNS/proxy/rebinding remoto, WSL procesos, attestation y sign-off de seguridad/owner.
- **YAGNI:** gRPC/ghz, profilers externos Node/Java/Python e IA BYO fuera de 0.2.0, no anunciados como funcionalidad.
- **Gobernanza:** owner autorizó merge y publicación de 0.2.0 con CI final y controles protegidos; QA manual instalado se realizará después. Ninguna prueba manual se contabiliza como PASS. [Plan post-release](POST_RELEASE_QA_0_2_0.md).
