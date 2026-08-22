# Project Progress

## Current Phase

Cross-Platform Packaging and Distribution active

## Current Specification

SPEC-011 — Cross-Platform Packaging and Distribution (Ready for Implementation)

## Current Status

TASK-011-001 is complete. Distribution now has one validated source-controlled
contract for package metadata, stable macOS/Windows/Linux identity, exact stable
SemVer tag agreement, and four collision-free primary artifact descriptors. Local
package, make, and validation commands are explicit, and release documentation
records unsigned personal-testing limitations, temporary Linux contact metadata,
checksum trust boundaries, and the absence of automatic updates.

The focused 14-test release-contract suite, tag fixtures, typecheck, lint,
formatting, and diff checks passed on 2026-08-22. Platform makers and native
artifacts remain intentionally deferred; TASK-011-002 is next. SPEC-012 remains
the final MVP release gate after SPEC-011 is Verified.

---

# Completed Specifications

- SPEC-000 — Project Foundation (Verified 2026-08-13)
- SPEC-001 — Core Time Tracking (Verified 2026-08-14)
- SPEC-002 — Daily History (Verified 2026-08-15)
- SPEC-003 — Task Search and Reuse (Verified 2026-08-15)
- SPEC-004 — One-Click Task Switching (Verified 2026-08-15)
- SPEC-005 — Manual Time Entry (Verified 2026-08-15)
- SPEC-006 — Edit and Delete Intervals (Verified 2026-08-15)
- SPEC-007 — Task Management (Verified 2026-08-21)
- SPEC-008 — System Tray and Window Lifecycle (Verified 2026-08-21)
- SPEC-009 — Analytics (Verified 2026-08-22)
- SPEC-010 — Settings and UX Polish (Verified 2026-08-22)

SPEC-010 delivered:

- one migrated, constrained settings singleton with Monday/System defaults,
  field-isolated no-op-aware updates, injected-Clock timestamps, and a narrow
  runtime-validated IPC/preload boundary;
- persisted Monday/Sunday current-week Analytics projection and immediate
  System/Light/Dark appearance with live system response and safe rollback;
- accessible three-destination navigation plus bounded whole-app theme, duration,
  keyboard, focus, dialog-scroll, long-content, and minimum-window repairs;
- a source-owned locally packaged application icon without changing tray assets.

Final acceptance covered AC-010-001 through AC-010-019 and the project Definition
of Done. Formatting, typecheck, lint, all 681 tests in 81 files, macOS arm64
packaging, and diff checks passed on 2026-08-22. The isolated packaged workflow
used `/tmp/timetracker-task010-final-user-data`, restored Sunday/Dark and a paused
Timer across full restart, produced 3h Sunday versus 1h Monday current-week totals,
remained usable at 640x480, and recorded no HTTP(S) resource or renderer console
warning/error.

SPEC-009 delivered:

- exact local-calendar Last 7 days and Last 30 days projections with zero-filled
  daily buckets, explicit-denominator averages, Monday-based current-week and
  local-month totals, deterministic top-five Tasks, and open-interval projection;
- one fixed-count bounded read-only query over Tasks and TimeIntervals, composed
  through an injected-Clock service and exact runtime-validated IPC/preload API;
- accessible Timer/Analytics navigation, semantic noninteractive chart data,
  loading/empty/error/stale states, and responsive normal/narrow layouts;
- renderer-local open-interval advancement without per-second IPC or database
  reads, plus stale-protected reconciliation after mutations, timer notifications,
  focus, local midnight, and a 60-second interval.

Final acceptance covered AC-009-001 through AC-009-019 and the project Definition
of Done. Formatting, typecheck, lint, all 585 tests in 73 files, macOS arm64
packaging, and diff checks passed on 2026-08-22. Isolated packaged acceptance with
eight Tasks and nine intervals verified 7/30-day, week/month, zero-day,
cross-midnight, top-five, running, paused, mutation, Retry, accessible-chart,
normal/narrow, authoritative Timer-return, console, and offline behavior. The
packaged renderer made no HTTP(S) request and emitted no warning/error console
entry.

SPEC-001 delivered:

- typed and runtime-validated timer contracts across renderer, preload, IPC, and
  main process;
- persistent reusable Tasks with exact normalized-description reuse;
- authoritative idle, running, and paused state reconstructed from UTC interval
  timestamps;
- atomic Start, Pause, Resume, and Stop transitions with one open interval enforced
  in both application logic and SQLite;
- session, local-today, and lifetime duration projections, including midnight
  overlap;
- an accessible renderer that animates locally and periodically resynchronizes with
  authoritative state;
- restart recovery while running and paused without per-second database writes.

Final acceptance covered AC-001 through AC-013 and the project Definition of Done.
Typecheck, lint, formatting, all 129 tests in 24 files, packaging, and diff checks
passed. The packaged macOS arm64 application passed Start/Pause/Resume/Stop,
renderer reload recovery in running and paused states, and complete application
restart recovery in both states using isolated user data.

SPEC-002 delivered:

- bounded local-calendar-day history pages with day, task-daily, lifetime, and
  interval projections, including cross-midnight and DST-safe behavior;
- accessible expandable task rows, pagination, loading, empty, exhausted, and
  retryable failure states beneath the existing timer;
- renderer-local advancement of open history values with authoritative refreshes
  after timer transitions, periodic reconciliation, focus, and local midnight;
- a narrow typed and runtime-validated history API across preload and IPC;
- Tailwind CSS v4, semantic light theme tokens, and selected source-owned official
  Radix Nova shadcn/ui primitives without changing renderer security boundaries.

Final acceptance covered AC-002-001 through AC-002-018 and the project Definition
of Done. Formatting, typecheck, lint, all 179 tests in 32 files, macOS arm64
packaging, and diff checks passed. Isolated development and packaged verification
covered empty, running, paused, narrow scrolling, renderer reload, paused/running
restart recovery, and offline rendering without runtime network resources or
packaged console errors.

SPEC-003 delivered:

- at most five recent or normalized substring-matched reusable-task suggestions,
  with prefix-first and deterministic recency ordering;
- authoritative local-today and lifetime totals derived from interval timestamps
  using a single snapshot and existing DST-safe calendar projections;
- an accessible asynchronous combobox with first-result highlighting, wrapping
  keyboard navigation, pointer reuse, predictable close/retry behavior, and stale
  response protection;
- atomic explicit task reuse by stable ID while preserving normalized typed Start,
  idle-only transitions, controlled missing-task behavior, and authoritative
  history refresh;
- narrow typed and runtime-validated task suggestion and Start boundaries without
  exposing database, Node.js, or raw Electron capabilities to the renderer.

Final acceptance covered AC-003-001 through AC-003-017 and the project Definition
of Done. Formatting, typecheck, lint, all 232 tests in 37 files, macOS arm64
packaging, and diff checks passed. Isolated development and packaged verification
covered recent discovery, substring search, keyboard and pointer reuse, normalized
typed reuse, accessibility state, restart reconstruction, scope exclusions, and
renderer security. The packaged app loaded without HTTP(S) resources or console
warnings/errors.

SPEC-004 delivered:

- one-click Daily History row actions that start or switch to an existing task by
  stable ID from idle, running, and paused timer states;
- atomic running-task and paused-task switch semantics that preserve or reset
  `sessionStartedAt` exactly as specified, including same-task running no-op and
  paused same-task resume behavior;
- compact non-blocking stale-task feedback with authoritative history refresh and
  unchanged active timer state on `TASK_NOT_FOUND`;
- runtime-validated switch input and a narrow typed preload/IPC boundary that
  reuses the existing timer-state contract without exposing raw Electron
  capabilities;
- service, integration, IPC, preload, shared-validation, renderer, and packaged
  acceptance coverage for the new switching flows.

Final acceptance covered AC-004-001 through AC-004-010 and the project Definition
of Done. Typecheck, lint, all 267 tests in 38 files, and macOS arm64 packaging
passed on 2026-08-15. An isolated packaged acceptance run using
`--user-data-dir=/tmp/timetracker-spec004-user-data` passed idle history Play,
running switch, paused switch, paused same-task resume, running same-task
disabled state, and stale-task inline feedback without touching the real
application profile.

SPEC-005 delivered:

- accessible global and Daily History day-scoped `Add time` entry points with
  local-day prefilling, existing-task selection, and typed task descriptions;
- atomic creation of exactly one closed UTC-timestamp interval with normalized
  task reuse/creation and unchanged timer `AppState`;
- global overlap protection across closed intervals and the elapsed portion of a
  running open interval, with controlled no-mutation failures;
- a narrow runtime-validated preload/IPC boundary and authoritative timer/history
  refresh after successful save;
- shared-validation, service, disposable-SQLite repository/integration,
  preload/IPC, renderer, and packaged acceptance coverage.

Final acceptance covered AC-005-001 through AC-005-012 and the project Definition
of Done. Formatting, typecheck, lint, all 312 tests in 43 files, and macOS arm64
packaging passed on 2026-08-15. An isolated packaged run at 1100×820 verified both
entry points, local-day prefill, initial focus and labels, successful
authoritative refresh, value-preserving overlap feedback, clean renderer console,
and persistence of exactly one closed 30-minute interval without changing idle
timer state.

SPEC-006 delivered:

- accessible Edit and Delete actions for closed Daily History intervals, with
  running intervals explicitly non-editable;
- transactional edit/delete operations that preserve Task and timer/AppState,
  enforce complete local range validation and global non-overlap, and safely reject
  missing or open targets;
- complete-value cross-day editing and informative deletion confirmation showing
  the Task, full range, and complete duration removed;
- narrow runtime-validated preload/IPC contracts with safe controlled failures;
- authoritative timer/history refresh, including removal of corrected intervals
  from every affected day already loaded in the renderer.

Final acceptance covered AC-006-001 through AC-006-014 and the project Definition
of Done. Formatting, typecheck, lint, all 394 tests in 51 files, and macOS arm64
packaging passed on 2026-08-15. An isolated packaged run verified cross-day edit
and display, running-overlap rejection, cancellation, informative confirmed
deletion, all-day projection refresh, unchanged running state, and a clean renderer
console.

SPEC-007 delivered:

- accessible per-row Task actions in Daily History, with keyboard-operable Rename
  and Delete workflows, managed dialog focus, pending states, and controlled
  errors;
- transactional Task rename that preserves Task identity, intervals, and
  `AppState`, supports self-normalizing changes, rejects collisions, and updates
  active timer/history projections authoritatively;
- informative Task deletion confirmation with complete interval count and
  lifetime duration, SQLite-cascaded interval deletion, and isolation of every
  other Task, interval, and `AppState` value;
- renderer and independently enforced service/boundary protection against
  deleting the running or paused active Task;
- narrow typed preload APIs, exact runtime-validated IPC commands, and unit,
  repository, disposable-SQLite integration, boundary, and renderer coverage.

Final acceptance covered AC-007-001 through AC-007-013 and the project Definition
of Done. Formatting, typecheck, lint, all 488 tests in 55 files, and macOS arm64
packaging passed on 2026-08-21. An isolated packaged run at 1040×688 verified
rename, normalized collision rejection, informative deletion of a two-interval
Task with database-confirmed cascade and zero orphans, accessible active-Task
delete disablement, forged-command rejection, authoritative refresh, and a clean
renderer console.

---

# Upcoming Specifications

1. SPEC-011 — Cross-Platform Packaging and Distribution (Ready for Implementation)
2. SPEC-012 — MVP QA and Release Readiness (Ready for Implementation; queued
   behind SPEC-011)

## Expected Post-MVP Specifications

These roadmap entries are not yet designed or implementation-ready. They must not
be implemented until SPEC-012 is Verified and each entry has a complete
specification and companion task breakdown.

1. SPEC-013 — Trusted Release Signing and Notarization
2. SPEC-014 — Data Export
3. SPEC-015 — Local Backup and Restore
4. SPEC-016 — Task Archiving
5. SPEC-017 — Global Keyboard Shortcuts
6. SPEC-018 — Automatic OS Startup

SPEC-013 is expected to gate any claim of trusted general-public production
distribution. The product enhancements remain sequenced behind that
release-hardening work.

---

# Known Blockers

None.

---

# Active Work

SPEC-010 — Settings and UX Polish is Verified. All eight implementation tasks and
AC-010-001 through AC-010-019 are complete.

SPEC-011 — Cross-Platform Packaging and Distribution is in progress. TASK-011-001
established the release contract, and TASK-011-002 now produces distinct unsigned
macOS arm64/x64 DMGs with stable identity, source-owned icons, native-module
rebuilds, local migrations/renderer/tray assets, focused inspection commands, and
documented Gatekeeper expectations. Both targets built and passed structural
inspection on macOS Apple Silicon; the arm64 app also launched with an isolated
profile. Native Intel-host confirmation remains assigned to TASK-011-005.
TASK-011-003 implementation now adds the Windows x64-only Squirrel maker,
source-owned ICO generation, stable Squirrel identity, early installer-event
isolation, single-instance normal launch, and bounded SmartScreen guidance. Native
Windows maker and installation evidence is still pending, so TASK-011-003 remains
In Progress.

SPEC-012 — MVP QA and Release Readiness is designed and queued as Ready for
Implementation. It defines one exact candidate and acceptance-evidence ledger;
connected whole-product regression; persistence, recovery, accessibility,
offline, security, and privacy audits; review of SPEC-011's identified native
platform evidence; owner hands-on acceptance on macOS Apple Silicon; bounded
release-blocker remediation; and an owner-recorded `GO` or `NO-GO` that does not
publish the draft prerelease. Its first task is TASK-012-001 — Establish Candidate,
Evidence, and Defect Contracts. Implementation remains pending until SPEC-011 and
every preceding specification are Verified.

---

# Important Decisions

See `docs/decisions.md`. SPEC-008 applies DEC-021 through DEC-025 without an
architectural reversal: normal Close hides, explicit Quit does not mutate timer
state, sleep remains wall-clock time, tray integration is included, and automatic
OS startup remains deferred. Design choices fixed for implementation are a live
one-second session-duration display derived locally from an authoritative
snapshot, native-menu Open behavior plus supported platform activation gestures,
immediate no-confirmation Quit, 80-code-point one-line Task presentation, and a
safe native dialog after tray command failure. No schema migration or new runtime
dependency is planned.

SPEC-009 applies DEC-010 through DEC-015 and DEC-028. It fixes Analytics ranges to
Today plus the prior 6 or 29 local calendar days, uses Monday as the interim current
week boundary until SPEC-010, divides daily average by all 7 or 30 selected days,
shows five deterministically ranked Tasks, uses an accessible noninteractive chart,
and advances open-interval presentation locally without per-second IPC or database
reads. No schema migration or new runtime dependency is planned.

SPEC-010 fixes persisted settings to Monday/Sunday week start and System/Light/Dark
appearance with Monday/System defaults. Changes apply without a Save button;
System follows operating-system appearance changes live without persistence
writes. Settings use a new constrained singleton SQLite row, Analytics reads week
start authoritatively in the main process, and the whole-app UX pass is limited to
documented consistency, accessibility, keyboard, state, duration, and
minimum-window defects rather than redesign. A schema migration is planned; no new
runtime dependency is planned.

SPEC-012 applies DEC-035 and DEC-036. It fixes the final MVP outcome to an
evidence-backed owner `GO` or `NO-GO` for an unsigned personal-testing prerelease;
keeps publication as a separate manual owner action; requires direct owner testing
only on available macOS Apple Silicon while retaining the full identified
SPEC-011 platform-evidence requirement; permits only bounded fixes for already
specified release blockers; and leaves signing/notarization and trusted public
distribution to planned SPEC-013. No schema, product API, product UI, or runtime
dependency change is planned.

---

# Last Updated

2026-08-22 — Implemented and locally verified SPEC-011 TASK-011-003's Windows x64
Squirrel configuration, icon derivative, startup-event isolation, stable identity,
single-instance behavior, and unsigned installation documentation. Native Windows
x64 maker and ordinary-user installation evidence remains required before the task
can be marked Complete.
