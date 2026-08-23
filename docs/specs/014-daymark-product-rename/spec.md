# SPEC-014 — Daymark Product Rename

## Status

Ready for Implementation

## Milestone

M9 — Cross-Platform Packaging

## Priority

P0

---

# 1. Objective

Rename the product from **Time Tracker** to **Daymark** everywhere a user or
release consumer encounters the product, while preserving the stable technical
identity and existing local application data established under the Time Tracker
name.

---

# 2. User Story

As the application owner,

I want the product to be named Daymark consistently in the application and its
distribution artifacts,

so that it has a distinctive public identity without interrupting existing time
tracking data or changing product behavior.

---

# 3. Background

The MVP was developed under the provisional name `Time Tracker`. The selected
product name is now `Daymark`.

The current product name appears in renderer copy, native window and tray
presentation, error dialogs, package metadata, installer metadata, artifact
names, release contracts, source-owned asset filenames, tests, and current
documentation. Some older identifiers also determine installation identity or
the location and shape of existing user data.

This specification distinguishes the new user-facing and distribution brand from
those compatibility-sensitive internal identifiers. It deliberately preserves
the latter so an installed build is treated as the same application and opens the
same local profile after the rename.

The existing icon artwork remains the Daymark icon for this specification. Asset
filenames may be renamed for source clarity, but the artwork must not be
redesigned.

---

# 4. Scope

This specification includes:

- changing the canonical user-facing product name to `Daymark`;
- changing renderer headings, loading copy, native window title, tray title,
  tooltip and commands, and native application error-dialog copy that names the
  product;
- changing `package.json` product metadata and distribution metadata that users
  or release consumers see;
- changing packaged application, executable, installer, DMG, Debian display, and
  primary release artifact names to use Daymark where supported by the existing
  distribution contract;
- preserving stable installation and runtime identifiers listed in §7;
- preserving automatic access to the existing application profile and database;
- renaming source-owned icon and tray asset filenames where they contain the old
  brand, without changing the artwork;
- updating active release scripts, package inspection, tests, release
  documentation, product documentation, and current project instructions to use
  Daymark where the text describes the current product;
- retaining historical evidence and completed-specification wording where it is
  an attributable record of what was verified under the former name;
- updating SPEC-011 and SPEC-012 contracts and task breakdowns so their remaining
  packaging and release-readiness work validates Daymark;
- packaged verification on the primary development platform and contract-level
  verification for every supported distribution target.

---

# 5. Out of Scope

This specification does not include:

- redesigning or replacing the application or tray icon artwork;
- changing time-tracking, History, Analytics, Settings, Task, or interval
  behavior;
- changing the database schema or data values;
- moving, copying, importing, exporting, or deleting an existing user profile;
- changing signing, notarization, publication, or automatic-update behavior;
- acquiring domains, social accounts, trademarks, or store listings;
- adding a tagline, onboarding flow, splash screen, or About screen;
- renaming every source symbol merely because it contains `TimeTracker` or
  `timeTracker`;
- rewriting immutable historical evidence to make it appear that old builds were
  named Daymark.

---

# 6. Dependencies and Execution Order

Required earlier specifications:

- SPEC-000 through SPEC-010 — Verified.

SPEC-011 is active and already contains packaging work whose exact product-name
assertions use `Time Tracker`. Implementation of this specification must occur
before SPEC-011 final acceptance, release assembly, or fresh-install evidence is
treated as current. Any SPEC-011 evidence invalidated by the rename must be rerun
against Daymark.

SPEC-012 must evaluate a Daymark candidate and therefore may not begin final
release-readiness execution until this specification and SPEC-011 are Verified.

The roadmap-reserved SPEC-013 — Trusted Release Signing and Notarization retains
its number. This specification uses SPEC-014 to avoid silently renumbering that
established work.

---

# 7. Product Identity and Compatibility Contract

## 7.1 Canonical current brand

The exact current product name is:

```text
Daymark
```

Current user-facing copy and current release/distribution documentation must not
present `Time Tracker` as the product's current name. When historical context is
necessary, use wording such as `Daymark (formerly Time Tracker)` once and continue
with `Daymark`.

## 7.2 Stable identifiers that must not change

The following compatibility-sensitive identifiers remain exactly as established:

```text
macOS bundle ID:              com.isaaczepeda.timetracker
Windows AppUserModelID:       com.squirrel.timetracker.time-tracker
Linux package identity:       time-tracker
Squirrel package identity:    timetracker
database filename:            time-tracker.sqlite
preload global:               window.timeTracker
npm package name:             time-tracker
```

Existing IPC channel names, TypeScript contract names, source module names,
database table/column/index names, and migration history may retain the old
technical terminology. They must be renamed only when required to remove
user-visible old-brand text or to keep a directly affected test readable.

## 7.3 Existing profile and data

A packaged Daymark upgrade or replacement installation must resolve the same
operating-system application profile used by the corresponding Time Tracker
build. It must open the existing `time-tracker.sqlite` database in place.

The rename must not:

- create a separate empty Daymark profile for an existing user;
- copy or move the database as an ordinary startup side effect;
- require a manual import;
- reset application settings;
- close or alter a persisted running or paused Timer;
- modify Task or TimeInterval records solely because the product name changed.

If changing visible package metadata would cause Electron or an installer to
derive a different profile path, startup or packaging configuration must
explicitly retain the established profile location before database initialization.
This is configuration compatibility work, not a database migration.

---

# 8. Data Model Changes

No database schema or data migration is permitted.

The existing database filename remains `time-tracker.sqlite` and the existing
profile is opened in place.

---

# 9. Application Service and IPC Behavior

No application-service operation, preload API, or IPC behavior changes.

`window.timeTracker` and all existing narrow APIs remain compatible. No alias such
as `window.daymark` is added.

---

# 10. Renderer and Native Desktop Presentation

The main application shell must display `Daymark` as its product heading. Loading
and application-level unavailable/error copy that names the product must use
Daymark.

The native window title must be `Daymark` wherever the platform displays it.

The tray/menu-bar presentation must use:

```text
Daymark
Open Daymark
```

The tray tooltip and any product-named native timer error dialogs must use
Daymark. Timer-state, Task-description, duration, and command behavior remain as
specified by SPEC-008.

The rename must not introduce layout regressions at the supported 640×480 minimum
window size or change accessible names except where replacing the old product name
with Daymark.

---

# 11. Packaging and Distribution Presentation

The visible product name in package metadata and the distribution contract is
`Daymark`.

Where the existing makers support it without changing the stable identifiers in
§7.2:

- the macOS application bundle display name and executable are Daymark;
- DMG titles and primary DMG filenames use Daymark;
- the Windows application display name, executable, installer title, and primary
  Setup filename use Daymark;
- the Debian application/launcher display name and executable use Daymark while
  the Debian package identity remains `time-tracker`;
- primary release artifact filenames use the existing version/platform/
  architecture convention with `Daymark` as the product segment.

Package inspectors and release-contract validation must distinguish the Daymark
display name from the intentionally preserved stable identifiers.

The existing icon artwork must be packaged unchanged. Source and generated asset
filenames may change from `time-tracker*` to `daymark*` when all configuration,
tests, and documentation references are updated atomically.

---

# 12. Documentation Rules

Current, forward-looking documents must identify the product as Daymark. At
minimum this includes `AGENTS.md`, `docs/context.md`, product/UX/architecture/
domain documentation where the current product is named, roadmap entries,
release documentation, and `docs/progress.md`.

Completed specifications, their task completion evidence, acceptance evidence,
and historical progress entries are historical records. They must not be
wholesale rewritten. A short current-name note may be added where needed, while
past commands, paths, artifact names, and observed output remain exact.

Active SPEC-011 and SPEC-012 content and task breakdowns must be updated wherever
their future acceptance or release contracts require the current name.

---

# 13. Error and Edge-Case Behavior

- A clean Daymark installation creates and uses the established profile naming
  contract and `time-tracker.sqlite` filename.
- An installation with existing Time Tracker data opens that data without a
  rename prompt or import flow.
- A running or paused Timer reconstructs unchanged after launching the renamed
  packaged application.
- Reinstall or replacement does not delete or fork the profile.
- Development profile isolation established by project-foundation maintenance
  remains intact.
- Native error messages name Daymark but do not expose internal identifiers.
- Old product-name text is allowed only for compatibility identifiers, source
  internals, and clearly historical documentation/evidence.

---

# 14. Acceptance Criteria

## AC-014-001 — Current product presentation uses Daymark

Given the application is launched,

when the renderer, native window, tray/menu-bar, and product-named native errors
are inspected,

then each identifies the product as Daymark and no current user-facing surface
identifies it as Time Tracker.

## AC-014-002 — Distribution presentation uses Daymark

Given each supported packaging configuration,

when package metadata, maker configuration, primary artifact names, and structural
inspection expectations are evaluated,

then visible product, executable, installer, launcher, and artifact presentation
uses Daymark as defined in §11.

## AC-014-003 — Stable technical identity is preserved

Given the identity contract before and after the rename,

when its compatibility-sensitive values are compared,

then every identifier listed in §7.2 remains exact while the visible product name
is Daymark.

## AC-014-004 — Existing data remains available in place

Given an isolated packaged Time Tracker profile containing Tasks, intervals,
Settings, and a running or paused Timer,

when the corresponding packaged Daymark build launches against that established
profile,

then it opens the same `time-tracker.sqlite` database in place, preserves all
records and settings, reconstructs the Timer correctly, and creates no competing
product profile.

## AC-014-005 — Clean installation remains valid

Given no existing application profile,

when Daymark launches and creates data,

then normal operation succeeds using the preserved profile and database naming
contract without a migration or runtime network dependency.

## AC-014-006 — Runtime contracts and product behavior are unchanged

Given the renamed application,

when existing automated behavior and boundary tests run,

then `window.timeTracker`, IPC contracts, database schema, Timer behavior, and all
previous product workflows remain compatible.

## AC-014-007 — Existing artwork is retained

Given the application and tray icon inputs before the rename,

when renamed source/generated assets are compared by content,

then the artwork is unchanged even if filenames and references changed.

## AC-014-008 — Current documentation and downstream release specs agree

Given current documentation plus active SPEC-011 and SPEC-012,

when current-name and release-contract references are reviewed,

then they describe Daymark consistently, preserve historical evidence, and require
future packaging and release-readiness evidence against Daymark.

## AC-014-009 — Packaged primary-platform smoke workflow passes

Given a packaged Daymark build using disposable application data,

when it is launched offline and the shell, tray, Timer reconstruction, and
database path are inspected,

then the visible rename and compatibility contract pass without renderer console
errors, unexpected main-process failures, or network dependence.

---

# 15. Required Automated Tests

Automated coverage must prove:

- exact Daymark renderer presentation where product copy is rendered;
- exact Daymark tray title, tooltip, open command, and product-named error copy;
- package metadata and the distribution contract use Daymark visibly;
- all stable identifier values in §7.2 remain exact;
- primary artifact-name generation uses Daymark;
- macOS, Windows, and Linux package inspection contracts expect Daymark display
  names while retaining stable identifiers;
- existing database-path and development-profile-isolation behavior is unchanged;
- icon/tray asset content is unchanged if files are renamed;
- no existing application behavior or API test regresses.

No new repository, domain, service, IPC, or database migration test is required
unless implementation changes code in one of those layers to preserve the profile
contract.

---

# 16. Required Manual and Packaged Verification

On the primary development platform:

1. package Daymark;
2. inspect the package display name, executable, native window title, renderer
   heading, and tray presentation;
3. launch once with a clean disposable profile and verify
   `time-tracker.sqlite` is created in the expected preserved profile location;
4. create representative Task, interval, Settings, and active Timer state;
5. launch the renamed build against an isolated profile seeded by the pre-rename
   packaged application or an equivalent attributable pre-rename fixture;
6. verify the same database is opened in place and all state reconstructs;
7. verify no competing Daymark profile is created;
8. verify no HTTP(S) runtime resource is required and no unexpected renderer
   console or main-process error is emitted.

Contract and structural package tests may cover non-primary platforms during this
specification. SPEC-011 remains responsible for native artifact and installation
evidence on its complete supported matrix, and that evidence must use Daymark.

---

# 17. Security, Accessibility, and Performance

No privileged API, dependency, database query, timer, telemetry, or network access
is added.

Existing semantic controls, keyboard behavior, focus behavior, and non-color
status communication remain unchanged. Product-named accessible labels use
Daymark.

The rename must not add ordinary-startup file copying or scanning. Profile
compatibility must be resolved deterministically before database initialization.

---

# 18. Definition of Done

This specification is complete when:

- AC-014-001 through AC-014-009 pass;
- all required automated and packaged verification passes;
- `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm test`, and
  `npm run package` pass;
- the existing profile and database remain compatible without a schema or data
  migration;
- active SPEC-011 and SPEC-012 contracts and tasks validate Daymark;
- current documentation uses Daymark and historical evidence remains accurate;
- `docs/progress.md` records completion;
- no icon redesign, product feature, or unrelated refactor is added.

---

# 19. Implementation Notes for Codex

- Treat `Daymark` as presentation and distribution identity, not as permission to
  rename all internal symbols.
- Centralize current product display copy where doing so removes risky duplicate
  literals without creating a generic branding framework.
- Resolve Electron `productName` and `userData` behavior explicitly before editing
  package metadata. Do not assume that preserving the bundle ID alone preserves
  the profile path on every platform.
- Do not edit migration snapshots merely to replace historical terminology.
- Use disposable profiles for every compatibility check. Never launch acceptance
  against the owner's normal application profile.
- If implementation reveals that a preserved identifier cannot coexist with a
  required Daymark display name on a supported maker, document the exact conflict
  and update the specification before choosing a new identity or migration.
