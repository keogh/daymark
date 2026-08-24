# SPEC-014 — Task Breakdown

## Source

- Specification: `docs/specs/014-daymark-product-rename/spec.md`
- Specification status: Ready for Implementation
- Last reviewed against specification: 2026-08-22

The specification is the source of truth for behavior. This file only decomposes
that behavior into implementation work. If the two conflict, update this breakdown
to match the specification.

---

# Execution Rules

- Complete tasks in dependency order.
- Keep only one task `In Progress` unless parallel work is explicitly coordinated.
- Before implementation, copy the active task's immediate steps into `docs/plan.md`.
- Record verification evidence before marking a task `Complete`.
- Use only disposable application profiles for packaged compatibility checks.
- Do not use task completion as a substitute for specification acceptance or the
  project Definition of Done.

---

# Task Index

| ID | Task | Status | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- |
| TASK-014-001 | Establish the Daymark identity and profile-compatibility contract | Complete | None | AC-014-002, AC-014-003, AC-014-005, AC-014-006 |
| TASK-014-002 | Rename renderer and native desktop presentation | Complete | TASK-014-001 | AC-014-001, AC-014-006 |
| TASK-014-003 | Rename packaging presentation and asset references | Complete | TASK-014-001 | AC-014-002, AC-014-003, AC-014-007 |
| TASK-014-004 | Align current documentation and downstream release specifications | Pending | TASK-014-001, TASK-014-002, TASK-014-003 | AC-014-008 |
| TASK-014-005 | Verify packaged upgrade compatibility and final acceptance | Pending | TASK-014-002, TASK-014-003, TASK-014-004 | AC-014-004, AC-014-005, AC-014-006, AC-014-009 |

---

# Tasks

## TASK-014-001 — Establish the Daymark Identity and Profile-Compatibility Contract

### Status

Complete

### Outcome

One tested source-controlled identity contract distinguishes the visible Daymark
brand from every stable Time Tracker-era identifier and deterministically retains
the established application profile.

### Dependencies

None.

### Included

- Change canonical visible product metadata to Daymark.
- Preserve every exact identifier in specification §7.2.
- Determine and encode how packaged Daymark retains the established cross-platform
  Electron `userData` profile before database initialization.
- Preserve development-profile isolation and `time-tracker.sqlite`.
- Add focused identity, metadata, path, and compatibility-contract tests.

### Excluded

- Renderer/tray copy changes.
- Installer and asset filename changes.
- Data copying, importing, or schema migration.
- Internal preload, IPC, database, or source-symbol renaming.

### Deliverables

- Updated product/distribution identity configuration.
- Explicit profile-path compatibility configuration where required.
- Focused automated tests for visible and stable identity values.

### Verification

- Run focused distribution-contract, release-contract, application-path, and
  lifecycle tests.
- Run `npm run typecheck`.

### Traceability

- Acceptance criteria: AC-014-002, AC-014-003, AC-014-005, AC-014-006
- Specification sections: 7, 8, 9, 11, 13, 15

### Completion Evidence

- Added `src/shared/product-identity.ts` as the tested source-controlled contract:
  visible name `Daymark`; macOS bundle ID `com.isaaczepeda.timetracker`;
  Windows AppUserModelID `com.squirrel.timetracker.time-tracker`; Linux package
  identity `time-tracker`; Squirrel identity `timetracker`; database filename
  `time-tracker.sqlite`; preload global `timeTracker`; npm package name
  `time-tracker`.
- Packaged startup deterministically replaces Electron's visible-name-derived
  final `userData` segment with the established `Time Tracker` profile directory
  before database initialization. Development uses the same established path
  plus ` Development`, preserving profile isolation. No profile or database is
  copied, moved, migrated, or renamed.
- `npm test -- --run test/scripts/release-contract.test.ts test/main/app/packaging.test.ts test/main/database/path.test.ts test/main/database/lifecycle.test.ts test/main/app/startup.test.ts test/main/app/windows-startup.test.ts test/preload/index.test.ts`
  — passed, 7 files and 40 tests.
- `npm run release:validate -- --tag v0.1.0` — passed.
- `npm run typecheck` — passed.
- `npm run format:check` and `git diff --check` — passed.

---

## TASK-014-002 — Rename Renderer and Native Desktop Presentation

### Status

Complete

### Outcome

Every current renderer, window, tray, tooltip, command, and native error surface
identifies the product as Daymark without changing desktop behavior.

### Dependencies

TASK-014-001.

### Included

- Replace current user-visible product copy with Daymark.
- Set the native window title to Daymark.
- Update tray title, tooltip, `Open Daymark`, and product-named error copy.
- Update focused renderer, tray-presentation, tray-asset, and lifecycle tests.
- Preserve supported narrow-layout and accessibility behavior.

### Excluded

- Packaging artifact names and icon filenames.
- General rewriting of internal `TimeTracker` or `timeTracker` symbols.
- New UI, interactions, or branding artwork.

### Deliverables

- Updated renderer and native presentation.
- Focused automated presentation and regression coverage.

### Verification

- Run focused renderer, tray, and lifecycle test files.
- Run `npm run typecheck` and `npm run lint`.

### Traceability

- Acceptance criteria: AC-014-001, AC-014-006
- Specification sections: 7, 9, 10, 13, 15, 17

### Completion Evidence

- Renderer heading, loading copy, HTML title, native `BrowserWindow` title,
  tray title/tooltip/information row, `Open Daymark` command, tray timer-error
  copy, and native timer/startup error titles now use the canonical Daymark
  identity. Compatibility-sensitive profile, executable-fixture, preload, IPC,
  database, and asset identifiers remain unchanged.
- `npm test -- --run test/renderer/app/App.test.tsx test/main/app/window-options.test.ts test/main/app/error-presentation.test.ts test/main/app/startup.test.ts test/main/app/window-owner.test.ts test/main/app/windows-startup.test.ts test/main/tray/presentation.test.ts test/main/tray/service.test.ts test/main/tray/assets.test.ts`
  — passed, 9 files and 84 tests.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, and
  `git diff --check` — passed.
- `npm run package` — passed for macOS arm64. The packaged Daymark renderer was
  inspected through local Chrome DevTools Protocol because Browser/IAB was not
  available. At the 640×480 native window minimum, `document.title` and the
  product heading were exactly `Daymark`, body width remained 640 pixels without
  horizontal overflow, and Timer → Analytics → Timer navigation preserved its
  selected-state behavior.
- Compared `/private/tmp/daymark-task014-002-reference-640x480.png` from the
  attributable pre-rename package with
  `/private/tmp/daymark-task014-002-current-640x480.png` using `view_image` at
  original detail. Copy, layout, typography, palette, controls, spacing, and
  narrow-window behavior matched; the only intended visible difference was the
  `Time Tracker` → `Daymark` product heading replacement.

---

## TASK-014-003 — Rename Packaging Presentation and Asset References

### Status

Complete

### Outcome

Supported package configurations and primary release artifacts present Daymark
while retaining stable install identities and byte-equivalent icon artwork.

### Dependencies

TASK-014-001.

### Included

- Update Electron Forge product, executable, maker, launcher, installer, DMG, and
  artifact display names as specified.
- Update macOS, Windows, and Linux structural inspection contracts.
- Rename old-brand source/generated application and tray asset filenames when
  appropriate and update all references atomically.
- Prove artwork content is unchanged.
- Update focused packaging and artifact-name tests.

### Excluded

- Icon artwork redesign.
- Signing, notarization, publishing, automatic updates, or new artifact types.
- Native cross-platform installation evidence owned by SPEC-011.

### Deliverables

- Daymark packaging configuration for all supported targets.
- Updated source/generated asset references.
- Automated release-contract and structural package coverage.

### Verification

- Run focused Forge, artifact-name, release-contract, asset, and package-inspector
  tests.
- Run `npm run package` on the primary development platform and inspect its
  structure.

### Traceability

- Acceptance criteria: AC-014-002, AC-014-003, AC-014-007
- Specification sections: 7, 11, 13, 15, 16

### Completion Evidence

- Forge configuration, primary artifact generation, and the macOS, Windows, and
  Linux package inspectors now require Daymark application, executable,
  installer, launcher, DMG, and primary artifact presentation. The intentionally
  stable macOS bundle ID, Windows AppUserModelID, Debian package/launcher
  identity, Squirrel package name, npm package name, profile directory, database
  filename, and preload global remain unchanged.
- Renamed the four application icon inputs and four tray inputs from
  `time-tracker*` to `daymark*`, updating Forge, runtime selection, generation,
  package inspection, and test references atomically. Fixed SHA-256 tests prove
  the pre/post-rename bytes are identical. The hashes are:
  `d03dac643a61359fcf5340bba8733cfcc2b67128ed342002e45f513a79ad5cfb`
  (icon source),
  `7d5ff142d9d04743d3a011342a5f6f1cd11cb0ffa92387b6d966905a28dfa642`
  (ICNS),
  `3b19074fa62693d3ac26a3f310253bce38f049761aa7bccd6d0dabb15353c989`
  (ICO),
  `81a57cc793f4c623e8b95875c0183e9ac84eea051dc5001e008735250b71c02d`
  (application PNG),
  `5b6066dc0dba87a9c4e76d6bc741d40a33b895f7a48c4b25cabc2923950aa414`
  (tray source),
  `ef16bcc79dc8a05c78ab1dd39deccc9262b82710b5b0428983b4d740ae88d6e4`
  (tray PNG and 2x template), and
  `5eb0584faccb43df7e5517be9defe4d627ebd302971d6c1c481b1146bda54577`
  (1x template).
- `npm test -- --run test/main/app/packaging.test.ts test/main/app/windows-startup.test.ts test/main/tray/assets.test.ts test/scripts/release-contract.test.ts test/scripts/linux-deb-artifact.test.ts test/scripts/workflow-artifacts.test.ts test/scripts/native-build-workflow.test.ts`
  — passed, 7 files and 39 tests.
- `npm run typecheck`, `npm run lint`, `npm run format:check`,
  `npm run release:validate -- --tag v0.1.0`, and `git diff --check` — passed.
- `npm run package` produced
  `out/Daymark-darwin-arm64/Daymark.app`; `npm run inspect:macos:arm64` passed.
  `Info.plist` reports display name and executable `Daymark` while retaining
  bundle ID `com.isaaczepeda.timetracker`, and structural inspection found the
  renamed Daymark icon/tray resources plus the required ASAR and arm64 native
  module content.

---

## TASK-014-004 — Align Current Documentation and Downstream Release Specifications

### Status

Pending

### Outcome

Current documentation names Daymark consistently, historical records remain
truthful, and SPEC-011/SPEC-012 require future evidence against Daymark.

### Dependencies

TASK-014-001, TASK-014-002, and TASK-014-003.

### Included

- Update current project, product, architecture, domain, UX, roadmap, release, and
  contributor/agent documentation where it presents the current product name.
- Add historical-name context where necessary without rewriting past evidence.
- Update active SPEC-011 and SPEC-012 specifications and task breakdowns for the
  Daymark identity, artifact names, commands, paths, and acceptance expectations.
- Record any acceptance evidence invalidated by the rename as requiring a rerun.

### Excluded

- Rewriting completed specification behavior or historical command/output records.
- Marking SPEC-011 or SPEC-012 tasks complete.
- Changing signing, publication, or release policy.

### Deliverables

- Updated current documentation.
- Updated SPEC-011 and SPEC-012 source-of-truth and task files.
- A reviewable record of intentionally retained historical `Time Tracker` text.

### Verification

- Search current documentation for remaining old-brand text and classify each
  occurrence as compatibility-sensitive, internal, or historical.
- Run `npm run format:check`.

### Traceability

- Acceptance criteria: AC-014-008
- Specification sections: 3, 4, 6, 7, 12, 13

### Completion Evidence

Record files updated, search commands/results, intentional historical exceptions,
and downstream evidence that must be rerun.

---

## TASK-014-005 — Verify Packaged Upgrade Compatibility and Final Acceptance

### Status

Pending

### Outcome

A packaged Daymark build proves clean-profile operation, in-place access to an
existing Time Tracker profile, unchanged workflows, and every SPEC-014 acceptance
criterion.

### Dependencies

TASK-014-002, TASK-014-003, and TASK-014-004.

### Included

- Run the full automated validation baseline.
- Package Daymark on the primary development platform.
- Perform clean disposable-profile verification.
- Perform isolated pre-rename-to-Daymark profile compatibility verification with
  representative Tasks, intervals, Settings, and a running or paused Timer.
- Inspect database path and persisted state before and after launch.
- Verify no competing profile, migration, data mutation, HTTP(S) runtime resource,
  renderer console error, or unexpected main-process failure.
- Evaluate every acceptance criterion and update `docs/progress.md`.

### Excluded

- Using the owner's normal application profile.
- Native Windows/Linux/Intel macOS installation evidence owned by SPEC-011.
- Publishing an artifact or release.
- Signing or notarization.

### Deliverables

- Automated validation results.
- Attributable packaged clean-profile and upgrade-compatibility evidence.
- Final acceptance record and progress update.

### Verification

- Run `npm run format:check`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm test`.
- Run `npm run package`.
- Complete and record specification §16 against disposable profiles.

### Traceability

- Acceptance criteria: AC-014-004, AC-014-005, AC-014-006, AC-014-009, plus final
  verification of AC-014-001 through AC-014-009
- Specification sections: 13 through 18

### Completion Evidence

Record commands, results, package identity, profile/database paths, before/after
state inspection, console/network observations, and the criterion-by-criterion
acceptance result.

---

# Final Specification Verification

After all implementation tasks are complete:

- verify AC-014-001 through AC-014-009 directly;
- confirm every stable identifier in specification §7.2 remains exact;
- confirm the same existing database is opened in place without a competing
  profile;
- run all validation required by the specification and Definition of Done;
- confirm SPEC-011 and SPEC-012 now validate Daymark and identify invalidated
  evidence for rerun;
- confirm historical records were not rewritten inaccurately;
- update `docs/progress.md`;
- mark the specification `Verified` only after every required check and packaged
  scenario passes.
