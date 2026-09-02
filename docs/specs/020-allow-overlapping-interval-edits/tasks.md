# SPEC-020 — Task Breakdown

## Source

- Specification: `docs/specs/020-allow-overlapping-interval-edits/spec.md`
- Specification status: Ready for Implementation
- Last reviewed against specification: 2026-09-01

The specification is the source of truth for behavior. This file only decomposes
that behavior into implementation work. If the two conflict, update this breakdown
to match the specification.

---

# Execution Rules

- Do not begin these tasks while the specification remains `Draft`.
- Complete tasks in dependency order.
- Keep only one task `In Progress` unless parallel work is explicitly coordinated.
- Before implementation, copy the active task's immediate steps into
  `docs/plan.md`.
- Record verification evidence before marking a task `Complete`.
- Do not use task completion as a substitute for final specification acceptance
  or the project Definition of Done.

---

# Task Index

| ID | Task | Status | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- |
| TASK-020-001 | Accept and document scoped overlap semantics | Complete | None | AC-020-004, AC-020-007 |
| TASK-020-002 | Allow overlaps in the interval update service | Complete | TASK-020-001 | AC-020-001, AC-020-002, AC-020-003, AC-020-005, AC-020-006 |
| TASK-020-003 | Reconcile edit boundary and renderer behavior | Complete | TASK-020-002 | AC-020-008 |
| TASK-020-004 | Verify persistence, projections, and restart | Pending | TASK-020-003 | AC-020-004, AC-020-007, AC-020-009 |
| TASK-020-005 | Run final acceptance and reconcile documentation | Pending | TASK-020-004 | AC-020-001 through AC-020-009 |

---

# Tasks

## TASK-020-001 — Accept and Document Scoped Overlap Semantics

### Status

Complete

### Outcome

The repository has one accepted decision that allows overlap from closed-interval
editing, preserves manual-creation overlap rejection and single-open-timer
semantics, and defines overlapping durations as additive.

### Dependencies

None internally. SPEC-020 must be `Ready for Implementation`, and repository
sequencing must permit post-MVP product work.

### Included

- Add a decision that partially supersedes DEC-026 and the global invariant from
  SPEC-006.
- Update current product, domain, architecture, agent, and Definition of Done
  documentation to distinguish edit overlap from manual-creation overlap.
- Preserve historical specifications while linking superseding behavior where
  appropriate.

### Excluded

- Service, repository, IPC, or renderer changes.
- Broad removal of manual-entry overlap protection.
- Union-based duration calculations.

### Deliverables

- Accepted decision and reconciled current documentation.
- Confirmed additive projection semantics.

### Verification

- Search current normative documentation for contradictory universal non-overlap
  requirements.
- Inspect the scoped documentation diff.

### Traceability

- Acceptance criteria: AC-020-004, AC-020-007
- Specification sections: 3, 5, 7, 24

### Completion Evidence

- 2026-09-01: Promoted SPEC-020 to `Ready for Implementation` after explicit
  owner approval for post-MVP sequencing and additive duration semantics.
- Added accepted DEC-039, which partially supersedes DEC-026 and SPEC-006 only
  for closed-interval editing while retaining manual-creation conflict rejection
  and the single-open-interval invariant.
- Reconciled `AGENTS.md`, current product context and PRD, domain model,
  architecture, Definition of Done, progress, and the historical SPEC-006
  supersession pointer. Confirmed overlapping intervals remain distinct and all
  projections add their applicable durations without union or deduplication.
- `rg` contradiction audit found no unresolved universal non-overlap requirement
  in current normative documentation. Remaining global wording is either
  historical SPEC-006 text with its supersession pointer or explanatory text in
  SPEC-020 and progress history. `git diff --check` passed.

---

## TASK-020-002 — Allow Overlaps in the Interval Update Service

### Status

Complete

### Outcome

An otherwise valid closed-interval update commits regardless of conflicts with
closed or elapsed open intervals while preserving every remaining mutation and
timer invariant.

### Dependencies

- TASK-020-001 — Accept and Document Scoped Overlap Semantics.

### Included

- Remove conflict detection from the interval update transaction.
- Retain closed-target, existence, valid-range, atomicity, Task-association, and
  `AppState` protections.
- Remove edit-only repository methods if they have no remaining caller.
- Add focused unit, repository, and SQLite integration coverage.
- Preserve manual-entry overlap behavior and coverage.

### Excluded

- Renderer changes.
- Manual creation behavior changes.
- Projection math changes.
- Schema or migration changes.

### Deliverables

- Updated interval service and any safely removable edit-only repository surface.
- Focused service, repository, and integration tests.

### Verification

- Run focused interval service and repository tests.
- Run focused manual-time service tests as a regression guard.
- Run type checking for affected contracts.

### Traceability

- Acceptance criteria: AC-020-001, AC-020-002, AC-020-003, AC-020-005,
  AC-020-006
- Specification sections: 7, 8, 9, 12, 13, 14

### Completion Evidence

- 2026-09-01: Removed closed-range and elapsed-open conflict checks from the
  interval update transaction while retaining target existence, closed-only
  mutation, valid-range validation, Task association, transaction rollback, and
  authoritative timer-state guards.
- Removed the update-only `findOverlappingClosedRangeExcluding` repository query;
  retained the global closed-overlap query used by manual interval creation and
  its existing behavior.
- Added service coverage for partial overlap, containment, identical same-Task and
  cross-Task ranges, multiple overlapping rows, and elapsed running time. Added
  disposable-SQLite repository and integration assertions that other rows, the
  open interval, and `AppState` remain unchanged.
- Focused interval/repository/manual-time verification passed: 5 files and 48
  tests. `npm run typecheck`, `npm run lint`, `git diff --check`, and the full
  `npm test` suite passed (88 files, 731 tests).

---

## TASK-020-003 — Reconcile Edit Boundary and Renderer Behavior

### Status

Complete

### Outcome

The edit flow treats overlapping values as an ordinary successful update and no
longer presents an edit-specific overlap error, while all other dialog and
process-boundary behavior remains intact.

### Dependencies

- TASK-020-002 — Allow Overlaps in the Interval Update Service.

### Included

- Remove the edit dialog's overlap-specific error mapping.
- Preserve the public update contract unless a demonstrated type cleanup is
  necessary.
- Update boundary and renderer tests for successful overlapping edits.
- Preserve invalid, missing, open-target, generic failure, refresh, focus, and
  cancellation behavior.
- Confirm manual entry still displays its overlap guidance.

### Excluded

- New warnings, confirmations, conflict indicators, or interval visualization.
- Changes to manual entry UI.

### Deliverables

- Reconciled edit UI and boundary coverage.
- Manual-entry renderer regression coverage.

### Verification

- Run focused IPC, preload, and Edit interval dialog tests.
- Run focused manual-entry renderer tests.
- Run typecheck and lint for the affected slice.

### Traceability

- Acceptance criteria: AC-020-008
- Specification sections: 10, 11, 12, 13, 21, 23

### Completion Evidence

- 2026-09-01: Removed the Edit interval dialog's edit-specific
  `TIME_INTERVAL_OVERLAP` guidance while preserving invalid-range, missing-target,
  open-target, generic retry, entered-value, pending, cancellation, and focus
  behavior. The shared public error contract remains unchanged for manual entry.
- Added direct dialog coverage showing valid overlapping values follow the normal
  save, authoritative-refresh, and close path without a warning or confirmation;
  an unexpected stale overlap result now receives generic edit failure guidance.
- Added Daily History coverage with a second conflicting persisted interval to
  verify the update payload, authoritative refresh, dialog closure, absence of an
  overlap alert, and focus restoration. Added IPC synchronization coverage for a
  successful overlapping update and retained preload validation coverage.
- Manual-entry renderer regression coverage confirms its overlap-specific message
  remains. Focused boundary/renderer verification passed (5 files, 88 tests), as
  did `npm run typecheck`, `npm run lint`, `git diff --check`, and the full
  `npm test` suite (88 files, 734 tests). The tightened conflicting-history fixture
  also passed its focused 26-test file and a final typecheck.

---

## TASK-020-004 — Verify Persistence, Projections, and Restart

### Status

Pending

### Outcome

Overlapping intervals persist through restart, contribute additively to
authoritative projections, and do not weaken manual-entry or single-open-timer
invariants.

### Dependencies

- TASK-020-003 — Reconcile Edit Boundary and Renderer Behavior.

### Included

- Add or adjust projection coverage for additive overlapping duration.
- Verify history and analytics return all concurrent records correctly.
- Verify restart reconstruction with persisted overlaps and a running timer.
- Verify manual creation still rejects conflicts after edit-created overlaps
  exist.
- Verify bounded query and refresh behavior does not regress.

### Excluded

- Union or deduplication analytics.
- New database indexes without demonstrated need.
- Packaged final acceptance, which belongs to TASK-020-005.

### Deliverables

- Integration and projection regression tests.
- Persistence/restart evidence using disposable data.

### Verification

- Run focused history, analytics, timer reconstruction, and manual-entry tests.
- Run relevant disposable-SQLite integration tests.

### Traceability

- Acceptance criteria: AC-020-004, AC-020-007, AC-020-009
- Specification sections: 7, 8, 14, 16, 17, 18, 22

### Completion Evidence

Record projection totals, restart scenario, regression commands, and results.

---

## TASK-020-005 — Run Final Acceptance and Reconcile Documentation

### Status

Pending

### Outcome

Every SPEC-020 acceptance criterion is evidenced, the packaged application
supports overlapping edits without timer regression, and all current
documentation accurately describes the scoped rule.

### Dependencies

- TASK-020-004 — Verify Persistence, Projections, and Restart.

### Included

- Audit AC-020-001 through AC-020-009.
- Run complete repository validation.
- Package and smoke-test with a disposable profile.
- Verify overlapping edit, additive history, overlap with a running timer,
  restart persistence, and manual-create rejection.
- Reconcile specification, tasks, progress, decision, and affected normative
  documentation.
- Inspect the final scoped diff.

### Excluded

- Release publication or installer acceptance.
- Any unrelated interval-management or roadmap feature.

### Deliverables

- Complete automated and packaged acceptance evidence.
- Reconciled documentation and progress record.
- Final specification verification record.

### Verification

- Run `npm run format:check`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm test`.
- Run `npm run package`.
- Run the disposable-profile packaged smoke workflow.
- Run `git diff --check` and inspect the scoped diff.

### Traceability

- Acceptance criteria: AC-020-001 through AC-020-009
- Specification sections: all

### Completion Evidence

Record full commands, test counts, packaged environment and profile isolation,
acceptance results, documentation changes, and any deviations.

---

# Final Specification Verification

After all implementation tasks are complete:

- verify AC-020-001 through AC-020-009 directly;
- verify manual creation still rejects closed and elapsed-open overlap;
- verify only one open interval can exist;
- verify overlapping closed intervals contribute additively to history, Task
  totals, and analytics;
- verify update overlap no longer queries or returns an edit-specific conflict;
- verify missing, open-target, invalid-range, and unexpected failures remain safe;
- verify restart persistence and packaged behavior with disposable data;
- run all validation required by SPEC-020 and the project Definition of Done;
- reconcile current normative documentation and `docs/progress.md`;
- verify the final diff contains no unrelated behavior;
- change the specification status to `Verified` only after all evidence passes.
