# Changelog

## [Unreleased] — 0.1.1 Enterprise AAAA implementation

- Upgrade work begins from the verified 0.1.0 preview baseline.
- Rebuilt the Control Center as a reusable editor-tab WebviewPanel launched from the Activity Bar, with four responsive ES/EN sections, accessible tab navigation, metric cards, an observed-P95 trend and reorganized diagnostics/history.
- Added an editor-tab custom HTTP scenario v2 form (GET/HEAD, closed/open loop) with strict host-side validation, workload budgets and local form state.
- Added explicit baseline choice before comparisons while preserving the 3+3 non-overlapping group constraint.
- Added opt-in local Go runtime trace capture; real Go integration now also captures mutex and block profiles.
- Added disposable Go, Node.js and Python HTTP fixtures executing the same real bounded k6 workload in CI.
- Added a local-only WebSocket k6 probe with explicit consent, protocol-specific evidence and RFC6455 fixture-backed E2E.
- Added controlled Go runtime fixtures for mutex contention and bounded goroutine growth; findings are observational, not causal claims.
- Added reproducible npm license inventory, split by production/dev dependencies, and included the evidence in CI and protected release artifacts.
- Removed the manifest's private flag: the repository and source package are public, while publication remains approval-gated.
- Added a security threat model and reconciled the Master Plan checklist with the actual PR #5 state.
- Hardened distribution pipeline, workload reproducibility, Go tracing and runtime diagnostics are tracked in the 0.1.1 checklist.
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
