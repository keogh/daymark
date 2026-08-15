# SPEC-003 — Task Breakdown

## Source

- Specification: `docs/specs/003-task-search-and-reuse/spec.md`
- Specification status: Ready for Implementation
- Last reviewed against specification: 2026-08-15

The specification is the source of truth for behavior. This file only decomposes
that behavior into implementation work. If the two conflict, update this breakdown
to match the specification.

---

# Execution Rules

- Complete tasks in dependency order and keep only one task `In Progress`.
- Before implementation, copy the active task's immediate steps into
  `docs/plan.md`.
- Record focused verification evidence before marking a task `Complete`.
- Reuse SPEC-002 local-calendar projection behavior and source-owned UI primitives
  where their semantics match.
- Do not add history-row Play, active-task switching, task management, manual time
  entry, interval management, analytics, or settings behavior.
- Task completion does not replace final acceptance and Definition of Done checks.

---

# Task Index

| ID | Task | Status | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- |
| TASK-003-001 | Define suggestion and explicit-start contracts | Complete | None | AC-003-007, AC-003-012–014 |
| TASK-003-002 | Implement bounded suggestion queries and projections | Complete | TASK-003-001 | AC-003-001–004, AC-003-015 |
| TASK-003-003 | Implement task suggestion and explicit-reuse services | Complete | TASK-003-002 | AC-003-001–004, AC-003-005–007, AC-003-012–015 |
| TASK-003-004 | Expose the validated task suggestion boundary | Complete | TASK-003-003 | AC-003-001–004, AC-003-011–015 |
| TASK-003-005 | Build the accessible idle-task combobox | Complete | TASK-003-004 | AC-003-001–011, AC-003-016 |
| TASK-003-006 | Verify Task Search and Reuse and update documentation | Pending | TASK-003-005 | AC-003-001–017 |

---

# Tasks

## TASK-003-001 — Define Suggestion and Explicit-Start Contracts

### Status

Complete

### Outcome

Shared types and runtime validators precisely define bounded suggestion requests
and the two valid timer Start variants without changing timer behavior yet.

### Dependencies

None.

### Included

- Define task-suggestion input, result, and API contracts.
- Revise StartTaskInput to a discriminated description/existing-task union.
- Validate exact object shapes, query strings, description rules, task IDs,
  discriminants, unknown properties, and length limits.
- Define controlled error codes required by SPEC-003.
- Update existing timer call sites and tests mechanically for the description
  discriminant while preserving verified behavior.

### Excluded

- Database queries, service behavior, IPC registration, and suggestion UI.

### Deliverables

- Shared contracts, validation modules, error mappings, and focused unit/boundary
  tests under mirrored `test/` paths.

### Verification

- Run focused contract and validation tests, existing timer boundary tests,
  `npm run typecheck`, and `npm run lint`.

### Traceability

- Acceptance criteria: AC-003-007, AC-003-012–014
- Specification sections: 7, 11–12, 15, 20, 25

### Completion Evidence

- Added bounded task-suggestion request/page/API contracts, the discriminated Start
  contract, and SPEC-003 controlled error codes.
- Added exact-shape runtime validation for suggestion requests and both Start
  variants, including Unicode code-point limits, task-text normalization, unknown
  properties, invalid discriminants, and empty task IDs.
- Mechanically migrated existing description Start callers without implementing
  suggestion queries, explicit reuse, or UI behavior.
- `npm test -- test/shared test/main/ipc/timer.test.ts test/preload/index.test.ts
  test/main/services/timer-service.test.ts
  test/main/services/timer-service.integration.test.ts
  test/main/database/repositories/task-repository.test.ts` — passed, 84 tests.
- `npm run format:check` — passed.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — passed, 200 tests.
- `git diff --check` — passed.

---

## TASK-003-002 — Implement Bounded Suggestion Queries and Projections

### Status

Complete

### Outcome

Disposable and production SQLite databases can return at most five correctly
matched, ordered, and aggregated task suggestions without per-result queries.

### Dependencies

TASK-003-001.

### Included

- Add normalized substring and prefix classification query behavior.
- Implement empty-query recency ordering and every deterministic tie-breaker.
- Calculate today and lifetime totals using one supplied snapshot.
- Reuse DST-safe local calendar and open/cross-midnight overlap behavior.
- Handle anomalous tasks without intervals safely.
- Demonstrate bounded result and query counts and read-only behavior.
- Add repository tests using disposable SQLite databases.

### Excluded

- Service orchestration, IPC, preload, and renderer behavior.
- Schema changes unless the specification and breakdown are updated first.

### Deliverables

- Focused repository/query modules and repository tests.

### Verification

- Run focused suggestion repository tests, relevant history projection regressions,
  `npm run typecheck`, and `npm run lint`.

### Traceability

- Acceptance criteria: AC-003-001–004, AC-003-015
- Specification sections: 7–10, 18, 21

### Completion Evidence

- Added one grouped, parameterized SQLite query that performs literal normalized
  substring matching, prefix classification, deterministic ordering, recency, and
  today/lifetime aggregation with a hard five-row limit.
- Reused the SPEC-002 local calendar helper for DST-safe day boundaries and clipped
  closed/open durations to the supplied authoritative snapshot.
- Disposable-database tests cover empty-query recency, five-row limiting, prefix
  priority, recency/description/ID tie-breakers, literal `%`/`_` matching, orphan
  tasks, repeated/open/cross-midnight/exact-boundary intervals, and DST.
- A prepared-statement spy demonstrates one query for the complete result rather
  than one query per suggestion; serialized database comparison demonstrates the
  operation is read-only. No schema change or migration was needed.
- `npm test -- test/main/database/repositories/task-suggestion-query-repository.test.ts
  test/main/services/history-projections.test.ts
  test/main/database/repositories/history-query-repository.test.ts` — passed, 17
  tests.
- `npm run format:check` — passed.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — passed, 207 tests.
- `git diff --check` — passed.

---

## TASK-003-003 — Implement Task Suggestion and Explicit-Reuse Services

### Status

Complete

### Outcome

Application services return authoritative suggestion pages and atomically start an
explicit existing task while preserving both prior Start behavior and idle-only
rules.

### Dependencies

TASK-003-002.

### Included

- Implement TaskService suggestion orchestration with one Clock snapshot.
- Integrate the bounded suggestion repository.
- Extend TimerService Start to resolve an existing task ID inside its transaction.
- Preserve normalized-description creation/reuse behavior.
- Return TASK_NOT_FOUND without mutation for stale IDs.
- Preserve TIMER_NOT_IDLE for both Start variants.
- Add deterministic service and disposable-SQLite integration tests.

### Excluded

- Switching from running or paused states.
- IPC and renderer behavior.

### Deliverables

- Task suggestion service, revised timer service, composition updates needed for
  service construction, and focused service/integration tests.

### Verification

- Run focused TaskService and TimerService tests, related SQLite integration tests,
  the existing core timer suite, `npm run typecheck`, and `npm run lint`.

### Traceability

- Acceptance criteria: AC-003-001–007, AC-003-012–015
- Specification sections: 9, 11, 15–16, 22

### Completion Evidence

- Added TaskService orchestration that validates complete inputs before work,
  normalizes through the shared validator, obtains exactly one Clock snapshot, and
  passes that same snapshot to the bounded suggestion query and response.
- Extended TimerService Start to resolve `existing-task` IDs only after the
  idle-state check and inside the existing SQLite transaction. Exact reuse creates
  one open interval without duplicating the Task; a missing ID returns
  `TASK_NOT_FOUND` with no persistence changes.
- Preserved description-based normalized reuse/creation and `TIMER_NOT_IDLE` for
  both Start variants. Tests demonstrate active-state rejection occurs before task
  lookup and transaction rollback coverage remains green.
- Added deterministic TaskService unit tests plus disposable-SQLite service
  integration for projected suggestions followed by exact-ID reuse.
- `npm test -- test/main/services/task-service.test.ts
  test/main/services/timer-service.test.ts
  test/main/services/timer-service.integration.test.ts
  test/main/database/repositories/task-suggestion-query-repository.test.ts
  test/main/database/repositories/task-repository.test.ts
  test/main/database/repositories/time-interval-repository.test.ts` — passed, 57
  tests.
- `npm run format:check` — passed.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — passed, 214 tests.
- `git diff --check` — passed.

---

## TASK-003-004 — Expose the Validated Task Suggestion Boundary

### Status

Complete

### Outcome

The renderer can request suggestions and explicitly reuse a task through narrow,
typed, runtime-validated preload and IPC APIs with controlled failures.

### Dependencies

TASK-003-003.

### Included

- Register an explicit suggestion IPC channel and thin handler.
- Expose `window.timeTracker.tasks.getSuggestions` through contextBridge.
- Wire the revised discriminated timer Start input end to end.
- Validate all input before repository queries or mutation.
- Map expected and unexpected failures without leaking internal details or user
  content.
- Add IPC, preload, global typing, composition, and boundary tests.

### Excluded

- Generic invoke/send access and renderer combobox behavior.

### Deliverables

- Main-process registration, preload API, public typings, error handling, and
  focused boundary/integration tests.

### Verification

- Run focused IPC, preload, composition, and timer boundary tests, `npm run
  typecheck`, and `npm run lint`.

### Traceability

- Acceptance criteria: AC-003-001–004, AC-003-011–015
- Specification sections: 12, 14–16, 22, 25

### Completion Evidence

- Added one explicit `tasks:get-suggestions` IPC handler that validates the exact
  request shape before invoking TaskService, safely returns controlled failures,
  and logs unexpected failures under a content-free technical message before
  returning `INTERNAL_ERROR`.
- Composed TaskSuggestionQueryRepository, TaskService, and the tasks handler in the
  main-process lifecycle without exposing database or query primitives.
- Added `tasks.getSuggestions` to the typed public API and contextBridge preload;
  preload tests demonstrate only the narrow method and explicit channel are
  exposed. The timer boundary and preload tests cover both description and
  existing-task Start variants end to end through their typed channel.
- Added focused IPC tests for successful delegation, malformed/oversized/unknown
  input rejection before service work, controlled suggestion failures, sanitized
  unexpected failures, and content-free logging.
- Mechanically updated the full renderer API test fixture for the new required
  public contract; no renderer suggestion behavior was introduced.
- `npm test -- test/main/ipc/tasks.test.ts test/main/ipc/timer.test.ts
  test/preload/index.test.ts test/main/services/task-service.test.ts
  test/main/services/timer-service.test.ts` — passed, 42 tests.
- `npm run format:check` — passed.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — passed, 222 tests.
- `git diff --check` — passed.

---

## TASK-003-005 — Build the Accessible Idle-Task Combobox

### Status

Complete

### Outcome

The idle timer offers a responsive, accessible five-result task combobox supporting
recent discovery, typed search, keyboard and pointer reuse, stale-result protection,
and recoverable errors.

### Dependencies

TASK-003-004.

### Included

- Load recent tasks on empty-input focus and matches as text changes.
- Render descriptions plus today and lifetime durations.
- Highlight the first result and implement wrapping Arrow Up/Down navigation.
- Start the highlighted option on Enter and a clicked option by task ID.
- Keep the Start button bound to the typed-description variant.
- Implement Escape, blur/click ordering, empty results, loading, recoverable errors,
  and stale-request invalidation.
- Refresh Daily History after successful reuse through the existing authoritative
  mechanism.
- Implement accessible combobox/listbox/option semantics and announcements.
- Add focused renderer interaction, race-condition, error, and accessibility tests.

### Excluded

- History-row Play and active-task switching.
- New general-purpose design-system work not required by the combobox.

### Deliverables

- Idle form/controller UI changes, minimal source-owned presentation additions, and
  focused renderer tests.

### Verification

- Run focused idle timer and suggestion renderer tests, existing timer and history
  renderer regressions, `npm run typecheck`, `npm run lint`, and `npm run
  format:check`.

### Traceability

- Acceptance criteria: AC-003-001–011, AC-003-016
- Specification sections: 13–17, 19, 23

### Completion Evidence

- Added a focused suggestion controller that hides prior results while loading,
  limits renderer rows to five, highlights the first successful result, invalidates
  stale responses by request generation, and provides retryable controlled errors.
- Extended the timer controller with exact-ID Start through the existing pending,
  error, authoritative-state, and Daily History revision path.
- Composed the existing source-owned Input and Field into an asynchronous
  combobox/listbox/option pattern with `aria-expanded`, `aria-controls`,
  `aria-activedescendant`, `aria-autocomplete`, `aria-busy`, selected state, a
  polite result-count announcement, and a visible recoverable error status.
- Implemented wrapping Arrow Up/Down, highlighted Enter, pointer selection,
  Escape, blur/click ordering, typing-after-Escape, silent empty results, and a
  Start button that remains bound to the typed description.
- Renderer tests cover recent focus loading, five-row limiting, duration display,
  pending usability, keyboard and pointer reuse, typed Start independence,
  Escape/blur, stale response ordering, recoverable suggestion errors, empty
  results, `TASK_NOT_FOUND`, ARIA relationships, retained focus, and history
  refresh.
- Browser plugin was unavailable, so rendered QA used Electron CDP with an isolated
  `/tmp` profile. At 1100×800 and 390×844, page identity/content, focused
  combobox state, two suggestion rows, highlighted selection, ArrowDown + Enter
  exact reuse, running-state transition, responsive width, and zero horizontal
  overflow passed with no renderer console warnings/errors.
- Visual screenshot inspection found and fixed a mobile stacking defect where the
  submit button painted over the first option; the repeated desktop/mobile QA and
  final screenshots show clean list geometry and no overlap.
- `npm test -- test/renderer/app/App.test.tsx
  test/renderer/app/DailyHistory.test.tsx
  test/renderer/app/use-display-duration.test.tsx
  test/renderer/app/duration-format.test.ts` — passed, 42 tests.
- `npm run format:check` — passed.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — passed, 232 tests.
- `git diff --check` — passed.

---

## TASK-003-006 — Verify Task Search and Reuse and Update Documentation

### Status

Pending

### Outcome

SPEC-003 is verified end to end against every acceptance criterion and the project
Definition of Done, with documentation accurately recording the delivered behavior.

### Dependencies

TASK-003-005.

### Included

- Trace AC-003-001 through AC-003-017 to automated and manual evidence.
- Run complete static validation and automated tests.
- Package on the primary development platform.
- Smoke-test recent, search, keyboard, pointer, exact-description, error-recovery,
  and restart-safe reuse workflows in isolated development and packaged apps.
- Confirm no runtime network dependency or renderer security regression.
- Confirm no SPEC-004 or later behavior was introduced.
- Update relevant architecture/domain documentation only if behavior requires it.
- Update `docs/progress.md`, task evidence, and final statuses.

### Excluded

- Implementing fixes or features outside SPEC-003; any discovered unrelated issue
  must be documented separately.

### Deliverables

- Acceptance evidence, validation results, packaging/runtime evidence, synchronized
  documentation, and final specification/task statuses.

### Verification

- Run `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm test`, and
  `npm run package`, plus the specified isolated runtime smoke tests.

### Traceability

- Acceptance criteria: AC-003-001–017
- Specification sections: 19–27

### Completion Evidence

Record the final acceptance matrix, command results, runtime evidence, deviations,
and documentation updates before marking this task and specification complete.

---

# Final Specification Verification

After all implementation tasks are complete:

- verify AC-003-001 through AC-003-017 directly;
- run all validation required by section 26 and the project Definition of Done;
- perform required isolated development and packaged-application checks;
- update documentation and `docs/progress.md`;
- change specification and task statuses only when their stated conditions hold.
