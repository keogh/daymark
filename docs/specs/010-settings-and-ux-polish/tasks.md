# SPEC-010 — Task Breakdown

## Source

- Specification: `docs/specs/010-settings-and-ux-polish/spec.md`
- Specification status: Ready for Implementation
- Last reviewed against specification: 2026-08-21

The specification is the source of truth for behavior. This file only decomposes
that behavior into implementation work. If the two conflict, update this breakdown
to match the specification.

SPEC-009 must be Verified before implementation of any task below begins. That
external prerequisite does not change the internal dependency order in this file.

---

# Execution Rules

- Complete tasks in dependency order.
- Keep only one task `In Progress` unless parallel work is explicitly coordinated.
- Before implementation, copy the active task's immediate steps into
  `docs/plan.md`.
- Record verification evidence before marking a task `Complete`.
- Do not use task completion as a substitute for specification acceptance or the
  project Definition of Done.
- Do not begin implementation while SPEC-009 is not Verified.
- Treat the UX audit as bounded defect discovery, not authorization for redesign.

---

# Task Index

| ID | Task | Status | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- |
| TASK-010-001 | Add Settings Persistence and Contracts | Pending | None | AC-010-001–003, AC-010-008, AC-010-016–017 |
| TASK-010-002 | Implement the Settings Service and Narrow Boundary | Complete | TASK-010-001 | AC-010-002–003, AC-010-005, AC-010-008–009, AC-010-016–017 |
| TASK-010-003 | Integrate Persisted Week Start with Analytics | Pending | TASK-010-002 | AC-010-004, AC-010-017 |
| TASK-010-004 | Add Settings Navigation, Controller, and Preference UI | Pending | TASK-010-002, TASK-010-003 | AC-010-002–011, AC-010-016–017 |
| TASK-010-005 | Implement Complete Light, Dark, and System Appearance | Pending | TASK-010-004 | AC-010-005–009, AC-010-012, AC-010-017 |
| TASK-010-006 | Complete the Bounded Whole-App UX Audit | Pending | TASK-010-004, TASK-010-005 | AC-010-010–015, AC-010-017 |
| TASK-010-007 | Add and Package the Application Icon | Pending | TASK-010-005 | AC-010-018 |
| TASK-010-008 | Verify Packaged Settings and Reconcile Documentation | Pending | TASK-010-001–007 | AC-010-001–019 |

---

# Tasks

## TASK-010-001 — Add Settings Persistence and Contracts

### Status

Complete

### Outcome

The database and shared type system contain one constrained authoritative settings
record with safe Monday/System defaults and exact mutation contracts, while all
existing user data remains unchanged.

### Dependencies

None within SPEC-010. SPEC-009 must already be Verified under the specification
prerequisite.

### Included

- Add `WeekStartsOn`, `ThemePreference`, complete settings, and exact mutation
  input contracts.
- Add controlled invalid-week-start and invalid-theme error codes.
- Add exact-shape runtime validators for both mutation inputs.
- Add the singleton settings table to the Drizzle schema.
- Generate/review a forward-only migration that creates and seeds exactly one
  Monday/System settings row.
- Preserve every existing Task, TimeInterval, and AppState value.
- Add database constraints for singleton ID and allowed enum values.
- Add a focused settings repository with read, set-week-start, and set-theme
  operations that update only the target field.
- Add contract, validation, migration, invariant, and disposable-repository tests.

### Excluded

- SettingsService behavior and injected Clock no-op semantics.
- IPC/preload wiring.
- Analytics changes.
- renderer navigation, settings UI, or themes.

### Deliverables

- Shared settings contracts, validators, and controlled errors.
- Drizzle schema and reviewed migration artifacts.
- Settings repository.
- Focused shared, migration, invariant, and repository tests under mirrored
  `test/` paths.

### Verification

- Run focused settings contract/validation tests.
- Run migration and settings repository tests against disposable SQLite.
- Run database invariant and lifecycle regression tests.
- Run `npm run typecheck` and lint/format checks for touched files.

### Traceability

- Acceptance criteria: AC-010-001 through AC-010-003, AC-010-008,
  AC-010-016 through AC-010-017.
- Specification sections: 7–9, 13, 25, 27–28, 32.

### Completion Evidence

- Added shared preference contracts, distinct controlled validation codes, and
  exact-own-shape validators that reject malformed, extra, inherited, and
  unsupported values.
- Added Drizzle migration `0002_mute_tarot`, advancing the prior two-migration
  schema to a constrained `application_settings` singleton seeded exactly once as
  Monday/System with deterministic `updated_at = 0`.
- Disposable migration coverage preserved byte-for-value query results for an
  existing Task, TimeInterval, and paused AppState while adding exactly one
  settings row. Direct singleton-ID, week-start, and theme constraint violations
  were rejected.
- Added a dedicated repository whose reads surface missing/invalid singleton
  invariants and whose updates change only the requested preference and timestamp;
  sequential update tests preserve the other preference.
- Verification passed on 2026-08-22: focused settings/database/shared suite (269
  tests in 28 files), full regression suite (627 tests in 77 files),
  `npm run typecheck`, `npm run lint`, `npm run format:check`, and
  `git diff --check`.

---

## TASK-010-002 — Implement the Settings Service and Narrow Boundary

### Status

Complete

### Outcome

The main process exposes authoritative settings reads and individually validated,
Clock-stamped, atomic preference updates through three narrow preload methods with
safe controlled failures.

### Dependencies

- TASK-010-001 — Add Settings Persistence and Contracts.

### Included

- Implement SettingsService with an injected Clock.
- Return the singleton without mutation for `get`.
- Implement field-isolated set operations.
- Make already-confirmed selection a successful no-op without write or timestamp
  advancement.
- Surface missing singleton and repository failures safely.
- Compose the repository/service into main-process startup.
- Add exact settings IPC channels and thin handlers.
- Validate before service execution.
- Register/dispose handlers through established lifecycle composition.
- Expose only the three typed settings methods through preload.
- Add service, disposable-SQLite integration, IPC, preload, lifecycle, and safe
  error tests.

### Excluded

- Analytics week-start projection changes.
- renderer Settings UI or theme behavior.
- generic preference APIs or Electron native-theme exposure.

### Deliverables

- SettingsService and main-process composition.
- Thin settings IPC module with lifecycle cleanup.
- Typed preload Settings API.
- Focused unit, integration, boundary, and security tests.

### Verification

- Run focused SettingsService unit/integration tests with FakeClock and disposable
  SQLite.
- Run settings validation, IPC, preload, and lifecycle tests.
- Run existing boundary/security regression tests.
- Run `npm run typecheck` and lint/format checks for touched files.

### Traceability

- Acceptance criteria: AC-010-002 through AC-010-003, AC-010-005,
  AC-010-008 through AC-010-009, AC-010-016 through AC-010-017.
- Specification sections: 9–10, 12–14, 25, 27, 29–30, 32–33.

### Completion Evidence

- Added an injected-Clock `SettingsService` whose authoritative reads do not
  mutate, whose changed updates write only one requested field with one Clock
  timestamp, and whose same-value updates neither call the Clock nor execute a
  repository update. Missing-singleton and injected SQLite trigger failures return
  safe `INTERNAL_ERROR` results; disposable integration tests confirm no
  replacement row or partial preference update is produced.
- Added exactly `settings:get`, `settings:set-week-start`, and
  `settings:set-theme` handlers. Exact validators reject malformed, extra,
  unsupported, and inherited inputs before service execution; expected failures
  stay controlled, unexpected exceptions are logged locally and sanitized, and
  application shutdown removes exactly those three handlers once.
- Composed the repository/service/handlers through the established main-process
  startup lifecycle and exposed only `settings.get`, `settings.setWeekStartsOn`,
  and `settings.setTheme` through the typed preload API. Existing renderer API
  mocks were extended without adding raw Electron or generic persistence access.
- Verification passed on 2026-08-22: focused service, disposable-SQLite, IPC,
  preload, renderer-contract, startup, and shutdown suite (82 tests in 8 files),
  full regression suite (662 tests in 80 files), `npm run typecheck`,
  `npm run lint`, `npm run format:check`, and `git diff --check`.

---

## TASK-010-003 — Integrate Persisted Week Start with Analytics

### Status

Complete

### Outcome

Every authoritative Analytics summary derives its current-week boundary from the
persisted Monday/Sunday preference while all other Analytics, History, interval,
Task, and Timer semantics remain unchanged.

### Dependencies

- TASK-010-002 — Implement the Settings Service and Narrow Boundary.

### Included

- Generalize the existing current-week calendar helper for Monday/Sunday input.
- Read authoritative week start in main-process Analytics composition for every
  summary request.
- Keep renderer Analytics input free of authoritative calendar boundaries.
- Preserve one Clock snapshot and DST-safe local-calendar operations.
- Preserve selected-range, current-month, ranking, and open-interval semantics.
- Invalidate stale Analytics presentation after a successful week-start change.
- Ensure navigation back to Analytics does not present the old week as current.
- Add projection, service, integration, renderer-invalidation, and regression
  tests.

### Excluded

- custom week starts or locale-derived automatic week start.
- persisted weekly totals.
- changes to Daily History day grouping.
- Settings layout beyond minimal integration support.

### Deliverables

- Monday/Sunday Analytics week projection.
- Settings-aware Analytics service composition.
- Authoritative invalidation path after preference success.
- Focused DST, boundary, integration, and renderer-state tests.

### Verification

- Run focused Analytics calendar/projection tests for Monday, Sunday, DST, and
  local-midnight edges.
- Run Analytics service/repository/integration tests.
- Run History and Timer regression tests.
- Run `npm run typecheck` and lint/format checks for touched files.

### Traceability

- Acceptance criteria: AC-010-004, AC-010-017.
- Specification sections: 6, 11, 17, 25, 27, 29, 33.

### Completion Evidence

- Generalized the current-week helper for persisted Monday/Sunday selection using
  local-calendar midnight construction. Focused coverage includes exact selected
  start-day midnight and a Sunday-based spring-DST week whose elapsed length is
  167 hours rather than a fixed seven times 24 hours.
- AnalyticsService now reads the authoritative settings singleton during every
  summary request, uses the same selected week boundary for the repository union
  and summary projection, and preserves its single Clock snapshot. The renderer
  supplies only the selected 7-day/30-day range.
- Disposable-SQLite integration data produced a one-hour Monday current-week
  total and a three-hour Sunday current-week total from the same intervals.
  Selected days, total, average, current month, task ranking, and running-task
  projection remained byte-for-value equal across the setting change.
- Added an Analytics invalidation revision seam that removes a loaded stale
  summary before requesting its authoritative replacement. The visible week label
  is derived from the returned local week boundary, so it reflects Monday or
  Sunday without renderer authority over the calculation.
- Verification passed on 2026-08-22: focused Analytics suite (26 tests in 4
  files), broader service/Analytics renderer regressions (182 tests in 22 files),
  full regression suite (666 tests in 80 files), `npm run typecheck`, `npm run
  lint`, `npm run format:check`, and `git diff --check`.

---

## TASK-010-004 — Add Settings Navigation, Controller, and Preference UI

### Status

Pending

### Outcome

The renderer offers an accessible third Settings destination whose authoritative
preferences load, apply one at a time without Save, persist, retry, and roll back
predictably without interrupting Timer behavior.

### Dependencies

- TASK-010-002 — Implement the Settings Service and Narrow Boundary.
- TASK-010-003 — Integrate Persisted Week Start with Analytics.

### Included

- Extend top-level navigation to Timer, Analytics, and Settings.
- Preserve Timer as the fresh renderer default and keep Timer controller/event
  behavior alive at shell level.
- Add an application-level settings controller with loading, ready, pending, and
  controlled-error states.
- Serialize all setting mutations and protect against stale results.
- Add load Retry and System in-memory fallback without writing guessed defaults.
- Render semantic Settings heading and labeled preference groups.
- Explain System and automatic application in visible text.
- Implement immediate no-Save week-start and appearance selection behavior.
- Apply requested appearance optimistically and restore confirmed appearance on
  persistence failure.
- Keep navigation usable during pending/error states.
- Add semantic, keyboard, focus, pending, error, retry, rollback, no-Save, and
  Timer-preservation renderer tests.

### Excluded

- complete Dark semantic-token palette and whole-app theme repair, owned by
  TASK-010-005.
- whole-app audit repairs beyond navigation/Settings, owned by TASK-010-006.
- router, persisted destination, or Settings tray menu.

### Deliverables

- Three-destination application shell.
- Settings controller/hook and Settings view.
- Immediate serialized preference interactions with safe rollback.
- Focused application-shell and Settings renderer tests.

### Verification

- Run focused App/navigation/Settings controller and component tests.
- Run Timer controller, Analytics navigation, and external timer-event regressions.
- Assert settings actions cause no Timer command.
- Run `npm run typecheck` and lint/format checks for touched files.

### Traceability

- Acceptance criteria: AC-010-002 through AC-010-011, AC-010-016 through
  AC-010-017.
- Specification sections: 14–17, 19, 25, 31, 34.

### Completion Evidence

Record commands, test counts, keyboard/semantic evidence, serialization behavior,
load fallback, rollback, and no-Timer-mutation evidence when complete.

---

## TASK-010-005 — Implement Complete Light, Dark, and System Appearance

### Status

Pending

### Outcome

Every implemented renderer surface uses a coherent semantic Light/Dark palette,
System follows operating-system appearance live without persistence activity, and
startup resolves appearance before revealing primary content.

### Dependencies

- TASK-010-004 — Add Settings Navigation, Controller, and Preference UI.

### Included

- Define or minimally extend complete Light and Dark semantic tokens.
- Map System to the current `prefers-color-scheme` result.
- React live to system appearance changes with bounded listener lifecycle.
- Ensure explicit Light/Dark ignores system changes.
- Set coherent `color-scheme` metadata.
- Resolve settings/theme during renderer bootstrap before primary content is
  revealed.
- Provide system-aware pre-resolution and fallback surfaces.
- Audit and replace demonstrated raw light-only presentation colors across Timer,
  History, Analytics, Settings, dialogs, menus, chart, and shared primitives.
- Verify focus, error, warning, destructive, selected, disabled, stale, chart,
  muted, border, and overlay presentation in both appearances.
- Add theme resolver/controller tests and representative semantic rendering tests.
- Assert system appearance changes call neither settings API nor Timer APIs.

### Excluded

- custom themes or accent selection.
- forcing native tray/menu/window chrome appearance.
- visual redesign or wholesale component rewrite.
- application icon work, owned by TASK-010-007.

### Deliverables

- Complete semantic Light/Dark token definitions.
- System appearance resolver/listener with cleanup.
- Theme-aware renderer bootstrap and fallback.
- Targeted component/style repairs and tests.

### Verification

- Run focused theme resolver/controller tests with simulated media changes.
- Run representative renderer tests in Light, Dark, and both System outcomes.
- Assert system changes cause zero settings IPC/database writes.
- Inspect all implemented views/overlays visually in Light and Dark at normal and
  minimum window sizes.
- Run `npm run typecheck` and lint/format checks for touched files.

### Traceability

- Acceptance criteria: AC-010-005 through AC-010-009, AC-010-012,
  AC-010-017.
- Specification sections: 17–20, 25, 27, 31, 33–34.

### Completion Evidence

Record commands, test counts, system-listener cleanup/no-write evidence, bootstrap
behavior, visual surface checklist, and targeted token changes when complete.

---

## TASK-010-006 — Complete the Bounded Whole-App UX Audit

### Status

Pending

### Outcome

Every implemented destination and overlay has documented evidence for keyboard,
focus, semantics, states, durations, reduced motion, and minimum-window behavior,
with targeted defects corrected without changing product behavior or visual
direction.

### Dependencies

- TASK-010-004 — Add Settings Navigation, Controller, and Preference UI.
- TASK-010-005 — Implement Complete Light, Dark, and System Appearance.

### Included

- Create the concise audit checklist required by specification §21.
- Review Timer, History, Analytics, Settings, navigation, task suggestions, menus,
  and every implemented dialog/overlay.
- Verify keyboard reachability/activation and Escape ownership.
- Verify dialog containment, initial focus, and restoration.
- Verify semantic headings, names, roles, labels, groups, and current-page state.
- Verify text/non-color status and restrained live announcements.
- Verify documented loading, empty, pending, stale, exhausted, and retry states.
- Consolidate accidental duration-format inconsistencies through established
  shared formatters.
- Verify unbounded hours, long descriptions, reduced motion, and configured
  minimum window dimensions.
- Repair only demonstrated gaps and add focused regression tests.
- Record reviewed concerns that required no code change.

### Excluded

- subjective redesign, rebranding, or information-architecture changes.
- new product states or workflows.
- new framework/router/state manager.
- future shortcuts, startup, export, backup, or notification behavior.

### Deliverables

- Completed whole-app UX audit checklist/evidence.
- Targeted renderer/shared fixes only where demonstrated.
- Focused keyboard, focus, semantics, state, duration, reduced-motion, long-content,
  and minimum-window regression tests.

### Verification

- Run focused tests for every repaired defect.
- Run the complete renderer test suite.
- Perform keyboard-only walkthroughs of all primary workflows and overlays.
- Inspect normal and constrained layouts with long/empty/error representative data.
- Run `npm run typecheck`, lint, and format checks.

### Traceability

- Acceptance criteria: AC-010-010 through AC-010-015, AC-010-017.
- Specification sections: 15–16, 20–23, 25, 31, 34.

### Completion Evidence

Record the checklist, commands, test counts, manual keyboard/focus observations,
window dimensions, defects found/fixed, and explicitly reviewed no-change surfaces
when complete.

---

## TASK-010-007 — Add and Package the Application Icon

### Status

Pending

### Outcome

The application has a source-owned, locally packaged, recognizable master icon
configured and verified for the primary-platform artifact without expanding into
cross-platform installer work or rebranding.

### Dependencies

- TASK-010-005 — Implement Complete Light, Dark, and System Appearance.

### Included

- Create or adopt one source-owned application icon master meeting specification
  §24.
- Keep icon assets local and free of runtime requests.
- Produce only the current Electron Forge/primary-platform format needed by this
  specification.
- Configure the existing packaging path to use the icon.
- Verify ordinary small/large launcher legibility and packaged artifact presence.
- Preserve reusable source material for SPEC-011 platform conversions.

### Excluded

- broad brand identity, typography, logo variants, or UI redesign.
- Windows/Linux installers or fresh-machine validation.
- signing, notarization, publishing, or release automation.
- replacement of the distinct native tray asset unless a proven compatibility
  defect requires a documented scope update.

### Deliverables

- Source-owned icon master and required derived primary-platform asset.
- Focused Electron Forge configuration update.
- Packaged icon verification evidence.

### Verification

- Run the relevant package/configuration checks.
- Run `npm run package` on the primary platform.
- Inspect the packaged artifact and ordinary launcher presentation.
- Confirm no runtime network dependency and no tray regression.

### Traceability

- Acceptance criteria: AC-010-018.
- Specification sections: 4–5, 24, 32, 35.

### Completion Evidence

Record asset sources/ownership, generation or conversion method, commands,
artifact path, inspected sizes/surfaces, and tray non-regression when complete.

---

## TASK-010-008 — Verify Packaged Settings and Reconcile Documentation

### Status

Pending

### Outcome

SPEC-010 is evidenced end to end in an isolated packaged application, the bounded
UX audit and all project checks pass, and specification, task, progress,
architecture, decisions, and follow-on packaging scope accurately reflect the
completed implementation.

### Dependencies

- TASK-010-001 through TASK-010-007.

### Included

- Audit AC-010-001 through AC-010-019 against automated and manual evidence.
- Run the complete required validation suite.
- Package the primary-platform application.
- Use isolated application/user data for packaged acceptance.
- Verify new defaults, all setting changes, reload, restart, System response, and
  explicit-theme stability.
- Seed or create known Sunday/Monday boundary data and verify Analytics totals.
- Exercise settings/navigation changes while idle, running, and paused.
- Verify representative keyboard/dialog focus workflows.
- Verify Light/Dark state coverage at normal and minimum window sizes.
- Verify representative empty/error/long-duration/long-description behavior.
- Verify application icon presence.
- Verify clean renderer console and no runtime HTTP(S) resources.
- Review the completed UX audit checklist and targeted changes for scope control.
- Inspect Windows/Linux-neutral branches and record deferred SPEC-011 physical
  validation.
- Update architecture or decisions only if accepted implementation changed them.
- Update `docs/progress.md`, `docs/plan.md`, specification status, task statuses,
  and final verification evidence consistently.

### Excluded

- Windows/Linux fresh-machine release acceptance.
- installer, signing, notarization, publishing, or release automation.
- automatic startup, global shortcuts, exports, backup, custom themes, or decimal
  durations.
- unrelated refactoring or visual redesign.

### Deliverables

- Complete automated validation evidence.
- Completed bounded UX audit evidence.
- Isolated packaged macOS arm64 Settings/theme/polish acceptance evidence.
- Icon, network, console, renderer-security, persistence, and migration evidence.
- Reconciled documentation and final statuses.

### Verification

- Run focused tests first if acceptance uncovers a defect.
- Run `npm run format:check` if available.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm test`.
- Run `npm run package`.
- Run isolated packaged acceptance for specification §35.
- Inspect `git diff --check` and the final scoped diff.

### Traceability

- Acceptance criteria: AC-010-001 through AC-010-019.
- Specification sections: 4–36.

### Completion Evidence

Record exact commands, versions/platform, complete test counts, artifact and
isolated data paths, migration source/target, UX audit reference, Settings/theme
observations, Analytics boundary totals, icon/network/console results, deviations,
and documentation changes before marking this task Complete.

---

# Final Specification Verification

After all implementation tasks are complete:

- verify AC-010-001 through AC-010-019 directly;
- verify safe migration/defaults, persistence, same-value no-op, rollback, and
  field isolation;
- verify Monday/Sunday Analytics boundaries across local midnight and DST;
- verify Light, Dark, and both System outcomes without system-change writes;
- verify three-destination navigation and unchanged idle/running/paused Timer
  behavior;
- review the complete bounded UX audit and all targeted repair evidence;
- verify configured-minimum-window, long-content, duration, keyboard, focus,
  reduced-motion, and state behavior;
- verify the source-owned icon and local-only packaged renderer;
- run all validation required by specification §36 and the project Definition of
  Done;
- complete isolated packaged primary-platform verification from specification
  §35;
- update documentation and `docs/progress.md`;
- change the specification to `Verified` and this source status only when all
  required evidence is recorded;
- leave installers, signing/notarization, cross-platform fresh-machine validation,
  and release work to SPEC-011.
