# Saturivo 0.2.0 — Acceptance criteria

The **authoritative, continuously updated six-phase checklist** is
[ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md](ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md).
The [Master Plan](ENTERPRISE_AAAA_MASTER_PLAN.md) is the contractual scope.
The [0.2.0 release tracker](RELEASE_0_2_0_CHECKLIST.md) tracks final packaging,
security sign-off and owner approval. Do not copy statuses between versions.

This file defines stable release acceptance IDs without incorrectly treating
an older CI run as evidence of the final candidate.

| Gate | Measurable release requirement | State |
|---|---|---|
| A01 | Exact 0.2.0 VSIX activated in VS Code real with central editor | PARTIAL — installed VSIX Extension Host Linux PASS #42422983667; post-screenshot CI 7/7 PASS #42424211042 at e777dda; new final docs SHA pending |
| A02 | Opening Control Center sends 0 test requests | IMPLEMENTED — Extension Host fixture |
| A03 | Remote/private URL, credentials and unsafe protocols refused without explicit consent | PARTIAL — adversarial proxy/DNS matrix pending |
| A04 | VU/rate/duration/requests constrained across all v2 phases; cancellation stops process descendants | PARTIAL — WSL/Windows hostile cases pending |
| A05 | Real k6 closed/open/ramp/phased fixture, valid P50/P95/P99 and observed arrival/status | TESTED — real k6 integration PASS #42422983667 on 0d73879; post-images CI PASS #42424211042 at e777dda; final docs SHA pending |
| A06 | v1/v2 run migration/roundtrip without altered metrics | PARTIAL — storage upgrade + migration PASS Linux/Windows/macOS #42422983667; native dialog E2E pending |
| A07 | Independent 3×3 comparison does not mistake noise or missing evidence for proof | PARTIAL — seeded 64× synthetic controls PASS #42422983667; real multi-host noise pending |
| A08 | Go race/pprof/trace/GC, source evidence and noncausal conclusions | PARTIAL — real profiling control experiment PASS #42422983667; IDE navigation E2E pending |
| A09 | HTTP Go/Node/Python and opt-in WebSocket fixture evidence; unsupported capabilities explicit | PARTIAL — remote env E2E pending |
| A10 | Keyboard, screen reader, ES/EN, light/dark and 200% zoom | PARTIAL — Chromium focus/keyboard and ES/EN host PASS #42422983667; screen reader, contrast, 200% BLOCKED |
| A11 | Redacted Markdown, JSON export consent, SARIF verified findings, import/delete/retention | PARTIAL — unit/Chromium action tests PASS; native open/save dialogs pending |
| A12 | TS strict + Linux/Windows/macOS build/test, real Go/k6/Browser/Extension Host on exact final SHA | PASS post-images #42424211042 on e777dda; PENDING final SHA after this documentation commit |
| A13 | Threat model, SSRF, proxy, symlink, process tree and profile quotas | PARTIAL — hostile Windows tree/proxy local PASS #42422983667; DNS remote, WSL and human sign-off pending |
| A14 | SBOM/notices/license review, shipped components, SHA-256/provenance, 0.1.0 upgrade | PARTIAL — 3-OS CLI upgrade, package inventory and hash PASS #42422983667; external attestation and final sign-off pending |
| A15 | Non-preview 0.2.0 branding and four actual renderer screenshots | PARTIAL — four images generated on 6387739 and capture run #42423371472 PASS; visual review and CI after this documentation commit pending |
| A16 | Manual owner authorization independently for merge, Git tag and marketplace/Open VSX publication | BLOCKED by design |

Evidence is recorded by **commit SHA** in the master checklist and release
tracker. `IMPLEMENTED` is never equivalent to a release `PASS`. Complete
uncached release verification runs only after the candidate is frozen.
