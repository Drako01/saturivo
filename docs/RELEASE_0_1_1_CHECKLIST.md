# Saturivo 0.1.1 — Enterprise AAAA release tracker

**Base:** main `a3eaa3768b6b43e811a0b7b6bf1b71e574a644a0` (6/6 CI PASS). **Branch:** `feat/enterprise-aaaa-v0.1.1`. **Policy:** no merge or publication without maintainer approval.

This is a **working checklist**, not a claim of completeness. Mark PASS only when tests and implementation are verified on the corresponding commit.

| Gate | Status | Evidence/acceptance |
|---|---|---|
| 0.1.0 compatibility, migration, strict TS | IN PROGRESS | 0.1.0 history and public commands remain supported |
| P1 scenario v2, baseline and richer metrics | TODO | strict schema, fingerprint/environment comparison, k6 fixture E2E |
| P1 statistical / local capacity experiment | PARTIAL | 3×3×3 fixture PASS on base; real pilot step E2E still missing |
| P2 Go tracing, pre/during/post, correlator | TODO | Go fixture, real captures, no invented root cause |
| P3 protocol/runtime adapters | TODO | gRPC or WebSocket E2E; HTTP Go + 2 additional fixtures; unsupported explicit |
| P4 UX, scenarios, history, source links, ES/EN | IN PROGRESS | PR #5: editor-sized Control Center, four accessible tabs, ES/EN, observational trend chart; verify CI and installed VSIX host, screenshots forthcoming |
| P5 threat model and adversarial tests | TODO | SSRF/DNS, redirects, process tree, output and secrets |
| P5 exact-release VSIX/upgrade/security | TODO | artifact checksum, audit, SBOM, third-party WARN, signed off |
| OIDC protected publish workflow | TODO | same immutable VSIX to both registries; manual release approvals |
| 0.1.1 publication | BLOCKED | owner sign-off, private flag, release CI, approved envs |

**Known risks:** `npm audit --omit=dev` was reported as 0 vulnerabilities for the 0.1.0 package by the maintainer; three moderate advisories in development tooling `@vscode/vsce`/glob/minimatch require re-evaluation for 0.1.1. Avoid force-upgrades without compatibility evidence.

**Safety:** never run load automatically, no hidden downloads or remote execution, only explicit authorized targets; runtime profiles may contain sensitive information and remain local.
