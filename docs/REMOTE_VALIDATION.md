# Saturivo 0.2.0 — Remote/host acceptance (BLOCKED until executed)

**Evidence status:** WSL, Remote-SSH and Dev Containers have not been exercised in this session. The manifest declares `extensionKind: ["workspace"]`; in remote VS Code, `127.0.0.1` belongs to the remote extension host, not necessarily the Windows desktop.

## Exact-SHA preflight commands in the remote host

From a clean clone at the **actual candidate SHA**, in a trusted remote VS Code terminal with installed Go, Node and k6:

```sh
git rev-parse HEAD
node --version
npm --version
go version
k6 version
npm ci --ignore-scripts --no-audit --no-fund
npm run verify
npm run build
npx --no-install vsce package --no-dependencies --out saturivo.vsix
node scripts/audit-vsix.cjs saturivo.vsix
node scripts/go-overhead.cjs
npm run test:integration:k6
npm run test:integration:network-adversarial
```

Missing dependencies are **BLOCKED/NOT_SUPPORTED**, never PASS. These commands establish CLI results, not full interactive extension compatibility.

## Host-specific interactive verification

| Host | Required checks | Status |
|---|---|---|
| WSL2 | VS Code WSL window, install candidate VSIX in **WSL** extension host, run and cancel only a WSL loopback fixture, inspect history and verify no descendant processes | BLOCKED |
| Remote-SSH | Disposable trusted SSH host, VSIX installed on that host, local-host versus remote-host loopback isolation, bounded run/cancel, source folder selection | BLOCKED |
| Dev Containers | Disposable container with Go/k6, VSIX installed **in container**, network scope and process cleanup, history after reload | BLOCKED |
| Multi-root remote | Two unrelated folders: explicitly select intended root; cancel QuickPick without starting a run | BLOCKED |

Use VS Code's **Extensions: Install from VSIX...** in the remote window and **Developer: Show Running Extensions** to verify host placement. Before each test: identify active host in Control Center, check that opening it produces **zero** traffic, and start only authorized disposable loopback fixtures. Do not send load to production or third parties.

## Persistence E2E across real installed VSIX upgrade

1. Verify the exact candidate's SHA-256: `node scripts/vsix-checksum.cjs write saturivo.vsix && node scripts/vsix-checksum.cjs check saturivo.vsix`; bind it to the same git SHA and release manifest.
2. Install the pinned 0.1.0 baseline, create a disposable history record, then upgrade to 0.2.0 **without replacing the VS Code profile or storage directory**.
3. Import v1 JSON via the **actual file dialog**, export v2 with disclosure/consent, reimport it and verify metrics and scenario hash. Reload VS Code: verify persistence.
4. Delete imported history in the UI, reload and verify deletion. Repeat with errors and cancel mid-test; inspect the host for orphan children.
5. Record the OS, VS Code version, remote name, runtime/toolchain, exact commit, VSIX SHA-256, UI screenshots, output and operator. Without these, keep BLOCKED.

## Accessibility and UX manual verification

On Windows/macOS and each declared remote host: VS Code at **200% zoom**, light/dark/high-contrast themes, keyboard-only skip link/tab/inspector/selection/import/export/cancel, focus recovery and NVDA/VoiceOver. Browser DOM smoke is not a substitute for screen reader testing.

| Environment | Exact SHA + VSIX hash | Evidence | Approver | Status |
|---|---|---|---|---|
| WSL2 | — | — | — | BLOCKED |
| Remote-SSH | — | — | — | BLOCKED |
| Dev Containers | — | — | — | BLOCKED |
| Windows/macOS installed UI and screen reader | — | — | — | BLOCKED |

**No claim of complete remote support or release approval until these checks are executed.**
