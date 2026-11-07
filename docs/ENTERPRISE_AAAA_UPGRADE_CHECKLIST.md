# Saturivo — Enterprise AAAA Implementation Checklist

**Actualizado:** 2026-11-07 · **Versión objetivo:** 0.2.0 (non-preview)
**Repositorio:** [Drako01/saturivo](https://github.com/Drako01/saturivo)
**PR en desarrollo:** [#5](https://github.com/Drako01/saturivo/pull/5) · Rama `feat/enterprise-aaaa-v0.1.1` · **Draft — no autorizado para merge, tags ni publicación**.
**Especificación contractual:** [ENTERPRISE_AAAA_MASTER_PLAN.md](ENTERPRISE_AAAA_MASTER_PLAN.md). **Release:** [RELEASE_0_2_0_CHECKLIST.md](RELEASE_0_2_0_CHECKLIST.md). **Criterios cuantificables:** [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md).

> **Regla de estado:** `[x]` = implementación comprobada por el CI citado o incorporada con prueba específica; `[ ]` = requisito abierto. Para un código recién incorporado sin CI del SHA exacto se indica **CI PENDING**. Una prueba anterior verde **no valida** cambios posteriores. Enterprise AAAA es objetivo interno de madurez, no certificación externa.

## Resumen de las seis fases

| Fase | Implementado | Pendientes de aceptación | Estado |
|---|---|---|---|
| **0 · Base de release** | Lockfile/CI 3 OS, k6 real, Extension Host/Linux, iconos y SBOM | QA de VSIX final instalado en todos los entornos y capturas | PARTIAL |
| **1 · Ingeniería de carga** | k6 closed/open/ramp, ventanas independientes, fingerprints, 3×3/SLO, migración JSON | E2E importación/variación y pruebas estadísticas de ruido | PARTIAL |
| **2 · Concurrencia Go** | Race, pprof/trace, GC, snapshots, navigation a fuentes (nuevo) | CI de navegación, ensayo controlado de overhead, evidencia causal prudente | PARTIAL |
| **3 · Adaptadores/protocolos** | HTTP Go/Node/Python, WebSocket, procfs, Docker Compose real | WSL/SSH/devcontainer, diagnósticos específicos por entorno | PARTIAL |
| **4 · UX/UI y evidencias** | Control Center central, estudio visual, inspector, historial, ES/EN, keyboard Chromium | Accesibilidad manual, flujos E2E, cuatro capturas definitivas | PARTIAL |
| **5 · Seguridad/release** | SSRF DNS/IPv6, kill-tree, cuotas, no-follow, auditor VSIX, SHA/SBOM | Matriz adversarial multiplataforma, notices, sign-off de artefacto y responsable | PARTIAL |

## Fase 0 · Base de calidad y release

- [x] **B01** Dependencias reproducibles: `package-lock.json`, `npm ci` Linux/Windows/macOS, TypeScript estricto, inventario de licencias y SBOM CycloneDX.
- [x] **B02** k6 real con HTTP loopback sintético: VUs constantes y tasa de arribo, 5–10 segundos, métricas reales y ninguna solicitud al exterior por omisión.
- [x] **B03 (Linux)** VSIX instalado en VS Code 1.99 Extension Host real, Control Center en pestaña central, cero tráfico implícito, ejecución y cancelación comprobadas.
- [x] **B04 (unit)** HistoryStore guarda y lee JSON v1/v2, controla cuotas, corrupción, enlaces simbólicos e importación hostile sin bloquear UI.
- [x] **B05 (base)** Limitaciones y abortos de requests/VUs/duración, rechazo de URL/métodos inseguros y árbol de procesos en unit tests.
- [x] **B06 (assets)** Ícono original PNG/transparencia, ícono monocromático Activity Bar y renderizador real para evidencias README.
- [x] **B07** Jobs Linux/Windows/macOS + Go + k6 + Chrome + Extension Host. Evidencia: [CI #42420415145](https://github.com/Drako01/saturivo/actions/runs/42420415145) 7/7 PASS en `e8f8efa` (capturas SKIPPED).
- [ ] **B03/B04 release** VSIX exacto y upgrade persistente en Windows/macOS; abrir-importar-exportar-borrar-reload usando UI real con datos v1/v2.
- [ ] **B06 final** Rehacer y revisar **solo al final** las cuatro capturas `overview/load/history/diagnostics`; después de eso ejecutar CI del nuevo commit.

## Fase 1 · Motor reproducible de carga

- [x] Escenarios tipados `constant-vus`, `constant-arrival-rate`, `ramping-vus`, límites VU/rate/tiempo/requests y previsualización.
- [x] Ventanas v2 warm-up / medición / cool-down: k6 etiqueta solicitudes y restringe estadísticas SLO/P50/P95/P99 a medición; `dropped_iterations` y presupuestos corresponden a la prueba total.
- [x] Fingerprint versionado `saturivo-scenario-v1..v4`, Git SHA, entorno/host pseudonimizado, Node, CPU y k6; historial legacy conserva sus identidades.
- [x] Reporta tasa solicitada y entregada, buckets HTTP, tasa de errores, throughput y presupuestos agotados.
- [x] Comparación 3×3 por bootstrap determinista, con `INCONCLUSIVE` ante fingerprints/hosts distintos, poca muestra, iteraciones descartadas, SLO inconcluso o presupuesto agotado.
- [x] Piloto local SLO bounded con interrupción temprana; **no** afirma capacidad sostenible de producción.
- [x] Migración **explícita** de evidencia JSON v1 → v2, idempotencia, hashes/SLO recalculados, rechazo de datos contradictorios y preservación de historial v1 existente.
- [ ] E2E real del diálogo de importación/exportación v1/v2 y preservación de datos tras actualización VSIX.
- [ ] **CI PENDING:** 64 comparaciones 3×3 con ruido sintético determinista ±25 ms y latencia inyectada +60 ms; umbrales explícitos de falsos hallazgos/sensibilidad. Variabilidad de host/red real sigue pendiente.

## Fase 2 · Go concurrency intelligence

- [x] `go test -race`: hallazgos observados, archivo/línea, diagnósticos VS Code, SARIF solo para hallazgos verificados.
- [x] Capturas opt-in pprof CPU, heap, goroutine, mutex, block y runtime trace; URL pprof loopback literal, 4 MB/captura, timeout, cuota 30 archivos/64 MiB y borrado explícito.
- [x] Goroutines before/during/after, estados observados, delta y coste de recolección monotónico; abort de load en falla de captura.
- [x] Contadores `expvar` Go GC/allocations/pausa en las tres fases con allowlist y `NOT_SUPPORTED` cuando no se exponen; correlación observacional, **nunca atribución causal**.
- [x] Fixtures Go de race real, goroutine-growth controlado y contención mutex; [CI #42419034596](https://github.com/Drako01/saturivo/actions/runs/42419034596).
- [x] **CI #42420415145 (`e8f8efa`):** comando `saturivo.navigateRace` desde Control Center → QuickPick de archivo y línea verificados → apertura nativa en editor; realpath y rechazo symlink fuera del workspace; test y manifest ES/EN.
- [ ] **CI PENDING:** experimento real `scripts/go-overhead.cjs` agregado: 3 controles + 3 ventanas perfiladas ABBAAB con P95/RPS y variabilidad; exporta JSON a CI. Requiere revisar sus mediciones, más plataformas y limitaciones de causalidad.
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
- [ ] Auditoría contrastes claros/oscuros, zoom 200%, teclado solo, NVDA/VoiceOver y foco tras render asíncrono; capturas de evidencia de errores/empty además de layouts.
- [ ] **Solo después de terminar implementación y UX:** regenerar 4 capturas reales desde renderer actual, revisar README ES/EN y estado de publicación, verificar CI después del commit de imágenes.
- [ ] BYO AI opt-in es **opcional** y no debe promocionarse ni introducirse sin justificación, redacción y consentimiento.

## Fase 5 · Seguridad y sign-off de 0.2.0

- [x] Trust requerido antes de ejecutar comandos Go o diagnosticar procesos; carga local sin auto-run; consentimiento para remoto, límite total de solicitudes.
- [x] Validación SSRF: redirecciones deshabilitadas, IPv4/IPv6 especiales (Teredo/6to4/documentación), DNS público pinneado, DNS mixto fail-closed, localhost literal.
- [x] Abort/timeout, output bounded, árbol procesos POSIX/Windows con pruebas dirigidas, cuotas temporales y goroutines/pprof, archivo por descriptor estable + no-follow y rechazo de hardlink.
- [x] Auditor estructural VSIX contra ZIP hostil, duplicados/case, symlink, encriptación y límites compresión; 5 tests.
- [x] Pipeline checkout SHA HEAD del PR (no merge sintético), checksum VSIX, manifest `saturivo.release.json`, licencia/lockfile/SBOM; evidencia [#42417954563](https://github.com/Drako01/saturivo/actions/runs/42417954563) y [#42419034596](https://github.com/Drako01/saturivo/actions/runs/42419034596).
- [x] Scripts de upgrade de VSIX 0.1.0 → 0.2.0 en VS Code real con CI Linux y política publicación protegida.
- [x] **CI #42420415145 (`e8f8efa`):** fixture k6 real con proxy HTTP(S) heredado malicioso y redirección 302 a un *trap* loopback descartable. Prueba que el proxy no se hereda y que no hay seguimiento de redirecciones; verifica distribución 3xx.
- [ ] Pruebas adversariales en proxy/redirect/rebinding **remoto**, IPv6 real, Windows/WSL procesos descendientes maliciosos, archivos/quotas con root hostil y resolución DNS según red. El trap loopback no demuestra seguridad frente a redes remotas.
- [ ] **CI PENDING:** `THIRD_PARTY_NOTICES.md` agregado como archivo obligatorio del VSIX; diferencia herramientas externas/dev de shipped. Falta audit de dependencias efectivamente distribuidas, licencias, vulnerabilidades y attestation de provenance; WARN tercero/dev separados de errores propios.
- [ ] VSIX final exacto instalado y actualizado sin pérdida en plataformas soportadas, SHA-256/SBOM/licencias/notices, CI final sin cancelaciones y evidencia manual/automática sobre **mismo SHA**.
- [ ] Firma de matriz de amenazas, revisión UX/screenshots y **aprobación expresa del propietario por separado** para merge, tag y publicar Marketplace/Open VSX.

## Evidencias y reglas de continuidad

- **Último verde observado al continuar:** [CI #42420415145](https://github.com/Drako01/saturivo/actions/runs/42420415145), SHA `e8f8efa7fb255d125b05188f8aca26403c462f2b`: 7 jobs PASS, screenshots SKIPPED intencionalmente.
- **Nuevo código posterior al verde:** Go overhead controlado con artifact JSON, 64 probes de ruido, notices obligatorios en VSIX. Estado CI del HEAD nuevo: **PENDING** hasta verificación exacta.
- **Gates BLOCKED/parciales:** E2E real de diálogos/importaciones, persistencia tras upgrade en varios host, accesibilidad NVDA/VoiceOver/200%, WSL/SSH/Dev Containers, matrix adversarial Windows/WSL/DNS remoto y provenance externo.
- **Capturas README:** no regeneradas; siguen reservadas para después de finalizar implementación y UX. Sin merge/tags/publicación.

