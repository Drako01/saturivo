# Saturivo Security Policy / Política de seguridad

Saturivo orchestrates load-generation and profiling tools. An incorrect target or uncontrolled subprocess can affect services and leak diagnostic information. **A non-preview extension is not security-certified.** The repository is public; vulnerability reports must not be made through public GitHub issues.

## Responsible disclosure

Report potential vulnerabilities privately through:
- [GitHub's private vulnerability reporting for Saturivo](https://github.com/Drako01/saturivo/security/advisories/new), **if available** for this repository; or
- [ArmoTuSitio support](https://armotusitio.com.ar/soporte/) with subject **Saturivo — Security Disclosure**, requesting a private channel.

Include reproduction steps and the affected commit/version using **sanitized synthetic fixtures**. Do not include production credentials, personal data, proprietary source or sensitive stack traces. Please avoid exploiting third-party systems or publishing details before the maintainer can review them. We do not promise an unverified response SLA.

## Current security boundaries

- Workspace Trust is required; untrusted and virtual workspaces are unsupported.
- Load begins only after an explicit user action. HTTP load is limited to GET/HEAD, with duration, VUs and request-count ceilings.
- Loopback targets are the default; remote load requires enabling a setting **and** per-run confirmation. Remote use is restricted to systems the tester owns or is authorized to evaluate.
- k6 redirects are disabled; generated scenarios and subprocesses do not use shell expansion.
- Process output/time and profile artifact sizes are bounded; cancellation and cleanup are tested, with additional cross-platform edge cases still being audited.
- Go profiling is opt-in and limited to literal loopback origins. pprof data is sensitive; it remains local unless the user explicitly exports it.
- Webview uses CSP, escaped dynamic values and an allowlisted set of actions.
- No built-in telemetry, automatic AI upload, background stress testing or automatic public release.

## Known limitations and risks

- **DNS/SSRF:** network hostname resolution, local services and remote opt-in still require a full security threat-model review. Do not treat user consent as protection against DNS rebinding or unintended downstream calls.
- **Local endpoints:** even a loopback test can modify state or saturate databases/dependencies. Run synthetic, isolated services.
- **Go tooling:** `go test` executes project code; confirm workspaces, test dependencies and runtime permissions.
- **Privileged diagnostics:** profiles, race reports and SARIF exports can expose internal paths, stack traces and identifiers. Redact before sharing.
- **Supply chain:** review k6 and Go binaries; never use untrusted binary paths. Release signing/provenance and full dependency/license audits remain acceptance gates.
- **Resource controls:** not all host/process-tree or filesystem limit cases are yet independently validated on every OS.

## Releases

No public release should be marked ready until the exact VSIX passes the gates in [Enterprise AAAA checklist](docs/ENTERPRISE_AAAA_UPGRADE_CHECKLIST.md), security review and manual owner approval. Any third-party vulnerability must be evaluated and documented by exploitability and shipped impact; unmitigated critical weaknesses in Saturivo's own code are blockers.

**En español:** Reportá fallas de seguridad en privado. Probá únicamente sistemas propios o con autorización explícita. No compartas credenciales ni perfiles sin anonimizar. No se asegura una certificación Enterprise AAAA hasta completar sus verificaciones.
