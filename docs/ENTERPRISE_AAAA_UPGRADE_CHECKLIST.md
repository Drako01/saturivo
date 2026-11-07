# Saturivo — Enterprise AAAA Upgrade Checklist

**Fecha:** 2026-11-07 · **PR activo:** [#5](https://github.com/Drako01/saturivo/pull/5) · **Rama:** `feat/enterprise-aaaa-v0.1.1` · **Estado observado:** Draft; no autorizado para merge o publicación.

Este es el **único checklist maestro de avance**. [Master Plan](ENTERPRISE_AAAA_MASTER_PLAN.md) define el alcance; [tracker de versión](RELEASE_0_2_0_CHECKLIST.md) registra los gates de release. PASS significa implementación, prueba y evidencia del **SHA indicado**. PARTIAL indica funciones implementadas sin todos los casos o plataformas. NOT RUN nunca equivale a aprobado.






## Migración de evidencias JSON v1 → v2 (Fases 1 y 4, 2026-11-07)

- [x] `migrateImportedRun` valida y convierte únicamente durante importación explícita; añade huella de workload verificable, recalcula SLO cuando existe y conserva métricas, identidad, fecha, entorno y advertencias originales.
- [x] Se rechaza evidencia legacy con fingerprint contradictorio o distribución de estados inconsistente. Importación idempotente y roundtrip disk → reimport; historial v1 existente no se reescribe automáticamente.
- [ ] Verificación en VS Code instalado con diálogo de importación/exportación real v1/v2 y CI del commit exacto. No asumir que todas las variantes históricas de terceros son compatibles.

## Accesibilidad de navegación y foco — P4 (2026-11-07)

- [x] `Skip navigation` ES/EN disponible al enfocar con teclado. Paneles ARIA de pestañas reciben foco (`tabindex=0`); Escape devuelve foco al botón que abrió el inspector.
- [x] Pruebas estructurales ES/EN y Chromium sobre ArrowRight/Home/End, `aria-selected`, visibilidad de paneles y foco. `--verify-only` no genera capturas.
- [ ] Auditoría manual con NVDA/VoiceOver, zoom 200%, modo oscuro/claro, contraste 4.5:1 y estados asíncronos. No declararlo WCAG PASS sin comprobar.
- [ ] CI de commit exacto antes de aprobar esta subfase.

## Bloque verificable — Provenance del VSIX y resumen k6 (2026-11-07)

- [x] Los jobs `verify`, `k6`, `extension-host`, `Go` y `ui-browser` hacen checkout del **commit HEAD real del PR**, evitando etiquetar un VSIX compilado desde el merge sintético como si fuese el SHA fuente.
- [x] El job de empaquetado genera y valida `saturivo.release.json` (version, SHA-256 del VSIX, commit git comprobado, identidad de extensión), lo archiva junto al VSIX y su checksum.
- [x] Lectura de resumen k6 por descriptor con rechazo de symlink/hardlink, identidad comprobada y límite en bytes durante la lectura.
- [ ] Validar CI del SHA nuevo y revisar artefactos archivados. **No es attestation criptográfica externa**; falta release sign-off y matriz de instalación/upgrade en plataformas remotas.

## Clasificación conservadora de regresiones — fase 1 (2026-11-07)

- [x] Comparación individual y bootstrap 3×3 comparten validación de calidad de evidencias: `INCONCLUSIVE` cuando el presupuesto global de solicitudes se agotó, hubo iteraciones descartadas o el SLO de la ejecución no es concluyente.
- [x] Incluye solicitudes totales de fases auxiliares (`totalRequests`) para detectar cap aunque el tramo medido tenga menos requests; tests unitarios de regresión específicos.
- [ ] Confirmar TypeScript/CI exacto y validación con muestras repetidas de carga real, ruido y saturación.

## Auditoría de la estructura VSIX (fase 5, 2026-11-07)

- [x] Auditor del paquete endurecido: detecta ZIP con entradas duplicadas o colisiones case-insensitive, rutas inseguras, enlaces simbólicos, ZIP cifrado, ZIP64/multipart, inconsistencias entre cabeceras, compresión anómala y descompresión excesiva.
- [x] Pruebas adversariales ZIP sintéticas ejecutadas localmente: **5/5 PASS**; integradas en `npm run verify` para los tres sistemas operativos del CI.
- [ ] Validar auditor sobre VSIX real del SHA exacto en CI; verificar bytes y contenido firmado con checksum/provenance. El auditor de metadatos no reemplaza la validación criptográfica ni la instalación en VS Code.
- [ ] Los gates de seguridad hostil/WSL/proxy y la publicación siguen pendientes; PR #5 continúa Draft.

## Estado de aceptación — fase 0 a 5 (PR #5, versión 0.2.0)

**Semántica:** `[x]` = código, pruebas o documento implementado; `[ ]` = falta el gate íntegro. `PASS` sólo con CI/evidencia de su SHA. El PR sigue **Draft**. Capturas README se regeneran **exclusivamente al final**.

| Fase | Entregado en PR #5 | Gate obligatorio abierto |
|---|---|---|
| 0 — Foundation | [x] lockfile, CI multi-OS, k6 real, Extension Host, SBOM/licencias | [ ] roundtrip instalado del VSIX exacto, revisión visual final |
| 1 — Load Engineering | [x] v2 closed/open/ramp, fases warm-up/medición/cool-down aisladas, presupuesto, fingerprints, 3×3 y SLO | [ ] migración v1/v2 exhaustiva, ruido/variabilidad, piloto UI E2E |
| 2 — Go Concurrency | [x] race con ubicaciones, pprof/trace, tres snapshots, coste de recolección, GC/allocations expvar opt-in y NO SOPORTADO | [ ] ensayo con/sin profiling para impacto inducido, GC/locks/latencia y diagnóstico sustentado |
| 3 — Protocol & Runtime | [x] HTTP Go/Node/Python, WebSocket, procfs y multi-root | [ ] WSL, SSH, devcontainer y Compose E2E, matrices multi-OS; gRPC sólo si justificado |
| 4 — UX & Evidence | [x] Control Center central, escenario visual, inspector, baseline, informes JSON/MD/SARIF, ES/EN y Chromium sin PNG | [ ] teclado/lector/contraste/zoom/temas, roundtrip UI host y cuatro screenshots finales |
| 5 — Security & Release | [x] SSRF DNS/IPv6, file descriptor/hardlinks, límites/abort, OIDC guardado, SBOM, script upgrade | [ ] proxy/rebinding adversarial y procesos Windows, artefacto VSIX exacto, audit/provenance y sign-off |

**Evidencia verificable:** [CI #42415007006](https://github.com/Drako01/saturivo/actions/runs/42415007006) y [CI #42415333285](https://github.com/Drako01/saturivo/actions/runs/42415333285), ambos PASS de sus SHA anteriores. El nuevo SHA conserva su propio gate CI pendiente; no extrapolar resultados históricos.


## Go GC/allocations opcional (Fase 2, 2026-11-07)

- [x] Lectura local **opt-in**, acotada y sin proxy/redirect de `/debug/vars`, únicamente origen pprof con IP loopback literal y Workspace Trust. `memstats.NumGC`, `TotalAlloc`, `HeapAlloc`, `PauseTotalNs` son los únicos valores aceptados; nunca exportar todas las variables expvar.
- [x] Capturas GC before/during/after integradas al flujo de correlación Go del Control Center con consentimiento actualizado ES/EN; reporte exporta contadores observados y deltas monotónicos, marca `NOT_SUPPORTED` si no existe endpoint y no afirma causalidad.
- [x] Tests parser, rechazo de URL no autorizada/redirect, GC funcional con servidor local, timeline con fixture sintética y fixture **Go real** (`expvar`).
- [ ] Validación CI exacta de este commit, medición del **overhead inducido** con ensayo controlado, correlación estadística de GC/locks/latencia y source navigation en IDE. Los cambios acumulados pueden incluir tráfico ajeno al workload; no representan root cause.

## Medición del tiempo de recolección Go — fase 2 (2026-11-07)

- [x] Tiempo monotónico por snapshot before/during/after, latencia de recolección durante la carga e inclusión en el reporte con evidencia cuantitativa. Tests para muestra lenta y preservación de advertencias no causales.
- [ ] **No confundir con overhead inducido:** falta ensayo control separado con y sin profiling, correlación GC/allocations y navegación de fuente para cierre completo de fase 2.
- [ ] CI exacto del nuevo SHA.

## Lecturas seguras por descriptor — historial y Go (2026-11-07)

- [x] Apertura con descriptor estable, identidad y enlace único; límite de bytes durante lectura y rechazo de hardlinks/symlinks.
- [ ] Evidencia CI SHA exacto y validación hostil Windows/WSL antes de completar fase 5.

## Seguridad IPv6 — prefijos de transición y normalización (2026-11-07)

- [x] Código y pruebas focalizadas para IPv6 canónico/no canónico, IPv4-mapped, 6to4, Teredo, documentación y 6bone; DNS mixto falla cerrado.
- [ ] Validación CI del SHA y pruebas adversariales en red/proxy/redirect/WSL para cierre de fase 5.

## Privacidad visual del destino y evidencia P1 (2026-11-07)

- [CI #42415007006](https://github.com/Drako01/saturivo/actions/runs/42415007006): **PASS**, commit `fa0bebc00879593274c3eea12373afbe07cf45d3`, siete jobs satisfactorios (Ubuntu/Windows/macOS, k6 real con ventanas medidas, Go, VS Code Extension Host y navegador Chromium). Job de capturas intencionalmente SKIPPED, no considerado falla.
- Nuevo hardening de privacidad **implementado, CI pendiente del SHA nuevo**: la UI oculta query y fragmentos del target en textos visibles; el endpoint ejecutado mantiene su valor original para no cambiar el escenario ni su fingerprint. Test de no filtración agregado.
- Capturas README siguen RESERVADAS PARA EL FINAL del PR #5.

## P1 — medición de carga con fases aisladas (2026-11-07)

**Verificado para `fa0bebc` en CI #42415007006 (7 PASS + 1 screenshot SKIPPED): k6 real, TypeScript y navegador.** No se regeneran capturas README antes del cierre.

- Escenarios `workloadVersion: 2` aceptan `warmupSeconds` y `cooldownSeconds` entre 0 y 30 cada uno, con **mínimo cinco segundos medidos** dentro de la duración global (5–120s). La autorización del destino, VUs y presupuesto global no cambian.
- k6 etiqueta solicitudes por fase usando `exec.instance.currentTestRunDuration`; los submétricos etiquetados de la ventana central informan **P50/P95/P99, errores, RPS, distribución HTTP y SLO**. El presupuesto de solicitudes se evalúa con `totalRequests` de todas las fases; `dropped_iterations` continúa siendo conservador para el ensayo completo.
- Huella nueva `saturivo-scenario-v4` **solo** cuando hay fases no nulas. Escenarios antiguos mantienen sus hashes v1/v2/v3, preservando comparaciones históricas.
- Historial/importación rechaza escenarios con fases no acotadas, `totalRequests` incoherente y SLO sobre presupuesto falsificado. Exportación Markdown e inspector muestran ventanas de medición y total.
- UX ES/EN: controles de calentamiento y enfriamiento, distribución visual de fases, validación inmediata. Tests de parser, validación, SHA, historial, UI, salida k6 y fixture real local.
- **Pendientes para DoD:** verificar TypeScript + test + navegador Chromium + integración k6 con output etiquetado por el SHA del bloque; justificar límites de muestras, latencia transfrontera y ruido. No declarar capacidad sostenible certificada.

## QA UX sin regenerar capturas (2026-11-07)

- `scripts/capture-readme.cjs --verify-only` ejecuta interacciones reales en Chromium sin escribir archivos PNG ni modificar el README: escenario válido/inválido y selección accesible del inspector, foco, `aria-expanded` y persistencia de `WebviewState`.
- Job CI separado `ui-browser` con permisos solo lectura. La generación/captura de imágenes permanece bajo el input manual `capture_screenshots=true`, reservado para el final.
- **Estado:** IMPLEMENTADO, CI/PASS pendiente del SHA de este bloque; no se reemplaza la auditoría humana de visuales, lectores de pantalla ni tema claro/oscuro.

## Bloque UX — investigación de ejecuciones en el editor (2026-11-07)

**Implementado en el commit del bloque; verificación CI nueva: PENDING.** Conserva las cuatro capturas README sin modificarlas; se regenerarán al final.

- La biblioteca de historial incorpora selección por ejecución, inspector en el **área central** (sin comandos externos), datos exactos P50/P95/P99, promedio, solicitudes, RPS, errores, iteraciones descartadas, clases HTTP observadas cuando existan, estado SLO, avisos y SHA-256 del escenario.
- Navegación de inspección con botón ARIA `aria-controls`/`aria-expanded`, región accesible, foco en encabezado, selección persistida en `WebviewState`, soporte ES/EN y estilo adaptable.
- Sin red/telemetría ni tráfico nuevo. Texto externo escapado; no se muestran query secrets del destino. La vista aclara que una ejecución no acredita capacidad ni regresión estadística.
- Test focalizado de UI/render con evidencia real sintética, HTML malicioso, protección de secretos y localización. **Resta:** interacción real en Chromium/Extension Host, auditoría lector de pantalla y revisión UX de contraste/diseño.
- **Siguiente:** CI exacto del commit y finalización incremental de requisitos de las fases restantes, preservando capturas para último gate.

## Capturas README — exclusivamente al finalizar el PR (2026-11-07)

- **Decisión del maintainer:** no regenerar ni commitear las cuatro imágenes del README durante fases intermedias. Las capturas anteriores son históricas, aunque hayan sido producidas por el renderer real.
- CI ordinario de PR continúa validando TS, unitarias, integraciones y Extension Host, pero **ya no corre ni realiza auto-push de capturas**. La regeneración se habilita únicamente con despacho manual de `ci.yml` en la rama de PR #5, input booleano `capture_screenshots=true`.
- **Gate final:** cuando las fases 0–5 y la UX estén cerradas, regenerar las cuatro pantallas, revisar visualmente claro/oscuro, ES/EN, tamaños/teclado, verificar datos sintéticos declarados, commitear las imágenes y ejecutar CI final del SHA resultante.
- **Estado:** REPROGRAMADO PARA EL FINAL. Ninguna captura intermedia acredita la Definition of Done visual.

## Cambio de versión y posicionamiento — 0.2.0 sin Preview (2026-11-07)

**Autorización actual:** el maintainer eligió 0.2.0 como versión destino y pidió quitar la etiqueta Marketplace Preview. El mismo PR #5 y la rama histórica `feat/enterprise-aaaa-v0.1.1` continúan; esta rama NO es el identificador de la versión publicada. No hay autorización para merge, tags Git ni publicación.

- **Implementación prevista en este commit:** `package.json.version` y ambas raíces de `package-lock.json` a 0.2.0; eliminación de `preview: true`; UI y User-Agent k6 0.2.0; upgrade VSIX 0.1.0 → 0.2.0, documentación de release y tests/manifest de identidad.
- **Discoverability:** 23 keywords específicos del producto (k6, concurrencia Go, pruebas de carga HTTP/WebSocket, profiling, pprof, regresión y observabilidad), sin claims no soportados ni tags Git. Verificación automatizada de unicidad, capacidades clave y límite de 30.
- **Evidencia histórica:** correcciones de cancelación Go y procesos en commit `e8eee7c` verificadas en [CI #42412836592](https://github.com/Drako01/saturivo/actions/runs/42412836592) (7/7). Ese CI corresponde a 0.1.1 y **no acredita** versión 0.2.0.
- **Estado para 0.2.0:** IMPLEMENTADO / CI PENDING hasta corridas del SHA exacto y validación de VSIX instalado, incluyendo que Marketplace no exhiba etiqueta Preview. El cambio de versión **no** acredita por sí solo Enterprise AAAA.
- **Siguiente paso:** verificar la matriz final por SHA, cubrir gaps de fases 0–5 y actualizar evidencias. Los gates de aprobación de lanzamiento siguen BLOCKED.

## Engineering block — cancellation and hostile Go evidence (2026-11-07)

**Verificado para SHA `e8eee7c008e31446fed7bc1e13c6817d28a62a98`: [CI #42412836592](https://github.com/Drako01/saturivo/actions/runs/42412836592) PASS (7/7); 0.2.0 requiere nuevo CI.**

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
6. **P5:** threat model, DNS remoto verificado y pinneado (bloquea metadata/private IP), límites de load/process, test de cierre de descendientes, licencias y SBOM, run/cancel en Extension Host, script de upgrade de VSIX 0.1.0→0.2.0. **Pendiente:** proxies/redirects/rebinding adversariales completos, auditar VSIX exacto y provenance, upgrade multi-OS, security sign-off y autorización release.

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

Continuar exclusivamente en el PR #5; releer HEAD, CI, Master Plan y este checklist **antes de modificar**. Trabajar por bloques con commits pequeños, tests focalizados por impacto (KISS/DRY/YAGNI/SOLID, TypeScript estricto), actualizar este checklist tras cada bloque y `docs/RELEASE_0_2_0_CHECKLIST.md` en hitos de release. No repetir suites costosas ya verdes salvo nueva superficie afectada o gate final. No declarar `PASS` por simple existencia de código ni hacer publicaciones por cuenta propia.

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
| P5 install/upgrade/release exacto | PARTIAL / CI PENDING | Prueba real 0.1.0→0.2.0 agregada al CI Linux; falta validar SHA final, Windows/macOS y aprobación expresa |

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
