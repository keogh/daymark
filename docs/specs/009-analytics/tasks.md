# SPEC-009 — Task Breakdown

## Source

- Specification: `docs/specs/009-analytics/spec.md`
- Specification status: Ready for Implementation
- Last reviewed against specification: 2026-08-21

The specification is the source of truth for behavior. This file only decomposes
that behavior into implementation work. If the two conflict, update this breakdown
to match the specification.

SPEC-008 must be Verified before implementation of any task below begins. That
external prerequisite does not change the internal dependency order in this file.

---

# Execution Rules

- Complete tasks in dependency order.
- Keep only one task `In Progress` unless parallel work is explicitly coordinated.
- Before implementation, copy the active task's immediate steps into `docs/plan.md`.
- Record verification evidence before marking a task `Complete`.
- Do not use task completion as a substitute for specification acceptance or the
  project Definition of Done.
- Do not begin implementation while SPEC-008 is not Verified.

---

# Task Index

| ID | Task | Status | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- |
| TASK-009-001 | Define Analytics Contracts, Validation, and Calendar Projections | Complete | None | AC-009-001–007, AC-009-017 |
| TASK-009-002 | Implement Bounded Analytics Queries | Complete | TASK-009-001 | AC-009-003, AC-009-005–007, AC-009-018 |
| TASK-009-003 | Implement the Authoritative Analytics Service | Complete | TASK-009-001, TASK-009-002 | AC-009-001–008, AC-009-010–012, AC-009-018 |
| TASK-009-004 | Expose the Narrow Analytics Boundary | Complete | TASK-009-003 | AC-009-016–018 |
| TASK-009-005 | Introduce Timer and Analytics Navigation | Pending | TASK-009-004 | AC-009-015 |
| TASK-009-006 | Render Static Analytics States and Accessible Chart | Pending | TASK-009-004, TASK-009-005 | AC-009-001, AC-009-002, AC-009-004–009, AC-009-016 |
| TASK-009-007 | Implement Live Analytics and Authoritative Reconciliation | Pending | TASK-009-003, TASK-009-006 | AC-009-010–014, AC-009-016 |
| TASK-009-008 | Verify Packaged Analytics and Reconcile Documentation | Pending | TASK-009-001–007 | AC-009-001–019 |

---

# Tasks

## TASK-009-001 — Define Analytics Contracts, Validation, and Calendar Projections

### Status

Complete

### Outcome

Analytics has explicit shared contracts, strict runtime input validation, and pure
deterministic projection helpers that define all selected-range, local-day,
current-period, average, and Task-ranking semantics without persistence or Electron
dependencies.

### Dependencies

None within SPEC-009. SPEC-008 must already be Verified under the specification
prerequisite.

### Included

- Add the exact Last 7 days and Last 30 days range type and input contract.
- Add summary, day, current-period, ranked-Task, and running-Task output contracts.
- Add `INVALID_ANALYTICS_RANGE` to the controlled error contract.
- Runtime validate exact own-property input and reject unknown or inherited input.
- Resolve 7/30 local-calendar-day ranges including Today.
- Resolve Monday-based current-week and local current-month boundaries.
- Project interval overlap using one explicit snapshot time.
- Produce zero-filled oldest-first day buckets.
- Calculate selected-range total and floored 7/30-day average.
- Calculate current-week and current-month totals.
- Rank at most five positive Task totals using every specified tie-breaker.
- Produce the separate running-Task selected-range projection.
- Add deterministic pure unit and shared-validation tests under mirrored `test/`
  paths.

### Excluded

- SQLite queries.
- AnalyticsService composition.
- IPC and preload wiring.
- renderer navigation, chart, or live ticker.
- schema or migration changes.

### Deliverables

- Shared Analytics contracts and error-code update.
- Shared Analytics input validator.
- Main-process pure Analytics calendar/projection modules or justified reuse of
  existing pure local-day helpers.
- Focused unit and validation tests for specification §§7, 9–13, and 16.

### Verification

- Run focused Analytics contract, validation, calendar, and projection tests.
- Run `npm run typecheck`.
- Run formatting/lint checks for touched files.

### Traceability

- Acceptance criteria: AC-009-001 through AC-009-007, AC-009-017.
- Specification sections: 7, 9–13, 16, 25, 27.

### Completion Evidence

- Added exact shared 7-day/30-day request and complete summary contracts plus the
  controlled `INVALID_ANALYTICS_RANGE` error code.
- Added exact-own-property runtime validation covering supported, missing,
  malformed, primitive, array, inherited-only, and unknown-property inputs.
- Added pure projections for DST-safe oldest-first local days, Monday weeks,
  local months, snapshot-capped overlaps, zero-filled day totals, floored
  averages, deterministic top-five ranking, and the separate open Task.
- Reused the established timestamp-based `TimeInterval` domain entity while
  keeping Analytics calendar/projection logic independent of persistence and
  Electron.
- Focused Analytics and shared error tests — passed, 4 files and 37 tests.
- `npm run typecheck`, `npm run lint`, and `npm run format:check` — passed.
- `npm test` — passed, 67 files and 552 tests. One pre-existing renderer focus
  test timed out during the first concurrent full run; it passed alone and the
  immediately repeated full suite passed without source changes.
- `git diff --check` — passed.

Record focused commands, passing test counts, and any justified helper reuse when
complete.

---

## TASK-009-002 — Implement Bounded Analytics Queries

### Status

Complete

### Outcome

The main process can read all and only interval/Task records needed for one
Analytics snapshot through a bounded, set-based, read-only query path whose query
count does not grow with days or Tasks.

### Dependencies

- TASK-009-001 — Define Analytics Contracts, Validation, and Calendar Projections.

### Included

- Add a dedicated Analytics query interface and SQLite/Drizzle implementation.
- Select records overlapping the bounded union of selected range, current week,
  and current month.
- Join stable Task identity and current description.
- Handle closed, open, boundary-crossing, and future-starting records consistently
  with the supplied snapshot.
- Preserve deterministic query ordering where exposed by the query contract.
- Avoid lifetime-history loads and per-day/per-Task query loops.
- Add disposable-SQLite query tests including boundary overlap and open intervals.
- Capture query-count or equivalent structural evidence for the fixed set-based
  design.
- Inspect the relevant SQLite query plan or existing indexes; add no migration
  unless measured evidence and a documented scope update require one.

### Excluded

- Projection totals or Task ranking in the repository when those belong to the
  service/pure projection layer.
- IPC, preload, or renderer work.
- persisted totals or cache tables.
- speculative index changes.

### Deliverables

- Analytics query interface and repository implementation.
- Disposable database tests under the mirrored repository test path.
- Recorded evidence that reads are bounded and fixed-query-count.

### Verification

- Run focused Analytics repository tests against disposable SQLite.
- Run existing database/repository regression tests affected by shared query code.
- Run `npm run typecheck` and lint for touched files.

### Traceability

- Acceptance criteria: AC-009-003, AC-009-005 through AC-009-007,
  AC-009-018.
- Specification sections: 8, 11, 14, 25, 28, 34.

### Completion Evidence

- Added a dedicated `AnalyticsQueries` contract and SQLite/Drizzle repository
  using one joined, set-based read from the earliest selected-range, current-week,
  or current-month start through the exclusive authoritative snapshot.
- Disposable SQLite coverage proves exclusion at the lower overlap boundary,
  inclusion across it, future-start exclusion, open-interval selection, current
  Task identity/description joins, stable start/ID ordering, and byte-for-byte
  read-only database state.
- The implementation performs one query per Analytics read; its query count does
  not vary with the number of days, Tasks, or returned intervals.
- `EXPLAIN QUERY PLAN` uses `time_intervals_started_at_idx` for the bounded
  interval search and the Tasks primary-key autoindex for the join. The existing
  indexes are appropriate for this bounded recent-period query, so no schema
  change or migration was added.
- Focused Analytics, History-query, and database-invariant tests — passed, 3 files
  and 14 tests.
- `npm run typecheck`, `npm run lint`, and `npm run format:check` — passed.
- `npm test` — passed, 68 files and 556 tests.
- `git diff --check` — passed.

Record commands, test counts, observed query count, query-plan conclusion, and the
absence or justification of a migration when complete.

---

## TASK-009-003 — Implement the Authoritative Analytics Service

### Status

Complete

### Outcome

AnalyticsService returns one complete, internally consistent 7-day or 30-day
summary from a single injected-Clock snapshot and bounded query result without
mutating application state.

### Dependencies

- TASK-009-001 — Define Analytics Contracts, Validation, and Calendar Projections.
- TASK-009-002 — Implement Bounded Analytics Queries.

### Included

- Compose the injected Clock, local range resolution, Analytics queries, and pure
  projections.
- Capture `capturedAt` exactly once per service request.
- Return exact day counts, totals, average, week, month, top five, and running Task.
- Ensure open-interval values use the same snapshot across every projection.
- Preserve Task and TimeInterval source data without writes.
- Wire AnalyticsService into main-process application composition without IPC yet.
- Add service unit tests with FakeClock.
- Add disposable-SQLite service integration tests for Timer, manual correction,
  Task rename/delete, restart reconstruction, and read-only behavior.

### Excluded

- IPC handler and preload exposure.
- renderer behavior.
- renderer-local ticking or refresh scheduling.
- schema changes.

### Deliverables

- AnalyticsService and main-process dependency composition.
- Focused service tests and disposable-SQLite integration tests.
- Evidence that repeated reads do not mutate database state.

### Verification

- Run focused Analytics service and integration tests.
- Run affected Timer, interval, Task, History, and database regression tests.
- Run `npm run typecheck` and lint for touched files.

### Traceability

- Acceptance criteria: AC-009-001 through AC-009-008, AC-009-010 through
  AC-009-012, AC-009-018.
- Specification sections: 7, 9–14, 25, 27, 29, 34.

### Completion Evidence

- Added `AnalyticsService` as the read-only composition of the injected Clock,
  local selected/week/month boundaries, the one bounded Analytics query, grouped
  Task records, and the established pure projection implementation.
- Wired the Analytics query repository and service into the main-process
  application composition root without adding the TASK-009-004 IPC boundary.
- Unit coverage proves exactly one Clock read and one bounded query per request,
  shared-snapshot open-interval values, exact 7/30-day output, zero filling,
  grouping, totals, averages, current periods, ranking, and source-record
  preservation.
- Disposable-SQLite integration coverage proves authoritative reprojection after
  Timer start/stop, application restart with an open interval, manual creation,
  Task rename, and cascade deletion. Byte-for-byte serialization before and after
  repeated 7/30-day reads proves the service path is read-only.
- Focused Analytics service, projection, and query tests — passed, 4 files and 18
  tests.
- Affected Timer, manual-time, interval, Task, History, and database regressions —
  passed, 12 files and 131 tests.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, and
  `git diff --check` — passed.
- `npm test` — passed, 70 files and 559 tests.

---

## TASK-009-004 — Expose the Narrow Analytics Boundary

### Status

Complete

### Outcome

The sandboxed renderer can request a validated Analytics summary through exactly
one typed preload method and one thin IPC handler, with controlled safe failures
and no generic privileged capability.

### Dependencies

- TASK-009-003 — Implement the Authoritative Analytics Service.

### Included

- Add the exact `analytics:get-summary` channel constant.
- Add a thin IPC handler that validates before calling AnalyticsService.
- Return `INVALID_ANALYTICS_RANGE` without service/query execution for malformed
  input.
- Map unexpected failures to renderer-safe `INTERNAL_ERROR` and local technical
  logging.
- Register and dispose the handler through established lifecycle composition.
- Expose only `window.timeTracker.analytics.getSummary(input)` through preload.
- Update the typed `TimeTrackerAPI` boundary.
- Add shared-validation, IPC, preload, safe-error, and lifecycle tests.

### Excluded

- navigation and Analytics UI.
- generic invoke, send, on, query, or event APIs.
- renderer-local refresh or ticker behavior.
- any writable Analytics command.

### Deliverables

- Shared channel/contract integration.
- Main-process IPC registration and disposal.
- Preload bridge method and global API typing.
- Focused boundary and safe-error tests.

### Verification

- Run focused Analytics validation, IPC, preload, and lifecycle tests.
- Run existing preload and IPC security regression tests.
- Run `npm run typecheck` and lint for touched files.

### Traceability

- Acceptance criteria: AC-009-016 through AC-009-018.
- Specification sections: 15–17, 30, 33.

### Completion Evidence

- Added the exact `analytics:get-summary` shared channel and a thin handler that
  accepts only the two validated range objects before invoking AnalyticsService.
- IPC tests cover missing, null, primitive, array, missing-range, unsupported,
  unknown-property, and inherited-only input; every malformed case returns
  `INVALID_ANALYTICS_RANGE` with zero service calls.
- Unexpected service/query failures are logged locally and reduced to the exact
  renderer-safe `INTERNAL_ERROR`; injected SQL and database-path details are
  absent from the serialized renderer result.
- Registered the handler with the composed AnalyticsService and attached its
  exact-channel removal callback to idempotent application shutdown cleanup.
- Added only `window.timeTracker.analytics.getSummary(input)` to the typed preload
  API. The preload audit confirms the exact invoke channel and no raw Electron,
  generic invoke/send/on, filesystem, database, or query capability exposure.
- Focused Analytics validation, IPC, preload, lifecycle, History IPC, and Timer
  IPC regressions — passed, 6 files and 43 tests.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, and
  `git diff --check` — passed.
- `npm test` — passed, 71 files and 571 tests.

---

## TASK-009-005 — Introduce Timer and Analytics Navigation

### Status

Pending

### Outcome

The renderer provides semantic, keyboard-accessible Timer and Analytics
destinations while preserving the authoritative Timer controller and every
verified Timer-view workflow.

### Dependencies

- TASK-009-004 — Expose the Narrow Analytics Boundary.

### Included

- Refactor the application shell only as needed to own top-level destination state.
- Render exactly Timer and Analytics navigation destinations.
- Default a fresh renderer load to Timer.
- Identify the current destination semantically and visually.
- Keep authoritative Timer state/revision behavior alive at application level.
- Ensure navigation never invokes a Timer command.
- Ensure returning to Timer avoids a false idle or zero-duration flash.
- Preserve all Daily History, manual time, interval, Task, and timer interactions
  within the Timer destination.
- Add keyboard, focus, navigation-state, and Timer-regression component tests.

### Excluded

- Analytics data layout beyond a minimal destination container.
- Settings destination or placeholder.
- routing dependency or persisted last destination.
- redesign of Timer or Daily History.

### Deliverables

- Application shell/navigation components or focused refactor.
- Minimal Analytics destination placeholder used only until TASK-009-006.
- Focused navigation and Timer-preservation tests.

### Verification

- Run focused App/navigation renderer tests.
- Run existing Timer and Daily History renderer regression tests.
- Run `npm run typecheck` and lint for touched files.

### Traceability

- Acceptance criteria: AC-009-015.
- Specification sections: 18, 19, 35.

### Completion Evidence

Record commands, test counts, keyboard evidence, and confirmation that navigation
issued no Timer command when complete.

---

## TASK-009-006 — Render Static Analytics States and Accessible Chart

### Status

Pending

### Outcome

The Analytics destination loads and switches authoritative ranges, presents every
specified static value and state, and renders a responsive visual chart with an
equivalent accessible daily data representation.

### Dependencies

- TASK-009-004 — Expose the Narrow Analytics Boundary.
- TASK-009-005 — Introduce Timer and Analytics Navigation.

### Included

- Add the Analytics controller/load-state model with Last 7 days default.
- Add exact mutually exclusive 7-day/30-day selection behavior.
- Protect range changes from duplicate and stale responses.
- Render selected-range total and explicit average denominator.
- Render current-week and current-month totals with unambiguous labels.
- Render at most five Top Tasks with wrapping descriptions and tabular durations.
- Render exactly one oldest-first bar per returned day.
- Provide every local date/duration pair through accessible semantic content.
- Handle positive sub-minute, zero-only, and greater-than-99-hour values.
- Implement initial loading, selected-range empty, initial error, Retry, pending
  range switch, and refresh-error/stale-data presentation.
- Keep stale summaries correctly labeled when a new-range request fails.
- Provide narrow-window, focus, contrast, and reduced-motion-safe styling through
  existing semantic tokens.
- Add no charting, routing, or global-state dependency.
- Add focused controller and renderer tests.

### Excluded

- one-second local advancement.
- midnight, focus, mutation, timer-event, and periodic reconciliation scheduling.
- interactive chart filtering or tooltips.
- Task or interval actions from Analytics.

### Deliverables

- Analytics controller/hook and renderer components.
- Source-owned visual chart and semantic daily-values representation.
- Analytics layout and state styling.
- Focused static, accessibility, responsive-state, and stale-response tests.

### Verification

- Run focused Analytics controller/component tests.
- Run accessibility-oriented role/name/state assertions.
- Run existing App and shared duration-format tests.
- Run `npm run typecheck` and lint for touched files.

### Traceability

- Acceptance criteria: AC-009-001, AC-009-002, AC-009-004 through AC-009-009,
  AC-009-016.
- Specification sections: 18–22, 25, 31, 35.

### Completion Evidence

Record commands, test counts, accessible-data evidence, dependency audit, and
narrow-layout evidence when complete.

---

## TASK-009-007 — Implement Live Analytics and Authoritative Reconciliation

### Status

Pending

### Outcome

While Analytics is displayed, an open interval advances every affected value
locally and all relevant events reconcile against authoritative data without
per-second IPC, stale rollback, or paused-state drift.

### Dependencies

- TASK-009-003 — Implement the Authoritative Analytics Service.
- TASK-009-006 — Render Static Analytics States and Accessible Chart.

### Included

- Derive local elapsed presentation from `capturedAt` and the running-Task
  projection.
- Advance Today, selected total/average, current week/month, chart, and active Task
  only while running.
- Insert and re-rank an outside active Task when it crosses into the top five.
- Keep the displayed ranking at five or fewer Tasks.
- Keep paused and closed values fixed.
- Cap local advancement at the next relevant calendar boundary.
- Refresh authoritatively at local midnight and shift the selected window.
- Refresh or invalidate after renderer Timer commands, tray Timer notifications,
  interval mutations, and Task mutations.
- Reconcile on window focus and at an interval no greater than 60 seconds.
- Coalesce or stale-protect overlapping refresh triggers.
- Preserve last usable data and Retry behavior after reconciliation failure.
- Avoid per-second live-region announcements, IPC calls, and database reads.
- Add controller/projection/component tests for live and synchronization behavior.

### Excluded

- background main-process aggregation.
- persisted cache or renderer global-state framework.
- mutation controls inside Analytics.
- system notifications or reminders.

### Deliverables

- Renderer-local Analytics duration projection.
- Application-level invalidation/reconciliation integration using the narrow
  established authoritative revision path.
- Midnight, focus, periodic, mutation, tray-event, stale-response, running-ranking,
  and paused-state tests.

### Verification

- Run focused Analytics live-projection and reconciliation tests with fake timers.
- Assert one-second presentation causes no Analytics preload call.
- Run Timer controller/event, History reconciliation, interval, Task, and tray
  renderer regression tests.
- Run `npm run typecheck` and lint for touched files.

### Traceability

- Acceptance criteria: AC-009-010 through AC-009-014, AC-009-016.
- Specification sections: 13, 17, 20, 23–25, 31, 34, 35.

### Completion Evidence

Record commands, test counts, no-per-second-IPC evidence, midnight results, and
mutation/event reconciliation evidence when complete.

---

## TASK-009-008 — Verify Packaged Analytics and Reconcile Documentation

### Status

Pending

### Outcome

SPEC-009 is evidenced end to end in an isolated packaged application, all project
checks pass, and specification, task, progress, architecture, and decision records
accurately reflect the completed implementation.

### Dependencies

- TASK-009-001 through TASK-009-007.

### Included

- Audit AC-009-001 through AC-009-019 against automated and manual evidence.
- Run the complete required validation suite.
- Package the primary-platform application.
- Use isolated application/user data for packaged acceptance.
- Seed or create representative data for 7-day, 30-day, week, month, zero-day,
  more-than-five-Task, running, paused, and mutation scenarios.
- Verify normal and narrow desktop layouts.
- Verify accessible chart text and keyboard navigation in the packaged workflow.
- Verify live presentation without per-second IPC and paused non-advancement.
- Verify return to authoritative Timer state.
- Verify clean renderer console and absence of runtime HTTP(S) resources.
- Inspect the packaged change for platform-specific assumptions.
- Update architecture or decisions only if accepted implementation changed them.
- Update `docs/progress.md`, `docs/plan.md`, specification status, task statuses,
  and final verification evidence consistently.

### Excluded

- Windows and Linux fresh-machine release acceptance.
- installer/notarization/signing/release automation.
- Settings, dark theme, export, goals, scoring, or arbitrary ranges.
- unrelated refactoring or visual redesign.

### Deliverables

- Complete automated validation evidence.
- Isolated packaged macOS arm64 Analytics acceptance evidence.
- Network/console and renderer-security evidence.
- Reconciled documentation and final status updates.

### Verification

- Run focused tests first if acceptance uncovers a defect.
- Run `npm run format:check` if available.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm test`.
- Run `npm run package`.
- Run isolated packaged acceptance for specification §36.
- Inspect `git diff --check` and the final scoped diff.

### Traceability

- Acceptance criteria: AC-009-001 through AC-009-019.
- Specification sections: 4–38.

### Completion Evidence

Record exact commands, versions/platform, complete test counts, artifact path,
isolated data path, acceptance observations, network/console results, deviations,
and documentation changes before marking this task Complete.

---

# Final Specification Verification

After all implementation tasks are complete:

- verify AC-009-001 through AC-009-019 directly;
- verify Monday week-start, local-month, DST, midnight, open-interval, average,
  ranking, accessibility, bounded-query, and read-only semantics explicitly;
- verify all source data remains Tasks and TimeIntervals with no mutable Analytics
  aggregate;
- verify no per-second Analytics IPC or database read exists;
- run all validation required by specification §37 and the project Definition of
  Done;
- complete isolated packaged primary-platform verification from specification §36;
- confirm Timer, Daily History, manual corrections, Task management, and tray
  behavior remain intact;
- update documentation and `docs/progress.md`;
- change the specification to `Verified` and this source status only when all
  required evidence is recorded;
- leave cross-platform fresh-machine packaging and release validation to its later
  specification.
