# Saturivo — CI and release automation (since 0.2.2)

## Contract

1. `ci.yml` runs for pull requests targeting `main`. It validates the **exact PR HEAD SHA** on Linux, Windows, macOS, k6, VS Code Extension Host, Go and Chromium. The `Verify (...)` check names remain those required by `Protect main`.
2. Solo maintainer: squash-merge a green PR into protected `main` (no independent human reviewer). **No second CI run is scheduled on `main`**. The only workflow triggered by that push is `publish.yml`.
3. The publish authorization job checks that the version increased relative to the previous `main` commit and that the changelog contains a finalized version. Unchanged-version merges are skipped without publishing.
4. For a version bump, `scripts/verify-merge-ci.cjs` resolves the associated merged PR via GitHub, requires its **merge commit SHA** and base branch to match, compares the original PR HEAD **Git tree SHA** to the squash-merge tree, and fetches the newest CI run and all seven successful jobs for that exact PR SHA. Missing, stale or failed evidence stops the release.
5. The release workflow **does not repeat PR unit, integration, Windows/macOS or smoke-test suites**. It builds and packages a VSIX from the merged source, audits/checksums it, archives SBOM/licenses and attests to its bytes. These are necessary publication artifacts, not a second PR CI.
6. Once packaging succeeds, the release-tag job creates or verifies immutable `v<package.json version>` at the exact `main` SHA using `contents: write`. A different existing SHA, an advancing `main` branch, or a GitHub ruleset rejection blocks publication; it never force-pushes or modifies rulesets.
7. Marketplace and Open VSX publish the **same verified VSIX** using OIDC Trusted Publishers and their separate named GitHub Environments. The release job does not require a second human reviewer or an optional Environments deployment-branch-policies API call. The authorization step checks the exact protected `main` SHA; the environments preserve separate OIDC identities. Only after the required registry jobs complete can the GitHub Release be created from the approved tag; its VSIX and sidecar checksum are downloaded and checked.

## Recovery and failure semantics

- A merge without a version bump triggers `publish` but does **not** publish.
- A direct push or squash merge whose tree differs from the green PR HEAD **fails closed**.
- If the tag cannot be created with `GITHUB_TOKEN`, investigate GitHub rules and job permissions; do not disable protections or claim success. An administrator may need to explicitly create the same immutable tag and then use confirmed `workflow_dispatch` on `main` for recovery.
- Manual `workflow_dispatch` requires `confirmation=PUBLISH_SATURIVO`, matching `version`, and a pre-existing protected tag at the exact `main` SHA. An existing GitHub Release skips duplicate publication.
- OIDC registry identity remains tied to workflow `publish.yml` and environments `marketplace` and `open-vsx`. Do not switch to PATs.
- Release failures must not be marked PASS. Published registry artifacts are immutable; resolve partial failures through the existing recovery mechanism without rebuilding a different VSIX for the same version.
- The versioned `Protect main` policy is adjusted for one maintainer: 0 human approvals, PR required, strict seven-job CI and squash-only history; live ruleset changes require admin access. `Protect release tags` is unchanged.

**Reference:** [`ci.yml`](../.github/workflows/ci.yml), [`publish.yml`](../.github/workflows/publish.yml), [repository rulesets](RULESETS.md).

## Solo-maintainer patch release 0.3.1 (2026-11-10)

The merge of 0.3.0 ([PR #9](https://github.com/Drako01/saturivo/pull/9), `9e5d8a8`) passed exact SHA and seven-job CI evidence, but [publish #42866596867](https://github.com/Drako01/saturivo/actions/runs/42866596867) failed at an optional Environments API endpoint returning HTTP 404; **no release 0.3.0 was published**.

Version 0.3.1 updates release governance and metadata only. `verify-merge-ci.cjs` still checks the exact merged PR HEAD, identical squash tree and all seven successful PR CI jobs. `verify-release-policy.cjs` requires repo identity, `refs/heads/main`, protected branch and same SHA, while verifying the workflow's named OIDC environments. No second person is required for publication.

After a green 0.3.1 PR is squash-merged, normal `push` to `main` automatically triggers `publish.yml` with no re-run of the PR test matrix. Keep the environment names for OIDC. If GitHub Settings have required reviewers explicitly configured, only the repo owner can remove that administrative restriction; editing YAML cannot override platform approvals. The manual `workflow_dispatch` recovery flow still requires a pre-existing immutable tag and matching version.
