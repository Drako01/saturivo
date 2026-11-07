# Saturivo — Project Governance

Saturivo is a public MIT-licensed extension developed and maintained by **Alejandro Daniel Di Stefano — ArmoTuSitio**. Public repository visibility does not imply Marketplace/Open VSX availability or Enterprise AAAA certification.

## Project roles and decisions

- **Maintainer/code owner:** @Drako01, responsible for product direction, scope, security policy, release approval, rulesets and final merge decisions.
- **Contributors:** may propose and implement focused improvements through issues/PRs; contribution does not confer publishing or repository administration permissions.
- **Reviewers:** assess correctness, reproducibility, backwards compatibility, safety, privacy, documentation and user experience.

There is no claim of a multi-person core team, independent security auditor or standing response-time SLA.

## Proposal and review lifecycle

1. Search existing issues/PRs; propose large changes with a concrete problem statement and objective acceptance criteria.
2. Use a topic branch and a focused PR. Draft PRs are encouraged for in-progress implementations.
3. CI runs the platform checks; affected components need targeted integration tests. Status must differentiate **PASS**, **FAIL**, **WARN**, **INCONCLUSIVE**, **NOT RUN** and **BLOCKED**.
4. Address review comments and update docs, translations and tests when behavior changes.
5. Merge is a maintainer decision under repository rulesets; prefer squash, preserving traceable history. Never force-push protected branches or rewrite release tags.
6. Tag and release the same verified VSIX artifact only with explicit maintainer approval. Publishing to a store is **not** triggered by merging a PR.

## Engineering rules

**KISS · DRY · YAGNI · SOLID · Clean Code**; strict TypeScript; clear separation among load adapters, runtime evidence, UI and persistence. Incremental additions must not break public commands, run history or security boundaries.

Load generation must be explicit, bounded, authorized and reproducible. Do not use real customer data or production endpoints in tests. Keep AI opt-in and inactive unless approved; do not transfer source or diagnostic artifacts by default.

A feature is not done merely because code exists. It needs measurable acceptance criteria, automated/fixture evidence, appropriate security checks, documentation and accurate status tracking.

## Releases

Release gates: [Master Plan](ENTERPRISE_AAAA_MASTER_PLAN.md), [Checklist](ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md), [Security](../SECURITY.md) and [Rulesets](RULESETS.md).

No contributor may independently enable automated publishing, change repository visibility, bypass release controls or mark Enterprise AAAA complete. Third-party findings may be documented as WARN by impact; unmitigated critical issues in shipped Saturivo code remain blocking.

## Community standards

Read [Contributing](../CONTRIBUTING.md), [Code of Conduct](../CODE_OF_CONDUCT.md), [Support](../SUPPORT.md) and [Security](../SECURITY.md). Technical disagreement is welcome; harassment, privacy violations, unauthorized stress testing and exposing secrets are not.
