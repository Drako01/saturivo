# Changelog

## [Unreleased] — 0.1.1 Enterprise AAAA implementation

- Upgrade work begins from the verified 0.1.0 preview baseline.
- Rebuilt the Control Center as a reusable editor-tab WebviewPanel launched from the Activity Bar, with four responsive ES/EN sections, accessible tab navigation, metric cards, an observed-P95 trend and reorganized diagnostics/history.
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

- Private initial implementation: bounded k6 workloads, local run history, simple baseline comparisons, Go test commands and ES/EN Control Center.
- Added CI and unit testing foundation. No public release has been made.
