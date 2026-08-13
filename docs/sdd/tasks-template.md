# SPEC-XXX — Task Breakdown

## Source

- Specification: `docs/specs/xxx-feature-name/spec.md`
- Specification status: Draft / Ready for Implementation / In Progress
- Last reviewed against specification: YYYY-MM-DD

The specification is the source of truth for behavior. This file only decomposes
that behavior into implementation work. If the two conflict, update this breakdown
to match the specification.

---

# Execution Rules

- Complete tasks in dependency order.
- Keep only one task `In Progress` unless parallel work is explicitly coordinated.
- Before implementation, copy the active task's immediate steps into `docs/plan.md`.
- Record verification evidence before marking a task `Complete`.
- Do not use task completion as a substitute for specification acceptance or the
  project Definition of Done.

---

# Task Index

| ID | Task | Status | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- |
| TASK-XXX-001 | Short outcome-oriented name | Pending | None | AC-XXX-001 |

---

# Tasks

## TASK-XXX-001 — Short Outcome-Oriented Name

### Status

Pending

### Outcome

State the single observable or technical result this task produces.

### Dependencies

None.

### Included

- Work required for this outcome.

### Excluded

- Nearby work intentionally left to another task or specification.

### Deliverables

- Expected code, tests, configuration, migration, or documentation artifacts.

### Verification

- Focused command or manual check that proves this task's outcome.

### Traceability

- Acceptance criteria: AC-XXX-001
- Specification sections: 1, 2

### Completion Evidence

Record commands run, results, and any relevant implementation notes when complete.

---

# Final Specification Verification

After all implementation tasks are complete:

- verify every acceptance criterion directly;
- run all validation required by the specification and Definition of Done;
- perform required manual and packaged-application checks;
- update documentation and `docs/progress.md`;
- change specification and task statuses only when their stated conditions hold.
