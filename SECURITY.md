# Security Policy

## Supported versions

Until a longer-term support policy is announced, security fixes are made only on the latest published version and
the current default branch. Older versions may not receive fixes.

## Reporting a vulnerability

Please do not disclose suspected vulnerabilities in a public channel, test fixture, or log.

Once the public GitHub repository is available, use its **Security** tab to submit a private vulnerability report.
If private vulnerability reporting is unavailable, email
[security@das.dev](mailto:security@das.dev). Include:

- The affected SDK version or commit
- The runtime and token-store adapter involved
- Reproduction steps or a minimal proof of concept
- The potential impact
- Any suggested mitigation

Do not include live QBench client secrets, JWT assertions, access tokens, customer data, or production URLs. Use
synthetic values and redact request and response bodies when necessary.

The maintainer will acknowledge a report as soon as practical, investigate it, and coordinate disclosure after a fix
or mitigation is available. This project cannot make response-time guarantees.

## Security scope

Security-sensitive areas include credential handling, JWT signing, access-token caching and invalidation, storage
adapter isolation, request authentication, and accidental disclosure through errors or logs.

The SDK requires HTTPS for the QBench base URL and for QBench-supplied attachment and report file URLs. It redacts
request payloads and raw API error responses by default. The optional `includeSensitiveErrorDetails` setting
deliberately weakens that protection for isolated debugging and must not be enabled where errors are logged,
exported, or shown to users.

This unofficial SDK does not control the QBench service. Service availability, QBench account access, and issues in
QBench itself should be reported through QBench's official support channels.
