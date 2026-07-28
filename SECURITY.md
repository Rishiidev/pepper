# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✓ |

## Reporting a Vulnerability

Do not open a public issue for security vulnerabilities.
Open a [GitHub Issue](https://github.com/Rishiidev/pepper/issues/new) with the prefix `[SECURITY]`.

Include: description, steps to reproduce, potential impact.
Response within 72 hours. Resolution within 7 days for confirmed issues.

## Scope

- Storage & privacy of saved tabs (PEPPER stores all data locally in Dexie IndexedDB; no data leaves the browser).
- Extension Manifest V3 permissions (`storage`, `tabs`, `contextMenus`, `commands`).
