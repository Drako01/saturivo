# Security policy — Saturivo

Report potential security issues privately to the maintainer before public disclosure. Do not submit credentials or real customer data to issues.

## Security boundaries

- Workspace Trust is required; untrusted/virtual workspaces are unsupported.
- Load runs require user action and only generate GET/HEAD requests.
- Non-loopback addresses are denied by default; remote URLs require opt-in plus per-run modal confirmation.
- Direct child process execution uses no shell; k6 redirects are disabled and workload sizes are bounded.
- Webview has a Content Security Policy, escapes dynamic HTML and allows only declared actions.
- Temporary scenario files are deleted. History remains local; there is no telemetry.

## Remaining risks

- k6 may resolve a hostname to another IP; DNS-based protection is not yet implemented. For safety, default to literal loopback addresses.
- A local URL can refer to sensitive developer services: review target before clicking Run.
- Go tests may execute project-defined code; they require explicit consent.
- Custom k6 executable paths are user controlled. Treat binaries and workspaces as trusted inputs.
- Process-tree termination and max filesystem resource consumption require further hardening.

**Policy:** do not publish until security and cross-platform install checks pass.
