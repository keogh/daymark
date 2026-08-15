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
| TASK-003-001 | Define suggestion and explicit-start contracts | Pending | None | AC-003-007, AC-003-012–014 |
| TASK-003-002 | Implement bounded suggestion queries and projections | Pending | TASK-003-001 | AC-003-001–004, AC-003-015 |
| TASK-003-003 | Implement task suggestion and explicit-reuse services | Pending | TASK-003-002 | AC-003-001–004, AC-003-005–007, AC-003-012–015 |
| TASK-003-004 | Expose the validated task suggestion boundary | Pending | TASK-003-003 | AC-003-001–004, AC-003-011–015 |
| TASK-003-005 | Build the accessible idle-task combobox | Pending | TASK-003-004 | AC-003-001–011, AC-003-016 |
| TASK-003-006 | Verify Task Search and Reuse and update documentation | Pending | TASK-003-005 | AC-003-001–017 |

---

# Tasks

## TASK-003-001 — Define Suggestion and Explicit-Start Contracts

### Status

Pending

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

Record commands run, results, and implementation notes when complete.

---

## TASK-003-002 — Implement Bounded Suggestion Queries and Projections

### Status

Pending

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

Record commands run, results, query-count evidence, and implementation notes when
complete.

---

## TASK-003-003 — Implement Task Suggestion and Explicit-Reuse Services

### Status

Pending

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

Record commands run, results, transaction evidence, and implementation notes when
complete.

---

## TASK-003-004 — Expose the Validated Task Suggestion Boundary

### Status

Pending

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

Record commands run, results, and implementation notes when complete.

---

## TASK-003-005 — Build the Accessible Idle-Task Combobox

### Status

Pending

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

Record commands run, results, and accessibility evidence when complete.

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
