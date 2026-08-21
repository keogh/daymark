# Architectural and Product Decisions

This document records decisions that materially affect implementation.

Do not silently reverse an accepted decision.

When changing a decision:

1. mark the original decision as superseded;
2. record the new decision;
3. explain the reason;
4. update affected documentation.

---

# DEC-001 — Desktop Runtime

## Status

Accepted

## Decision

Use Electron.

## Context

The application must support:

- macOS;
- Windows;
- Linux.

The implementation should remain primarily TypeScript.

## Reasoning

Electron provides:

- mature cross-platform desktop support;
- TypeScript/Node.js integration;
- tray support;
- application lifecycle APIs;
- mature packaging tooling.

Keeping most of the application in TypeScript is preferred over introducing a second systems language for the MVP.

---

# DEC-002 — Renderer Framework

## Status

Accepted

## Decision

Use React with TypeScript.

---

# DEC-003 — Build Tool

## Status

Accepted

## Decision

Use Vite for renderer development/building.

Use Electron Forge for Electron project packaging and distribution.

---

# DEC-004 — Local Database

## Status

Accepted

## Decision

Use SQLite.

## Reasoning

The product is:

- single-user;
- local-first;
- offline;
- desktop-only for the MVP.

A server database is unnecessary.

---

# DEC-005 — SQLite Driver

## Status

Accepted

## Decision

Use better-sqlite3.

SQLite access occurs only from the Electron main process.

---

# DEC-006 — ORM

## Status

Accepted

## Decision

Use Drizzle ORM.

## Reasoning

The application has a small relational model and benefits from:

- typed schema definitions;
- migrations;
- direct SQL-style queries;
- relatively low abstraction overhead.

---

# DEC-007 — Network Architecture

## Status

Accepted

## Decision

The MVP has no application backend.

No network connectivity is required for normal operation.

---

# DEC-008 — Renderer Security Boundary

## Status

Accepted

## Decision

Use:

    contextIsolation = true
    nodeIntegration = false

Privileged functionality is exposed through an explicit preload API.

The renderer must never receive unrestricted ipcRenderer access.

---

# DEC-009 — SQLite Ownership

## Status

Accepted

## Decision

SQLite is owned by the Electron main process.

The renderer must never connect directly to SQLite.

---

# DEC-010 — Timer Source of Truth

## Status

Accepted

## Decision

Persist start and end timestamps.

Do not persist continuously updated duration counters.

## Consequence

The visual timer is derived from timestamps.

The database does not receive writes every second.

---

# DEC-011 — Time Representation

## Status

Accepted

## Decision

Persist timestamps as UTC epoch milliseconds.

Use the user's local timezone when projecting intervals into calendar days.

---

# DEC-012 — Midnight Intervals

## Status

Accepted

## Decision

A TimeInterval may cross midnight.

Do not split the persisted interval.

Daily reports calculate overlap with calendar-day boundaries.

---

# DEC-013 — Task Persistence

## Status

Accepted

## Decision

Tasks are independent of days.

A task may contain intervals across any number of days.

Daily history is a projection over intervals.

---

# DEC-014 — Task Duration

## Status

Accepted

## Decision

Do not store:

    task.totalDuration

as mutable state.

Lifetime duration is calculated from intervals.

---

# DEC-015 — Daily Duration

## Status

Accepted

## Decision

Do not store daily accumulated duration.

Daily totals are calculated from intervals.

---

# DEC-016 — One Active Timer

## Status

Accepted

## Decision

Only one TimeInterval may be open globally.

This invariant should be enforced both:

- in application logic;
- by SQLite.

---

# DEC-017 — Pause Semantics

## Status

Accepted

## Decision

Pause closes the current open interval.

The Task remains the current Task.

Resume creates a new TimeInterval.

---

# DEC-018 — Stop Semantics

## Status

Accepted

## Decision

Stop:

- closes the current open interval if necessary;
- clears the current Task;
- ends the current UI tracking session;
- returns the timer to idle.

The Task itself is preserved.

---

# DEC-019 — Switching Tasks

## Status

Accepted

## Decision

Starting another task while one is running or paused automatically stops the current task and starts the selected task.

No confirmation dialog is shown.

---

# DEC-020 — Tracking Session Persistence

## Status

Accepted

## Decision

Do not create a separate TrackingSession database table for the MVP.

Persist:

    app_state.session_started_at

while the current Start → Stop session exists.

Session active duration is derived from TimeIntervals.

---

# DEC-021 — Closing the Window

## Status

Accepted

## Decision

Closing the main window hides it instead of quitting the application.

The tray remains active.

---

# DEC-022 — Explicit Application Exit

## Status

Accepted

## Decision

Explicitly quitting the application does not stop an open timer.

The open interval remains persisted.

When the application starts again, elapsed duration is reconstructed from timestamps.

---

# DEC-023 — Computer Sleep

## Status

Accepted

## Decision

Elapsed wall-clock time continues to count while the computer sleeps if the timer remains running.

Idle detection and sleep correction are outside the MVP.

---

# DEC-024 — System Tray

## Status

Accepted

## Decision

System tray/menu-bar integration is included in the MVP.

It provides:

- Open;
- Pause/Resume;
- Stop;
- Quit;
- current timer information where practical.

---

# DEC-025 — Automatic OS Startup

## Status

Accepted

## Decision

Do not implement automatic launch at OS startup in the initial MVP.

Design should not intentionally prevent adding it later.

---

# DEC-026 — Manual Time Entry

## Status

Accepted

## Decision

The MVP supports manual time creation and correction.

Manual intervals must not overlap existing tracked intervals.

---

# DEC-027 — Task Fields

## Status

Accepted

## Decision

An MVP Task contains only a description as user-authored content.

Do not add:

- notes;
- project;
- category;
- tags;
- client.

---

# DEC-028 — Analytics Scope

## Status

Accepted

## Decision

MVP analytics is limited to:

- 7-day view;
- 30-day view;
- time per day;
- total;
- daily average;
- weekly total;
- monthly total;
- top tasks.

---

# DEC-029 — Package Manager

## Status

Accepted

## Decision

Use npm.

## Reasoning

The project is small and does not require workspace/package-manager features beyond standard npm functionality.

This can be revisited if the repository later becomes a monorepo.

---

# DEC-030 — Testing

## Status

Accepted

## Decision

Use:

- Vitest for TypeScript unit/integration tests;
- React Testing Library for renderer components.

Store all automated tests in the top-level `test/` directory. Test paths mirror
their production paths beneath `src/`; for example,
`src/main/services/timer-service.ts` is tested by
`test/main/services/timer-service.test.ts`. Do not colocate tests in `src/`.
Test-only setup, fixtures, fakes, and helpers also belong under `test/`.

End-to-end tooling may be introduced when an executable workflow requires it.

Do not make E2E tooling a prerequisite for project foundation unless SPEC-000 requires it.

---

# DEC-031 — State Management

## Status

Accepted

## Decision

Do not introduce Redux or another global state-management framework during project foundation.

Use React state/hooks initially.

Introduce a global state library only if later feature complexity demonstrates a real need.

---

# DEC-032 — Runtime Validation

## Status

Accepted

## Decision

IPC input crossing from renderer to main must be validated at runtime.

The exact validation technique may be selected during implementation.

Avoid introducing a large validation dependency if straightforward validation is sufficient.

---

# DEC-033 — Database Migrations

## Status

Accepted

## Decision

All production schema changes use migrations.

Never rely on deleting/recreating the user's database after release.

---

# DEC-034 — Renderer Styling and Component Foundation

## Status

Accepted

## Decision

Use Tailwind CSS v4 for renderer styling and selectively adopt source-owned
shadcn/ui components from the official `@shadcn` registry.

Initialize shadcn/ui for the existing Vite renderer with:

- the Radix-based Nova preset;
- the existing `@/*` source-root alias;
- Lucide icons;
- a neutral/slate semantic-token foundation;
- the existing blue treatment as the semantic primary color.

SPEC-002 introduces light appearance only. Semantic tokens should permit a later
dark-mode decision without adding dark-mode product behavior now.

Add only components required by the active specification. Do not install all
components or use community registry blocks without a separate demonstrated need
and review.

Generated component files are application-owned source code. Review, test, and
maintain them under the same standards as handwritten renderer code.

Adopt the foundation incrementally. Shared controls and states may migrate when
touched, while specialized product UI such as the primary timer display remains
custom. Do not use this decision as authorization for a wholesale redesign.

## Context

Daily History and later MVP specifications require increasingly complex accessible
controls, including expandable content, overlays, menus, forms, navigation, and
charts. Reimplementing every primitive independently would duplicate interaction,
focus, state, and styling work.

The existing renderer also contains repeated button, input, pending, focus, and
error styles that benefit from shared variants and semantic tokens.

## Reasoning

Tailwind provides compact composition and layout utilities without changing the
renderer process boundary. shadcn/ui provides inspectable component source rather
than an opaque runtime component framework, allowing the project to keep components
small, accessible, and product-specific.

Selective adoption preserves the project's preference for minimal dependencies and
avoids forcing the application into a generic dashboard design.

## Consequences

- Tailwind and required primitive packages become renderer build dependencies.
- Component source is committed to this repository and reviewed after CLI changes.
- Feature components use semantic tokens instead of raw palette colors for product
  meaning.
- The renderer continues to access privileged behavior only through the typed
  preload API.
- Runtime network access is not introduced.
- Completed specifications are not rewritten merely because their controls are
  later migrated without behavioral change.

---

# DEC-035 — Initial Cross-Platform Distribution

## Status

Accepted

## Decision

Use Electron Forge to produce these initial MVP distribution artifacts on native
GitHub-hosted runners:

- separate macOS arm64 and x64 DMGs;
- a Windows x64 Squirrel Setup executable;
- a Linux x64 Debian package for representative Ubuntu GNOME environments.

`package.json` is the authoritative semantic version. A release tag must match it
exactly as `v${version}`. Successful native builds are assembled with SHA-256
checksums into one public-repository GitHub Release that remains both draft and
prerelease until a person completes and reviews fresh-install acceptance.

The initial artifacts are unsigned and intended for personal installation and
testing. Documentation must identify expected Gatekeeper/SmartScreen warnings and
must not present checksums as publisher authentication. General-public production
distribution requires the signing/notarization decision planned for SPEC-013 and
owner-provided credentials.

Uninstall preserves the per-user application database and settings. Replacement,
reinstall, and—beginning with the second published version—forward upgrade must
preserve that profile. Downgrades and automatic updates are outside the initial
distribution scope.

## Context

The repository has no Apple or Windows signing certificates yet. The project owner
wants personally installable cross-platform artifacts now and intends to make the
application public later. Native builds avoid unsupported cross-compilation and
ensure `better-sqlite3` is rebuilt for the target Electron platform and
architecture.

## Consequences

- Unsigned artifacts may require a documented, per-application operating-system
  override and are not described as general-public production builds.
- CI build success does not substitute for installation acceptance on physical or
  virtual clean systems.
- Only the release-assembly job receives repository contents-write permission.
- No signing secret, certificate placeholder, auto-updater, telemetry, or runtime
  networking is introduced.
- SPEC-011 defines the exact artifact, CI, release, and acceptance contracts.

---

# DEC-036 — MVP Release Readiness and Owner Approval

## Status

Accepted

## Decision

The final MVP release gate evaluates one exact checksummed candidate and ends with
an owner-recorded `GO` or `NO-GO` decision. A `GO` means only that the candidate is
ready for the owner to publish as an unsigned personal-testing prerelease. It does
not publish the GitHub Release; publication remains a separate deliberate owner
action.

Every acceptance criterion from SPEC-000 through SPEC-011 must have current,
attributable evidence. The owner performs direct hands-on acceptance on macOS Apple
Silicon. Required Intel macOS, Windows, and Linux claims reuse the identified
native installation evidence required by SPEC-011 and must not be represented as
owner-tested.

SPEC-012 may repair a release blocker only when existing specified behavior is
unambiguous and the repair is narrowly scoped. Material behavior changes update
their originating specification first; features, architectural changes, and broad
work remain separate. Any candidate-affecting repair requires rebuilt artifacts
and rerun evidence.

Signing, notarization, and trusted general-public distribution are not part of the
MVP release-readiness gate.

## Context

Feature-level acceptance and distribution smoke tests do not by themselves create
one complete final-release judgment. The project owner has an Apple Silicon Mac
for manual evaluation but does not have direct access to every supported target.
The release process must distinguish owner experience from evidence gathered on
other identified native environments while still enforcing the complete target
matrix.

## Consequences

- Missing, stale, contradictory, or unattributable required evidence produces
  `NO-GO`; unavailable local hardware does not create a waiver.
- CI may recommend a result but cannot approve or publish a release.
- Failed evidence is retained and linked to reruns rather than overwritten.
- No acceptance criterion may be reclassified as a cosmetic issue.
- Planned SPEC-013 and owner-provided credentials are required before the project
  claims signed general-public production distribution.
- SPEC-012 defines the evidence ledger, defect policy, integrated regression,
  owner acceptance, and final decision contract.
