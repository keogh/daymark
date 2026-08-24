# SPEC-014 — Task Breakdown

## Source

- Specification: `docs/specs/014-daymark-product-rename/spec.md`
- Specification status: Ready for Implementation
- Decision: DEC-037

Earlier rename tasks were superseded before the first clear installable release.
This task records the final Daymark-only identity contract.

## Task Index

| ID | Task | Status | Acceptance criteria |
| --- | --- | --- | --- |
| TASK-014-006 | Establish the clean first-release Daymark identity | Complete | AC-014-001 through AC-014-007 |

## TASK-014-006 — Establish the Clean First-Release Daymark Identity

### Status

Complete

### Outcome

The first installable version uses Daymark consistently for presentation,
technical identifiers, profiles, persistence, process boundaries, packaging,
workflow artifacts, tests, and current documentation.

### Included

- Revise the specification and architectural decision record.
- Apply every canonical identity from the specification.
- Remove compatibility with differently named profiles.
- Update implementation, tests, inspectors, downstream specifications, and docs.
- Verify a clean packaged macOS arm64 build.

### Excluded

- Importing, moving, or deleting earlier local data.
- Database schema changes.
- Publishing, signing, notarization, or moving the repository directory.

### Verification

- Run focused identity, path, preload, packaging, and workflow tests.
- Run `npm run format:check`, `npm run typecheck`, `npm run lint`, and `npm test`.
- Run `npm run make:macos:arm64` and `npm run inspect:macos:arm64`.
- Search tracked source and docs for earlier product-name identifiers.

### Completion Evidence

- Canonical identity is `Daymark`, `daymark`, `com.isaaczepeda.daymark`,
  `com.squirrel.daymark.daymark`, `Daymark/daymark.sqlite`, `window.daymark`, and
  `DaymarkAPI` across runtime, packaging, tests, CI, and documentation.
- Startup uses the Daymark profile directly and contains no import, copy, rename,
  or migration path for another product profile.
- Focused identity, path, preload, packaging, workflow, and Linux contract tests
  passed: 7 files and 37 tests.
- Formatting, typecheck, lint, release validation, and the full 87-file/721-test
  suite passed.
- `npm run make:macos:arm64` produced
  `out/make/Daymark-0.1.0-darwin-arm64.dmg`; structural inspection passed with
  executable `Daymark` and bundle ID `com.isaaczepeda.daymark`.
- A tracked-tree search found no earlier product identifier.
