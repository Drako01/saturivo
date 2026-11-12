# Changelog

## [0.4.0] — 2026-11-11 (candidate; NOT PUBLISHED)

- Added a bilingual, opt-in **Check setup** command and Control Center action, using the existing visual components. Version-only local tool checks and target-policy validation never send load traffic.
- Fixed history retention when corrupt files appear among valid records: prune only counted valid reports, scan through malformed entries, and preserve malformed evidence for explicit cleanup.
- Rejected partial or invalid HTTP status distributions and malformed dropped-iteration evidence instead of reporting incomplete metrics as valid.
- Redacted WebSocket query parameters from Markdown evidence and extension output logs; workload execution continues using the original approved local URL.
- Added regression tests for these failure modes and documentation/audit evidence; kept existing logo, palette, dashboard layout, historical schema and release governance intact.
- Updated source/lockfile version to 0.4.0. Publishing is gated by exact-head PR CI and protected main release. Do not label 0.4.0 published based on this commit.


## [0.3.1] — 2026-11-10

**Stable release candidate (no Preview); awaiting exact PR CI and squash merge.** The 0.3.0 source upgrade was merged in PR #9 but never published: its release-environment verifier required human approval and queried the unavailable deployment-branch-policies endpoint (HTTP 404).

- Adopt a solo-maintainer release gate: require the exact merged PR HEAD with seven successful CI jobs, identical squash-merge tree and protected `main` SHA; do not require a second human deployment approver.
- Retain least-privilege workflow permissions, OIDC-scoped Marketplace/Open VSX environments, immutable tag, artifact hash, SBOM and GitHub Release verification.
- Reconcile the versioned PR ruleset with zero human approvals while preserving strict seven-job CI, squash-only merges, branch protection and review-thread resolution.
- Add negative tests for missing OIDC environment, unprotected main, wrong repository/ref/SHA and malformed release workflow.
- Bump package and lockfile to 0.3.1; no changes to load generation, Go diagnostics or Control Center UI.


## [0.3.0] — 2026-11-10

**Stable-channel release candidate; not yet published.** Release requires the final PR CI, operator approval, and verified GitHub deployment-environment rules.

- Fixed the run-lock time-of-check/time-of-use race through a shared cancellable lifecycle with typed aborts.
- Centralized safety limits for load scenarios, editor input and historical evidence.
- Hardened WebSocket JSON summary reads; synchronized k6/WebSocket identification with the packaged version.
- Prevented workspace-controlled executable paths via machine-scoped settings and manifest/Extension Host regression checks.
- Added deterministic property testing and measured coverage gates; expanded branch ruleset to the seven release-required jobs.
- Added fail-closed checks for required deployment reviewers and main-only environment restrictions.
- Removed legacy write-permission screenshot commits from CI; retained manual artifact capture.
- Reconciled documentation and release metadata, retaining legacy evidence limitations.


## [0.2.2] — 2026-11-07

- Run the full CI suite once on the pull request; prevent duplicate CI on merge to `main`.
- Automatically start the protected Trusted Publisher release on version-bumping merges to `main` after verifying the exact merged PR HEAD and its successful CI. Preserve immutable `v*` release tags, checksums, SBOM and OIDC distribution without rerunning the PR test matrix.

## [0.2.1] — 2026-11-07 (source-only; no tag or GitHub Release)

- Fix incorrect Control Center logo branding and align the VS Code Activity Bar icon with the official Saturivo gauge.

## [0.2.0] — 2026-11-07

- Owner authorized publication of 0.2.0 after verified automated gates (CI #42425033225: 7/7 PASS on `ebac70f`). Version 0.2.0 was subsequently published; refer to its immutable tag and GitHub Release for the final release evidence.
- Manual installed-host validation is explicitly deferred by the owner to after publication, and remains **NOT RUN**, not PASS. Includes real UI dialogs, WSL/SSH/Dev Containers, accessibility and remote adversarial networks; see [post-publication QA](docs/POST_RELEASE_QA_0_2_0.md). Do not claim complete Enterprise AAAA certification.


- Verified 7/7 exact-commit [CI #42422983667](https://github.com/Drako01/saturivo/actions/runs/42422983667) on `0d73879`: Windows/macOS/Linux installed 0.1.0→0.2.0 VSIX CLI upgrades with persisted v1/v2 history, real Go/k6/Compose/WebSocket/Chromium and shipped JavaScript inventory.
- Fixed Windows VS Code CLI upgrade by invoking native Code.exe in Electron Node CLI mode without executing untrusted `.cmd` files through a shell.
- Localized remaining Host authorization, Go project execution, import/export and failure labels ES/EN; preserved webview focus on async re-render, added responsive forced-color styles and Chromium keyboard/command bridge checks.
- Refreshed all four README screenshots from the actual production renderer with synthetic fixtures, commit `6387739` ([capture run #42423371472](https://github.com/Drako01/saturivo/actions/runs/42423371472)); removed one-shot screenshot workflow after completion.
- Remaining WSL/SSH/Dev Containers, VS Code native dialogs, NVDA/VoiceOver/200% zoom, remote DNS/WSL threat tests, external provenance and maintainer sign-off are **BLOCKED**, not counted as release approval.


- Added a six-window real Go control-versus-profiling overhead experiment with persisted JSON P95/RPS/variability evidence; verified #42422983667.
- Added 64 seeded 3×3 synthetic noise controls and injected +60 ms latency sensitivity checks; real-network noise remains separate.
- Included `THIRD_PARTY_NOTICES.md` in the distributable VSIX allowlist, distinct from development-only license inventory.
- Aligned exact-SHA checklist, release tracker and threat-model claims to green CI #42420415145; added executable remote validation runbook with explicit BLOCKED states.

- Added a real local k6 adversarial fixture that sets malicious proxy environment variables and a 302 redirect to a trap server; fails if k6 follows the redirect or inherits the proxy. Remote SSRF testing remains a separate release gate.
- Added evidence-backed Go race source navigation from the central Control Center: choose an observed file/line in QuickPick, open real source in VS Code; rejects symlink traversal outside the original trusted workspace, with ES/EN labels and tests.
- Consolidated contradictory historical AAAA status lists into one master checklist and compact release tracker; retained traceable CI references and outstanding release gates.

- Prevented active Markdown links/images from untrusted run names and warning text in load and Go timeline reports, without changing JSON evidence or fingerprint identity.

- Added real Docker Compose + statically linked Go loopback fixture with bounded k6 workload and cleanup to Linux CI, without container registry downloads; exact SHA pending verification.

- Explicitly identify VS Code remote execution context and localhost scope in the Control Center, bilingual; redact URL queries from authorization modals without changing validated execution target.

- Explicit v1-to-v2 evidence import migration preserves metrics and legacy on-disk history while validating fingerprints, SLO assessments and HTTP status totals; idempotent roundtrip and adversarial tests added.

- Keyboard skip navigation, focusable tab panels and Escape focus recovery in inspector; bilingual checks and real Chromium tab keyboard interaction tests added.


- Bound the CI-built VSIX to immutable PR HEAD, SHA-256 and release manifest and archived all three pieces; constrained k6 summary reads to no-follow, verified bounded file descriptors.

- Comparisons now return INCONCLUSIVE when capped request budgets, dropped iterations or inconclusive run SLOs make throughput/latency evidence unsuitable for regression claims; shared unit-tested quality guard for two-run and 3×3 bootstrap comparisons.

- Hardened VSIX ZIP central/local header audit against duplicate paths, symlink entries, encrypted archives, ZIP bombs, and unsupported metadata; added five adversarial tests to the multi-OS verification gate (verified #42422983667).

- Fixed exported SARIF tool metadata to read the packaged extension version instead of advertising 0.1.0; added a manifest-parity regression test. Consolidated v0.2.0 acceptance criteria and the six-phase gate summary (CI of exact commit pending).

- Integrated optional local Go expvar GC/allocation observations into the before/during/after load timeline, with strictly allowlisted counters, bilingual consent, noncausal reporting and real Go fixture verification; CI of exact commit pending.


- Go timeline now records per-snapshot monotonic collection wall time and discloses during-load sampling duration without misrepresenting it as causal profiling overhead. Targeted fixture included (verified #42422983667).


- Redact URL query/fragment values in visible Control Center endpoint labels while retaining the original execution target and scenario fingerprint.

- Added optional bounded warm-up and cool-down windows for v2 load scenarios. k6 tags requests by phase, reports latency/errors/RPS and SLOs only for the measurement window, and retains all-phase request-budget enforcement; older workload fingerprints remain unchanged.

- Split browser functional QA from README asset regeneration: ordinary CI validates scenario editing and history investigation in real Chromium, while screenshot files can only be refreshed through an explicitly requested final-stage workflow.

- Added an in-editor accessible run investigation view: exact observed latency/RPS/errors/status counts, SLO findings, warnings and workload fingerprint; persistent selected run and bilingual disclosure. Four README screenshots subsequently generated at 6387739, with manual visual sign-off pending.

- Set candidate version to `0.2.0` across manifest/lockfile, editor branding, k6 identification, upgrade tests and release records; removed `preview: true`. Added 23 relevant Marketplace/Open VSX keywords with an automated uniqueness/limit check. No Git tags or publication. Publication remains separately approval-gated.

- Strengthened POSIX descendant termination, abort-on-profile-failure for correlated loads, guarded oversized/symlinked goroutine snapshots and sanitized diagnostic Markdown.

- Hardened v2 evidence roundtrip, SLO/status consistency and independent 3×3 host comparisons; rejected incomplete k6 HTTP metrics rather than reporting false zeros.
- Fixed Markdown reporter string escaping and redacted URL query parameters by default; full-fidelity JSON export now requires an explicit bilingual privacy confirmation.

- Upgrade work begins from the verified 0.1.0 preview baseline.
- Rebuilt the Control Center as a reusable editor-tab WebviewPanel launched from the Activity Bar, with four responsive ES/EN sections, accessible tab navigation, metric cards, an observed-P95 trend and reorganized diagnostics/history.
- Added an editor-tab custom HTTP scenario v2 form (GET/HEAD, closed/open loop) with strict host-side validation, workload budgets and local form state.
- Added a developer-oriented UX workflow: guided onboarding, safe preset-to-studio selection, live stage/arrival/VU visualization, inline validity, accessible chart values, transparent comparison context and responsive theme-aware layouts.
- Added Chromium-backed interaction checks for valid/invalid workload previews and regenerated synthetic README screenshots from the production renderer.
- Added optional Git/environment fingerprints, HTTP status-class and requested/observed arrival evidence; bounded history retention and Go profile storage; DNS-pinning safety tests and a real VSIX upgrade gate.
- Added an opt-in local Linux process-metrics adapter for Node, Java and Python, with explicit NOT SUPPORTED status elsewhere.
- Added explicit baseline choice before comparisons while preserving the 3+3 non-overlapping group constraint.
- Added opt-in local Go runtime trace capture; real Go integration now also captures mutex and block profiles.
- Added disposable Go, Node.js and Python HTTP fixtures executing the same real bounded k6 workload in CI.
- Added a local-only WebSocket k6 probe with explicit consent, protocol-specific evidence and RFC6455 fixture-backed E2E.
- Added controlled Go runtime fixtures for mutex contention and bounded goroutine growth; findings are observational, not causal claims.
- Added reproducible npm license inventory, split by production/dev dependencies, and included the evidence in CI and protected release artifacts.
- Removed the manifest's private flag: the repository and source package are public, while publication remains approval-gated.
- Added a security threat model and reconciled the Master Plan checklist with the actual PR #5 state.
- Hardened distribution pipeline, workload reproducibility, Go tracing and runtime diagnostics are tracked in the 0.2.0 checklist.
- **Not yet released:** all subsequent feature completion must be verified on the exact release commit.


## [Unreleased] — Enterprise AAAA Phase 0 / Phase 1 foundation

- Fixed fully transparent rounded corners on Marketplace/README PNG; added pixel-level regression test.
- Added stable versioned workload SHA-256 fingerprint to new run results and Markdown reports, with backward compatibility for existing history and comparison.

### Public repository governance (PR #4)

- Added versioned default-branch and release-tag rulesets matching the published extension repositories, plus an explicit admin-only apply/status script.
- Added CODEOWNERS, public contribution/community conduct/support/security guidance, and structured PR/issue templates.
- Updated README and ES documentation to reflect that source code is public while releases remain unpublished.
- Fixed capacity-discovery test expectations for inconclusive and over-budget outcomes.

### Local capacity engineering pilot

- Added an explicit bilingual Control Center action for a three-stage bounded local arrival-rate experiment with required P95 SLO and stop-on-failure/inconclusive behavior.
- Protected the pilot with literal-loopback restrictions, request budgets, cancellation and clear non-production-capacity disclaimers.

## [0.1.0] — Unreleased

- Initial implementation: bounded k6 workloads, local run history, simple baseline comparisons, Go test commands and ES/EN Control Center.
- Added CI and unit testing foundation. No public release has been made.
