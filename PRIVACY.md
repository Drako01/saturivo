# Privacy — Saturivo

Saturivo does not implement telemetry or require a cloud account. It invokes locally installed k6 and Go binaries only when explicitly requested. The configured URL is sent by the user's local load generator to the chosen HTTP service.

Results are written to VS Code workspace extension storage as JSON and may contain target URLs, timing and machine characteristics. Reports are exported only when requested. No AI provider is contacted.

Do not embed secrets in URLs, commit reports to public repositories, or run against sensitive production systems. Workspace storage may survive extension uninstallation; users can remove it through their normal filesystem/VS Code data management.
