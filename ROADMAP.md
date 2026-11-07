# Saturivo — Product roadmap

Status legend: [x] implemented; [ ] pending. PR #1 was merged into main. Enterprise AAAA is a plan, not a current claim. See docs/ENTERPRISE_AAAA_MASTER_PLAN.md.

## M0 — Functional foundation (0.1.0)

- [x] TypeScript strict, VS Code extension manifest and Control Center.
- [x] Spanish/English UI, isolated extension Webview with CSP.
- [x] k6 load presets: smoke, bounded stress, open-loop arrival rate.
- [x] Local-only targets by default, explicit remote opt-in and confirmation.
- [x] Run history, P95/P99/RPS/errors/dropped iterations, Markdown export.
- [x] Go race detector and benchmark command wrappers with confirmation.
- [x] Unit tests and cross-platform CI configuration.
- [x] Strict TS, unit tests and manifest passed on Linux/Windows/macOS; preview VSIX packaged on Linux (CI 42390990344). [ ] Real packaged VSIX smoke and local k6 load remain pending.
- [ ] Lockfile, package/SBOM audit and release-readiness verification.

## M1 — Reproducible load engineering

- [ ] User-defined scenarios, ramps, warm-up, cooldown and scenario versioning.
- [ ] Full environment fingerprint with runtime, CPU model, Go toolchain, git SHA and host load; **workload SHA-256 only** implemented on Phase 0 branch (awaiting CI).
- [ ] Repeated trials, bootstrap confidence intervals, statistical uncertainty and stable baselines.
- [ ] Capacity discovery with abort-on-SLO-violation, bounded growth, confirmed saturation region.
- [ ] Backpressure, rate limiting, response status distribution and coordinated-omission awareness.
- [ ] Live progress, timeout/no-progress kill, expanded result provenance and cancellation test.

## M2 — Go observability

- [ ] Opt-in pprof CPU, heap, mutex, block and goroutine profiles from local service.
- [ ] Trace analysis, goroutine growth/leak heuristic, per-profile Go version capability detection.
- [ ] Correlate load time windows to profiles and VS Code source locations.
- [ ] Race detector parser that links concrete findings to file/line with evidence.
- [ ] Redaction of stack traces and URLs before any optional export.

## M3 — Cross-runtime protocol adapters

- [ ] Optional ghz for gRPC, k6 scenarios for WebSocket, Vegeta/Fortio adapters.
- [ ] Go, Node, Java and Python profiler plugins with capability-based detection.
- [ ] Docker Compose/devcontainer opt-in orchestration; never launch remote targets implicitly.

## M4 — Enterprise AAAA readiness

- [ ] Multi-root, remote development/WSL/SSH tests, Windows/macOS/Linux extension-host E2E.
- [ ] Threat model, robust DNS resolution controls, process-tree termination and quotas.
- [ ] Export SARIF/JSON with schema, migration tests, workspace-scoped retention controls.
- [ ] i18n completeness, accessibility/keyboard tests, UX polish and images.
- [ ] Trusted Publisher/marketplace verification, release tag provenance, pinned CI dependencies.
- [ ] Optional BYO AI integration only with explicit opt-in and artifact redaction.

**Release policy:** no publication while acceptance criteria or security gates are incomplete.

## Enterprise AAAA follow-up

Execution phases and quantifiable acceptance gates are documented in [Enterprise AAAA Master Plan](docs/ENTERPRISE_AAAA_MASTER_PLAN.md). The plan is NOT implementation evidence.
