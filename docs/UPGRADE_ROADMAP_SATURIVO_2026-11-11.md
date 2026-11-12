# Saturivo — Upgrade roadmap 0.4.0 (2026-11-11)

**Baseline:** 0.3.1 stable. **Candidate:** 0.4.0. **Primary KPI:** trustworthy evidence and successful first-use experience; *retention uplift cannot be asserted without opt-in product measurement*.

## Phase 0 — Source of truth (implemented, acceptance pending CI)

- Reconcile README/STATUS/ES manual with actual 0.3.1 release. Treat 0.4.0 as unpublished candidate.
- Preserve all current logo/icon files, colors, layout, CSS and screenshot provenance.
- **DoD:** manifest/lockfile/docs agree; no misleading unpublished/published claims; documentation-sync test passes.

## Phase 1 — Evidence accuracy and privacy (implemented, acceptance pending CI)

- Audit `history.ts`, `metrics.ts`, `websocket.ts`, logging.
- Keep only N newest valid run reports while preserving invalid entries until explicit cleanup; never hide old valid evidence behind 100 malformed new filenames.
- Reconcile observed HTTP status buckets to request count whenever counters exist; reject corrupt dropped-iteration evidence.
- Redact query strings in WebSocket Markdown/logging without modifying actual authorized URL.
- **DoD:** new deterministic tests pass on all three OS CI jobs; no old-schema JSON compatibility regressions.

## Phase 2 — First-run experience (implemented, acceptance pending CI)

- Add localized Check setup using the Control Center's existing buttons and a command-palette entry.
- Verify k6 and optional Go locally with bounded version commands; check active URL allowlist and display clear next steps.
- **DoD:** explicit opt-in only; opening webview sends zero traffic; missing k6 yields a report; concurrent actions use lifecycle lock; cancellation releases slot.
- **Non-goal:** real network reachability test, automatic dependency installation, new visual identity or telemetry.

## Phase 3 — End-to-end gates and release (pending external evidence)

- Require exact head SHA seven-job CI including local k6/Go/WebSocket fixtures, TypeScript, Chromium, native VS Code and upgrade smoke.
- Verify permissions, release artifact checksum, branch ruleset and OIDC provenance.
- **DoD:** all mandatory checks green; no bypass of failing gates; PR ready for user merge; publish only by main-release workflow.

## Phase 4 — Residual UX assurance (not automatically testable)

- Manually confirm keyboard/focus/reader, high contrast, ES/EN translations and WSL/SSH/Containers PATH resolution.
- Compare first-run completion and support issues via privacy-respecting, opt-in observation **only if later authorized**.
- **DoD:** record evidence; do not infer improved retention from download counts alone.

## Rollback

Keep 0.3.1 available and immutable; avoid data-format migrations. If release or regression issues arise, stop the 0.4.0 rollout and reinstall the verified previous VSIX; preserve workspace history.
