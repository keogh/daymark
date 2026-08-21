# SPEC-011 — Cross-Platform Packaging and Distribution

## Status

Ready for Implementation

## Milestone

M9 — Cross-Platform Packaging

## Priority

P0

---

# 1. Objective

Produce reproducible, installable Time Tracker artifacts for supported macOS,
Windows, and Linux targets and assemble them into a version-consistent draft
GitHub prerelease that can be verified on clean systems before a person publishes
it.

This first distribution is for Isaac Zepeda's personal installation and testing.
The pipeline and artifacts must form a safe foundation for later public
distribution, but this specification does not claim that unsigned artifacts are
ready for general public use.

---

# 2. User Story

As the application owner,

I want versioned installers built on their native operating systems and collected
in one reviewable GitHub prerelease,

so that I can install and evaluate Time Tracker on macOS, Windows, and Linux
without a development environment and without risking existing local data.

---

# 3. Background

SPEC-000 established Electron Forge packaging on the primary development platform.
SPEC-008 owns tray and window lifecycle behavior. SPEC-010 owns the source-owned
application icon, its primary-platform packaging, and platform-neutral UX polish.
Neither earlier specification creates installers, release automation, or complete
fresh-machine cross-platform evidence.

DEC-001 and DEC-003 require Electron and Electron Forge. The roadmap's M9 milestone
requires macOS, Windows, and Linux installable builds and fresh-machine testing.
This specification completes that milestone while keeping the exhaustive product
QA and final MVP release decision in a later SPEC-012.

The repository currently has no signing certificates. Electron Forge documents
that unsigned macOS and Windows applications trigger operating-system trust
checks. This is accepted only for the personal-testing release stage defined here.

---

# 4. Scope

This specification includes:

- deterministic Electron Forge makers for macOS DMG, Windows Squirrel Setup, and
  Debian package artifacts;
- separate macOS arm64 and x64 artifacts;
- Windows x64 and Linux x64 artifacts;
- platform-specific application icon conversion from SPEC-010's source-owned
  master;
- required installer metadata, stable application identity, and Windows installer
  lifecycle handling;
- native GitHub Actions build jobs for every supported artifact;
- exact `package.json` version and `vX.Y.Z` tag matching;
- unique version/platform/architecture artifact names;
- SHA-256 checksums generated from the final uploaded files;
- assembly of one draft GitHub prerelease after every required native build
  succeeds;
- prominent unsigned-personal-testing warnings in the draft release;
- manual publication only after required installation evidence is recorded;
- fresh installation, launch, tray, offline, quit/relaunch, uninstall/reinstall,
  and data-preservation smoke acceptance;
- a forward upgrade test starting with the second published version;
- release documentation, a repeatable acceptance checklist, and recorded evidence;
- automated configuration and release-contract tests where practical.

---

# 5. Out of Scope

This specification does not include:

- Apple Developer ID signing or notarization;
- Windows Authenticode, EV, or Azure Trusted Signing;
- Linux repository signing;
- claims that unsigned builds are suitable for unrestricted public distribution;
- automatic application updates or update checks;
- an application update UI;
- Mac App Store, Microsoft Store, Snap Store, Flathub, or package-repository
  publication;
- macOS Universal binaries;
- Windows arm64 or x86 artifacts;
- Linux arm64, RPM, AppImage, Snap, or Flatpak artifacts;
- portable/no-install archives as supported release products;
- downgrade support;
- deleting application data during uninstall;
- telemetry, crash reporting, analytics collection, or runtime networking;
- automatic startup, global shortcuts, exports, backup, or other deferred product
  features;
- exhaustive MVP regression acceptance, release announcement, or a general-public
  launch decision, which belong to SPEC-012.

Maker-generated ancillary files may be retained as release assets when the chosen
maker requires them, but they do not create an auto-update contract.

---

# 6. Dependencies

Implementation requires these specifications to be Verified:

- SPEC-000 — Project Foundation;
- SPEC-001 — Core Time Tracking;
- SPEC-002 — Daily History;
- SPEC-003 — Task Search and Reuse;
- SPEC-004 — One-Click Task Switching;
- SPEC-005 — Manual Time Entry;
- SPEC-006 — Edit and Delete Intervals;
- SPEC-007 — Task Management;
- SPEC-008 — System Tray and Window Lifecycle;
- SPEC-009 — Analytics;
- SPEC-010 — Settings and UX Polish.

SPEC-011 may be designed and queued before those dependencies are complete, but no
implementation task may begin until SPEC-010 and all preceding specifications are
Verified.

---

# 7. Distribution Stage and Trust Model

The release stage is:

```text
personal installation and testing
```

Artifacts are public GitHub prerelease assets because the intended repository is
public, but they are not trusted public-production binaries. Every draft and
published release created under this specification must state prominently:

- the artifacts are unsigned;
- macOS Gatekeeper and Windows SmartScreen may warn or block the first launch;
- the artifacts are intended for personal testing;
- checksums verify transfer integrity but do not authenticate the publisher;
- installation should proceed only when the tester obtained the artifact from the
  repository's own GitHub Release page and intentionally accepts the warning.

Acceptance may use the operating system's documented graphical user override for
an unsigned application. Acceptance must not require globally disabling platform
security, disabling antivirus, changing machine-wide execution policy, or running
an undocumented bypass command.

Signing and notarization are mandatory work planned for SPEC-013 before the
project describes its downloads as general-public production releases. The
packaging structure must not intentionally prevent later secret-driven signing,
but no placeholder secret, certificate, password, or private key may be committed.

---

# 8. Supported Artifact Matrix

The required outputs are:

| Platform | Architecture | Primary artifact | Build host |
| --- | --- | --- | --- |
| macOS | arm64 | `.dmg` | native GitHub-hosted macOS arm64 runner |
| macOS | x64 | `.dmg` | native GitHub-hosted macOS Intel runner |
| Windows | x64 | Squirrel `{productName} Setup.exe` | native GitHub-hosted Windows x64 runner |
| Linux | x64 | Debian `.deb` | native GitHub-hosted Ubuntu x64 runner |

The Windows maker may also produce its required `.nupkg` and `RELEASES` files.
They may be uploaded with the installer, but auto-update behavior remains out of
scope. The Setup executable is the supported user installation entry point.

Each uploaded primary artifact filename must contain, directly or through an
unambiguous containing archive name:

```text
product name
package.json version
operating system
architecture
```

No two matrix entries may produce the same uploaded filename. CI must not infer an
artifact's platform or architecture solely from a GitHub job label.

---

# 9. Electron Forge Packaging Behavior

Electron Forge remains the only packaging and maker framework.

The configuration must add only focused, maintained makers needed by §8:

- the Electron Forge DMG maker for macOS;
- the Electron Forge Squirrel maker for Windows;
- the Electron Forge Debian maker for Linux.

Makers must be restricted explicitly to their applicable platform. Native modules,
including `better-sqlite3`, must be rebuilt for the exact Electron version,
platform, and architecture of each package. Packaging must retain existing ASAR,
native-module unpacking, migrations, renderer security, and local-resource
behavior.

The repository must provide explicit scripts for:

- packaging the current host for development acceptance;
- making the current host's installer/distributable;
- validating release metadata and tag/version agreement;
- generating/verifying checksums where those operations are repository-owned.

Script names may follow existing npm conventions. They must use npm and the
committed lockfile. `npm ci` must be sufficient to prepare a clean CI checkout.

---

# 10. Application Identity and Metadata

Installer identity must remain stable across releases so replacement, reinstall,
future upgrade, shortcuts, and application-data paths refer to the same product.

Required product metadata:

```text
package name: time-tracker
product name: Time Tracker
author: Isaac Zepeda
description: A local-first desktop time tracker.
```

Platform identifiers must be explicit, source-controlled, reverse-domain-style
values and must remain stable after the first published artifact. The implementation
may select the simplest consistent identifier derived from the product name and
author, but the selected values must be documented before the first artifact is
published.

Linux packaging temporarily uses:

```text
maintainer name: Isaac Zepeda
maintainer email: isaaczepeda@users.noreply.github.com
homepage: omitted
```

The noreply address is temporary release metadata. Before signed or general-public
distribution, the project owner must confirm that it is an appropriate reachable
or account-associated address, replace it with a real public contact if necessary,
and add the canonical project homepage. This requirement must remain visible in
release documentation and must not be silently treated as complete merely because
the maker accepts the placeholder.

Installer metadata must not claim a company, support SLA, license, copyright
ownership, homepage, or publisher identity that has not been supplied.

---

# 11. Application Icons and Native Presentation

SPEC-010's source-owned icon master is authoritative. SPEC-011 must derive and
commit or deterministically generate the platform formats and sizes required by
the selected makers.

The installed application, installer where supported, launcher/Start menu entry,
task switcher/dock, and Linux desktop entry must show the Time Tracker application
icon without runtime network access. The separate tray icon behavior established
by SPEC-008 must remain platform-appropriate and must not be replaced casually by
the application icon.

Icon conversion must be reproducible from source-owned local assets. A proprietary
hosted conversion service or runtime download is not permitted.

---

# 12. Windows Installer Lifecycle

The Squirrel installer launches the application with installer lifecycle arguments
during install, update, and uninstall events. The application must handle those
events before normal database, tray, or window initialization so installer events
do not:

- open the ordinary Time Tracker window;
- create or mutate the user's database;
- start a tray instance;
- leave a background process;
- display an irrelevant startup failure.

Normal installed launch must create only one reachable application instance and
must preserve SPEC-008 lifecycle behavior. The installed application must have a
stable Windows application user model identity where required by the selected
maker and product name.

Squirrel installation should remain per-user and should not require administrator
privileges under its normal supported flow. SmartScreen warnings are accepted only
under §7.

---

# 13. Linux Package Behavior

The Debian artifact must install through the operating system's standard package
tooling on supported Ubuntu LTS systems. It must provide:

- the Time Tracker executable;
- a desktop application entry in the normal application launcher;
- the configured application icon;
- required package metadata;
- dependencies expressed by the generated package rather than undocumented manual
  copying into system locations.

System package installation/removal may require normal administrator authorization.
Launching Time Tracker and storing its SQLite profile must occur as the ordinary
desktop user, never as root.

The representative desktop environment is Ubuntu GNOME. Other Debian-based
distributions or desktop environments are not claimed as verified by this
specification.

---

# 14. Version and Tag Contract

`package.json` is the authoritative application version and must contain a stable
semantic version accepted by the packaging tools.

A release-triggering Git tag must be exactly:

```text
v${package.json.version}
```

Examples:

```text
package.json 0.1.0  <-> tag v0.1.0  valid
package.json 0.1.0  <-> tag 0.1.0   invalid
package.json 0.1.0  <-> tag v0.1.1  invalid
```

The version gate must run before distributable creation or publication. A missing,
malformed, non-semantic, or mismatched tag fails safely and publishes nothing.
Every build job must use the same immutable tagged commit and package-lock state.

A tag is not moved after a release is published. Correcting release content
requires a new version and tag. A failed draft may be rebuilt idempotently from the
same tag only while unpublished, without mixing files from different workflow runs.

---

# 15. Native CI Build Pipeline

The public repository must contain a GitHub Actions workflow that:

1. triggers for a `v*` tag and may support an explicit non-publishing manual dry
   run;
2. grants build jobs read-only repository permissions;
3. validates the tag/version contract once before fan-out;
4. checks out the exact tag commit;
5. installs the committed Node version and dependencies with `npm ci`;
6. runs the required project validation at least once in a clearly identified job;
7. runs native maker jobs for all four matrix entries in §8;
8. performs a packaged-application smoke check where the runner can do so safely;
9. uploads immutable, uniquely named workflow artifacts;
10. waits for all required jobs before release assembly;
11. downloads only artifacts produced by that workflow run;
12. generates and verifies a single `SHA256SUMS.txt` over final release files;
13. creates or updates one draft GitHub prerelease for the exact tag;
14. never marks the GitHub release as published automatically.

Use stable, explicitly selected native runner labels available when implementation
begins. Do not use preview runner images for the release path when a stable image
can produce the required target. The chosen labels and architectures must be
documented in the workflow and acceptance record.

The release-assembly job alone receives `contents: write`; build and validation
jobs remain read-only. Pull requests, untrusted forks, branches, and manual dry
runs must not receive publication permission or create releases.

---

# 16. GitHub Draft Prerelease

All required artifacts belong to one GitHub Release matching the Git tag and
package version. The automation creates it with both:

```text
draft: true
prerelease: true
```

The draft must include:

- version and tagged commit;
- the four primary artifacts from §8;
- any explicitly retained Squirrel ancillary artifacts;
- `SHA256SUMS.txt`;
- a concise platform/architecture download map;
- unsigned personal-testing warnings from §7;
- supported installation targets;
- documented graphical handling of expected unsigned warnings;
- a statement that automatic update is unavailable;
- known limitations and the temporary publisher/contact metadata note;
- the acceptance-evidence status.

Automation must not combine partial results into a publishable-looking release. If
one required build, validation, checksum, or upload fails, the workflow fails and
the release remains absent or clearly incomplete and draft. A person may publish
the prerelease only after §21 evidence is complete.

---

# 17. Checksums and Artifact Integrity

CI must calculate SHA-256 over the exact byte content of every final uploaded
release file other than the checksum manifest itself. The manifest must use stable,
unambiguous filenames and a format supported by ordinary platform checksum tools.

Before manual publication:

- every listed file must exist exactly once;
- every uploaded release file in checksum scope must appear exactly once;
- recomputation must match the manifest;
- a deliberately changed test fixture must fail automated checksum verification.

Checksums detect accidental corruption or transfer changes. Documentation must not
describe them as a substitute for code signing or publisher authentication.

---

# 18. Installation and Profile Ownership

Acceptance must use disposable OS users, virtual machines, or physical test
profiles that do not point at the developer's real Time Tracker profile.

On first ordinary launch, the installed application must:

- use the platform-appropriate per-user application-data directory;
- create or migrate SQLite through the existing main-process database lifecycle;
- require no backend or runtime network request;
- never store user data inside the replaceable application bundle or installer
  directory;
- remain usable without the source checkout or Node.js installed.

The installer/reinstaller must not delete, relocate, or recreate a valid existing
profile. Packaging does not change database schemas and adds no migration by
itself.

---

# 19. Uninstall, Reinstall, Upgrade, and Downgrade

Uninstall removes installed application binaries and normal installer-owned
shortcuts/desktop entries. It intentionally preserves the per-user SQLite database,
settings, and application-data directory.

No "delete my data" option or cleanup utility is added. Release documentation must
state that uninstall preserves personal data and that manual profile deletion is a
separate destructive operation outside this specification.

For the first published version, acceptance must prove:

```text
install candidate
create representative data
quit
replace or reinstall the same candidate through the platform-supported flow
relaunch
verify all representative data and timer state
uninstall
reinstall
relaunch
verify preserved profile
```

Starting with the second published version, acceptance must additionally install
the immediately preceding published artifact, create representative data, upgrade
to the candidate, and prove data preservation and normal migration. If no earlier
artifact exists, this forward-version step is explicitly not applicable rather
than simulated with an untracked version mutation.

Downgrades are unsupported. The release checklist must warn testers not to use a
newer profile with an older application and must not claim downgrade safety.

---

# 20. Cross-Platform Smoke Workflow

Each required fresh-install environment must verify this bounded workflow:

```text
download from the repository's GitHub draft/prerelease assets
verify SHA-256
install through the platform's normal installer flow
launch without a development checkout or Node.js
confirm application and launcher icon
confirm idle tray/menu-bar item
start Task A
close the window and confirm tracking continues
restore from tray
pause and resume from tray
switch to Task B and stop
confirm Daily History and Analytics show representative data
change one Settings preference and confirm persistence after restart
start a timer, explicitly Quit, relaunch, and confirm reconstruction
disconnect networking and repeat representative launch/tracking
perform the §19 replacement/reinstall and uninstall/reinstall checks
```

This is a distribution smoke test, not a duplicate of every earlier acceptance
criterion. Failures in previously verified behavior block release and must be fixed
under their authoritative specification or recorded as a defect before SPEC-011
can be Verified.

No unexpected renderer console error, uncaught main-process error, missing local
asset, second application instance, or write to the developer's real profile is
permitted.

---

# 21. Platform Acceptance Matrix

The minimum manual/VM acceptance matrix is:

| Platform family | Required environments |
| --- | --- |
| macOS | latest generally available macOS major and the preceding supported major, covering arm64 and Intel across the two environments |
| Windows | current supported Windows 11 x64 release and the immediately preceding Windows 11 release when it remains vendor-supported and practically available |
| Linux | Ubuntu 26.04 LTS GNOME x64 and Ubuntu 24.04 LTS GNOME x64 |

If the preceding Windows release is no longer vendor-supported or obtainable when
acceptance occurs, the current Windows 11 x64 release alone is required and the
reason must be recorded. An unsupported Windows 10 environment is not used merely
to satisfy a count of two versions.

For macOS, at least one Apple Silicon environment and one Intel environment are
required. Additional OS/architecture combinations are useful but not required.

The acceptance record must capture:

- exact OS version and architecture;
- physical machine or VM;
- artifact filename and SHA-256 result;
- clean install result;
- expected unsigned-warning path used;
- smoke workflow result;
- reinstall/data-preservation result;
- uninstall/reinstall result;
- upgrade result or first-release not-applicable reason;
- tray, icon, offline, console, and main-process observations;
- defects, deviations, and reviewer/date.

CI runner success is build evidence, not a substitute for installation acceptance.

---

# 22. Failure Behavior

- A tag/version mismatch fails before maker or release work and publishes nothing.
- A missing required metadata value fails configuration validation with a safe,
  actionable build error.
- A native module rebuild failure fails only with technical CI output and cannot
  produce a releasable draft.
- A missing platform artifact, duplicate filename, or unexpected architecture
  fails release assembly.
- A checksum mismatch fails release assembly or manual acceptance.
- A failed platform job cannot be hidden by successful jobs on other platforms.
- A partially assembled release remains draft and must never be manually published.
- An installation, launch, tray, offline, or data-preservation failure blocks
  publication and SPEC-011 verification.
- Release documentation must not expose GitHub tokens, future signing secrets,
  local database paths, task descriptions, or other user-created content.

---

# 23. Edge Cases

The implementation and acceptance must consider:

- product and executable names containing a space;
- identical product identity across four artifacts;
- x64 and arm64 DMGs from the same version;
- stale artifacts from an earlier workflow rerun;
- duplicate or missing release filenames;
- tag created from a commit whose `package.json` version differs;
- a draft release already existing for the same unpublished tag;
- Squirrel install/update/uninstall arguments;
- application launch immediately after installation;
- normal launch with no network connection;
- non-ASCII or long Task descriptions in preserved data;
- a running timer during explicit Quit and replacement/reinstall;
- application settings and database migrations from the prior version;
- uninstall with the application still open;
- expected Gatekeeper or SmartScreen warning;
- Linux installation requiring administrator authorization while runtime data
  remains owned by the desktop user;
- unsupported downgrade attempts;
- temporary maintainer contact metadata still present before public signing.

---

# 24. Acceptance Criteria

## AC-011-001 — Required Artifacts Are Produced Natively

Given one valid tagged commit,

when the native build matrix completes,

then it produces separate macOS arm64 and x64 DMGs, a Windows x64 Squirrel Setup
executable, and a Linux x64 Debian package using the committed Electron Forge
configuration.

## AC-011-002 — Platform and Architecture Are Unambiguous

Given the four required primary artifacts,

when their filenames and packaged metadata are inspected,

then each artifact identifies the same product/version and its correct platform
and architecture without a filename collision.

## AC-011-003 — Version and Tag Must Match

Given `package.json` contains version `X.Y.Z`,

when a release workflow runs for any tag other than exactly `vX.Y.Z`,

then validation fails before maker or publication work and no GitHub Release is
created or modified.

## AC-011-004 — Native Modules and Local Assets Are Complete

Given each packaged application,

when it launches on its target architecture without the repository or Node.js,

then `better-sqlite3`, migrations, renderer resources, application icons, and tray
assets load locally and no runtime HTTP(S) resource is required.

## AC-011-005 — Windows Installer Events Are Isolated

Given the Windows installer invokes install, update, or uninstall lifecycle events,

when the application receives those arguments,

then it exits through the installer path without ordinary window, tray, database,
or timer initialization and leaves no background process.

## AC-011-006 — Application Identity and Metadata Are Stable

Given artifacts from every platform and a replacement/reinstall,

when their application identity and package metadata are inspected,

then they consistently identify Time Tracker and Isaac Zepeda, preserve the same
per-user profile identity, and contain only the explicitly approved temporary
contact metadata.

## AC-011-007 — CI Uses Native Isolated Builds

Given a valid release tag,

when GitHub Actions runs,

then each required platform/architecture is built on a compatible native runner
from the same tag and lockfile, each build is isolated, and publication waits for
all required jobs.

## AC-011-008 — Checksums Cover Final Release Files

Given completed build artifacts,

when release assembly generates and verifies `SHA256SUMS.txt`,

then every checksum-scoped final file appears exactly once and any changed or
missing file causes verification to fail.

## AC-011-009 — One Draft Prerelease Is Assembled Safely

Given every required build and checksum succeeds,

when the release job completes,

then one draft prerelease matching the tag contains the required assets, download
map, unsigned warning, installation limitations, and acceptance status and is not
published automatically.

## AC-011-010 — Partial Results Cannot Be Published

Given any required validation, build, upload, naming, or checksum step fails,

when the workflow concludes,

then no published release exists and any partial release remains absent or clearly
incomplete and draft.

## AC-011-011 — Fresh Installation Works on the Required Matrix

Given each clean environment in §21,

when its matching artifact is downloaded, checksum-verified, installed through the
normal platform flow, and launched,

then Time Tracker runs as the ordinary user with the expected launcher icon, tray,
per-user profile, and no development toolchain dependency.

## AC-011-012 — Unsigned Warnings Are Explicit and Bounded

Given an unsigned macOS or Windows artifact,

when the operating system presents its trust warning,

then release documentation identifies the limitation and acceptance can proceed
through a documented graphical per-application override without disabling
machine-wide security.

## AC-011-013 — Installed Smoke Workflow Works Offline

Given a freshly installed application with networking unavailable,

when the bounded Timer, tray, History, Analytics, Settings, close/restore, Quit,
and relaunch workflow in §20 is exercised,

then authoritative behavior remains correct with no runtime network request or
unexpected application error.

## AC-011-014 — Replacement and Reinstall Preserve Data

Given representative Tasks, intervals, settings, and running or paused Timer state
in the per-user profile,

when the candidate is replaced/reinstalled and relaunched,

then the same profile is opened, migrations complete safely, and all authoritative
data and reconstructed Timer behavior are preserved.

## AC-011-015 — Uninstall Preserves Personal Data

Given an installed application with representative data,

when it is uninstalled and the same version is installed again,

then installer-owned binaries and entries were removed, the per-user application
data remained, and the reinstalled application reconstructs the preserved profile.

## AC-011-016 — Forward Upgrade Is Required After the First Release

Given an immediately preceding published version exists,

when a tester installs it, creates representative data, and upgrades to the
candidate,

then the new version launches against the preserved profile without data loss; for
the first release only, the evidence records this criterion as not applicable
because no preceding artifact exists.

## AC-011-017 — Manual Publication Is Gated by Evidence

Given a complete draft prerelease,

when any required environment lacks recorded installation evidence or has an open
blocking defect,

then the release remains draft; only a person may publish it after the complete
acceptance record passes.

## AC-011-018 — Distribution Adds No Product Networking or Data Mutation

Given the packaging and workflow changes,

when source, process boundaries, installed runtime behavior, and profiles are
inspected,

then no auto-updater, telemetry, crash reporting, backend, new renderer privilege,
schema change, packaging-time profile mutation, or uninstall-time data deletion was
introduced.

---

# 25. Required Automated Tests

- release version validation accepts exact `vX.Y.Z` agreement and rejects missing
  `v`, malformed SemVer, mismatch, extra suffix, and absent version/tag values;
- artifact manifest validation requires all four matrix entries, exact version,
  correct platform/architecture, unique names, and no stale extra primary artifact;
- checksum generation and verification cover exact files and reject changed,
  missing, duplicate, or unexpectedly added files;
- Forge configuration tests or equivalent inspection cover platform-restricted
  makers, stable identity, approved metadata, icon paths, ASAR, migrations, and
  native-module unpacking;
- Windows startup tests prove every supported Squirrel lifecycle argument exits
  before normal application initialization and ordinary launch continues normally;
- workflow validation proves build jobs are read-only, only release assembly has
  contents-write permission, all matrix jobs gate assembly, and release output is
  draft/prerelease;
- packaging smoke scripts fail when an expected artifact or packaged migration,
  native module, icon, or local renderer asset is absent;
- existing project tests remain passing.

Tests and test support belong under top-level `test/` when they exercise production
TypeScript modules. Repository-owned release scripts may have mirrored tests under
an appropriate `test/scripts/` location.

---

# 26. Required Repository and Migration Tests

No database schema or repository behavior changes are required.

Existing migration and disposable-SQLite integration tests remain regression
requirements. Cross-platform acceptance must use disposable profiles and must
never modify the developer's real application database.

---

# 27. Required Integration and Packaged Tests

- each native CI host successfully runs its maker for the required architecture;
- each output launches on a matching target environment;
- packaged database initialization and existing migration execution succeed;
- installed Timer and tray behavior satisfy the bounded workflow in §20;
- explicit Quit with a running timer and relaunch reconstructs state;
- offline operation produces no application HTTP(S) request;
- replacement/reinstall preserves representative data on all platform families;
- uninstall/reinstall preserves representative data on all platform families;
- forward upgrade is tested on all platform families beginning with the second
  published version;
- the acceptance matrix and evidence fields in §21 are complete.

Automated hosted-runner checks may supplement but do not replace fresh-install
physical/VM evidence.

---

# 28. Renderer and Accessibility Requirements

No renderer UI is added by this specification.

The installed application must preserve all SPEC-010 keyboard, focus, theme,
contrast, reduced-motion, minimum-window, and semantic-state behavior. Native
installer controls and operating-system warning dialogs use platform accessibility
behavior and are not customized by the application.

Release notes and installation documentation must use descriptive link text,
headings, lists, and plain-language platform/architecture labels. Instructions may
not rely on screenshots, icons, or color alone.

---

# 29. Security and Privacy Considerations

- GitHub workflow permissions follow least privilege; only release assembly may
  write repository contents.
- No secrets are required for unsigned builds. Empty or fake signing secrets must
  not be introduced.
- Future signing configuration must read secrets from protected CI storage and is
  not implemented here.
- Third-party pull requests and manual dry runs cannot publish artifacts.
- Build inputs come from the tagged commit, committed npm lockfile, and explicitly
  referenced workflow actions.
- Release logs and evidence contain no user-created Task descriptions or copied
  production databases.
- Checksums provide integrity, not authenticated provenance; the distinction is
  explicit.
- The renderer security boundary is unchanged.
- Installed runtime behavior remains local-first and offline.
- Test profiles are disposable and isolated from real user data.

---

# 30. Performance and Artifact Size

Packaging is release-time work and may take longer than ordinary project checks.
Parallel native jobs are preferred where GitHub Actions permits.

The implementation should avoid:

- building an architecture more than once in the same workflow without evidence
  that it is required;
- uploading duplicate application bundles when only the installer is supported;
- including source checkout, tests, logs, caches, or unrelated development files
  in distributables;
- downloading runtime assets after installation.

No arbitrary artifact-size threshold is imposed. Unexpected large growth must be
investigated and recorded before publication.

---

# 31. Documentation and Release Evidence

The repository must document:

- supported artifact and acceptance matrices;
- exact local make commands;
- tag/version release procedure;
- CI draft-prerelease behavior;
- artifact checksum verification examples for each platform family;
- unsigned-install limitations and supported graphical override path;
- offline behavior and absence of automatic updates;
- uninstall data preservation;
- first-release versus later forward-upgrade expectations;
- unsupported downgrades;
- temporary maintainer email and missing homepage follow-up;
- future signing/notarization prerequisite for general-public distribution;
- how and where to record acceptance evidence.

Evidence may be kept in a release checklist document or a clearly named directory
under `docs/`. It must identify the release version and must not contain secrets or
personal task data.

---

# 32. Definition of Done

This specification is complete when:

- AC-011-001 through AC-011-018 pass;
- all earlier specifications are Verified;
- the required automated, integration, packaging, and manual acceptance checks
  pass;
- `npm run format:check` passes if the script remains available;
- `npm run typecheck` passes;
- `npm run lint` passes;
- `npm test` passes;
- `npm run package` passes on the primary platform;
- every native matrix job successfully produces its required distributable;
- one complete draft GitHub prerelease is assembled with verified checksums;
- all required platform environments have recorded acceptance evidence;
- the draft remains unpublished until a person confirms that evidence;
- replacement/reinstall and uninstall/reinstall preserve data on every platform
  family;
- the first release records forward upgrade as not applicable, or later releases
  pass actual preceding-version upgrade acceptance;
- source and installed application icons and tray assets are correct;
- installed operation remains offline and renderer security remains unchanged;
- release documentation records unsigned status, temporary contact metadata,
  uninstall preservation, and unsupported downgrade behavior;
- `docs/progress.md` and relevant decisions/architecture documentation agree with
  implementation;
- no signing, auto-update, telemetry, store publication, unrelated feature, or
  exhaustive SPEC-012 QA scope is added.

---

# 33. Implementation Notes for Codex

Prefer official Electron Forge makers and the GitHub release mechanisms already
supported by the chosen toolchain. Do not replace Electron Forge or build a custom
installer framework.

Keep packaging metadata and target selection centralized and typed where practical.
Keep version/artifact/checksum validation in small deterministic scripts that can
be tested without creating full installers.

Use native runners for target builds. Do not attempt unsupported cross-compilation
for convenience, especially for macOS DMGs or native `better-sqlite3` binaries.

Treat GitHub publication as a privileged final assembly step. A passing CI build is
not permission to publish, and a draft prerelease is not acceptance evidence.

SPEC-010 must be Verified before implementation begins. Implement only one
unblocked task from `tasks.md` at a time and update `docs/plan.md` for that task
before changing production or release configuration.
