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

# 5. Step 4 — Create an Implementation Plan

For non-trivial specifications, create or update:

    docs/plan.md

The plan should contain implementation steps, not restate the entire specification.

Example:

    1. Add database schema.
    2. Add repositories.
    3. Implement TimerService.
    4. Add preload contracts.
    5. Add renderer timer UI.
    6. Add tests.
    7. Verify acceptance criteria.

Keep steps small enough that progress can be validated incrementally.

---

# 6. Step 5 — Implement Vertically

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

# 7. Step 6 — Test Continuously

Run focused tests while implementing.

Examples:

    npm test -- timer
    npm test -- database

The exact commands may evolve with project configuration.

Fix failures before expanding the implementation.

---

# 8. Step 7 — Verify Acceptance Criteria

At implementation completion, evaluate every acceptance criterion in the specification.

Do not infer that passing unit tests automatically means all acceptance criteria are satisfied.

Where possible, acceptance criteria should correspond to automated tests.

---

# 9. Step 8 — Run Project Validation

Run all checks required by the specification and project Definition of Done.

Expected baseline:

    npm run typecheck
    npm run lint
    npm test

When relevant:

    npm run package

No specification should be marked complete while required validation fails.

---

# 10. Step 9 — Update Documentation

Update documentation when implementation introduces an accepted change to:

- architecture;
- data model;
- behavior;
- development workflow;
- dependencies.

Do not update documentation merely to describe low-level implementation details that are obvious from code.

---

# 11. Step 10 — Update Progress

Update:

    docs/progress.md

Record:

- completed specification;
- major implementation outcome;
- relevant decisions/deviations;
- next planned specification.

---

# 12. Specification Statuses

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

# 13. Scope Changes During Implementation

If a new requirement appears while implementing a specification:

## Small clarification

Update the current specification before implementing the behavior.

## Independent feature

Create a future specification.

Do not silently expand current scope.

---

# 14. Architectural Changes

If implementation demonstrates an architectural decision is incorrect:

1. stop before making the architectural change;
2. document the problem;
3. update `docs/decisions.md`;
4. update architecture documentation;
5. continue implementation under the new documented decision.

---

# 15. Database Changes

Every schema modification requires:

- schema update;
- migration;
- migration test when appropriate.

Do not modify production schema exclusively through ad-hoc initialization code.

---

# 16. Bug Fixes

Small implementation bugs may be fixed directly when the expected behavior is already defined.

If a bug reveals unspecified product behavior, update or create a specification.

---

# 17. Refactors

Refactors should preserve behavior.

Significant refactors should be separated from unrelated feature implementation when practical.

Tests must protect behavior during refactoring.

---

# 18. Codex Execution Pattern

A useful Codex task format is:

    Implement SPEC-XXX.

    Read AGENTS.md and the required project documentation first.

    Follow docs/sdd/workflow.md.

    Create/update docs/plan.md before implementation.

    Work only within the specification scope.

    Run the required tests and validation.

    Update docs/progress.md when finished.

This allows the specification to remain the primary implementation instruction.

---

# 19. Completion Rule

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
