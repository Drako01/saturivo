# Saturivo — GitHub Repository Rulesets

**Reference implementation:** active rulesets verified on 2026-11-07 from [Probato PR](https://github.com/Drako01/probato-pr), [Indizivo](https://github.com/Drako01/indizivo) and [Orquestivo](https://github.com/Drako01/orquestivo).

**Verified live state (2026-11-07):** Both repository rulesets are now **ACTIVE**, installed by the owner. [Protect main](https://github.com/Drako01/saturivo/rules/26766004) (ID `26766004`) and [Protect release tags](https://github.com/Drako01/saturivo/rules/26766025) (ID `26766025`) were read back from GitHub and their conditions, required reviews/checks, and bypass actors match the versioned definitions and Orquestivo. Previously the list was empty; those earlier observations are superseded. The local authenticated `npm run rulesets:status` command is still **NOT RUN** from this session.

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
| Pull requests | 1 approval, stale reviews dismissed on new commits, CODEOWNERS approval, last-push approval, all review threads resolved |
| Merge | Squash only (enforced by ruleset policy; repository merge settings should also permit squash) |
| CI required | `Verify (ubuntu-latest)`, `Verify (windows-latest)`, `Verify (macos-latest)` with GitHub Actions App integration ID `15368` |
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

**Current status: already installed; do not import duplicate rulesets.** Only use `--apply` if rulesets are missing or show verified drift. Prerequisites for changes: repository owner/admin access and a token scoped to **Drako01/saturivo** with repository **Administration: Read and write**. Never copy or paste the token into this repository, issues, PRs, screenshots or chat.

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

**Solo maintainer:** the code owner is `@Drako01`, but GitHub will not count the PR author's own approval. The repository-admin **PR-only bypass** offers a traceable exception; do not globally disable review rules. Test how the bypass works on a real feature PR before treating it as a reliable solo-maintainer workflow.

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
