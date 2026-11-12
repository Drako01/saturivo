# Saturivo 0.4.0 — release acceptance checklist

**Base:** `main` `c34b22ffabcfed24d681b5a46457a49c07a2ad10` (0.3.1 published). **Candidate:** 0.4.0. **Release:** NOT PUBLISHED.

## Mandatory CI — exact candidate SHA (pending until GitHub reports results)

- [ ] Verify (Linux/macOS/Windows), including `npm run verify`, TS compilation, coverage, license and manifesto.
- [ ] Real k6 HTTP local fixture and 3+3 repeated-regression fixture.
- [ ] Real VS Code Extension Host, cancellation and upgrade from pinned 0.1.0.
- [ ] Real Go race, pprof, runtime matrix, WebSocket and adversarial network fixtures.
- [ ] Chromium dashboard interaction tests.
- [ ] Package auditing, SBOM, SHA-256, lockfile/manifest consistency and publish provenance.
- [ ] All seven required checks green for the PR head SHA; no post-merge duplicate CI.

## Functional and privacy regression criteria

- [ ] 101+ newest corrupt files do not hide the older valid history record.
- [ ] Prune preserves N newest *valid* reports; corrupt entries are not silently deleted.
- [ ] Partial HTTP statuses, negative/fractional counters and invalid dropped iterations fail closed.
- [ ] WebSocket Markdown and log never reveal the URL query; authorized workload target remains unchanged.
- [ ] Check setup reads versions only and does not send traffic, including when first opened.
- [ ] Unavailable k6 gives a useful diagnostic; optional Go never blocks setup.
- [ ] Cancelled check exits without leaving busy state.
- [ ] Existing four tabs, scenarios, history import/export, SLOs and race/pprof navigation retain prior behavior.
- [ ] Same icon SVG/PNG and CSS design tokens as 0.3.1; one additional existing-style button only.

## Manual or environment-dependent checks — **NOT RUN until verified**

- [ ] Native dialogs and keyboard/screen-reader walkthrough (ES/EN).
- [ ] Actual remote host WSL, SSH and Dev Containers path/PATH behavior.
- [ ] Windows/macOS/Linux upgraded installed VSIX and workspace-history integrity (CI runs these, verify evidence).
- [ ] Check Marketplaces/Open VSX and GitHub Release after a future authorized merge and publish.

## Release protocol

1. Inspect and approve diff + exact SHA checks.
2. Merge via existing protected `main` rules; no second human approval required for sole owner.
3. Publish only via authorized existing workflow and verify VSIX checksum, provenance and both registries.
4. If a gate fails, fix in a fresh PR; do not bypass failures.
5. Roll back using the last known-good signed 0.3.1 release; do not delete user history.

No screenshot in this PR should be represented as a new live benchmark. Existing screenshots are historical, synthetic and unchanged.
