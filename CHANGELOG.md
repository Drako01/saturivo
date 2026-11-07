# Changelog

## [Unreleased] — Enterprise AAAA Phase 0 / Phase 1 foundation

- Fixed fully transparent rounded corners on Marketplace/README PNG; added pixel-level regression test.
- Added stable versioned workload SHA-256 fingerprint to new run results and Markdown reports, with backward compatibility for existing history and comparison.

### Public repository governance (PR #4)

- Added versioned default-branch and release-tag rulesets matching the published extension repositories, plus an explicit admin-only apply/status script.
- Added CODEOWNERS, public contribution/community conduct/support/security guidance, and structured PR/issue templates.
- Updated README and ES documentation to reflect that source code is public while releases remain unpublished.
- Fixed capacity-discovery test expectations for inconclusive and over-budget outcomes.

## [0.1.0] — Unreleased

- Private initial implementation: bounded k6 workloads, local run history, simple baseline comparisons, Go test commands and ES/EN Control Center.
- Added CI and unit testing foundation. No public release has been made.
