# Distribution and Release Contract

Time Tracker distribution is currently limited to unsigned personal installation
and testing. It is not a general-public production release.

## Stable identity and metadata

The source-controlled distribution contract is
`scripts/distribution-contract.ts`. Its stable macOS bundle identifier is
`com.isaaczepeda.timetracker`; its Windows Squirrel application user model
identifier is `com.squirrel.timetracker.time-tracker`; and its Linux package
identifier is `time-tracker`. The package name is
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

## Native CI dry runs

`.github/workflows/native-builds.yml` runs for `v*` tag pushes and supports a
manual dry run for an existing tag. It validates the exact `vX.Y.Z` tag and commit
before four isolated jobs check out that immutable commit, use Node from `.nvmrc`,
install the committed lockfile with `npm ci`, make the target, inspect its native
module and local packaged resources, and upload a unique workflow artifact. A
final read-only job accepts the set only when all four jobs produced the expected
names, metadata, tag, commit, and unchanged bytes.

The stable runner selections verified against GitHub's hosted runner image catalog
on 2026-08-22 are:

| Target | Runner label | Native architecture |
| --- | --- | --- |
| macOS arm64 | `macos-15` | arm64 |
| macOS x64 | `macos-15-intel` | x64 |
| Windows x64 | `windows-2025` | x64 |
| Linux x64 | `ubuntu-24.04` | x64 |

Every job has only `contents: read`. The workflow contains no release-creation or
publication step, so both tag runs and manual runs are non-publishing during this
task. Draft prerelease assembly remains separate work.

## Local commands and version gate

- `npm run package` packages the current host for development acceptance.
- `npm run make` makes the current host distributable once its platform maker is
  added by the applicable follow-up task.
- `npm run release:validate -- --tag v0.1.0` validates package metadata, stable
  identity, the artifact matrix, and exact tag/version agreement.

`package.json` is the version authority. A release tag must be exactly
`v${package.json.version}` using stable `X.Y.Z` semantic versioning. Missing,
malformed, suffixed, or mismatched values fail before making or publication.

## macOS DMGs

Run `npm run make:macos:arm64` on a native Apple Silicon host and
`npm run make:macos:x64` on a native Intel host. The committed Forge
configuration produces separate `Time-Tracker-{version}-darwin-{architecture}.dmg`
files. `npm run inspect:macos:arm64` or `npm run inspect:macos:x64` verifies the
matching packaged application executable, `better-sqlite3` native binary, bundle
identity, ASAR renderer and migration content, application icon, and tray assets.

The DMGs are unsigned and not notarized, so Gatekeeper may block first launch.
After confirming the DMG came from this repository's own GitHub Release page,
macOS testers may use the documented graphical per-application override: try to
open Time Tracker once, then open System Settings, choose Privacy & Security, and
choose **Open Anyway** for Time Tracker. Confirm the subsequent macOS prompt.
Do not disable Gatekeeper globally or change machine-wide security settings.

## Windows x64 Squirrel installer

Run `npm run icon:windows` to reproduce the committed ICO from the source-owned
local PNG, and run `npm run make:windows:x64` on a native Windows x64 host. The
Windows-only Forge maker produces the unsigned per-user
`Time-Tracker-{version}-win32-x64 Setup.exe` plus Squirrel's `.nupkg` and
`RELEASES` ancillary files. The Setup executable is the supported installation
entry point; MSI, machine-wide installation, and automatic updates are not
supported.

Windows SmartScreen may warn or block first installation because the executable
is unsigned. After confirming the installer came from this repository's own
GitHub Release page, a tester may use the warning dialog's **More info**, inspect
the displayed application and publisher information, and intentionally choose
**Run anyway** for this installer. Do not disable SmartScreen, antivirus, or other
machine-wide security controls.

Squirrel install, update, uninstall, and obsolete invocations exit before normal
database, tray, timer, or window initialization. Normal installed launch uses the
stable Squirrel identity above and a single-instance lock; a second launch brings
the existing Time Tracker window forward.

## Linux x64 Debian package

Run `npm run make:linux:x64` on a native Ubuntu x64 host with `dpkg`, `fakeroot`,
and the lockfile-installed Node dependencies. The Linux-only Forge maker produces
`Time-Tracker-{version}-linux-x64.deb`. Run `npm run inspect:linux:x64` to verify
the artifact filename, `amd64` control metadata, generated dependencies, launcher,
icon, application executable, x64 `better-sqlite3` module, migrations, renderer,
and tray assets. The package intentionally omits homepage metadata and retains the
temporary maintainer-contact follow-up above.

Install the package using Ubuntu's standard package tooling with normal
administrator authorization, then launch **Time Tracker** from the Ubuntu GNOME
application launcher as the disposable ordinary desktop user. Do not launch the
application with `sudo`. Confirm its profile beneath that user's configuration
directory is owned by the ordinary user. Removal may use normal administrator
authorization; after removal, confirm `/usr/bin/time-tracker`, the desktop entry,
installed application files, and installed icon are gone while the disposable
user's profile and representative data remain. Reinstall and launch as that same
ordinary user to confirm the data remains available.

## Trust and update limitations

Artifacts are unsigned. macOS Gatekeeper and Windows SmartScreen may warn or block
first launch. Only proceed after obtaining the artifact from this repository's own
GitHub Release page and intentionally accepting the operating system's documented
per-application graphical override. Do not disable platform security globally.

Checksums verify transfer integrity; they do not authenticate the publisher.
Automatic updates and update checks are unavailable. Signing and macOS
notarization remain required before general-public production distribution.
