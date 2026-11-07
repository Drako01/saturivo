# Saturivo — Enterprise AAAA Master Plan

**Baseline:** PR #1 merged on 2026-11-07. **Contractual scope, not certification:** this Master Plan does not claim completion. See the [implementation checklist](ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md) and [release tracker](RELEASE_0_2_0_CHECKLIST.md) for exact-SHA evidence.

## Product target

A local-first, evidence-based VS Code platform for performance engineering. Saturivo correlates reproducible load scenarios, Go concurrency measurements, runtime profiling, source navigation and before/after regressions. HTTP testing remains language-agnostic; supporting other runtimes requires optional adapters. Reuse proven load engines such as Grafana k6; do not build an unverified replacement.

## Non-negotiable contract

- KISS, DRY, YAGNI, SOLID, strict TypeScript, separation of responsibilities and backward compatibility. Every change must be additive or accompanied by explicit schema migration.
- Never start load automatically; require an explicit user gesture and consent, default to loopback, enforce rate/duration/VU/request-size ceilings, stop processes on cancel or timeout, and prohibit unauthorized remote testing.
- Require Workspace Trust before executing project code; no auto-uploads, telemetry or AI prompts. Any external AI option needs explicit consent and redaction.
- Run targeted change-based tests during development; run complete uncached release verification only for a candidate artifact. Maintain traceable CI, environment and artifact evidence.
- Feature complete means implemented + tested + documented + evidenced. Unknown test status is NOT RUN, not PASS.
- No merge, public repository change, marketplace publishing or automatic release without explicit owner approval.

## Phase 0 — Release-quality foundation

| Gate | Deliverable | Measurable acceptance |
|---|---|---|
| B01 | Reproducible dependencies | Committed package-lock, CI uses npm ci, successful clean install on Linux/Windows/macOS; SBOM and license inventory generated |
| B02 | Real local k6 smoke | Disposable loopback HTTP server; 10s constant-VU plus 10s constant-arrival-rate tests; finite P50/P95/P99/RPS, zero unintended remote calls |
| B03 | Installed VSIX | Install generated VSIX into real Extension Development Host, open Control Center and execute/cancel a run with no errors |
| B04 | History and report | Save, reload and export two runs; malformed JSON and interruptions do not crash extension |
| B05 | Safety tests | Denied target, malformed URL, excessive VUs/duration/rate, cancellation, kill and timeouts verified |
| B06 | Branding | README vector logo renders on GitHub; original 128x128 PNG extension icon packaged; screenshots reflect implemented UI only |
| B07 | CI evidence | CI green for Windows/macOS/Linux; separate unit/build, host E2E and real k6 integration gates |

Current evidence: TypeScript, tests, manifest on all three OS PASS, and preview VSIX built on Linux (GitHub Actions run 42390990344). Remaining B01–B07 gates must be validated individually.

## Phase 1 — Reproducible load engine

- Typed scenario schema v2: target, method/protocol, rate, VUs, ramps, warm-up/cool-down, budgets and explicit workload version; migration from v1.
- Pluggable adapters around k6, plus optional Vegeta/Fortio only where real user need exists; capability and binary version detection.
- Correct separate closed-loop VUs vs open-loop arrivals; report target vs achieved arrival rate, dropped iterations and response status distribution.
- Fingerprint scenario SHA, git SHA, runtime version, CPU model/count, load host and test environment before comparing results.
- Multiple trials, variability estimates, confidence intervals, transparent thresholds and explicit INCONCLUSIVE state when environments or samples differ.
- Bounded SLO-based capacity discovery and early stop; report local scenario-specific sustainable capacity, never production guarantees.

**P1 acceptance:** run >=3 repeatable trials against a synthetic service; detect a deliberately introduced latency regression; avoid incorrect FAIL on identical fixtures with noise; enforce all workload and stop constraints; every result contains experiment fingerprint.

## Phase 2 — First-class Go concurrency analysis

- Opt-in local pprof CPU, heap, goroutine, mutex and block profiling with limits and validated local endpoints.
- Integrate Go runtime tracing and version-aware leak diagnostics when supported by the installed toolchain.
- Parse race detector output into proven file/line findings; do not equate a clean race test with race freedom.
- Capture pre/during/post load profiles and correlate goroutine growth, blocked channels, lock contention, allocations, GC and throughput/latency changes.
- Navigate to evidence in editor; distinguish observed facts, plausible hypotheses and unavailable signals.
- Record profiling overhead and prevent profile collection from distorting the load experiment without warning.

**P2 acceptance:** controlled Go fixtures covering mutex contention, a known race and goroutine-growth behavior each yield real test/profiler evidence and correct source links; no unsupported root-cause claims.

## Phase 3 — Protocol and language extensibility

- HTTP(S) remains language-neutral; add opt-in gRPC (ghz) and WebSocket scenarios after fixture testing.
- Runtime adapter contract for Node.js, Java and Python, initially extracting supported process metrics and available profiler artifacts.
- WSL, SSH, devcontainer, multi-root and Docker Compose execution must use explicit workspace/host selection.
- Clear unsupported-capability reporting; no hidden downloads, shell injection or remote execution.

**P3 acceptance:** same HTTP load profile runs against Go and at least two other language fixtures; one gRPC or WebSocket adapter passes fixture-backed E2E; unsupported runtimes return NOT SUPPORTED.

## Phase 4 — Diagnostic UX and evidence export

- Central Control Center with scenario editor, live progress, cancel, history, baseline selector, comparison visualization and source navigation.
- P50/P95/P99/throughput/error views disclose sample size and confidence; do not imply causality from correlation.
- Versioned JSON/Markdown and SARIF (only for verified source findings), configurable retention and artifact deletion.
- Complete ES/EN UI and docs, keyboard and screen reader validation, accessible charts.
- Optional BYO AI: opt-in only, redacted artifacts, no secrets or raw code sent by default, outputs explicitly labeled hypotheses.

**P4 acceptance:** all new strings localized ES/EN; accessible keyboard flows; reports re-import without metric corruption; users can cancel and remove artifacts; safe HTML rendering and CSP verified.

## Phase 5 — Enterprise AAAA hardening and release

- Threat model plus regression tests for SSRF, hostname/redirect/DNS manipulation, workspace trust, malicious fixtures, process trees, secret leaks and oversized profiles.
- Resource limits for child processes, memory, disk, test duration and number of concurrent sessions; no background load on IDE idle.
- Fast PR quality gate vs targeted integration gate vs final strict release gate; pin CI action revisions, least privilege and no redundant repeated tests.
- Linux/Windows/macOS, plus WSL/SSH/devcontainer and installed VSIX/upgrade testing wherever relevant.
- Package audit, reproducible lockfiles, SBOM, notices, SHA-256, artifact provenance and release checklist.
- Marketplace and Open VSX release remain manual until approved, with verified publisher/namespace and correct visual assets.

**P5 acceptance:** green exact-release commit and signed-off security test matrix, install/upgrade pass, no severe unresolved vulnerabilities in shipped code, known third-party risks separately documented as WARN when appropriate, no unsupported marketing claims.

## Universal measurable Definition of Done

1. Implementation is correct, reviewed and incremental, without regressions in established commands/features.
2. Tests prove success and expected failures in controlled fixtures, including cancellation/cleanup.
3. Evidence records commands, runner OS/runtime versions, CI run URL, test results and artifacts; no fabricated PASS.
4. Safety: ownership/authorization, trust, redaction, finite budgets and resource cleanup are verified.
5. Docs, roadmap, changelog, status/checklist and translations match the running version.
6. Release decision is separately approved by the maintainer after the exact VSIX passes the release gate.

**Enterprise AAAA is a target maturity level, not an external certification.**

## Work sequence

1. Close Phase 0 evidence gaps and deliver full icon/assets.
2. Implement scenario v2, baseline fingerprint and repeated trials (Phase 1).
3. Add Go native profiling and source-level diagnostic correlation (Phase 2, principal competitive differentiator).
4. Extend protocols and languages through adapters (Phase 3).
5. Complete UX, reporting and multi-platform hardening (Phases 4–5).
6. Review exact release candidate, then request explicit merge/publication approval.

Next engineering PR after branding: Phase 0 + the first bounded vertical slice of Phase 1. Avoid one giant, hard-to-review patch.

## Decisiones de alcance v0.2.0 y deuda explícita (2026-11-07)

- **gRPC/ghz:** diferido. El criterio P3 admite probar WebSocket o gRPC; WebSocket RFC6455 con k6 superó el fixture real. No se promociona soporte gRPC.
- **Node/Java/Python profilers, Vegeta/Fortio y BYO AI:** diferidos por YAGNI, pendientes de demanda verificable, diseño de seguridad y E2E con fixtures. Se soporta tráfico HTTP real contra Go/Node/Python y observaciones Linux read-only limitadas, no profiling especializado.
- **Correlación Go:** goroutines/pprof/trace/GC y overhead son evidencia observacional; solo hallazgos `go test -race` con fuente validada permiten navegación a archivo/línea. No afirmar fuga, causalidad ni libertad de races.
- **Entornos remotos:** el código presenta host de ejecución y exige selección explícita multi-root. WSL, Remote SSH y Dev Containers no tienen E2E de host remoto. Ver [runbook](REMOTE_VALIDATION.md); estado BLOCKED.
- **Artefacto/capturas:** versión 0.2.0 non-preview, cuatro capturas README generadas con datos sintéticos en commit `6387739`; CI del SHA post-capturas/documentación y revisión visual humana todavía obligatorios.
- **Governance:** PR #5 Draft no significa release aprobado. La autorización del propietario para merge, Git tag y publicación Marketplace/Open VSX es independiente y permanece BLOCKED.
