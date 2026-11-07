# Contributing to Saturivo

**Contributions are welcome. / Se aceptan contribuciones.**

Saturivo is a public, MIT-licensed Visual Studio Code extension for **local-first load testing and evidence-based concurrency diagnostics**. It is a **pre-release development project**, not a production capacity certification system.

We welcome bug reports, test fixtures, documentation improvements, translations (ES/EN), accessibility feedback, Go profiling cases, and well-scoped engineering contributions.

**En español:** Podés colaborar con código TypeScript, pruebas, ejemplos de Go, documentación, traducciones ES/EN, reportes de errores, seguridad y accesibilidad. Antes de cambios grandes, abrí un issue para acordar alcance y criterios verificables.

## Before contributing

Read [README](README.md), [Architecture](ARCHITECTURE.md), [Roadmap](ROADMAP.md), [Security](SECURITY.md), [Code of Conduct](CODE_OF_CONDUCT.md) and [Enterprise AAAA acceptance checklist](docs/ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md).

Search existing [issues](https://github.com/Drako01/saturivo/issues) and PRs before proposing new work. For substantial changes, open an issue describing what should improve, the measurable acceptance criteria, risk/safety implications and a reproducible local fixture. Never publish a proprietary API URL, client code or credentials.

## Develop from a fork

Requirements: Node.js **22+**, npm, Visual Studio Code **1.99+**, Git, and optionally [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) or Go for the affected area.

```bash
git clone https://github.com/YOUR-USERNAME/saturivo.git
cd saturivo
git remote add upstream https://github.com/Drako01/saturivo.git
git fetch upstream main
git switch -c feat/describe-your-change upstream/main
npm ci --ignore-scripts
npm run verify
```

For the current in-flight Enterprise AAAA implementation, check the relevant open PR before targeting a branch; **do not assume that unmerged features are already in main**. Keep each PR focused and document any base-branch dependency explicitly.

Suggested branches: `feat/local-profiler-adapter`, `fix/race-parser-boundary`, `test/load-cancellation`, `docs/performance-methodology`.

## Quality verification

| Check | When to run |
|---|---|
| `npm run rulesets:check` | Governance files and PR protections |
| `npm run typecheck` / `npm test` | Changed TypeScript and tests |
| `npm run verify` | Every PR before requesting review |
| `npm run package:vsix` | Packaging, manifest, icon, release or extension resources |
| `npm run test:integration:k6` | k6 engine or workload changes; use an authorized disposable local fixture |
| `npm run test:integration:vscode` | VS Code commands, UI, installation or lifecycle changes; requires a GUI-capable environment |
| `node scripts/go-evidence.cjs` | Go pprof, race or runtime evidence changes; requires Go and fixtures |

A missing tool, timeout or skipped check is **NOT RUN**, not PASS. Record the actual commands, OS, Node/VS Code/Go/k6 versions, outcomes and CI URLs. Avoid repeating expensive unchanged checks without a change-impact reason; run the complete exact-artifact release gate before any public release.

## Architecture and engineering principles

- Follow **KISS, DRY, YAGNI, SOLID, Clean Code** and strict TypeScript. Prefer small, cohesive modules with explicit types.
- Keep `src/extension.ts` responsible for VS Code orchestration, `src/ui/` for presentation/i18n, `src/core/` for engines, validation and evidence, and `test/` for reproducible cases.
- Preserve command IDs, schemas, historical reports, telemetry/privacy guarantees and safety limits unless there is a reviewed migration.
- Add positive, negative and regression tests with fixture data. Test expected failures, resource cleanup and cancellation; no tests against third-party/production targets.
- Distinguish measured facts, inconclusive results, statistical uncertainty and hypotheses. Never label a profiler snapshot as a proven leak.
- Local-first by default; no hidden uploads, automatic stress tests, shell injection, unapproved network traffic or code execution.
- Keep user-facing strings in **English and Spanish**, with keyboard/accessibility considerations.
- Never embed tokens, customer details, private logs or confidential code in commits, fixtures or public issues.

## Conventional commits and Pull Requests

Use Conventional Commits in English: `feat(scope): ...`, `fix(scope): ...`, `test(scope): ...`, `docs(scope): ...`, `chore(scope): ...`, `security(scope): ...`. Avoid unrelated churn and disruptive refactors.

PRs must include:
1. Linked issue or concrete problem statement and the minimal scope.
2. Measurable Definition of Done / acceptance criteria.
3. Test commands and actual evidence; mark blocked/skipped checks honestly.
4. Risk assessment (network target, permissions, resource budgets, credentials, privacy and potential backwards compatibility).
5. Updated docs, translations and changelog when behavior changes.
6. Sanitized logs, screenshots or minimal fixtures when useful, never secrets.

**Repository policy:** work through feature branches and PRs; do not push directly to protected main, force-push release tags, weaken rulesets or enable automatic publishing. The maintainer reviews and explicitly approves merging/releases.

Read [governance](docs/GOVERNANCE.md), [ruleset policy](docs/RULESETS.md), [support](SUPPORT.md) and [Code of Conduct](CODE_OF_CONDUCT.md). Vulnerabilities must be disclosed **privately** following [SECURITY.md](SECURITY.md).
