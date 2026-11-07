# Saturivo — measurable acceptance criteria

| ID | Criterion | Measurement | Current evidence |
|---|---|---|---|
| A1 | Extension activates on VS Code >=1.99 | Open Extension Host, icon loads Control Center with no errors | Pending host smoke |
| A2 | No implicit load | Open workspace and view; verify zero HTTP calls to disposable target | Pending integration smoke |
| A3 | Local default policy | Reject remote URLs, URL credentials, unsupported schemes and methods in unit tests | Unit tests written |
| A4 | Bounded workload | Reject >100 VUs or >120 seconds even with malformed settings | Unit tests written |
| A5 | k6 execution | Local k6 installed, 10-second smoke, >=1 request, finite P95/P99/RPS | Pending live smoke |
| A6 | Open-loop mode | k6 script contains constant-arrival-rate executor; dropped iterations reported | Unit tests written; integration pending |
| A7 | Durability | Save run, reload from disk, compare same scenario after extension reload | History test pending |
| A8 | Regression guard | Mismatched scenario, environment or <100 samples => inconclusive | Unit tests written |
| A9 | Race safety | Go -race command executes only after explicit consent and can be cancelled | Manual host smoke pending |
| A10 | Bilingual UI | Every manifest string key has ES/EN counterpart; control panel translates keys | Unit/manifest test written |
| A11 | Build | TypeScript strict typecheck on three OS with 0 errors | CI pending |
| A12 | Artifact | `vsce package --no-dependencies` generates installable VSIX and extension host activates | CI & host smoke pending |
| A13 | Security | CSP, limited Webview messages, no cloud telemetry, local-first target | Unit/security review pending |
| A14 | Release | No automatic publication; manual sign-off and clean checks | No publish workflow |
| A15 | Transparent brand icon | PNG 192×192, four exterior corners alpha=0, center opaque | Pixel-level gate added in Phase 0 branch; CI pending |
| A16 | Workload fingerprint | Identical workloads yield identical 64-char SHA-256, workload changes yield different hash; legacy history supported | Deterministic unit cases added in Phase 0 branch; CI pending |

Criteria are explicit but are **not** marked PASS until observed. Go profiling, profiler correlation, dynamic capacity discovery and advanced regression statistics remain roadmap items.
