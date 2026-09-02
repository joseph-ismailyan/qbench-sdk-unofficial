# Changelog

Notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and public releases will follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-09-02

### Added

- Bundled TypeScript declarations for the complete public client, handler, error, token, and adapter API.
- A release guard that inspects the npm tarball and rejects tenant-specific files or content.

### Changed

- Keep QBench payload and response declarations intentionally open-ended so tenant-defined fields remain supported
  without shipping any tenant-specific schema or business mapping.

## [0.1.0] - 2026-09-02

### Added

- First public package prepared as `qbench-sdk-unofficial`.
- Expiry-aware access-token reuse with memory, Cloudflare Workers KV, DynamoDB, custom token-store, and custom
  access-token-provider options.
- QBench API resource handlers, attachment and report file helpers, and one-time rejected-token recovery.
- Public project license, security policy, and release documentation.
- Source-only 95% minimum coverage gates for lines, branches, and functions.
- Success and failure coverage for attachment uploads, attachment downloads, report downloads, worksheet helpers,
  and handler validation.

### Changed

- Reject invalid `page_size` values locally. QBench pagination is limited to integer values from 1 through 50.
- Require HTTPS for QBench authentication and API traffic.
- Require HTTPS for QBench-supplied attachment upload, attachment download, and report download URLs.
- Restrict transient retries to `GET` and `HEAD`; mutations are not replayed after rate limits, server errors, or
  connection resets.
- Redact request payloads, response bodies, response descriptions, error tokens, and unsafe headers from thrown
  errors unless sensitive details are explicitly enabled.
- Remove remote response bodies from attachment and report file-helper errors.
