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
| A01 | Exact v0.2.0 VSIX activates in real VS Code and opens central editor | PARTIAL — Extension Host CI; exact artifact pending |
| A02 | Opening Control Center sends 0 test requests | IMPLEMENTED — Extension Host fixture |
| A03 | Remote/private URL, credentials and unsafe protocols refused without explicit consent | PARTIAL — adversarial proxy/DNS matrix pending |
| A04 | VU/rate/duration/requests constrained across all v2 phases; cancellation stops process descendants | PARTIAL — WSL/Windows hostile cases pending |
| A05 | Real k6 closed/open/ramp/phased fixture, valid P50/P95/P99 and observed arrival/status | IMPLEMENTED — exact release CI pending |
| A06 | Scenario fingerprints and v1/v2 imports roundtrip without loss | PARTIAL — Extension Host migration E2E pending |
| A07 | Independent 3×3 comparison never treats noise, missing environment or samples as proof | PARTIAL — 64 synthetic-noise probes added; CI and real-host variability pending |
| A08 | Go race/pprof/trace/source evidence and controlled GC observations without causal marketing claims | PARTIAL — control/profile experiment added; CI and source E2E pending |
| A09 | HTTP Go/Node/Python and opt-in WebSocket fixture evidence; unsupported capabilities explicit | PARTIAL — remote env E2E pending |
| A10 | Keyboard, screen reader, ES/EN, light/dark, zoom 200% on complete editor workflow | PARTIAL — manual WCAG audit pending |
| A11 | Redacted Markdown, explicit JSON export consent, SARIF verified findings, import/delete/retention | PARTIAL — roundtrip hosted QA pending |
| A12 | TS strict + Linux/Windows/macOS unit/build + real Go/k6/Webview/Extension Host on **same final SHA** | NOT RUN for final SHA |
| A13 | Threat model signed; SSRF, proxy, symlink, process and profile DoS matrices pass | PARTIAL — remaining adversarial matrix |
| A14 | SBOM, notices/licenses, audit shipped code, checksum/provenance, install/upgrade from 0.1.0 | PARTIAL — notice requirement added, CI/final VSIX and external attestation pending |
| A15 | Marketplace branding/icons/4 screenshots reflect final UI, no Preview, correct 0.2.0 version | PARTIAL — final screenshots intentionally deferred |
| A16 | Manual owner authorization independently for merge, Git tag and marketplace/Open VSX publication | BLOCKED by design |

Evidence is recorded by **commit SHA** in the master checklist and release
tracker. `IMPLEMENTED` is never equivalent to a release `PASS`. Complete
uncached release verification runs only after the candidate is frozen.
