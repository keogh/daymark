# SPEC-002 — Task Breakdown

## Source

- Specification: `docs/specs/002-daily-history/spec.md`
- Specification status: Ready for Implementation
- Last reviewed against specification: 2026-08-14

The specification is the source of truth for behavior. This file only decomposes
that behavior into implementation work. If the two conflict, update this breakdown
to match the specification.

---

# Execution Rules

- Complete tasks in dependency order and keep only one task `In Progress`.
- Before implementation, copy the active task's immediate steps into
  `docs/plan.md`.
- Record focused verification evidence before marking a task `Complete`.
- Re-read the current official shadcn component documentation before adding or
  updating source-owned components.
- Do not add Play, task switching, task search, manual entry, interval editing,
  interval deletion, task management, analytics, or settings behavior.
- Task completion does not replace final acceptance and Definition of Done checks.

---

# Task Index

| ID | Task | Status | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- |
| TASK-002-001 | Establish the renderer styling foundation | Complete | None | AC-002-017–018 |
| TASK-002-002 | Define history contracts and projection primitives | Complete | TASK-002-001 | AC-002-002–006, AC-002-010–011, AC-002-015–016 |
| TASK-002-003 | Implement bounded history queries and service paging | Pending | TASK-002-002 | AC-002-001–006, AC-002-008–009, AC-002-015–016 |
| TASK-002-004 | Expose the validated history IPC boundary | Pending | TASK-002-003 | AC-002-001–006, AC-002-008–009, AC-002-015 |
| TASK-002-005 | Render the initial Daily History states | Pending | TASK-002-004 | AC-002-001–007, AC-002-013, AC-002-017 |
| TASK-002-006 | Add older-page loading and resilient retry | Pending | TASK-002-005 | AC-002-008–009, AC-002-014 |
| TASK-002-007 | Synchronize live history with timer state | Pending | TASK-002-005 | AC-002-010–012 |
| TASK-002-008 | Verify Daily History and update documentation | Pending | TASK-002-006–007 | AC-002-001–018 |

---

# Tasks

## TASK-002-001 — Establish the Renderer Styling Foundation

### Status

Complete

### Outcome

The existing Vite renderer uses Tailwind CSS v4 and a minimal official,
Radix-based shadcn/ui Nova foundation while preserving verified timer behavior.

### Dependencies

None.

### Included

- Confirm current official shadcn CLI guidance and component APIs.
- Configure Tailwind CSS v4 in the existing Vite renderer.
- Initialize the official Radix-based Nova shadcn preset using npm and the existing
  `@/*` alias.
- Define light semantic tokens with a neutral/slate foundation and existing blue
  primary treatment.
- Add only primitives required by SPEC-002.
- Review all CLI-added source files and dependencies.
- Incrementally migrate reusable Button, Input, field, loading, and error
  primitives while preserving the specialized timer layout.
- Add focused regression and accessibility tests for existing timer states.

### Excluded

- Daily History data behavior.
- Dark-mode behavior or a theme selector.
- Community registries, blocks, all-component installation, and wholesale redesign.

### Deliverables

- Tailwind/shadcn configuration, global semantic tokens, minimal source-owned UI
  primitives, migrated shared timer controls, and focused renderer tests.

### Verification

- Run the focused timer renderer tests, `npm run typecheck`, `npm run lint`,
  `npm run format:check`, and a development renderer smoke test.

### Traceability

- Acceptance criteria: AC-002-017, AC-002-018
- Specification sections: 3–5, 24–26, 28, 34

### Completion Evidence

Tailwind CSS v4 is integrated through the existing Electron Forge Vite renderer.
The official shadcn 4.18.0 CLI validated the manual Electron configuration as the
Radix Nova preset with Lucide icons and added only Button, Input, Field, Spinner,
Alert, and Field's required Label and Separator dependencies. Light neutral/slate
semantic tokens retain the existing blue primary treatment.

The idle, running, paused, loading, and error timer branches now use the reviewed
source-owned primitives without changing controller behavior, labels, keyboard
access, focus restoration, pending states, or the specialized timer layout.
Focused renderer and boundary tests passed (20 tests), including explicit source-
owned component, variant, focus, pending, and invalid-state assertions. Typecheck,
lint, formatting verification, and macOS arm64 packaging passed. A live Electron
development smoke test at `http://localhost:5173/` verified the focused idle input,
disabled-to-enabled Start interaction, rendered Tailwind styling, and no relevant
renderer console errors; the sole console warning was Electron's documented
development-only CSP warning. The packaged production renderer completed without a
runtime network dependency.

---

## TASK-002-002 — Define History Contracts and Projection Primitives

### Status

Complete

### Outcome

Typed history contracts, runtime input validation, and pure projection utilities
define correct day boundaries, overlap, totals, ordering, formatting inputs, and
pagination semantics.

### Dependencies

TASK-002-001.

### Included

- Define HistoryPageInput, HistoryPage, HistoryDay, HistoryTask, and
  HistoryInterval contracts.
- Add runtime validation for the history-page input shape and cursor.
- Implement local calendar-day boundary and interval-overlap primitives.
- Implement open-interval, cross-midnight, total, ordering, and cursor logic using
  the injected snapshot time.
- Add deterministic unit tests including exact midnight and DST transitions.

### Excluded

- SQLite history queries, service orchestration, IPC registration, and React UI.

### Deliverables

- Shared typed contracts, boundary validation, pure projection modules, and unit
  tests under mirrored `test/` paths.

### Verification

- Run focused history contract/projection tests, `npm run typecheck`, and
  `npm run lint`.

### Traceability

- Acceptance criteria: AC-002-002–006, AC-002-010–011, AC-002-015–016
- Specification sections: 7, 9–14, 17–18, 21, 29, 31

### Completion Evidence

Defined the shared HistoryPageInput, HistoryPage, HistoryDay, HistoryTask, and
HistoryInterval contracts, the explicit history channel, and the fixed
30-activity-day page limit. Runtime validation accepts only the empty initial shape
or a finite safe-integer cursor at local midnight no later than Today, rejects
unknown properties, and returns INVALID_HISTORY_RANGE without requiring a query.

Pure main-process projection primitives now derive DST-aware local calendar-day
boundaries, clip closed and open intervals with half-open overlap semantics, retain
cross-midnight interval IDs, calculate daily and lifetime totals from timestamps,
apply deterministic task/interval ordering, and select initial or exclusive-cursor
pages while including empty Today without consuming an activity slot.

Focused history contract, validation, and projection tests passed (20 tests),
including exact-midnight exclusion and America/New_York 23-hour and 25-hour DST
days. The complete suite passed (149 tests), as did typecheck, lint, and formatting
verification.

---

## TASK-002-003 — Implement Bounded History Queries and Service Paging

### Status

Pending

### Outcome

HistoryService returns correct, deterministic, read-only pages of at most 30
activity days from disposable and production SQLite databases without per-row
queries.

### Dependencies

TASK-002-002.

### Included

- Add bounded repository/query operations for overlapping intervals, activity-day
  pagination, and lifetime totals.
- Implement HistoryService with one Clock snapshot per response.
- Always include Today on the initial page and omit empty older days.
- Return and consume the exclusive older-day cursor.
- Include open, repeated-task, cross-midnight, exact-boundary, and DST behavior.
- Demonstrate bounded query behavior without one query per rendered task.
- Add repository and service integration tests using disposable SQLite databases.

### Excluded

- IPC wiring and renderer behavior.
- Database schema changes unless the specification and breakdown are first updated.

### Deliverables

- History query module/repository operations, HistoryService, and focused repository
  and integration tests.

### Verification

- Run focused repository and HistoryService tests, `npm run typecheck`, and
  `npm run lint`.

### Traceability

- Acceptance criteria: AC-002-001–006, AC-002-008–009, AC-002-015–016
- Specification sections: 8–15, 17, 27, 29, 32–33

### Completion Evidence

Pending.

---

## TASK-002-004 — Expose the Validated History IPC Boundary

### Status

Pending

### Outcome

The renderer can request authoritative history pages through one explicit typed,
runtime-validated preload API with safe AppResult errors.

### Dependencies

TASK-002-003.

### Included

- Register the narrow `history:get-page` IPC handler.
- Expose `window.timeTracker.history.getPage` through contextBridge.
- Connect service construction through the existing application lifecycle.
- Reject unknown, malformed, unsafe, future, and non-local-midnight cursors.
- Map expected and unexpected errors without exposing internal details.
- Add preload, IPC handler, contract, and failure-mapping tests.

### Excluded

- Generic IPC methods, renderer history components, and mutation commands.

### Deliverables

- Main IPC handler, preload API, window typing, lifecycle wiring, and focused
  boundary tests.

### Verification

- Run focused shared/preload/main IPC tests, `npm run typecheck`, and
  `npm run lint`.

### Traceability

- Acceptance criteria: AC-002-001–006, AC-002-008–009, AC-002-015
- Specification sections: 15–18, 28, 33

### Completion Evidence

Pending.

---

## TASK-002-005 — Render the Initial Daily History States

### Status

Pending

### Outcome

The main Timer view displays accessible loading, empty, loaded, expandable, and
retryable initial-error history states beneath the timer.

### Dependencies

TASK-002-004.

### Included

- Add the history controller and initial-page request.
- Render Today, activity days, day totals, task daily/lifetime totals, and local
  labels in the required hierarchy.
- Add independently expandable task rows and semantic interval lists.
- Implement initial loading, empty, loaded, and initial-error/Retry behavior.
- Keep timer controls usable throughout history states.
- Preserve normal page scrolling, responsive wrapping, visible focus, and semantic
  structure.
- Add focused React Testing Library coverage.

### Excluded

- Older-page loading and live open-interval animation.
- Play, add, edit, delete, or interval-menu actions.

### Deliverables

- History controller/components/styles and renderer tests for initial states and
  expansion.

### Verification

- Run focused history renderer tests plus existing timer renderer tests,
  `npm run typecheck`, and `npm run lint`.

### Traceability

- Acceptance criteria: AC-002-001–007, AC-002-013, AC-002-017
- Specification sections: 19–22, 25–26, 34

### Completion Evidence

Pending.

---

## TASK-002-006 — Add Older-Page Loading and Resilient Retry

### Status

Pending

### Outcome

Users can append older activity pages without duplicate requests, lost history,
lost expansion state, or lost keyboard focus, and can retry a failed older page.

### Dependencies

TASK-002-005.

### Included

- Render Load older only when a cursor is available.
- Prevent duplicate concurrent pagination requests.
- Append and de-duplicate older day sections.
- Preserve prior content, expansion state, and focus.
- Add pending, older-page error/Retry, and exhausted states.
- Add focused controller and renderer tests.

### Excluded

- Automatic infinite scrolling and arbitrary range selection.

### Deliverables

- Pagination controller behavior, controls/states, and focused tests.

### Verification

- Run focused pagination and history renderer tests, `npm run typecheck`, and
  `npm run lint`.

### Traceability

- Acceptance criteria: AC-002-008–009, AC-002-014
- Specification sections: 14, 20, 22, 26–27, 29, 34

### Completion Evidence

Pending.

---

## TASK-002-007 — Synchronize Live History with Timer State

### Status

Pending

### Outcome

Open-interval history values advance locally and reconcile after timer transitions,
periodic snapshots, focus changes, and local midnight without per-second IPC or
database writes.

### Dependencies

TASK-002-005.

### Included

- Derive live day, task, lifetime, and expanded-interval values from the
  authoritative history snapshot.
- Keep paused and closed values stable.
- Refresh history after successful timer commands.
- Integrate periodic reconciliation no less frequently than every 60 seconds.
- Refresh at local midnight and on application focus when practical.
- Retain the last valid history on a reconciliation failure and provide Retry.
- Add deterministic hook/component tests with controlled time.

### Excluded

- Per-second IPC, database writes, and changes to persisted timer semantics.

### Deliverables

- Live history derivation/reconciliation behavior and focused tests.

### Verification

- Run focused live-history and timer-controller tests, `npm run typecheck`, and
  `npm run lint`.

### Traceability

- Acceptance criteria: AC-002-010–012
- Specification sections: 10–12, 20–23, 27, 29, 31, 34

### Completion Evidence

Pending.

---

## TASK-002-008 — Verify Daily History and Update Documentation

### Status

Pending

### Outcome

Every SPEC-002 acceptance criterion and Definition of Done requirement has current
automated and packaged-application evidence, and project documentation accurately
reflects the verified implementation.

### Dependencies

TASK-002-006 and TASK-002-007.

### Included

- Audit AC-002-001 through AC-002-018 against implementation and tests.
- Run the full project validation suite and package the current platform.
- Perform required manual and packaged offline verification with isolated user
  data.
- Verify keyboard access, visible focus, scrolling, reload, restart, and running and
  paused states.
- Update task evidence, specification status, architecture documentation, and
  `docs/progress.md` based on actual results.

### Excluded

- Later-spec product features and unrelated refactoring.

### Deliverables

- Final validation evidence and accurate specification, task, plan, architecture,
  and progress documentation.

### Verification

- Run `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm test`,
  `npm run package`, `git diff --check`, and the required packaged/manual workflows.

### Traceability

- Acceptance criteria: AC-002-001–018
- Specification sections: 30–38

### Completion Evidence

Pending.

---

# Final Specification Verification

After all implementation tasks are complete:

- verify AC-002-001 through AC-002-018 directly;
- run every validation required by the specification and Definition of Done;
- perform the required manual and packaged offline checks;
- confirm no later-spec controls or behavior were introduced;
- update `docs/progress.md` and other affected documentation;
- change the specification to `Verified` only when all evidence is satisfactory.
