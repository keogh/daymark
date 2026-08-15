# Project Progress

## Current Phase

Manual Time Entry in progress

## Current Specification

SPEC-005 — Manual Time Entry (Task TASK-005-001 complete)

## Current Status

SPEC-005 implementation has started with `TASK-005-001` complete. The shared
manual-entry boundary now defines explicit IPC/preload contracts, renderer-safe
error typing, and runtime validation for exact object shape, task-source
exclusivity, trimmed fields, local date/time syntax, and same-day end-after-start
rejection before service or persistence work.

---

# Completed Specifications

- SPEC-000 — Project Foundation (Verified 2026-08-13)
- SPEC-001 — Core Time Tracking (Verified 2026-08-14)
- SPEC-002 — Daily History (Verified 2026-08-15)
- SPEC-003 — Task Search and Reuse (Verified 2026-08-15)
- SPEC-004 — One-Click Task Switching (Verified 2026-08-15)

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

---

# Upcoming Specifications

1. SPEC-005 — Manual Time Entry
2. SPEC-006 — Edit and Delete Intervals
3. SPEC-007 — Task Management
4. SPEC-008 — System Tray
5. SPEC-009 — Analytics
6. SPEC-010 — Settings
7. SPEC-011 — Packaging and Release

---

# Known Blockers

None.

---

# Active Work

SPEC-005 — Manual Time Entry is active. `TASK-005-001` is complete and the next
planned task is `TASK-005-002` to implement transactional manual interval
creation, task reuse/creation, local-time conversion, and overlap rejection.

---

# Important Decisions

See `docs/decisions.md`. `TASK-005-001` remains within the established typed
preload API, main-process SQLite ownership, timestamp-based interval source of
truth, injected Clock, and npm decisions. No schema migration, dependency,
decision, or architectural deviation was required for the shared manual-entry
contracts and validation layer.

---

# Last Updated

2026-08-15 — Completed `TASK-005-001` for SPEC-005. Added the shared
`manual-time:create-interval` contract, manual-entry runtime validation, new
renderer-safe error coverage, and typed preload API surface updates.
`npm test -- manual-time`, `npm run typecheck`, and `npm run lint` passed.
