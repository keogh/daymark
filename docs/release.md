# Distribution and Release Contract

Time Tracker distribution is currently limited to unsigned personal installation
and testing. It is not a general-public production release.

## Stable identity and metadata

The source-controlled distribution contract is
`scripts/distribution-contract.ts`. Its stable macOS bundle identifier and Windows
application user model identifier are both `com.isaaczepeda.timetracker`; its
Linux package identifier is `time-tracker`. The package name is
`time-tracker`, the visible product name is `Time Tracker`, the author and Linux
maintainer name are `Isaac Zepeda`, and the description is
`A local-first desktop time tracker.`

Linux temporarily uses `isaaczepeda@users.noreply.github.com` as its maintainer
email and intentionally omits homepage metadata. Before signed or general-public
distribution, the owner must confirm that this address is appropriate and
reachable (or replace it with a real public contact) and add the canonical project
homepage. No company, publisher, support, license, or copyright claim is implied.

## Artifact contract

Each version has exactly four primary artifacts:

| Platform | Architecture | Filename pattern |
| --- | --- | --- |
| macOS | arm64 | `Time-Tracker-{version}-darwin-arm64.dmg` |
| macOS | x64 | `Time-Tracker-{version}-darwin-x64.dmg` |
| Windows | x64 | `Time-Tracker-{version}-win32-x64 Setup.exe` |
| Linux | x64 | `Time-Tracker-{version}-linux-x64.deb` |

The normalized `darwin`, `win32`, and `linux` values are explicit packaging
platform identifiers. The filename, not a CI job label, carries product, version,
platform, and architecture identity.

## Local commands and version gate

- `npm run package` packages the current host for development acceptance.
- `npm run make` makes the current host distributable once its platform maker is
  added by the applicable follow-up task.
- `npm run release:validate -- --tag v0.1.0` validates package metadata, stable
  identity, the artifact matrix, and exact tag/version agreement.

`package.json` is the version authority. A release tag must be exactly
`v${package.json.version}` using stable `X.Y.Z` semantic versioning. Missing,
malformed, suffixed, or mismatched values fail before making or publication.

## Trust and update limitations

Artifacts are unsigned. macOS Gatekeeper and Windows SmartScreen may warn or block
first launch. Only proceed after obtaining the artifact from this repository's own
GitHub Release page and intentionally accepting the operating system's documented
per-application graphical override. Do not disable platform security globally.

Checksums verify transfer integrity; they do not authenticate the publisher.
Automatic updates and update checks are unavailable. Signing and macOS
notarization remain required before general-public production distribution.
