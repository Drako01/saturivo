# Auditoría independiente — Saturivo (2026-11-11)

## 1. Ficha de auditoría

- Repository: `Drako01/saturivo`; baseline ref: `main`; commit SHA: `c34b22ffabcfed24d681b5a46457a49c07a2ad10`.
- Source version: `0.3.1`; published GitHub Release: `v0.3.1`, 2026-11-10.
- Access: GitHub source-file API, recursive tree, release list, recent CI summaries and workflows; no local source checkout or installation.
- Scope: modules under `src/core`, extension host, Webview renderer, unit/integration tests, CI/release rules, README, CHANGLEOG and current UX.
- Limits: no independent native Extension Host run, pentest, production telemetry, real user-retention metrics or user-machine access.
- **Release condition for the 0.4.0 candidate: NOT DETERMINABLE until exact-head CI passes and manual boundaries are reviewed.**

## 2. Architecture

VS Code editor-tab Control Center → explicit commands and consent → `RunLifecycle` → bounded k6/Go tooling → versioned local JSON history → comparisons, reports, SARIF. `src/extension.ts` coordinates command UX; `src/ui/html.ts` renders an HTML+JS Webview using CSP and nonce; `src/core` separates validation, probes, limits, evidence and serialization. No telemetry is declared.

## 3. Rubric and provisional scorecard

Fixed maximum weights: Architecture 15, Correctness 20, Implementation 15, Security 15, Testing 15, CI/CD 10, Performance 5, UX/DX 5; total 100.

| Dimension | Provisional baseline | Evidence and rationale |
|---|---:|---|
| Architecture /15 | 12 | Explicit core adapters and lifecycle; large coordinating extension and monolithic renderer. |
| Correctness /20 | 14 | Validated budgets and structured evidence; corrupt retention and incomplete HTTP status contracts demonstrated in source. |
| Implementation /15 | 11 | Strict TS, bounded adapters and modules; long inline Webview script and substantial orchestration coupling. |
| Security /15 | 12 | CSP, workspace trust, loopback/DNS pinning, explicit consent; WebSocket query disclosure in report/log before remediation. |
| Tests /15 | 12 | Deterministic unit/property fixtures and coverage policy; no independent local run for this audit. |
| CI/CD /10 | 8 | Seven-job PR gate, artifact SHA/manifest and OIDC release; effective policy/host matrix not independently retested. |
| Performance /5 | 3 | Real k6 fixtures and pprof-overhead script; no representative user workload p95/p99 baseline available. |
| UX/DX /5 | 3 | Accessible four-tab Control Center ES/EN; lack of zero-load setup diagnosis causes onboarding friction. |
| **TOTAL /100** | **75** | **Provisional baseline grade; confidence MEDIA-BAJA due to no independent execution.** |

## 4. Five strengths to preserve

1. Consent before load and Go profiling, and `RunLifecycle` mutual exclusion.
2. Strict allowlists for HTTP GET/HEAD, loopback default, pinned DNS for approved remote tests.
3. Reproducible local evidence, explicit SLO inference limits and backward-compatible import.
4. CSP with nonce, ARIA tabs, accessible data tables, ES/EN translations and existing branding.
5. PR-exact CI and separate OIDC publish, checksum, SBOM and no CI duplication on merge.

## 5. Findings — priority, evidence, acceptance

### AUD-P1-001 — Evidence retention loses healthy runs (CONFIRMED source behavior)
- Location: `src/core/history.ts` `list` scanned only first 100 filenames; `prune` counted malformed filenames when choosing survivors.
- Impact: numerous malformed newer JSON files could hide a valid historical baseline; cleanup could delete valid data.
- Counterproof considered: bounded-file guard and `isStoredRun` protect parsing but do not fix enumeration/retention order.
- Fix: scan owned records until finding requested valid evidence; count valid reports during pruning and leave invalid files for explicit cleanup.
- Regression: 101 corrupt reports before one valid run; pruning retains newest valid evidence. Acceptance: no valid evidence silently discarded due to corrupt-count quotas.

### AUD-P1-002 — Partial HTTP status counters accepted (CONFIRMED source behavior)
- Location: `src/core/metrics.ts` `readK6Summary`, status distribution previously checked only for phased results; `finite()` coerced malformed bucket values to zero.
- Impact: contradictory status aggregates could be presented as valid evidence, harming user trust in results.
- Counterproof considered: phased parser already reconciles counters, but the non-phased path did not.
- Fix: for both paths require count reconciliation if counters exist, and reject missing/negative/noninteger present counters. Acceptance: invalid and incomplete evidence fail closed.

### AUD-P1-003 — WebSocket diagnostic query disclosure (CONFIRMED source behavior)
- Location: `src/core/websocket.ts` `webSocketReport` and `src/extension.ts` `websocketProbe` output.
- Impact: the target query may contain credentials; exporting a report/log could expose them.
- Counterproof considered: HTTPS/HTTP redaction exists elsewhere but was not applied to WebSocket report/output.
- Fix: `redactTargetForDisplay` only at presentation/logging boundaries; retain original URI for the explicitly authorized test. Acceptance: query secret cannot be found in report or extension output.

### AUD-P2-001 — First-run prerequisite diagnosis missing (OBSERVED)
- Location: `src/extension.ts`, `src/ui/html.ts` and `package.json` before upgrade.
- Impact: a new adopter can hit a generic load failure before learning that local k6 must be installed; avoidable uninstall risk.
- Counterproof considered: README already explains prerequisites but requires leaving the product.
- Fix: explicit Check setup button/command using existing visual style, local version probes and a guided report; no target traffic. Acceptance: missing k6 is explained, optional Go not required, no background load.

### AUD-P2-002 — Published/source documentation drift (CONFIRMED API evidence)
- Location: `README.md`, `STATUS.md`, `docs/README_ES.md` vs published `v0.3.1`.
- Impact: users see misleading install branches, release status and screenshot provenance.
- Fix: update docs with verified published 0.3.1 and clearly unpublished candidate 0.4.0, preserve old screenshots as synthetic historic examples.
- Acceptance: all version references in current instructions are coherent with manifest and release facts.

## 6. Threat model / second adversarial pass

Trust boundaries: Webview message, workspace settings, external k6/Go commands, DNS, local history files, imported JSON, profile binaries and output exports. Checked abusive cases: HTML input, query secrets, invalid counters, symlinks, corrupted newest history, cancellation and concurrent requests. Safety constraints already present: no shell expansion; bounded output; no auto load, remote stress needs per-run confirmation. Remaining risks: native platform-specific process tree cleanup, remote hosts, real-world permission ambiguity, unusual DNS/IP setups. Do not claim exploitability or 100% safety without execution.

## 7. Test inventory and CI

Defined: TypeScript unit/property suites, k6 local Go/Node/Python/WebSocket fixtures, Chromium interaction tests, VS Code Extension Host tests, Windows/macOS/Linux VSIX upgrade, supply chain and exact-head release gates. Previous 0.3.1 publish workflow succeeded, but **new 0.4.0 tests were NOT EXECUTED by this auditor**; GitHub Actions after PR creation will provide per-SHA evidence. Coverage is enforced by policy; the actual new-SHA percentage is not asserted.

## 8. Performance and UX

Potential friction: prerequisite discovery in editor, interpreting metrics when samples are too small, preserving keyboard focus during re-renders and reading high-contrast themes. No current user-retention, activation funnel or crash-rate dataset exists in the repository; any numerical retention improvement would be speculation. Changes focus on removing concrete first-use failure modes, not redesign.

## 9. Roadmap and release decision

See `docs/UPGRADE_ROADMAP_SATURIVO_2026-11-11.md` and `docs/RELEASE_0_4_0_CHECKLIST.md`. The P1 evidence integrity/privacy fixes and P2 setup/docs changes are implemented in candidate source; acceptance is conditional on exact-head CI and environment tests. Remaining remote-host, accessibility and manual onboarding checks must be marked NOT RUN until verified. Rollback to verified 0.3.1 VSIX if release gates fail. **No current global quality score or zero-bug claim is warranted for 0.4.0 before testing.**
