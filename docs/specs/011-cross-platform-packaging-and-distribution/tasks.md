# SPEC-011 — Task Breakdown

## Source

- Specification: `docs/specs/011-cross-platform-packaging-and-distribution/spec.md`
- Specification status: Ready for Implementation
- Last reviewed against specification: 2026-08-21

The specification is the source of truth for behavior. This file only decomposes
that behavior into implementation work. If the two conflict, update this breakdown
to match the specification.

SPEC-010 and every preceding specification must be Verified before implementation
of any task below begins. That external prerequisite does not change the internal
dependency order in this file.

SPEC-014 renamed the current product to Daymark while preserving the established
`Daymark` profile directory and other stable identifiers. Completed evidence
below remains an exact historical record. Any earlier evidence that asserted a
`Daymark` visible name, executable, installer, DMG, launcher, icon filename,
or primary artifact filename is stale and must be rerun against Daymark before
SPEC-011 acceptance or release assembly.

---

# Execution Rules

- Complete tasks in dependency order.
- Keep only one task `In Progress` unless parallel work is explicitly coordinated.
- Before implementation, copy the active task's immediate steps into
  `docs/plan.md`.
- Record verification evidence before marking a task `Complete`.
- Do not use task completion as a substitute for specification acceptance or the
  project Definition of Done.
- Do not begin implementation while SPEC-010 is not Verified.
- Do not publish a GitHub prerelease automatically or before the complete manual
  acceptance record passes.
- Never use the developer's real application profile for installer acceptance.

---

# Task Index

| ID | Task | Status | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- |
| TASK-011-001 | Establish Distribution Metadata and Release Contracts | Complete | None | AC-011-002, AC-011-003, AC-011-006, AC-011-018 |
| TASK-011-002 | Build macOS arm64 and x64 DMG Targets | Complete | TASK-011-001 | AC-011-001, AC-011-002, AC-011-004, AC-011-006 |
| TASK-011-003 | Build the Windows x64 Squirrel Installer | Pending — native evidence assigned to TASK-011-005 | TASK-011-001 | AC-011-001, AC-011-002, AC-011-004, AC-011-005, AC-011-006 |
| TASK-011-004 | Build the Linux x64 Debian Package | Pending — native evidence assigned to TASK-011-005 | TASK-011-001 | AC-011-001, AC-011-002, AC-011-004, AC-011-006 |
| TASK-011-005 | Add Native CI Builds and Artifact Validation | In Progress | TASK-011-002; implementation portions of TASK-011-003 and TASK-011-004 | AC-011-001, AC-011-002, AC-011-003, AC-011-004, AC-011-007, AC-011-010 |
| TASK-011-006 | Assemble a Checksummed Draft GitHub Prerelease | Pending | TASK-011-005 | AC-011-008, AC-011-009, AC-011-010, AC-011-012, AC-011-017 |
| TASK-011-007 | Define Repeatable Installation and Data-Preservation Acceptance | Pending | TASK-011-006 | AC-011-011, AC-011-012, AC-011-013, AC-011-014, AC-011-015, AC-011-016, AC-011-017 |
| TASK-011-008 | Verify Cross-Platform Distribution and Reconcile Documentation | Pending | TASK-011-007 | AC-011-001 through AC-011-018 |

---

# Tasks

## TASK-011-001 — Establish Distribution Metadata and Release Contracts

### Status

Complete

### Outcome

The repository has one validated source of packaging identity, version/tag rules,
artifact-matrix expectations, temporary publisher metadata, and local release
commands without yet adding platform makers or publication behavior.

### Dependencies

None internally.

External prerequisite: SPEC-010 and every preceding specification are Verified.

### Included

- Confirm and document stable reverse-domain-style application identifiers before
  the first artifact is published.
- Add required package author metadata as `Isaac Zepeda` while preserving the
  existing product name, package name, version, and description.
- Define the temporary Linux maintainer email
  `isaaczepeda@users.noreply.github.com` and omit homepage metadata.
- Preserve a visible follow-up requiring confirmed real contact and homepage values
  before signed/general-public distribution.
- Add deterministic release metadata validation for exact
  `v${package.json.version}` agreement and stable semantic versioning.
- Define the four required primary artifact descriptors and collision-free naming
  rules.
- Add or refine npm scripts for package, make, and release-contract validation.
- Add focused tests for version/tag, metadata, identity, and artifact-manifest
  validation.
- Document that checksums do not authenticate unsigned publishers and that
  automatic updates are unavailable.

### Excluded

- platform makers and generated installers;
- GitHub Actions workflows;
- GitHub Release creation;
- signing, notarization, secrets, or certificates;
- application feature or database changes;
- assigning an unprovided company, homepage, license claim, or support promise.

### Deliverables

- Stable application-identity and packaging-metadata configuration.
- Tested version/tag and artifact-contract validation.
- Explicit local make/validation scripts.
- Temporary-contact follow-up in release documentation.

### Verification

- Run focused release-contract tests.
- Run the version validator with matching, missing-`v`, mismatched, malformed, and
  absent tag fixtures.
- Inspect `package.json`, Forge configuration, and documentation for one consistent
  version/product/author identity.
- Run `npm run typecheck` and `npm run lint` for touched TypeScript/configuration.

### Traceability

- Acceptance criteria: AC-011-002, AC-011-003, AC-011-006, AC-011-018
- Specification sections: 7, 8, 9, 10, 14, 22, 25, 29, 31

### Completion Evidence

Completed 2026-08-22. `scripts/distribution-contract.ts` is the single packaging
contract. Stable identifiers are `com.isaaczepeda.daymark` for the macOS bundle
and Windows App User Model identity, and `daymark` for the Linux package.
Approved identity remains Daymark / Isaac Zepeda / version `0.1.0`; Linux uses
temporary maintainer email `isaaczepeda@users.noreply.github.com` with homepage
omitted. `docs/release.md` retains the required contact/homepage follow-up and
unsigned/checksum/no-auto-update limitations.

Verification:

- `npm test -- test/scripts/release-contract.test.ts` — 14 tests passed;
- matching tag `v0.1.0` — accepted;
- missing-`v` tag `0.1.0`, mismatched tag `v0.1.1`, malformed/suffixed tag
  `v0.1.0-beta.1`, and absent tag — rejected;
- `npm run release:validate -- --tag v0.1.0` — passed;
- `npm run typecheck` — passed;
- `npm run lint` — passed;
- `npm run format:check` — passed;
- `git diff --check` — passed.

---

## TASK-011-002 — Build macOS arm64 and x64 DMG Targets

### Status

Complete

### Outcome

Electron Forge produces distinct unsigned Daymark DMGs for macOS arm64 and
x64, with correct native modules, icons, migrations, product identity, and local
runtime assets.

### Dependencies

- TASK-011-001 — Establish Distribution Metadata and Release Contracts.

### Included

- Add the maintained Electron Forge DMG maker restricted to macOS.
- Derive required macOS icon assets from SPEC-010's source-owned master.
- Configure separate arm64 and x64 make targets and collision-free output names.
- Preserve ASAR, native-module unpacking, migrations, tray assets, and renderer
  security.
- Verify `better-sqlite3` is rebuilt for each target architecture.
- Add packaging inspection/smoke checks for both architectures where automation can
  inspect them safely.
- Document unsigned Gatekeeper expectations and the supported graphical
  per-application override without weakening machine-wide security.

### Excluded

- Developer ID signing, hardened-runtime customization, or notarization;
- a Universal DMG;
- Mac App Store packaging;
- automatic updates or ZIP update artifacts;
- public-production readiness claims;
- Windows or Linux makers.

### Deliverables

- macOS-restricted Forge maker configuration.
- Reproducible macOS icon derivatives.
- arm64 and x64 make commands/output naming.
- Focused configuration and packaged-content tests.
- macOS unsigned-install documentation.

### Verification

- Run focused Forge configuration and icon checks.
- Run macOS arm64 `make` on a compatible native host.
- Run macOS x64 `make` on a compatible native host or record the pending CI-native
  verification that TASK-011-005 must complete.
- Inspect the DMG/application metadata, architecture, icon, migrations, native
  module, tray asset, and renderer resources.
- Launch the host-compatible package with an isolated profile and no runtime
  network dependency.

### Traceability

- Acceptance criteria: AC-011-001, AC-011-002, AC-011-004, AC-011-006
- Specification sections: 7, 8, 9, 10, 11, 15, 18, 25, 27

### Completion Evidence

Completed 2026-08-22 on macOS 26.3.1 arm64. Electron Forge 7.11.2 produced
unsigned ULFO DMGs named `Daymark-0.1.0-darwin-arm64.dmg` and
`Daymark-0.1.0-darwin-x64.dmg`. `npm run make:macos:arm64` and
`npm run make:macos:x64` both completed, including one native dependency rebuild
per target. Package inspection confirmed bundle identifier
`com.isaaczepeda.daymark`, arm64/x86_64 application executables and matching
`better-sqlite3` Mach-O bundles, local renderer resources, all three migrations,
application/tray icons, and ASAR native unpacking for both targets. `hdiutil
imageinfo` confirmed checksummed read-only lzfse disk images.

The arm64 package launched with disposable profile
`/tmp/daymark-task011-arm64-user-data`, initialized its SQLite database, and
loaded Electron renderer/profile resources without the repository or a runtime
network dependency. Native Intel-host execution remains required in TASK-011-005;
this Apple Silicon host could build and structurally inspect x64 but is not the
specification's native Intel acceptance host. Unsigned Gatekeeper behavior and the
graphical per-application **Open Anyway** flow are documented in `docs/release.md`.

Verification:

- focused packaging/release tests — 19 passed;
- full suite — 698 tests in 82 files passed;
- `npm run format:check`, `npm run typecheck`, `npm run lint`, and
  `git diff --check` — passed;
- both `inspect:macos:*` commands and both DMG image inspections — passed.

---

## TASK-011-003 — Build the Windows x64 Squirrel Installer

### Status

Pending — implementation is locally complete; native Windows acceptance remains

### Outcome

Electron Forge produces an unsigned per-user Windows x64 Squirrel Setup executable,
and installer lifecycle invocations exit before normal Daymark initialization.

### Dependencies

- TASK-011-001 — Establish Distribution Metadata and Release Contracts.

### Included

- Add the maintained Electron Forge Squirrel maker restricted to Windows x64.
- Supply required author/description and stable no-space package identity while
  retaining the visible product name `Daymark`.
- Derive and configure the Windows icon from SPEC-010's source-owned master.
- Add the smallest maintained Squirrel startup-event handling required by the
  selected maker.
- Handle install, update, obsolete, and uninstall lifecycle arguments before
  database, tray, or BrowserWindow initialization.
- Configure a stable Windows application user model identity where required.
- Preserve per-user, no-admin normal installation behavior.
- Test lifecycle short-circuiting and ordinary launch.
- Document unsigned SmartScreen expectations and the supported graphical
  per-application override.

### Excluded

- Authenticode, EV certificate, or Azure Trusted Signing;
- MSI, MSIX, Microsoft Store, portable, x86, or arm64 artifacts;
- auto-update behavior despite maker-generated `.nupkg`/`RELEASES` files;
- machine-wide installation;
- macOS or Linux makers.

### Deliverables

- Windows-restricted Forge maker configuration and x64 output.
- Windows icon derivative and stable application identity.
- Early Squirrel lifecycle handling with tests.
- Windows unsigned-install documentation.

### Verification

- Run focused Windows lifecycle and Forge configuration tests.
- Invoke every supported Squirrel lifecycle argument and prove no ordinary
  database/tray/window initialization occurs.
- Run the Windows x64 maker on a native Windows host.
- Inspect Setup executable and ancillary output names and metadata.
- Install as an ordinary user on a disposable profile and verify one normal
  application/tray instance launches.

### Traceability

- Acceptance criteria: AC-011-001, AC-011-002, AC-011-004, AC-011-005,
  AC-011-006
- Specification sections: 7, 8, 9, 10, 11, 12, 15, 18, 22, 25, 27

### Completion Evidence

Implementation and local verification completed 2026-08-22 on macOS 26.3.1 arm64.
The Windows-only Forge maker is configured for the x64 Squirrel Setup executable
`Daymark-0.1.0-win32-x64 Setup.exe`, no MSI, local source-owned ICO, approved
author/description/product metadata, and the Squirrel-derived stable App User
Model ID `com.squirrel.daymark.daymark`. The normal Windows lifecycle
sets that identity and enforces one reachable instance.

The recommended maintained `electron-squirrel-startup` handler runs at main entry,
and an explicit guard prevents normal lifecycle registration for install, updated,
uninstall, and obsolete arguments. Focused packaging, release-contract, icon, and
startup tests pass for every event and ordinary launch. Documentation records the
bounded graphical SmartScreen override and prohibits machine-wide security
weakening.

Native Windows x64 maker output, Setup/ancillary inspection, ordinary-user
installation, installed launch with a disposable profile, application/tray/icon
inspection, and observed SmartScreen behavior remain pending on a native Windows
x64 host. The task stays In Progress until that evidence is recorded.

---

## TASK-011-004 — Build the Linux x64 Debian Package

### Status

In Progress

### Outcome

Electron Forge produces a Linux x64 Debian package that installs a normal Ubuntu
GNOME launcher entry and runs Daymark as the desktop user with correct local
assets and per-user data ownership.

### Dependencies

- TASK-011-001 — Establish Distribution Metadata and Release Contracts.

### Included

- Add the maintained Electron Forge Debian maker restricted to Linux x64.
- Configure `Isaac Zepeda` and the approved temporary noreply maintainer email.
- Omit homepage metadata and preserve the required future-metadata note.
- Derive and configure required Linux application icon sizes from SPEC-010's
  source-owned master.
- Produce a launcher/desktop entry with correct product name and icon.
- Ensure install may use normal administrator authorization but runtime and SQLite
  profile remain owned by the ordinary desktop user.
- Verify generated package metadata, dependencies, architecture, installed files,
  and removal behavior on a disposable Ubuntu environment.

### Excluded

- package repository publication or signing;
- RPM, AppImage, Snap, Flatpak, or arm64 packages;
- Debian environments outside the Ubuntu GNOME acceptance matrix;
- running Daymark as root;
- macOS or Windows makers.

### Deliverables

- Linux-restricted Forge Debian maker configuration.
- Linux icon derivatives and launcher metadata.
- x64 `.deb` artifact with approved temporary maintainer metadata.
- Focused packaging inspection checks and documentation.

### Verification

- Run focused Forge configuration/icon tests.
- Run the Linux x64 maker on a native Ubuntu host with required packaging tools.
- Inspect package architecture, control metadata, dependencies, desktop entry,
  executable, and icons.
- Install with normal system authorization, launch as a disposable ordinary user,
  and verify that the profile is user-owned.
- Remove the package and inspect installer-owned entries without deleting the
  per-user profile.

### Traceability

- Acceptance criteria: AC-011-001, AC-011-002, AC-011-004, AC-011-006
- Specification sections: 7, 8, 9, 10, 11, 13, 15, 18, 19, 25, 27

### Completion Evidence

Implementation and local verification completed 2026-08-22 on macOS 26.3.1 arm64.
The Linux-only Forge maker is restricted to x64 and configures the stable
`daymark` package/launcher identity, the visible `Daymark` product name,
the source-owned PNG icon, Utility category, approved description, and temporary
`Isaac Zepeda <isaaczepeda@users.noreply.github.com>` maintainer while omitting a
homepage. A post-make hook converts the maker's Debian-style filename to the
contracted `Daymark-0.1.0-linux-x64.deb` name.

An emulated linux/amd64 `node:24-bookworm` container ran `npm ci`,
`npm run make:linux:x64`, and `npm run inspect:linux:x64`. Inspection passed for
the artifact filename, `amd64` control metadata, generated dependencies, omitted
homepage, desktop entry, executable, PNG launcher icon, x64 Electron and
`better-sqlite3` binaries, renderer, all migrations, and tray assets. The exported
106 MB artifact had SHA-256
`52c9ae3add758bc8b54885b572c9b309559286b33b96340c4b3f439cfb7575bc`.
All 707 tests in 84 files, release validation, typecheck, lint, formatting,
macOS arm64 host packaging, and diff checks passed.

Native Ubuntu x64 maker confirmation, Ubuntu GNOME launcher/runtime acceptance as
a disposable ordinary user, profile-ownership inspection, package removal, and
profile-preservation evidence remain pending. The current Docker daemon is Linux
arm64, so the emulated Debian build is useful structural evidence but does not
satisfy those native Ubuntu requirements. TASK-011-004 remains In Progress until
that evidence is recorded.

---

## TASK-011-005 — Add Native CI Builds and Artifact Validation

### Status

In Progress

### Outcome

A least-privilege GitHub Actions workflow validates one tagged commit and builds,
smoke-checks, and uploads all four required artifacts on compatible stable native
runners without granting publication rights to build jobs.

### Dependencies

- TASK-011-002 — Build macOS arm64 and x64 DMG Targets.
- The implementation portions of TASK-011-003 and TASK-011-004.

TASK-011-003 and TASK-011-004 originally required complete native-host evidence
before this task while assigning that same native evidence to this task's CI
matrix. With project-owner approval on 2026-08-22, TASK-011-005 supplies that
evidence; their final statuses are reconciled from the resulting native runs.

### Included

- Add tag-triggered and non-publishing manual dry-run behavior.
- Select and document stable GitHub-hosted runner labels with correct
  architectures; avoid preview images where a stable option exists.
- Validate tag/version before fan-out.
- Use the exact tag commit, repository Node version, committed lockfile, and
  `npm ci` in every native job.
- Run the complete baseline validation in a clearly identified job.
- Build macOS arm64, macOS x64, Windows x64, and Linux x64 natively.
- Install only build-host tooling actually required by the relevant maker.
- Run safe packaged-content/native-module smoke checks per job.
- Normalize and validate unique artifact names and manifest metadata.
- Upload isolated workflow artifacts and gate downstream assembly on every required
  job.
- Keep validation/build permissions read-only and prevent PR/fork/dry-run
  publication.
- Add automated workflow contract checks where practical.

### Excluded

- creating or modifying a GitHub Release;
- `contents: write` outside a later release-assembly job;
- signing credentials or secrets;
- cross-compiling a required primary artifact;
- manual fresh-install acceptance;
- publishing after CI success.

### Deliverables

- Native GitHub Actions validation/build matrix.
- Per-platform dependency and maker steps.
- Uploaded versioned workflow artifacts from all four entries.
- Workflow and artifact-manifest contract tests.
- Documented runner labels and architectures.

### Verification

- Validate workflow syntax and repository-owned workflow contract tests.
- Run a non-publishing manual dry run and prove no release is created.
- Run or inspect one valid tagged workflow covering all four native jobs.
- Confirm the same tag SHA/version/lockfile across jobs.
- Confirm each artifact architecture, unique name, packaged native module, and
  required local contents.
- Confirm only read permissions exist in validation/build jobs.

### Traceability

- Acceptance criteria: AC-011-001, AC-011-002, AC-011-003, AC-011-004,
  AC-011-007, AC-011-010
- Specification sections: 8, 9, 11, 14, 15, 22, 25, 29, 30

### Completion Evidence

Implementation and local verification completed 2026-08-22. The workflow accepts
only `v*` tag pushes or an explicit existing-tag manual dry run, validates exact
stable tag/version/SHA agreement once before fan-out, and checks out that immutable
SHA in every job. It uses stable native `macos-15` arm64,
`macos-15-intel` x64, `windows-2025` x64, and `ubuntu-24.04` x64 runner labels,
with an explicit native-architecture guard in each build job. Every job has only
`contents: read`; no release or publication operation exists.

All four jobs use `.nvmrc`, `npm ci`, their platform Forge maker, and package
inspection. Each uploads one collision-free primary artifact plus a manifest
binding its name, version, platform, architecture, tag, commit, and bytes. The
final read-only job depends on all four builds, downloads only this run's matching
workflow artifacts, and rejects an incomplete, renamed, mixed-commit, or changed
set. Windows inspection newly checks the packaged x64 executable and
`better-sqlite3` PE architecture plus local renderer, migrations, icons, and tray
assets.

Local verification:

- workflow YAML parsed successfully;
- focused packaging/workflow/release tests rerun 2026-08-26 — 35 passed;
- full suite rerun 2026-08-26 — 721 tests in 87 files passed;
- `npm run release:validate -- --tag v0.1.0`, `npm run typecheck`,
  `npm run lint`, `npm run format:check`, and `git diff --check` — passed.

The task remains In Progress. Record the workflow URL/run ID, tag SHA, native job
results, uploaded artifact names/architectures, smoke output, permission inspection,
and manual dry-run evidence after this workflow is committed, tagged, pushed, and
run. The local repository had no release tag and no GitHub CLI available during
the 2026-08-26 verification, so hosted evidence was not claimed.

---

## TASK-011-006 — Assemble a Checksummed Draft GitHub Prerelease

### Status

Pending

### Outcome

After every native job succeeds, one privileged assembly job verifies final files
and checksums and creates an unpublished GitHub draft prerelease with complete
unsigned-personal-testing guidance.

### Dependencies

- TASK-011-005 — Add Native CI Builds and Artifact Validation.

### Included

- Download only workflow artifacts produced by the current tagged run.
- Reject missing, duplicate, stale, incorrectly named, wrong-version, or
  wrong-architecture primary artifacts.
- Generate one stable `SHA256SUMS.txt` over exact final release files.
- Verify complete one-to-one checksum coverage before upload.
- Add deterministic checksum tests for changed, missing, duplicate, and extra
  files.
- Grant `contents: write` only to the release-assembly job.
- Create or safely update one release matching the exact tag with `draft: true`
  and `prerelease: true`.
- Include the download map, unsigned warnings, graphical override guidance,
  checksum limitation, automatic-update absence, supported targets, uninstall
  preservation, downgrade exclusion, temporary-contact note, and evidence status.
- Keep a failed or partial result absent or unmistakably incomplete and draft.
- Prevent automation from publishing the release.

### Excluded

- manual publication;
- fresh-machine acceptance;
- signing, notarization, provenance claims, or an auto-updater;
- a public-production readiness statement;
- GitHub Store/marketplace distribution.

### Deliverables

- Tested checksum generation/verification.
- Least-privilege release-assembly workflow job.
- Complete draft GitHub prerelease with all required assets and notes.
- Failure-safe/idempotent unpublished rerun behavior.

### Verification

- Run focused artifact/checksum/release-metadata tests.
- Alter a checksum fixture and prove validation fails.
- Simulate or run a missing platform artifact and prove no publishable-looking
  release results.
- Inspect workflow permissions and prove build jobs cannot publish.
- Inspect the real draft prerelease assets, names, version, commit, warnings,
  limitations, and draft/prerelease flags.
- Confirm no automation path marks the release published.

### Traceability

- Acceptance criteria: AC-011-008, AC-011-009, AC-011-010, AC-011-012,
  AC-011-017
- Specification sections: 7, 14, 15, 16, 17, 22, 25, 29, 31

### Completion Evidence

Record workflow/release URL, tag, commit, artifact list, checksum verification,
permission audit, failure fixture results, and draft/prerelease flags here.

---

## TASK-011-007 — Define Repeatable Installation and Data-Preservation Acceptance

### Status

Pending

### Outcome

A versioned, privacy-safe acceptance procedure and evidence template can prove
fresh installation, bounded offline workflows, replacement/reinstall,
uninstall/reinstall, and later forward upgrades across the complete platform
matrix before manual publication.

### Dependencies

- TASK-011-006 — Assemble a Checksummed Draft GitHub Prerelease.

### Included

- Create the release acceptance checklist/evidence location required by the spec.
- Cover the latest and preceding supported macOS majors across Apple Silicon and
  Intel.
- Cover current supported Windows 11 x64 and the preceding release when it remains
  vendor-supported and available, with an explicit exception record otherwise.
- Cover Ubuntu 26.04 LTS GNOME x64 and Ubuntu 24.04 LTS GNOME x64.
- Require disposable OS users/VMs/profiles isolated from real Daymark data in the
  compatibility-preserved `Daymark` profile directory.
- Verify release download origin and SHA-256 before install.
- Document graphical per-application Gatekeeper/SmartScreen override paths without
  disabling global security.
- Exercise the bounded offline Timer/tray/History/Analytics/Settings/lifecycle
  workflow.
- Verify application and tray icons, ordinary-user profile ownership, clean
  application logs/console, and no runtime HTTP(S) resources.
- Define first-release replacement/reinstall and uninstall/reinstall data fixtures.
- Define actual preceding-version upgrade acceptance beginning with the second
  release and a first-release not-applicable record.
- State uninstall data preservation and unsupported downgrade behavior.
- Gate manual publication on every required evidence record and no open blocking
  defect.

### Excluded

- performing final acceptance for TASK-011-008;
- exhaustive repetition of all SPEC-001 through SPEC-010 acceptance criteria;
- automatic updates or downgrade validation;
- deletion of preserved application data;
- screenshots or evidence containing personal Task descriptions or real profiles;
- publication authority for CI.

### Deliverables

- Versioned cross-platform acceptance checklist and evidence template.
- Platform-specific install/uninstall and unsigned-warning instructions.
- Representative synthetic data fixture/scenario.
- Manual publication gate and defect/deviation fields.
- Upgrade policy for first and later releases.

### Verification

- Dry-run the checklist against the host-compatible draft artifact and a disposable
  profile.
- Confirm every §21 evidence field has an explicit place.
- Confirm the checklist distinguishes first release, later upgrade, reinstall,
  uninstall/reinstall, and downgrade exclusion.
- Review instructions for accessibility, privacy, least privilege, and absence of
  machine-wide security bypasses.
- Trace the checklist to AC-011-011 through AC-011-017.

### Traceability

- Acceptance criteria: AC-011-011, AC-011-012, AC-011-013, AC-011-014,
  AC-011-015, AC-011-016, AC-011-017
- Specification sections: 7, 18, 19, 20, 21, 22, 23, 27, 28, 31

### Completion Evidence

Record checklist dry-run environment, isolation method, fixture values, checksum,
install/smoke/reinstall results, privacy review, and traceability audit here.

---

## TASK-011-008 — Verify Cross-Platform Distribution and Reconcile Documentation

### Status

Pending

### Outcome

All SPEC-011 acceptance criteria are evidenced against one complete draft
prerelease, every required clean-system environment passes, baseline validation is
green, and repository documentation accurately describes the unsigned personal
distribution stage and future public-release prerequisites.

### Dependencies

- TASK-011-007 — Define Repeatable Installation and Data-Preservation Acceptance.

### Included

- Audit AC-011-001 through AC-011-018 against automated and manual evidence.
- Run complete repository validation and primary-platform packaging.
- Verify the native build matrix and exact tag/version/commit agreement.
- Verify all draft release artifacts and `SHA256SUMS.txt`.
- Execute the complete §21 physical/VM acceptance matrix using disposable profiles.
- Exercise the bounded §20 smoke workflow offline on every required environment.
- Verify replacement/reinstall and uninstall/reinstall data preservation on each
  platform family.
- Record first-release forward upgrade as not applicable, or perform the actual
  preceding-version upgrade when one exists.
- Confirm expected unsigned warning paths do not require global security changes.
- Confirm icon, tray, launcher, lifecycle, profile ownership, native module,
  migration, offline, console, and error behavior.
- Confirm the release remains draft until a person reviews complete evidence.
- Update decisions, architecture, release documentation, `docs/progress.md`,
  `docs/plan.md`, specification status, task statuses, and evidence consistently.
- Preserve the future requirement for real public contact/homepage metadata and
  signed/notarized general-public artifacts.

### Excluded

- automatic publication by CI;
- signing, notarization, or certificate procurement;
- automatic updates;
- exhaustive SPEC-012 MVP QA or public-launch decision;
- unrelated features, refactors, installers, architectures, or package formats;
- deleting any real or disposable profile unless separately and explicitly
  authorized after evidence is retained.

### Deliverables

- Complete automated validation evidence.
- Successful four-entry native build evidence.
- Complete draft GitHub prerelease with verified checksums.
- Complete cross-platform install, smoke, reinstall, uninstall/reinstall, and
  applicable-upgrade evidence.
- Reconciled specification/task/progress/decision/architecture/release docs.
- Explicit remaining public-distribution prerequisites.

### Verification

- Run `npm run format:check` if available.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm test`.
- Run `npm run package` on the primary platform.
- Run the complete valid-tag native GitHub Actions workflow.
- Recompute checksums from downloaded release assets.
- Complete every required §21 acceptance record.
- Inspect renderer/main logs, runtime network activity, installed files, application
  data, and final scoped diff.
- Run `git diff --check`.

### Traceability

- Acceptance criteria: AC-011-001 through AC-011-018
- Specification sections: all

### Completion Evidence

Record every command and result, workflow and draft release references, all
platform evidence, defects/deviations and resolutions, version-upgrade status,
documentation changes, and final Definition of Done audit here.

---

# Final Specification Verification

After all implementation tasks are complete:

- verify AC-011-001 through AC-011-018 directly;
- verify every earlier specification is still Verified;
- run all validation required by specification §32 and the project Definition of
  Done;
- verify all four native distributables originate from the exact tagged commit;
- verify the GitHub Release is complete, checksummed, draft, and prerelease;
- complete the full fresh-install platform matrix with disposable profiles;
- verify offline smoke, replacement/reinstall, uninstall/reinstall, and applicable
  forward-upgrade behavior;
- verify uninstall preserves application data and downgrade remains unsupported;
- verify no auto-update, telemetry, signing placeholder, secret, new renderer
  privilege, schema mutation, or unrelated product feature was added;
- verify unsigned personal-testing and temporary-contact limitations remain
  prominent;
- update documentation and `docs/progress.md`;
- change the specification to `Verified` and this source status only when every
  required result is recorded;
- leave general-public signing/notarization and exhaustive MVP QA/release work to
  follow-on specifications.
