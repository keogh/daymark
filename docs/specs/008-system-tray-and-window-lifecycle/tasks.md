# SPEC-008 — Task Breakdown

## Source

- Specification: `docs/specs/008-system-tray-and-window-lifecycle/spec.md`
- Specification status: Ready for Implementation
- Last reviewed against specification: 2026-08-21

The specification is the source of truth for behavior. This file only decomposes
that behavior into implementation work. If the two conflict, update this
breakdown to match the specification.

---

# Execution Rules

- Complete tasks in dependency order and keep only one task `In Progress`.
- Before implementation, copy the active task's immediate steps into
  `docs/plan.md`.
- Record focused verification evidence before marking a task `Complete`.
- Reuse the established authoritative timer services, injected Clock,
  `AppResult`, preload isolation, and renderer reconciliation behavior.
- Do not add a full event bus, persistence for tray/window state, automatic OS
  startup, arbitrary tray task selection, notifications, or later-spec work.
- Task completion does not replace final acceptance and Definition of Done
  checks.

---

# Task Index

| ID | Task | Status | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- |
| TASK-008-001 | Define tray presentation and platform asset selection | Complete | None | AC-008-001–004, AC-008-017 |
| TASK-008-002 | Implement owned close, restore, and quit lifecycle | Complete | None | AC-008-009–011, AC-008-013, AC-008-015 |
| TASK-008-003 | Implement authoritative tray service and timer commands | Complete | TASK-008-001 | AC-008-001–008, AC-008-015–017 |
| TASK-008-004 | Synchronize tray and renderer timer presentation | Complete | TASK-008-003 | AC-008-005, AC-008-008, AC-008-012, AC-008-017 |
| TASK-008-005 | Compose startup, assets, lifecycle, and recovery | Complete | TASK-008-002, TASK-008-004 | AC-008-001, AC-008-009–018 |
| TASK-008-006 | Verify System Tray and update documentation | In Progress | TASK-008-005 | AC-008-001–018 |

---

# Tasks

## TASK-008-001 — Define Tray Presentation and Platform Asset Selection

### Status

Complete

### Outcome

Pure, deterministic presentation logic produces the required idle, running, and
paused native menu models, duration text, Task-description text, and local icon
selection without accessing persistence or Electron from renderer code.

### Dependencies

None.

### Included

- Define the narrow internal tray presentation model and labels.
- Derive running duration from an authoritative snapshot and injected Clock.
- Format unbounded-hour `HH:MM:SS` consistently with the renderer.
- Normalize presentation whitespace and truncate Task descriptions to 80
  Unicode code points without modifying stored data.
- Add platform-appropriate local tray assets and deterministic asset-path
  selection for development and packaged layouts.
- Add focused unit tests for all states, time edge cases, Unicode presentation,
  tooltip/title, and supported platform paths.

### Excluded

- Creating Electron Tray/Menu objects, executing commands, window lifecycle,
  renderer notification, or application startup composition.

### Deliverables

- Main-process tray presentation/formatting modules, tray image assets, and
  focused mirrored tests.

### Verification

- Run focused tray presentation and asset-selection tests, then
  `npm run typecheck` and `npm run lint`.

### Traceability

- Acceptance criteria: AC-008-001–004, AC-008-017
- Specification sections: 7, 9, 15, 17, 22–25

### Completion Evidence

- `npm test -- test/main/tray/presentation.test.ts test/main/tray/assets.test.ts`
  — passed 12 focused tests across 2 files.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npx prettier --check src/main/tray test/main/tray docs/plan.md docs/specs/008-system-tray-and-window-lifecycle/tasks.md`
  and `git diff --check` — passed.
- Added pure idle/running/paused menu presentation, unbounded duration and
  Unicode-safe Task-description formatting, deterministic development/packaged
  asset selection, and application-owned 1x/2x macOS template plus fallback
  assets. Native Tray/Menu creation and packaging composition remain scoped to
  later SPEC-008 tasks.

---

## TASK-008-002 — Implement Owned Close, Restore, and Quit Lifecycle

### Status

Complete

### Outcome

The main process owns at most one normal window, normal Close hides it, Open and
platform activation restore it, and explicit Quit bypasses hiding and cleans up
without invoking timer mutation.

### Dependencies

None.

### Included

- Introduce testable single-window ownership and lifecycle state.
- Hide and retain the window on normal Close in every timer state.
- Restore, unminimize, show, and focus the existing window without duplicates.
- Recreate one secure window only after exceptional destruction.
- Support macOS application activation and reliable Windows/Linux tray
  double-click restoration.
- Replace non-macOS `window-all-closed` quit behavior while tray lifecycle is
  active.
- Add explicit quitting state, idempotent cleanup hooks, and shutdown behavior
  that permits window destruction but invokes no timer command.
- Add focused lifecycle tests using narrow Electron adapters/fakes.

### Excluded

- Tray menu presentation, timer commands, state publication, assets, and final
  startup composition.

### Deliverables

- Window/lifecycle ownership modules, lifecycle integration seams, and focused
  tests.

### Verification

- Run focused main app/window lifecycle tests and existing startup/security
  tests, then `npm run typecheck` and `npm run lint`.

### Traceability

- Acceptance criteria: AC-008-009–011, AC-008-013, AC-008-015
- Specification sections: 4–5, 11–12, 15–17, 19, 24

### Completion Evidence

- `npm test -- test/main/app/window-owner.test.ts test/main/app/shutdown.test.ts
  test/main/app/startup.test.ts test/main/app/window-options.test.ts` — passed 16
  focused lifecycle, startup, and secure-window tests across 4 files.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npx prettier --write` on changed source, test, and task documents plus
  `git diff --check` — passed.
- Added one testable main-window owner for close-to-hide, retained restore,
  exceptional replacement, application activation, and tray double-click
  restoration. Added explicit quit state and reverse-order, idempotent cleanup;
  the existing database lifecycle now participates in that path without any
  timer-service dependency or transition.

---

## TASK-008-003 — Implement Authoritative Tray Service and Timer Commands

### Status

Complete

### Outcome

One main-process tray presents an authoritative snapshot, animates running
duration with one local ticker, and safely executes existing Pause, Resume, and
Stop operations with visible failure handling.

### Dependencies

TASK-008-001.

### Included

- Create a testable main-process Tray service around narrow native adapters.
- Initialize exactly once from an authoritative state and dispose idempotently.
- Build native menus for idle, running, paused, and command-pending states.
- Own at most one once-per-second ticker while running and perform no per-tick
  database/IPC work.
- Execute existing timer-service Pause, Resume, and Stop commands.
- Prevent duplicate pending tray commands.
- Synchronize and publish successful results through a narrow callback.
- Reconcile controlled/thrown failures, show safe native error dialogs, and
  sanitize unexpected logging.
- Add service and disposable-SQLite integration tests for command persistence
  and failure safety.

### Excluded

- Renderer preload subscription, renderer controller changes, full startup
  composition, or window lifecycle implementation.

### Deliverables

- Tray native adapters/service, command coordination, focused tests, and timer
  integration coverage.

### Verification

- Run focused tray unit/integration and existing timer-service tests, then
  `npm run typecheck` and `npm run lint`.

### Traceability

- Acceptance criteria: AC-008-001–008, AC-008-015–017
- Specification sections: 7, 9–10, 14–19, 22–24

### Completion Evidence

- `npm test -- test/main/tray/service.test.ts
  test/main/tray/service.integration.test.ts test/main/tray/presentation.test.ts
  test/main/tray/assets.test.ts test/main/services/timer-service.test.ts
  test/main/services/timer-service.integration.test.ts` — passed 73 focused
  tray, presentation, SQLite integration, and existing timer-service tests
  across 6 files.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npx prettier --write` on changed source, test, and task documents plus
  `git diff --check` — passed.
- Added a narrow Electron Tray/Menu adapter and deterministic authoritative tray
  service with exactly-once initialization, idempotent disposal, at-most-one
  running ticker, pending-command guards, returned-state publication, fresh-state
  failure reconciliation, safe native messages, and sanitized technical logging.
  Renderer subscription and startup composition remain scoped to TASK-008-004
  and TASK-008-005 respectively.

---

## TASK-008-004 — Synchronize Tray and Renderer Timer Presentation

### Status

Complete

### Outcome

All relevant main-process mutations update the tray, and tray transitions reach
the live renderer through one explicit, safely removable timer-state
subscription with authoritative focus reconciliation.

### Dependencies

TASK-008-003.

### Included

- Add the fixed `timer:state-changed` event contract and typed
  `timer.onStateChanged` preload subscription.
- Strip Electron event objects and return precise listener cleanup without
  exposing generic messaging.
- Publish successful tray transition state to every live main window.
- Synchronize the tray after renderer Start, Switch, Pause, Resume, and Stop.
- Refresh tray presentation after active Task rename and relevant current-session
  interval corrections.
- Update the renderer timer controller from published authoritative state,
  preserving stale-request protection and advancing history revision.
- Add authoritative timer refresh when a restored window receives focus.
- Add focused IPC/preload, coordinator, renderer controller, App, and history
  reconciliation tests.

### Excluded

- New renderer visual UI, generic application events, tray ticker publication,
  or unrelated mutation notifications.

### Deliverables

- Typed event contract, preload bridge, main-process publication/coordination,
  renderer reconciliation changes, and focused tests.

### Verification

- Run focused timer IPC/preload, tray coordination, renderer App/controller,
  and Daily History tests, then `npm run typecheck` and `npm run lint`.

### Traceability

- Acceptance criteria: AC-008-005, AC-008-008, AC-008-012, AC-008-017
- Specification sections: 10, 13–20, 22–24

### Completion Evidence

- `npm test -- test/main/timer/state-synchronization.test.ts
  test/main/timer/state-publisher.test.ts test/preload/index.test.ts
  test/main/ipc/timer.test.ts test/main/ipc/tasks.test.ts
  test/main/ipc/intervals.test.ts test/renderer/app/App.test.tsx
  test/renderer/app/DailyHistory.test.tsx` — passed 90 focused synchronization,
  boundary, IPC, renderer, and history tests across 8 files.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — passed all 525 tests across 63 files.
- Added the fixed `timer:state-changed` contract, precise preload listener
  cleanup, live-window publication, and a narrow synchronization coordinator.
  Successful renderer timer commands use returned authoritative state; Task
  rename and interval correction seams reread state before tray/publication.
  The renderer now accepts validated publication snapshots, invalidates stale
  requests, advances history revision, refreshes on focus, and cleans up its
  one subscription. Startup composition remains scoped to TASK-008-005.

---

## TASK-008-005 — Compose Startup, Assets, Lifecycle, and Recovery

### Status

Complete

### Outcome

Application startup and shutdown compose database, services, authoritative
state, tray, single-window ownership, renderer publication, and packaged assets
in a safe order with complete failure cleanup and restart reconstruction.

### Dependencies

- TASK-008-002
- TASK-008-004

### Included

- Wire application composition after database/service readiness.
- Initialize tray from the reconstructed state and create/show one normal
  window.
- Connect Open, platform activation, close-to-hide, explicit Quit, OS shutdown,
  state synchronization, error dialogs, and resource disposal.
- Make tray/icon initialization failure fatal with safe feedback and complete
  cleanup.
- Ensure development and packaged asset paths are included by Forge packaging.
- Add startup order, partial-failure cleanup, restart, close/restore, and
  composition integration tests.
- Verify all existing timer/history/task/interval boundaries remain intact.

### Excluded

- Analytics, settings, installers, automatic OS startup, and full Windows/Linux
  fresh-machine validation.

### Deliverables

- Main application composition, packaged asset configuration, integration tests,
  and recovery coverage.

### Verification

- Run focused startup/lifecycle/restart/integration tests, full regression tests,
  and `npm run package` before advancing to final acceptance.

### Traceability

- Acceptance criteria: AC-008-001, AC-008-009–018
- Specification sections: 3–6, 10–15, 17–19, 22–25

### Completion Evidence

- `npm test -- test/main/app/startup.test.ts test/main/app/shutdown.test.ts
  test/main/app/window-owner.test.ts test/main/app/packaging.test.ts
  test/main/tray/service.test.ts test/main/tray/service.integration.test.ts
  test/main/services/timer-service.integration.test.ts
  test/main/timer/state-synchronization.test.ts
  test/main/timer/state-publisher.test.ts` — passed 41 focused startup,
  lifecycle, tray, synchronization, SQLite command, and restart tests across 9
  files.
- `npm run format:check`, `npm run typecheck`, and `npm run lint` — passed.
- `npm test` — passed all 528 tests across 64 files.
- `npm run package` — passed for macOS arm64 after allowing Forge's required
  packaging download; the initial sandboxed attempts failed only because DNS
  access to GitHub was unavailable.
- Inspected the packaged application and confirmed the application-owned SVG,
  fallback PNG, and 1x/2x macOS template PNGs exist under
  `Contents/Resources/assets/tray`; the native template image is 16x16 RGBA.
- Composed database/service readiness, one reconstructed initial snapshot,
  native tray creation, timer synchronization/publication, and single-window
  ownership in deterministic order. Connected Open, non-macOS tray
  double-click, macOS activation, explicit/OS quit, safe native errors, and
  reverse-order idempotent cleanup. Tray/icon initialization failure is fatal
  before window creation and cleans partial resources before exit.
- `git diff --check` — passed.

---

## TASK-008-006 — Verify System Tray and Update Documentation

### Status

In Progress

### Outcome

SPEC-008 acceptance criteria and the project Definition of Done are verified,
and documentation reflects the completed tray and window lifecycle.

### Dependencies

TASK-008-005.

### Included

- Verify AC-008-001 through AC-008-018 directly against automated and manual
  evidence.
- Run formatting, typecheck, lint, the complete test suite, and packaging.
- Exercise the isolated packaged macOS workflow in specification §25.
- Inspect isolated SQLite state around Quit-while-running and relaunch.
- Check local-only packaged assets, duplicate-window prevention, native error
  cleanliness, and renderer/main security boundaries.
- Review Windows/Linux platform branches and record deferred SPEC-011 physical
  platform validation.
- Update `docs/progress.md` and any architecture/product documentation made
  inaccurate by implementation.
- Reconcile specification and task statuses only after every required check
  passes.

### Excluded

- SPEC-009 Analytics, SPEC-010 Settings, SPEC-011 release packaging, and any
  deferred roadmap work.

### Deliverables

- Acceptance evidence, full validation results, isolated packaged-app evidence,
  documentation updates, and reconciled statuses.

### Verification

- Run `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm test`,
  and `npm run package`, then complete the packaged workflow from §25.

### Traceability

- Acceptance criteria: AC-008-001–018
- Specification sections: 16–27

### Completion Evidence

Record commands run, results, and relevant implementation notes when complete.

---

# Final Specification Verification

After all implementation tasks are complete:

- verify AC-008-001 through AC-008-018 directly;
- run all validation required by SPEC-008 and the project Definition of Done;
- perform the isolated packaged-application workflow from specification §25;
- update documentation and `docs/progress.md`;
- change specification and task statuses only when their stated conditions hold.
