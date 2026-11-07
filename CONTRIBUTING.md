# Contributing

This repository is private during pre-release development. Open a feature branch and a draft PR; do not merge without review.

Use TypeScript strict mode and maintain separation between VS Code UI, adapters, validation and data analysis. Prefer KISS, DRY, SOLID, security gates and focused tests. Do not rerun unchanged long-running checks without change-impact justification.

Before requesting review run `npm run verify` and, for release changes, `npm run package:vsix`. Include measurable evidence and update `STATUS.md` and `docs/ACCEPTANCE_CRITERIA.md`.

No public deployment, production stress test or external AI service call is permitted from tests.
