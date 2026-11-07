# Saturivo 0.2.0 — Protected release process

**State: staged for review in PR #5. No publication has been triggered.** This document is a release checklist, not an assertion that OIDC credentials or GitHub Environments were validated.

## Prerequisites

- The maintainer has registered Trusted Publishing for `Drako01/saturivo` and `publish.yml` in Visual Studio Marketplace (environment `marketplace`) and Open VSX (environment `open-vsx`).
- In GitHub → Settings → Environments, create `marketplace`, `open-vsx` and `github-release`. Require approval by a maintainer and restrict deployments to `main`/approved tags.
- Check that both registry namespaces are verified and the release version does not exist; GitHub OIDC must use `id-token: write`. Remove `OVSX_PAT` and `VSCE_PAT` from these jobs (a PAT can take precedence with Open VSX).
- `Protect release tags` protects `v*`; the maintainer, not an untrusted CI run, creates the tag for the exact `main` SHA.

## Publishing a finalized version

1. Complete `docs/RELEASE_0_2_0_CHECKLIST.md` and approve the release candidate. The source repository is public: do not add `private: true`. The final commit must have version `0.2.0`, no `preview` manifest field and a **maintainer-approved, dated** `## [0.2.0] — YYYY-MM-DD` section in `CHANGELOG.md`. That finalization is **not authorized at this stage**.
2. Merge the reviewed release PR. Read the exact commit SHA in `main` and create the protected `v0.2.0` tag at that SHA using an authorized maintainer account. This tag push triggers the publishing workflow.
3. The workflow validates version, source and protected tag **before** publishing. It runs multi-OS verification; builds one exact audited VSIX with SHA-256, a commit-bound release manifest, SBOM and provenance attestation.
4. Two publishing jobs download and check the **same immutable artifact**, then use OIDC + the already configured Trusted Publishers to publish to each registry. The release job rechecks the artifact and creates GitHub Release.
5. Never force-update or recycle a release tag. Do not mark a partially successful publish as complete.

## Partial-publish recovery

From Actions → publish → Run workflow, select `main`, type `PUBLISH_SATURIVO`, supply exact version, failed registry and, optionally, earlier publish run ID. Reusing the VSIX requires its release manifest to match **both exact SHA and exact version**. The workflow must never rebuild a VSIX silently for a partial recovery.

## Limitations and operational notes

- If you push the release commit before creating its protected tag, the push job safely **skips** publication; the tag event then starts it. This is deliberate and avoids a GitHub Release failing after marketplace publication.
- The workflow is not tested end-to-end until an approved real release. Never claim the protected environments, OIDC exchanges or registry listing as PASS without their real logs.
- Version 0.1.0 remains the installed-upgrade baseline. Version 0.2.0 is the next intended release candidate; no protected tag, merge or registry publication is authorized by this PR.
