# Saturivo 0.2.0 — Security threat model (living document)

**Scope:** public VS Code extension source, local Control Center, child-process execution, local-only profiling, evidence files and the protected publication pipeline. This is an engineering review, **not** external security certification.

## Trust boundaries

| Boundary | Untrusted input | Required control |
|---|---|---|
| Webview → Extension Host | scenario form and action messages | action allowlist; parse and validate every field in extension; never trust target, privileges or limits supplied by the page |
| Workspace → Go toolchain | project source, tests, benchmarks | Workspace Trust plus explicit user confirmation; tests may execute arbitrary local project code |
| Extension → HTTP target | URL, DNS, redirects, configured workload | HTTP(S) GET/HEAD only, loopback default, opt-in remote settings, authorization modal, finite request/time/VU budgets |
| Extension → profiler | runtime stack/heap/trace from process | only literal loopback IP and HTTP; no credentials/redirects; deadlines/size cap; explicit consent; local storage |
| Extension → operating system | binary path and child process tree | no shell, bounded output, timeout, AbortSignal, terminate descendant tree on cancel where supported |
| Evidence → Webview/export | JSON, names, paths, metrics, stack data | schema and size validation, HTML escaping and CSP, safe export defaults; user controls sharing |
| GitHub CI → public registries | package, tags, credentials and provenance | pinned actions, least privilege, exact manifest/checksum, owner-controlled protected tag and approval environments |

## Attack and failure cases

| Risk | Current mitigation or observation | Open verification |
|---|---|---|
| SSRF to metadata, private or unapproved service | loopback is default; target authority is validated; remote testing requires separate opt-in and per-run confirmation | **PARTIAL:** public-IP validation and DNS pinning with adversarial tests added; proxy/IPv6 edge cases and actual hostile network fixture sign-off remain |
| Spoofed localhost/DNS result | k6 explicitly pins localhost to 127.0.0.1; literal loopback addresses accepted; redirects disabled | **PARTIAL:** attack matrix for alternate encodings, IPv4/IPv6 and proxy settings |
| Unbounded load or automatic traffic | no run on activation, defined requests/VUs/duration/arrival ceilings; explicit form submit and consent | **PARTIAL:** installed VSIX stress/cancel UI E2E, budget exhaustion and cleanup probes |
| Adversarial Go correlation cancellation | A failed mid-load profile now aborts its owned in-flight k6 run; profile reads are regular-file/size checked | **PARTIAL:** targeted tests added, exact-SHA CI and hostile remote/Windows validation pending |
| Child-process escape or zombie descendants | shell disabled; POSIX detached process group kill and Windows taskkill tree | **PARTIAL:** adversarial process descendants on all three OSes |
| Malicious imported history | max 100 KiB, numeric/fingerprint/type checks, atomic write and corruption-tolerant reads | **PARTIAL:** version migration/reimport roundtrip and malformed field matrix |
| Visual URL disclosure | Target URL query/fragment values are not displayed in the Control Center; runtime configuration and workload identity remain unchanged | **PARTIAL:** exact-SHA CI and manual shoulder-surf/screen reader review pending |
| Evidence export privacy | Markdown strips URL query values while retaining the original scenario SHA; full-fidelity JSON requires an explicit local consent modal | **PARTIAL:** secrets in URL paths/manual JSON sharing remain operator risks; cross-platform E2E and redaction review required |
| Profile/data exfiltration | local storage, no network upload/telemetry/AI by default; 4 MB/profile and 15 s/request, plus 30 owned files / 64 MiB local storage ceiling | **PARTIAL:** configurable run retention and Go profile quota added; export redaction and end-to-end limits still require review |
| Misleading diagnostics | observed vs inferred distinctions; no race freedom or leak certainty claims | **PARTIAL:** independent Go contention and goroutine-growth fixtures |
| Third-party dependency advisories | lockfile, CycloneDX SBOM, scope-separated license inventory | **PARTIAL:** exact-version release audit; development-only warnings must be disclosed |
| Forged/repackaged release | pinned workflow actions, immutable VSIX/checksum and protected publish jobs | **PARTIAL:** exact release candidate install/upgrade and approval verification |

## Security invariants for every release

1. A run is always preceded by an explicit user action. Remote authorization is never inferred from changing a setting alone.
2. A scenario cannot override the extension's target or security policy through Webview payloads.
3. Every active process and request has a bounded deadline and abort path; unauthorized background load is prohibited.
4. Imported, generated and captured evidence is local, size-bounded and never exported without user action.
5. PASS requires a named test plus the exact commit/runner/CI URL. An absent test is NOT RUN.
6. A green pull request is **not** a release authorization. Publishing requires the maintainer's protected tag and registry environment approvals.

## Residual risks and release blockers

- Testing an explicitly approved remote endpoint can still impact dependent systems; authorization and isolation remain the operator's responsibility.
- Remote DNS rebinding/private network and proxy cases are not fully mitigated or fixture-verified. Do not market remote load testing as SSRF-hardened.
- Complete Windows/macOS installed VSIX execution, process descendant cleanup and VSIX upgrades have not yet been evidenced.
- Optional AI, remote runtime adapters and external protocol engines must never be introduced through silent downloads.
- Sensitive snapshots, trace files and race output require a documented retention/redaction review.

## Required evidence

Record the exact commit, job URL, runtime versions, scenario fingerprint, approved endpoint classification, abort/cleanup result, artifact checksum, failure-case results and the reviewer/release sign-off. Maintain links in [the live checklist](ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md).

**Status:** model documented; threat-model sign-off and unresolved fixtures remain open. This document does not declare Enterprise AAAA complete.

## SSRF hardening — IPv6 transitional prefixes (2026-11-07)

- Normalize IPv6 before classification so leading-zero documentation addresses cannot bypass checks.
- Fail closed on 6to4 (2002::/16), Teredo/ORCHID special use (2001::/23), documentation (2001:db8::/32) and deprecated 6bone (3ffe::/16). Mixed public/private DNS remains rejected rather than silently selecting a public answer.
- Coverage: deterministic unit tests with literal IPv6 URLs and injected DNS answers. **Pending:** exact-commit CI and manual proxy/redirect/rebinding matrix; this does not claim comprehensive SSRF elimination.
