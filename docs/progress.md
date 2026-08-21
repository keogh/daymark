# Project Progress

## Current Phase

System Tray specification ready for implementation

## Current Specification

SPEC-008 — System Tray and Window Lifecycle (Ready for Implementation)

## Current Status

SPEC-008 is designed and implementation-ready. It defines native idle, running,
and paused tray presentation; authoritative Pause/Resume/Stop controls; a
one-second presentation-only duration ticker; close-to-hide and single-window
restore behavior; immediate renderer/tray synchronization; explicit Quit without
timer mutation; safe failure handling; lifecycle cleanup; and packaged macOS
acceptance while preserving later Windows/Linux release validation.

SPEC-009 is also designed and queued as Ready for Implementation, but its task
breakdown explicitly requires SPEC-008 to be Verified before Analytics
implementation begins.

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

1. SPEC-009 — Analytics (Ready for Implementation; queued behind SPEC-008)
2. SPEC-010 — Settings
3. SPEC-011 — Packaging and Release

---

# Known Blockers

None.

---

# Active Work

SPEC-008 — System Tray and Window Lifecycle is ready for implementation. Its
companion task breakdown begins with TASK-008-001 — Define Tray Presentation and
Platform Asset Selection. No implementation task is currently in progress.

SPEC-009 — Analytics has a complete companion task breakdown. Its first task is
TASK-009-001 — Define Analytics Contracts, Validation, and Calendar Projections,
but it remains pending until SPEC-008 is Verified.

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

---

# Last Updated

2026-08-21 — Designed SPEC-009 and created its implementation task breakdown.
SPEC-009 is Ready for Implementation but queued behind verification of SPEC-008;
SPEC-008 remains the active implementation specification and SPEC-007 remains the
latest verified implementation milestone.
