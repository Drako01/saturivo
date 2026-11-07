# Architecture — Saturivo

## Boundaries

1. `src/extension.ts`: VS Code commands, user consent, workspace trust, lifecycle and state.
2. `src/ui/*`: ES/EN dashboard and CSP-constrained Webview; UI messages are mapped to a fixed command allowlist.
3. `src/core/validation.ts`: target protocol, local/remote policy, method and load ceilings.
4. `src/core/k6.ts`: deterministic k6 script generation, bounded external process, captured summary.
5. `src/core/metrics.ts`: extraction and normalization of k6 aggregates.
6. `src/core/history.ts`: workspace-scoped local JSON history (atomic writes, bounded reads).
7. `src/core/comparison.ts`: comparison contract with explicit inconclusive state.
8. `src/core/go.ts`: direct Go toolchain command execution with explicit consent.
9. `src/core/report.ts`: exportable Markdown evidence.

## Data flow

```text
User click → trusted VS Code command → target validation → [remote confirmation]
           → k6 child process (generated local script, no shell)
           → local JSON summary → typed metrics → workspace history
           → dashboard / baseline comparison / Markdown export

User confirmation → go test -race OR go test -bench → bounded output panel
```

## Design decisions

- Reuse k6 instead of implementing an unverified load engine.
- Separate experiment execution from analysis. Go commands do not run automatically.
- Default loopback-only, read-only HTTP methods, no redirects in k6, bounded duration and VUs.
- Open-loop experiments are available because closed-loop workloads can hide overload.
- Record environment (OS, architecture, Node, CPU count) and keep non-comparable runs inconclusive.
- No telemetry, cloud uploads, AI calls, network service or external backend controlled by Saturivo.

## Known limitations

- No CPU/heap/mutex/block/trace/pprof capture or attribution to source code yet.
- No HTTP body/auth, custom workload profiles, distributed load or gRPC/WebSockets yet.
- No repeated trials, confidence intervals, warm-up control, environment fingerprinting, or statistical claims.
- Fixed preset VUs; the setting is an upper bound, not a precision workload editor.
- No end-to-end VS Code Extension Host run and no live k6 server smoke is asserted by unit tests.
- Race detector only observes exercised paths and is **not** equivalent to proving race freedom.
- The Go commands may run arbitrary repository tests; the consent gate is mandatory.

## Upgrade strategy

See `ROADMAP.md`: instrumentation capture, adapter layer for Go/Node/Java, controlled saturation search, baseline evidence and release hardening.
