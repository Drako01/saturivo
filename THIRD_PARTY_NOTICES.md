# Saturivo 0.2.0 — Third-party notices and shipped component scope

This notice applies to the **packaged VSIX**, not to every package installed in the development checkout.

## Included in the extension

- Saturivo TypeScript compiled JavaScript, extension metadata and original application assets.
- Saturivo source and original assets: MIT license, see `LICENSE.txt`.
- No third-party Node.js runtime packages are declared in `package.json`. The VSIX is built with `vsce package --no-dependencies`, and the ZIP auditor rejects `extension/node_modules/`.

## Tools used externally, not shipped with the VSIX

- Grafana k6, the Go toolchain and runtime, Python, Node.js fixture servers, and Docker Compose are optional *external* tools or CI fixture dependencies. Saturivo does not silently install or redistribute these executables.
- `@vscode/vsce`, `@vscode/test-electron`, TypeScript and `@types/*` are **development-only** dependencies, not binaries shipped inside the extension.

## Release verification

The CI produces a lockfile-wide CycloneDX SBOM and license inventory **separately** from the VSIX. Those documents include development dependencies and must not be presented as an exact list of shipped executable libraries.

The release auditor checks the actual VSIX envelope, an allowlist of mandatory files, and the absence of bundled `node_modules`, tests, CI source and secret-looking files. Review `reports/saturivo-licenses.md` for license exceptions and warnings, `saturivo.release.json` for the exact source SHA and VSIX SHA-256, and the exact final VSIX file list. Manual license/provenance sign-off is still required; this notice alone is not a legal opinion or supply-chain attestation.
