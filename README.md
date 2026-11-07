# Saturivo

**Load & Concurrency Inspector — by ArmoTuSitio**

> Private pre-release • v0.1.0 • Development status is documented in `STATUS.md`.

Saturivo is a VS Code extension for **evidence-first local performance engineering**. It connects bounded k6 load experiments to repeatable results, comparison against a baseline, and explicit Go test commands. It does **not** claim automatic root-cause analysis or production capacity certification.

## Funcionalidades (ES)

- Centro de Control al hacer clic en el ícono de la barra lateral.
- Ejecución manual de pruebas de carga con **k6**: rápida (1 VU), estrés limitado (hasta 20 VUs), tasa de llegadas (25 iteraciones/s, hasta 20 VUs).
- Duración configurable entre 5 y 120 segundos; límite global máximo 100 VUs. Sin ejecución automática.
- Métricas HTTP: solicitudes, RPS, tasa de errores, latencia promedio/P50/P95/P99 e iteraciones descartadas.
- Historial persistido localmente y comparación descriptiva contra una ejecución anterior del mismo escenario.
- Exportación Markdown y comandos explícitos de Go (`go test -race ./...`, `go test -run ^$ -bench . -benchmem ./...`).
- Interfaz ES/EN, validación de Workspace Trust y política de destinos de loopback de forma predeterminada.

## Features (EN)

- One-click Control Center in the VS Code Activity Bar.
- Explicit, bounded k6 smoke / stress / open-loop arrival-rate presets.
- Local run history, Markdown reports, and baseline regression heuristics.
- Optional Go race detection and benchmark execution after confirmation.
- Safe-by-default local targets, ES/EN UI, CSP-protected webview.

## Requirements

- VS Code **1.99+**, Node **22+** for development, and [Grafana k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) installed locally and available in `PATH` (or configured in `saturivo.k6Path`).
- For Go-specific commands: a local Go toolchain and a trusted Go project folder.
- Supported initial protocol: **HTTP(S) GET and HEAD**. No POST/PUT/PATCH/DELETE load generation in v0.1.0.

## Run locally

```bash
git clone https://github.com/Drako01/saturivo.git
cd saturivo
git switch feat/initial-enterprise-foundation
npm install
npm run verify
npm run package:vsix
```

Press **F5** in VS Code to open an Extension Development Host, or install the generated `saturivo.vsix` with **Extensions: Install from VSIX**.

Open a folder containing your API. Start the API on `http://127.0.0.1:8080/`. Click the Saturivo icon and choose **Configure Target**, then run **Smoke**, **Stress** or **Arrival Rate**. Nothing runs just by opening the extension.

### Settings

| Setting | Default | Purpose |
|---|---|---|
| `saturivo.target` | `http://127.0.0.1:8080/` | The API endpoint (HTTP/S) |
| `saturivo.allowRemoteTargets` | `false` | Must be enabled for non-loopback targets, with another confirmation each run |
| `saturivo.k6Path` | `k6` | Executable name or path |
| `saturivo.durationSeconds` | `10` | Duration: 5–120 seconds |
| `saturivo.maxVirtualUsers` | `100` | Hard ceiling: 1–100 VUs |

**Caution:** A remote test can impact real services even when bounded. Only test services you own or have permission to test. Do not put secrets in target URLs or commit exported reports containing sensitive information.

## Verification

```bash
npm run typecheck
npm test
npm run smoke:manifest   # after npm run build
npm run verify
```

CI verifies Linux, Windows and macOS and builds a preview VSIX on Linux. No automatic Marketplace/Open VSX publication is configured.

## Architecture and evidence

See `ARCHITECTURE.md`, `docs/METHODOLOGY.md`, `docs/ACCEPTANCE_CRITERIA.md`, `ROADMAP.md`, `STATUS.md`, `SECURITY.md` and `PRIVACY.md`.

**Disclaimer:** the preliminary comparison rule uses heuristic thresholds, not repeated-trial statistical inference. Saturivo v0.1.0 is a foundational MVP, not an Enterprise AAAA-complete product.

Developed by Alejandro Daniel Di Stefano · [ArmoTuSitio](https://armotusitio.com.ar) · MIT License.
