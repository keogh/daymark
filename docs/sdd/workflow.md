# Spec-Driven Development Workflow

## Purpose

This project uses specifications as the unit of product implementation.

A specification converts product intent into implementation-ready behavior.

The workflow is designed so that Codex can work on one bounded problem at a time.

---

# 1. Workflow Overview

The normal development cycle is:

    Product Context
          ↓
    Feature Definition
          ↓
    Specification
          ↓
    Task Breakdown
          ↓
    Implementation Plan
          ↓
    Implementation
          ↓
    Tests
          ↓
    Acceptance Verification
          ↓
    Documentation
          ↓
    Complete

---

# 2. Step 1 — Select a Specification

Work begins from a specification under:

    docs/specs/

Example:

    docs/specs/001-core-time-tracking/spec.md

The specification must have:

    Status: Ready for Implementation

Do not begin implementation from roadmap text alone.

---

# 3. Step 2 — Read Context

Before implementation, read:

    AGENTS.md
    docs/context.md
    docs/decisions.md
    docs/sdd/definition-of-done.md
    active specification

Read additional architecture/domain/product documents only as necessary.

---

# 4. Step 3 — Analyze the Specification

Before changing code:

1. identify required behavior;
2. identify affected architectural layers;
3. identify data-model changes;
4. identify migrations;
5. identify test requirements;
6. identify acceptance criteria;
7. identify dependencies on incomplete specs.

Do not start implementation if a hard prerequisite is missing.

---

# 5. Step 4 — Create a Task Breakdown

Before implementation, create or update the companion task breakdown:

    docs/specs/XXX-feature-name/tasks.md

Use:

    docs/sdd/tasks-template.md

as the starting structure.

The task breakdown translates the complete specification into an ordered list of
small, reviewable implementation tasks. It does not define product behavior and
must not contradict or expand the specification.

Every task must include:

- a stable task ID;
- one concrete outcome;
- dependencies on earlier tasks;
- included and excluded work;
- expected deliverables;
- focused verification;
- acceptance-criteria traceability.

A task is self-contained when an implementer can complete and verify it after its
listed dependencies without discovering hidden required work. Prefer one coherent
change that can be reviewed independently. Split a task when it contains multiple
outcomes that can be completed or verified separately.

The breakdown must cover every acceptance criterion and every required test in the
specification. Infrastructure or documentation work that does not map directly to
an acceptance criterion must still identify the specification section that requires
it.

Use these task statuses:

    Pending
    In Progress
    Blocked
    Complete

Only one task should normally be `In Progress`. Completing every task does not by
itself verify the specification; final acceptance and Definition of Done checks are
still required.

If `spec.md` changes materially, review and update `tasks.md` before continuing.

---

# 6. Step 5 — Create an Implementation Plan

Before starting a task, create or update:

    docs/plan.md

The plan is the short-lived execution view for the current task. It should reference
the active specification and task ID, and contain only the immediate implementation
steps and checks. Do not duplicate the complete task breakdown in `docs/plan.md`.

Example:

    Specification: SPEC-001
    Task: TASK-001-005 — Implement start transition

    1. Add the transactional service operation.
    2. Add focused service tests.
    3. Run the focused test command.

When the active task is complete, update its status and evidence in `tasks.md` before
selecting the next task.

---

# 7. Step 6 — Implement the Active Task

Implement only the selected task and work needed to satisfy its stated outcome.

Where the task is a feature slice, prefer connecting the required layers vertically.

Prefer feature slices that connect required layers.

For example:

    domain
       +
    persistence
       +
    application service
       +
    IPC
       +
    UI

Avoid building large speculative infrastructure for future features.

---

# 8. Step 7 — Test Continuously

Run focused tests while implementing.

Examples:

    npm test -- timer
    npm test -- database

The exact commands may evolve with project configuration.

Fix failures before expanding the implementation.

---

# 9. Step 8 — Verify Acceptance Criteria

At implementation completion, evaluate every acceptance criterion in the specification.

Do not infer that passing unit tests automatically means all acceptance criteria are satisfied.

Where possible, acceptance criteria should correspond to automated tests.

---

# 10. Step 9 — Run Project Validation

Run all checks required by the specification and project Definition of Done.

Expected baseline:

    npm run typecheck
    npm run lint
    npm test

When relevant:

    npm run package

No specification should be marked complete while required validation fails.

---

# 11. Step 10 — Update Documentation

Update documentation when implementation introduces an accepted change to:

- architecture;
- data model;
- behavior;
- development workflow;
- dependencies.

Do not update documentation merely to describe low-level implementation details that are obvious from code.

---

# 12. Step 11 — Update Progress

Update:

    docs/progress.md

Record:

- completed specification;
- major implementation outcome;
- relevant decisions/deviations;
- next planned specification.

---

# 13. Specification Statuses

Use:

    Draft
    Ready for Implementation
    In Progress
    Blocked
    Implemented
    Verified

Recommended lifecycle:

    Draft
      ↓
    Ready for Implementation
      ↓
    In Progress
      ↓
    Implemented
      ↓
    Verified

`Implemented` means code exists.

`Verified` means:

- acceptance criteria pass;
- Definition of Done passes.

---

# 14. Scope Changes During Implementation

If a new requirement appears while implementing a specification:

## Small clarification

Update the current specification before implementing the behavior.

## Independent feature

Create a future specification.

Do not silently expand current scope.

---

# 15. Architectural Changes

If implementation demonstrates an architectural decision is incorrect:

1. stop before making the architectural change;
2. document the problem;
3. update `docs/decisions.md`;
4. update architecture documentation;
5. continue implementation under the new documented decision.

---

# 16. Database Changes

Every schema modification requires:

- schema update;
- migration;
- migration test when appropriate.

Do not modify production schema exclusively through ad-hoc initialization code.

---

# 17. Bug Fixes

Small implementation bugs may be fixed directly when the expected behavior is already defined.

If a bug reveals unspecified product behavior, update or create a specification.

---

# 18. Refactors

Refactors should preserve behavior.

Significant refactors should be separated from unrelated feature implementation when practical.

Tests must protect behavior during refactoring.

---

# 19. Codex Execution Pattern

A useful Codex task format is:

    Implement SPEC-XXX.

    Read AGENTS.md and the required project documentation first.

    Follow docs/sdd/workflow.md.

    Read the specification's tasks.md and select the next unblocked task.

    Create/update docs/plan.md for that task before implementation.

    Work only within the specification scope.

    Run the required tests and validation.

    Update docs/progress.md when finished.

This allows the specification to remain the primary implementation instruction.

---

# 20. Completion Rule

A specification is not complete because code was generated.

It is complete when:

    behavior
      +
    tests
      +
    acceptance criteria
      +
    documentation
      +
    project validation

all agree.
