# SPEC-000 — Task Breakdown

## Source

- Specification: `docs/specs/000-project-foundation/spec.md`
- Specification status: Ready for Implementation
- Last reviewed against specification: 2026-08-13

`spec.md` is the source of truth for behavior. This file only decomposes it into
implementation work and must be updated if the specification changes.

---

# Execution Rules

- Complete tasks in dependency order and keep only one task `In Progress`.
- Put only the active task's immediate steps in `docs/plan.md`.
- Run the focused verification before marking a task `Complete` and record the
  result under Completion Evidence.
- Do not implement timer behavior or any other SPEC-001 feature.
- Task completion does not replace final acceptance and Definition of Done checks.

---

# Task Index

| ID | Task | Status | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- |
| TASK-000-001 | Bootstrap project and quality tooling | Complete | None | AC-000-001, AC-000-014–016 |
| TASK-000-002 | Create the secure Electron and React shell | Complete | TASK-000-001 | AC-000-001–002 |
| TASK-000-003 | Define and migrate the foundation schema | Pending | TASK-000-001 | AC-000-007–008, AC-000-010–013 |
| TASK-000-004 | Initialize and manage the database lifecycle | Pending | TASK-000-003 | AC-000-005–006, AC-000-008–009 |
| TASK-000-005 | Add the typed health-check boundary | Pending | TASK-000-002, TASK-000-004 | AC-000-003–004 |
| TASK-000-006 | Build the foundation health screen | Pending | TASK-000-005 | AC-000-001, AC-000-004 |
| TASK-000-007 | Verify schema and database invariants | Pending | TASK-000-004 | AC-000-007–014 |
| TASK-000-008 | Verify health service and renderer states | Pending | TASK-000-005, TASK-000-006 | AC-000-003–004, AC-000-014 |
| TASK-000-009 | Integrate startup failure handling | Pending | TASK-000-004–006 | AC-000-005 |
| TASK-000-010 | Configure native-module packaging | Pending | TASK-000-002, TASK-000-004 | AC-000-006, AC-000-017 |
| TASK-000-011 | Smoke-test packaged SQLite and offline startup | Pending | TASK-000-005, TASK-000-006, TASK-000-010 | AC-000-018–019 |
| TASK-000-012 | Run final acceptance and update documentation | Pending | TASK-000-007–011 | AC-000-001–019 |

---

# Tasks

## TASK-000-001 — Bootstrap Project and Quality Tooling

### Status

Complete

### Outcome

The repository has an npm-managed, mutually compatible Electron/Forge, TypeScript,
React/Vite, SQLite/Drizzle, Vitest/RTL toolchain with the required developer scripts.

### Dependencies

None.

### Included

- Create `package.json` and `package-lock.json` using stable dependencies.
- Configure TypeScript, Vite, Electron Forge, Vitest, ESLint, and minimal formatting.
- Create the conceptual `src/main`, `src/preload`, `src/renderer`, and `src/shared`
  directory boundaries.
- Add `dev`, `typecheck`, `lint`, `test`, and `package` scripts.

### Excluded

- Working application behavior, database schema, IPC operations, and timer logic.

### Deliverables

- npm manifests, tool configuration, scripts, and bounded source directory skeleton.

### Verification

- Run `npm install`, `npm run typecheck`, `npm run lint`, and `npm test` against the
  initial skeleton.

### Traceability

- Acceptance criteria: AC-000-001, AC-000-014, AC-000-015, AC-000-016
- Specification sections: 7–10, 39, 49–55, 65

### Completion Evidence

- 2026-08-13: Installed the npm dependency graph and generated
  `package-lock.json` with npm 11.9.0 on Node.js 24.14.0.
- 2026-08-13: `npm run format:check`, `npm run typecheck`, `npm run lint`, and
  `npm test` passed. The empty bootstrap suite exits successfully by design; Node
  and jsdom renderer test projects are configured for subsequent tasks.
- 2026-08-13: `npm ls --depth=0` reported a valid top-level dependency graph, and
  `npm audit --omit=dev` reported zero production dependency vulnerabilities.

---

## TASK-000-002 — Create the Secure Electron and React Shell

### Status

Complete

### Outcome

`npm run dev` launches Electron, opens a BrowserWindow, and renders React with the
required renderer isolation settings.

### Dependencies

TASK-000-001.

### Included

- Add main, preload, and renderer entry points and lifecycle/window modules.
- Support development and production renderer loading.
- Enable `contextIsolation`, disable `nodeIntegration`, and enable sandboxing.
- Add a focused configuration test that protects the security settings.

### Excluded

- Database initialization, health-check IPC, product UI, and timer behavior.

### Deliverables

- Launchable application shell and secure BrowserWindow configuration.

### Verification

- Run focused window configuration tests and manually confirm the React shell opens
  with `npm run dev`.

### Traceability

- Acceptance criteria: AC-000-001, AC-000-002
- Specification sections: 10–13, 36, 62, 64

### Completion Evidence

- 2026-08-13: Added Electron main/preload entries, cross-platform application
  lifecycle handling, development/production renderer loading, and a minimal React
  shell.
- 2026-08-13: A focused window-options test verifies `contextIsolation: true`,
  `nodeIntegration: false`, and `sandbox: true`; a renderer test verifies the React
  foundation shell renders.
- 2026-08-13: `npm run dev` rebuilt the native dependency, launched the Vite
  renderer target, built `main.js` and `preload.js`, and launched Electron without a
  startup error. Automated desktop screen capture was unavailable because the
  execution environment could not capture the macOS display.
- 2026-08-13: `npm run typecheck`, `npm run lint`, `npm test`,
  `npm run format:check`, and `git diff --check` passed (2 test files, 2 tests).
- 2026-08-13: Corrected an Electron startup regression caused by CommonJS main and
  preload bundles using `.js` extensions inside an ESM package. Both bundles now
  use explicit `.cjs` extensions; `npm run dev` launched Electron without the
  previous `require is not defined in ES module scope` failure. Baseline validation
  passed after the correction.

---

## TASK-000-003 — Define and Migrate the Foundation Schema

### Status

Pending

### Outcome

One initial Drizzle migration creates `tasks`, `time_intervals`, and `app_state` with
all specified keys, indexes, checks, references, and global uniqueness invariants.

### Dependencies

TASK-000-001.

### Included

- Define the Drizzle schema and generated/maintained migration artifacts.
- Enforce interval timestamp validity, foreign keys, cascade/set-null behavior, the
  single open interval, AppState status values, and singleton ID.
- Keep production schema creation in migrations rather than ad-hoc startup SQL.

### Excluded

- Repositories, timer transitions, and application startup orchestration.

### Deliverables

- Schema definitions, indexes/constraints, and initial migration files.

### Verification

- Apply all migrations to an empty disposable SQLite database and inspect the
  resulting tables, indexes, foreign keys, and checks.

### Traceability

- Acceptance criteria: AC-000-007, AC-000-008, AC-000-010, AC-000-011,
  AC-000-012, AC-000-013
- Specification sections: 22–29

### Completion Evidence

Pending.

---

## TASK-000-004 — Initialize and Manage the Database Lifecycle

### Status

Pending

### Outcome

The main process can open one SQLite connection at an injected path, enable foreign
keys, run pending migrations, idempotently seed AppState, report readiness, and close
cleanly.

### Dependencies

TASK-000-003.

### Included

- Implement a central database context and migration/bootstrap operation.
- Resolve the production path through Electron's per-user application data directory.
- Initialize the database before normal IPC/window readiness and close it on shutdown.
- Keep path resolution and connection objects out of the renderer.

### Excluded

- General repositories and timer application services.

### Deliverables

- Database initialization, path resolution, readiness, and lifecycle modules.

### Verification

- Initialize the same disposable database twice and verify one AppState row and
  preserved data; test that foreign keys are enabled.

### Traceability

- Acceptance criteria: AC-000-005, AC-000-006, AC-000-008, AC-000-009
- Specification sections: 19–21, 27, 30–32, 40, 57, 60–62

### Completion Evidence

Pending.

---

## TASK-000-005 — Add the Typed Health-Check Boundary

### Status

Pending

### Outcome

The renderer can call a fully typed `window.timeTracker.system.healthCheck()` that
travels through contextBridge and an explicit IPC handler to database readiness.

### Dependencies

TASK-000-002 and TASK-000-004.

### Included

- Define one shared health contract and the global Window declaration.
- Implement the health application operation and thin main IPC handler.
- Expose only the explicit health method from preload.
- Return renderer-safe success/failure information without paths or stack traces.

### Excluded

- Generic IPC methods, raw `ipcRenderer`, database objects, and timer APIs.

### Deliverables

- Shared contract, health operation, IPC registration, preload API, and typings.

### Verification

- Run a focused integration test from initialized database health operation through
  the IPC/preload contract seam.

### Traceability

- Acceptance criteria: AC-000-003, AC-000-004
- Specification sections: 14–17, 31, 35, 47, 64

### Completion Evidence

Pending.

---

## TASK-000-006 — Build the Foundation Health Screen

### Status

Pending

### Outcome

The minimal React screen shows loading, ready/database-connected, and initialization
failure states using only the typed preload API.

### Dependencies

TASK-000-005.

### Included

- Add the root component and local hook/state needed for the health check.
- Add minimal styling and accessible status text.
- Ensure renderer code has no Node, Electron, SQLite, or raw IPC imports.

### Excluded

- Timer UI, state libraries, design systems, and later product features.

### Deliverables

- Foundation screen and minimal presentation styles.

### Verification

- Run the renderer locally and exercise loading, successful, and failed health states
  with a mocked boundary where needed.

### Traceability

- Acceptance criteria: AC-000-001, AC-000-004
- Specification sections: 18, 36–38, 48

### Completion Evidence

Pending.

---

## TASK-000-007 — Verify Schema and Database Invariants

### Status

Pending

### Outcome

Disposable-database tests prove the migration, initial state, idempotency, references,
cascade, timestamp, single-open-interval, and AppState singleton behavior.

### Dependencies

TASK-000-004.

### Included

- Create isolated temporary database test helpers.
- Implement every database and migration test required by SPEC-000.
- Ensure tests cannot resolve or modify the user's application database.

### Excluded

- TimerService and renderer behavior.

### Deliverables

- Migration/database integration test suite and disposable database fixtures.

### Verification

- Run the focused database suite and confirm all required invalid inserts fail at the
  database level.

### Traceability

- Acceptance criteria: AC-000-007 through AC-000-014
- Specification sections: 40–46, 67

### Completion Evidence

Pending.

---

## TASK-000-008 — Verify Health Service and Renderer States

### Status

Pending

### Outcome

Automated tests prove database-backed health success plus renderer loading, ready,
and failure states without launching a real BrowserWindow.

### Dependencies

TASK-000-005 and TASK-000-006.

### Included

- Add a health operation integration test with an initialized disposable database.
- Add React Testing Library tests with a mocked typed preload API.
- Protect the shared contract from untyped duplication at process boundaries.

### Excluded

- Full Electron end-to-end automation and timer UI tests.

### Deliverables

- Health integration and renderer component tests.

### Verification

- Run the focused health and renderer test suites.

### Traceability

- Acceptance criteria: AC-000-003, AC-000-004, AC-000-014
- Specification sections: 39, 47–48, 67

### Completion Evidence

Pending.

---

## TASK-000-009 — Integrate Startup Failure Handling

### Status

Pending

### Outcome

A database or migration initialization failure prevents normal readiness, is logged
locally, and produces a minimal safe failure experience where possible.

### Dependencies

TASK-000-004, TASK-000-005, and TASK-000-006.

### Included

- Wire startup order so migrations complete before services, IPC, and normal window
  readiness.
- Add minimal main-process technical logging without user-created content.
- Cover the initialization failure path with focused tests or a deterministic manual
  fixture.

### Excluded

- Third-party logging frameworks, recovery workflows, and telemetry.

### Deliverables

- Startup orchestration and failure handling/logging.

### Verification

- Force a controlled migration/database failure and confirm the ready UI is not
  exposed and the technical cause is locally diagnosable.

### Traceability

- Acceptance criteria: AC-000-005
- Specification sections: 11, 20, 30, 58–59

### Completion Evidence

Pending.

---

## TASK-000-010 — Configure Native-Module Packaging

### Status

Pending

### Outcome

Electron Forge produces an unpacked application for the development platform with a
better-sqlite3 binary compatible with the packaged Electron runtime.

### Dependencies

TASK-000-002 and TASK-000-004.

### Included

- Configure Forge packaging and native dependency rebuild/unpacking as required.
- Ensure runtime code writes only to the per-user application data directory.
- Keep configuration portable across macOS, Windows, and Linux.

### Excluded

- Installers, signing, notarization, CI release matrices, and other-platform artifacts.

### Deliverables

- Packaging configuration and a successful current-platform package output.

### Verification

- Run `npm run package` and inspect the package for the required application and
  native module artifacts.

### Traceability

- Acceptance criteria: AC-000-006, AC-000-017
- Specification sections: 55–57, 62–63

### Completion Evidence

Pending.

---

## TASK-000-011 — Smoke-Test Packaged SQLite and Offline Startup

### Status

Pending

### Outcome

The packaged application launches, initializes its writable SQLite database, and
returns a successful health check without network access.

### Dependencies

TASK-000-005, TASK-000-006, and TASK-000-010.

### Included

- Launch the current-platform packaged application.
- Confirm migration, AppState initialization, ready screen, and health check.
- Verify normal packaged startup has no runtime network dependency.

### Excluded

- Cross-platform release verification and installer testing.

### Deliverables

- Recorded packaged smoke-test and offline-startup evidence.

### Verification

- Execute the manual checks from specification section 68 against the package, with
  network access unavailable for the offline check.

### Traceability

- Acceptance criteria: AC-000-018, AC-000-019
- Specification sections: 56–57, 61, 68

### Completion Evidence

Pending.

---

## TASK-000-012 — Run Final Acceptance and Update Documentation

### Status

Pending

### Outcome

Every SPEC-000 acceptance criterion and Definition of Done item has recorded evidence,
all required validation passes, and project documentation reflects the verified
foundation.

### Dependencies

TASK-000-007, TASK-000-008, TASK-000-009, TASK-000-010, and TASK-000-011.

### Included

- Run typecheck, lint, the full test suite, packaging, and required manual checks.
- Review all acceptance criteria and architecture boundaries explicitly.
- Update architecture/decisions only if implementation changed them.
- Update `docs/progress.md` and specification/task statuses when their conditions hold.

### Excluded

- Any SPEC-001 implementation.

### Deliverables

- Final validation evidence and accurate documentation/status updates.

### Verification

- Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run package`; repeat
  the development and packaged manual verification from the specification.

### Traceability

- Acceptance criteria: AC-000-001 through AC-000-019
- Specification sections: 66–72 and `docs/sdd/definition-of-done.md`

### Completion Evidence

Pending.

---

# Final Specification Verification

TASK-000-012 owns the final cross-task verification. SPEC-000 may move to `Verified`
only after all tasks are complete and every required automated and manual check passes.
