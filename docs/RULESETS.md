# Saturivo — GitHub Repository Rulesets

**Reference implementation:** active rulesets verified on 2026-11-07 from [Probato PR](https://github.com/Drako01/probato-pr), [Indizivo](https://github.com/Drako01/indizivo) and [Orquestivo](https://github.com/Drako01/orquestivo).

**Historical live state (2026-11-07):** Both original repository rulesets were active. The 0.3.0 versioned policy now requires seven jobs and strict checking; this updated policy has NOT been verified live. [Protect main](https://github.com/Drako01/saturivo/rules/26766004) (ID `26766004`) and [Protect release tags](https://github.com/Drako01/saturivo/rules/26766025) (ID `26766025`) were read back from GitHub and their conditions, required reviews/checks, and bypass actors match the versioned definitions and Orquestivo. Previously the list was empty; those earlier observations are superseded. The local authenticated `npm run rulesets:status` command is still **NOT RUN** from this session.

## Source of truth

- [Protect main](../.github/rulesets/protect-main.json)
- [Protect release tags](../.github/rulesets/protect-release-tags.json)
- [Governance automation](../scripts/rulesets.mjs) — safe-by-default offline check, read-only status and explicit apply
- [CODEOWNERS](../.github/CODEOWNERS) — @Drako01

## Protection contract

| Rule | Expected state |
|---|---|
| Main branch | `Protect main`, active, matches `~DEFAULT_BRANCH` |
| History | Block branch deletion, non-fast-forward pushes; require linear history |
| Pull requests | **0 human approvals** (sole owner); PR required, review threads resolved; no CODEOWNER/last-push approval |
| Merge | Squash only (enforced by ruleset policy; repository merge settings should also permit squash) |
| CI required | All seven entries exported by `scripts/verify-merge-ci.cjs::REQUIRED_JOBS`, with `strict_required_status_checks_policy: true` and GitHub Actions integration ID `15368` |
| Admin exception | Repository-admin role may bypass **only through a PR**, like the reference extensions |
| Tags | `Protect release tags` active on `refs/tags/v*`; disallow update, deletion and non-fast-forward |
| Tag exception | Repository-admin role may bypass when genuinely required; document the reason |

These checks match job names that already exist in `.github/workflows/ci.yml`. CI protects syntax, type safety and tested behavior but is **not** equivalent to a complete security/release approval.

## Validate without changing repository settings

```bash
npm ci --ignore-scripts
npm run rulesets:check
```

This command verifies the versioned definitions, expected GitHub Actions job contexts, bypass/approval rules and CODEOWNERS. It does **not** claim that the live rulesets are active.

## Administration (only if the rulesets are missing or drifted)

**Current 0.3.0 status: updated definitions are versioned but application to the live repository is NOT VERIFIED. Do not import duplicate rulesets.** Only use `--apply` if rulesets are missing or show verified drift. Prerequisites for changes: repository owner/admin access and a token scoped to **Drako01/saturivo** with repository **Administration: Read and write**. Never copy or paste the token into this repository, issues, PRs, screenshots or chat.

Using PowerShell 7 with authenticated GitHub CLI:

```powershell
gh auth status
$env:GH_TOKEN = gh auth token
try {
    npm run rulesets:check
    node scripts/rulesets.mjs --apply --confirm=Drako01/saturivo
    npm run rulesets:status
} finally {
    Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue
}
```

The apply operation is **explicit and idempotent by name/target**. It creates missing `Protect main`/`Protect release tags` rulesets, updates matching definitions that have drifted, and **does not delete unrelated existing rulesets**. It never logs the token. If the token lacks permissions, the command fails closed. Re-run `rulesets:status` with the same privileges to confirm live state.

Alternative: create the rulesets through [Saturivo → Settings → Rules → Rulesets](https://github.com/Drako01/saturivo/settings/rules) using the versioned JSON definitions, then run the authenticated status check.

## Important considerations

**Solo maintainer:** CODEOWNERS remains `@Drako01` for ownership, but a sole PR author cannot approve their own PR. The 0.3.1 ruleset therefore requires **zero human approvals** while preserving PRs, strict seven-job CI, squash-only merges and resolved review threads. The administrative PR-only bypass remains available but should not be needed just to omit a second reviewer.

**Exact status names:** do not rename `Verify (ubuntu-latest)`, `Verify (windows-latest)` or `Verify (macos-latest)` without updating the rulesets and the governance checker first.

**Release tags:** `Protect release tags` currently prohibits tag updates, deletion, and non-fast-forward movement; it does **not** prohibit new tag creation. After a green PR merges and the immutable VSIX has been packaged, `publish.yml` attempts to create the new `v*` ref using the scoped GitHub Actions token (`contents: write`) and checks that it points to the exact `main` SHA. If GitHub rejects creation, release fails closed without weakening the ruleset. See [release automation](RELEASE_AUTOMATION.md).

**Repository merge settings:** verify squash merge is enabled and incompatible merge paths are disabled as desired. Versioned ruleset JSON does not change repository-level merge settings.

## Current verification matrix

| Gate | Status |
|---|---|
| Reference rulesets inspected | **PASS** — 3 related repositories checked |
| Saturivo live rulesets list | **2 ACTIVE** — Protect main `26766004`, Protect release tags `26766025` |
| Versioned JSON & script | Implemented in PR #4; CI evidence pending on latest SHA |
| Actual ruleset installation | **PASS** — live ruleset configurations read back and compared with Orquestivo |
| Authenticated `rulesets:status` | **NOT RUN** |
| Release workflow/tag bypass smoke | **NOT RUN** |

Do not mark these gates PASS merely because a PR is green. Documentation and the live GitHub settings are distinct.

## Release environments for solo owner (0.3.1)

The publish preflight does **not** require an independent human approver or query optional `environments/*/deployment-branch-policies` API endpoints. The 0.3.0 release attempt [#42866596867](https://github.com/Drako01/saturivo/actions/runs/42866596867) passed exact PR/CI validation but received GitHub HTTP 404 at that endpoint. Version 0.3.1 uses `verify-release-policy.cjs`, which requires the correct repository, protected `main`, identical SHA and OIDC-named publish jobs, in addition to exact successful seven-job PR evidence.

GitHub Environments `marketplace`, `open-vsx` and `github-release` remain in the workflow. **If they have required reviewers configured at GitHub Settings, those platform settings will still block the jobs**, regardless of code. The sole owner can disable those settings under [Settings → Environments](https://github.com/Drako01/saturivo/settings/environments).

The versioned `Protect main` ruleset now requires zero human approvals. Apply it to the live repository with an explicit administration-scoped token; committed JSON does not change GitHub Settings. The authenticated `rulesets:status` command verifies rulesets only; it no longer queries optional Environment policies.

For supply-chain tracking, the 2026-11-10 audit found three moderate `minimatch` advisories through development-only `@vscode/vsce`. The distributed extension has no runtime dependencies, and `npm audit --omit=dev` was zero at the audited SHA. The informational CI runtime audit does not waive unresolved build-tool advisories; revisit when upstream fixes become available. Secret scanning, push protection and Dependabot require independent GitHub Settings verification.
