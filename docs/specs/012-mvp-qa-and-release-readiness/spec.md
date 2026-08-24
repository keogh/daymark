# SPEC-012 — MVP QA and Release Readiness

## Status

Ready for Implementation

## Milestone

M10 — MVP QA and Release

## Priority

P0

---

# 1. Objective

Establish whether one exact Daymark release candidate is ready for the owner
to publish as an unsigned personal-testing MVP prerelease by auditing all earlier
specification evidence, exercising the complete product as an integrated system,
resolving bounded release-blocking defects, and recording an explicit `GO` or
`NO-GO` decision.

The specification prepares and evaluates the release candidate. It does not
publish the GitHub Release.

---

# 2. User Story

As the application owner,

I want one traceable release-readiness record backed by automated, packaged, and
manual evidence,

so that I can decide whether to publish the MVP prerelease without relying on
assumptions, stale feature checks, or an unverified build.

---

# 3. Background

SPEC-000 through SPEC-010 define and verify the complete MVP product behavior.
SPEC-011 produces native macOS, Windows, and Linux artifacts, checksums, a draft
GitHub prerelease, and fresh-install evidence across its required platform matrix.

The roadmap's M10 milestone still requires a final whole-product QA pass. Earlier
feature acceptance proves individual specifications, while SPEC-011 proves
distribution and a bounded installed smoke workflow. Neither provides one final
ledger showing that every MVP acceptance criterion remains supported by current
evidence and that the integrated product is suitable for the owner's personal
testing release.

The owner has a macOS Apple Silicon system available for hands-on acceptance. The
owner does not have local Intel macOS, Windows, or Linux systems. SPEC-012 therefore
requires direct owner acceptance on macOS Apple Silicon and reviews the native
installation evidence already required by SPEC-011 for the remaining targets. It
must not claim that the owner personally tested unavailable environments.

DEC-035 defines the candidate as unsigned and intended for personal installation
and testing. Signing, notarization, and a general-public production claim remain
planned SPEC-013 work.

---

# 4. Scope

This specification includes:

- identifying one exact release candidate by version, tag, source commit, native
  artifacts, and SHA-256 checksums;
- confirming SPEC-000 through SPEC-011 are `Verified` before release-readiness
  execution begins;
- creating a coverage ledger for every acceptance criterion in SPEC-000 through
  SPEC-011;
- rejecting missing, stale, contradictory, or inapplicable-without-explanation
  evidence;
- running the complete automated repository validation baseline;
- exercising a deterministic integrated regression using synthetic data and an
  isolated application profile;
- verifying Timer, switching, lifecycle recovery, midnight behavior, manual data
  correction, Task management, History, Analytics, Settings, tray, appearance,
  accessibility, and offline behavior together;
- inspecting persisted state after critical mutations and recovery scenarios;
- reviewing the complete SPEC-011 cross-platform build, installation, reinstall,
  data-preservation, and applicable upgrade evidence;
- direct owner acceptance of the packaged macOS Apple Silicon candidate;
- inspecting renderer console output, main-process logs, runtime network activity,
  and application-profile isolation during acceptance;
- classifying discovered defects and deviations consistently;
- allowing narrowly scoped fixes for release-blocking defects under §18;
- rebuilding and rerunning invalidated evidence after a candidate-affecting fix;
- recording residual non-blocking observations outside existing requirements;
- producing an explicit, dated `GO` or `NO-GO` decision with reviewer identity;
- leaving publication as a separate deliberate owner action after a `GO` decision.

---

# 5. Out of Scope

This specification does not include:

- automatic or agent-initiated publication of a GitHub Release;
- treating a `GO` decision as publication;
- Apple Developer ID signing or notarization;
- Windows code signing;
- Linux repository signing;
- a general-public production-readiness claim;
- certificate procurement or release-secret configuration;
- automatic application updates or update UI;
- telemetry, crash reporting, analytics collection, or runtime networking;
- new product features or roadmap enhancements;
- export, import, backup, restore, automatic startup, global shortcuts, idle
  detection, reminders, Task archiving, projects, or tags;
- schema or persisted-data changes solely for QA convenience;
- weakening an earlier acceptance criterion or marking it not applicable to obtain
  a `GO` decision;
- repeating every earlier manual scenario when current, attributable automated or
  packaged evidence already proves the same behavior;
- claiming owner hands-on acceptance on a platform the owner did not use;
- deleting the owner's real application profile or personal data;
- downgrade support or downgrade testing.

---

# 6. Dependencies

Execution requires all of these specifications to be `Verified`:

- SPEC-000 — Project Foundation;
- SPEC-001 — Core Time Tracking;
- SPEC-002 — Daily History;
- SPEC-003 — Task Search and Reuse;
- SPEC-004 — One-Click Task Switching;
- SPEC-005 — Manual Time Entry;
- SPEC-006 — Edit and Delete Intervals;
- SPEC-007 — Task Management;
- SPEC-008 — System Tray and Window Lifecycle;
- SPEC-009 — Analytics;
- SPEC-010 — Settings and UX Polish;
- SPEC-011 — Cross-Platform Packaging and Distribution.

SPEC-012 may be designed and queued before those dependencies are complete. No
SPEC-012 implementation or release-readiness execution may begin before every
dependency is `Verified`.

---

# 7. Release Candidate Identity

One evaluation run applies to one immutable release candidate. The readiness
record must identify:

```text
product name
package.json version
exact vX.Y.Z tag
artifact source commit SHA
draft GitHub prerelease reference
every required artifact filename
every required artifact SHA-256
acceptance-evidence commit SHA
evaluation start and completion timestamps
```

The tag, package version, artifact source commit, artifact names, and checksums
must agree with SPEC-011. The acceptance-evidence commit may be later than the
artifact commit when it changes only tests, checklists, or documentation and does
not alter packaged application inputs.

A change to production source, runtime or build dependencies, migrations,
packaging configuration, packaged assets, application metadata, or native build
workflow creates a new candidate. The affected native artifacts must be rebuilt,
checksummed, and re-evaluated.

A test-only or documentation-only change does not by itself create a new binary
candidate. The readiness record must still identify the newer evidence commit and
explain why artifact validity was unaffected.

No evidence from a different candidate may be silently attributed to the current
candidate.

---

# 8. Acceptance Evidence Ledger

The repository must contain a versioned release-readiness record or template under
a clearly named `docs/` location. It must map every acceptance criterion from
SPEC-000 through SPEC-011 to at least one current evidence source.

Each ledger entry records:

- specification and acceptance-criterion ID;
- evidence type: automated, packaged, manual, inspection, or inherited SPEC-011
  platform evidence;
- exact command, test, checklist entry, or evidence reference;
- candidate or commit to which the evidence applies;
- result;
- reviewer and date when manual judgment is involved;
- rerun reason or current-validity rationale when evidence is inherited;
- linked defect or deviation, if any.

An automated test name alone is sufficient only when its asserted behavior clearly
matches the criterion. A passing suite count without criterion-level traceability
is not sufficient.

Earlier evidence may be reused when all of these are true:

1. it is attributable to a known source or artifact commit;
2. the relevant implementation, dependency, configuration, and platform behavior
   have not changed in a way that invalidates it;
3. the current full regression remains green;
4. the ledger explains why the evidence is still applicable.

If applicability is uncertain, rerun the evidence. An acceptance criterion cannot
be waived or reclassified as non-blocking.

---

# 9. Test Data and Environment Isolation

All acceptance uses synthetic Tasks and disposable data. Suggested Task names are:

```text
Task A — Planning
Task B — Implementation
Task C — Review
```

The exact descriptions may vary but must contain no personal work information.

Automated persistence checks use disposable SQLite databases. Packaged application
checks use a dedicated temporary Electron `--user-data-dir`, disposable operating
system user, VM profile, or equivalently isolated application-data location.

Before each destructive acceptance scenario, the tester must resolve and record
the exact disposable target. No scenario may point at the owner's normal Time
Tracker profile. The release-readiness record must not contain personal Task
descriptions, authentication tokens, signing material, or private machine data.

The owner macOS acceptance may use a fresh dedicated test profile or the fresh
installation profile established by SPEC-011. It must not require deleting the
owner's ordinary application data.

---

# 10. Automated Validation Baseline

The exact candidate source must pass:

```text
npm ci
npm run format:check
npm run typecheck
npm run lint
npm test
npm run package
```

If SPEC-011 adds release-contract, make, artifact, checksum, or workflow-validation
commands, every command required by SPEC-011's final Definition of Done must also
pass.

Validation runs from a clean checkout or a demonstrably clean dependency state
using the committed lockfile and required Node version. No failure may be hidden by
rerunning only a passing subset. Flaky behavior is a defect, not a passing result;
the cause must be resolved or the decision must be `NO-GO`.

The final record includes command versions, exit results, test counts, and package
output identity without exposing sensitive environment values.

---

# 11. Integrated MVP Regression

The final packaged regression is one connected workflow, not eleven unrelated
feature demonstrations. It must cover at least the following behaviors against an
isolated profile.

## 11.1 Bootstrap and Empty State

```text
launch the installed/package candidate offline
observe neutral startup loading rather than false timer data
confirm idle Timer, empty History, empty Analytics, and default Settings
confirm idle tray presentation
```

## 11.2 Timer, Reuse, and Switching

```text
start Task A by description
confirm running state and locally advancing presentation
pause and confirm elapsed time stops advancing
resume and confirm a new interval continues the same session
start or Play Task B and confirm atomic switching without confirmation
stop Task B and confirm idle state
reuse Task A from search/history without creating a duplicate Task
```

Persisted inspection must show valid intervals, one normalized Task per reused
description, correct AppState, and never more than one open interval.

## 11.3 Window and Process Recovery

```text
start Task A
close the window and confirm it hides while tracking continues
restore the same window from tray
pause/resume from tray and confirm renderer reconciliation
explicitly Quit while running
relaunch and confirm authoritative reconstruction
stop and confirm the reconstructed interval is retained
```

## 11.4 Midnight, Local Calendar, and Settings

Using deterministic automated coverage and, where practical, controlled packaged
fixtures:

```text
verify an interval crossing local midnight remains one stored interval
verify each local day receives only its overlap
verify Today, seven-day, thirty-day, week, and month projections agree
change week start and confirm Analytics updates authoritatively
change System/Light/Dark appearance and confirm persistence and complete surfaces
verify DST-sensitive calendar projection using deterministic tests
```

The owner is not required to wait for real midnight or alter the system clock when
deterministic lower-layer evidence proves the boundary behavior.

## 11.5 Manual Data Repair

```text
add one valid closed interval
attempt an invalid range and confirm no mutation
attempt overlap with closed and running time and confirm no mutation
edit a closed interval, including a cross-day value
delete one interval only after confirmation
confirm Timer, History, and Analytics refresh authoritatively
```

## 11.6 Task Management

```text
rename an inactive Task and confirm all projections update
attempt a normalized-description collision and confirm no mutation
confirm active Task deletion is unavailable and rejected authoritatively
delete an inactive Task after informative confirmation
confirm its intervals cascade and unrelated records remain unchanged
```

## 11.7 Analytics, Navigation, and Presentation

```text
verify seven-day and thirty-day totals from known fixture durations
verify daily average uses every selected day
verify current week and month totals
verify deterministic top-Task ordering
navigate Timer, Analytics, and Settings without losing timer state
verify paused and running values reconcile after relevant mutations
verify durations above 99 hours do not break required presentation
```

---

# 12. Accessibility and Window Acceptance

The integrated regression must exercise the primary workflows with keyboard input
and inspect their semantics. At minimum:

- every destination and primary action is reachable in a logical Tab order;
- visible focus is present;
- Enter starts from the idle Task input;
- suggestion navigation, menus, expandable History, dialogs, and Settings controls
  follow their specified keyboard behavior;
- Escape closes dismissible overlays and focus returns predictably;
- dialogs contain focus while open;
- destructive confirmations communicate the affected Task, interval, or duration;
- timer and paused state are not communicated only through color;
- Analytics chart values have an accessible nonvisual representation;
- loading, empty, pending, disabled, retry, and controlled-error states remain
  understandable;
- System, Light, and Dark appearances retain usable contrast on all implemented
  surfaces;
- the application remains usable at SPEC-010's supported minimum window size;
- long Task descriptions and durations greater than 99 hours do not obscure
  essential controls.

Automated semantic/component evidence may support this audit, but the owner macOS
acceptance must include keyboard use of the primary Start, Pause, Resume, switch,
Stop, navigation, and one dialog workflow.

---

# 13. Offline, Security, and Privacy Acceptance

Normal installed operation must succeed with networking unavailable. Acceptance
must confirm:

- no runtime HTTP(S), WebSocket, or remote asset request is required;
- no backend, account, authentication, synchronization, update check, telemetry,
  crash reporting, or analytics collection has appeared;
- renderer `contextIsolation` remains enabled;
- renderer Node integration remains disabled;
- the renderer has no raw `ipcRenderer`, filesystem, database, shell, or generic
  invoke/send capability;
- privileged behavior remains behind narrow typed preload APIs and validated IPC;
- technical logs do not unnecessarily contain Task descriptions;
- renderer errors do not expose stack traces or internal database details;
- the application writes only to its expected isolated test profile during
  acceptance;
- unsigned-install warnings and checksum limitations remain accurately documented.

Unexpected runtime network activity, a renderer privilege regression, a write to a
real profile, or exposure of secrets or personal data is release-blocking.

---

# 14. Persistence and Recovery Integrity

Critical scenario checkpoints must inspect persisted data or use deterministic
integration evidence to prove:

- only one open interval exists globally;
- every interval references a valid Task;
- closed interval ends occur after starts;
- forbidden interval overlap is absent;
- idle, running, and paused AppState invariants hold;
- Task deletion leaves no orphan intervals;
- totals remain projections rather than persisted mutable counters;
- Settings contains one constrained authoritative row after SPEC-010;
- restart and explicit Quit reconstruction do not invent, truncate, or duplicate
  time;
- migrations apply from every supported released schema baseline without database
  recreation;
- replacement, reinstall, uninstall/reinstall, and applicable forward upgrade
  preserve the profile as required by SPEC-011.

Acceptance must never mutate or inspect the owner's real production profile for QA
convenience.

---

# 15. Cross-Platform Evidence Policy

SPEC-011 remains authoritative for the native artifact and clean-install matrix.
SPEC-012 must review, rather than unnecessarily repeat, its evidence for:

- macOS arm64;
- macOS x64;
- Windows x64;
- Linux x64;
- each required representative operating-system version;
- fresh install and launch;
- tray and window behavior;
- offline installed operation;
- replacement/reinstall and uninstall/reinstall data preservation;
- applicable forward upgrade;
- native module, application icon, tray asset, console, and log behavior.

For each environment, the SPEC-012 record states who performed the test and links
the exact SPEC-011 evidence. CI build results alone remain insufficient for manual
installation claims.

The owner directly performs only the macOS Apple Silicon acceptance defined in
§16. Intel macOS, Windows, and Linux readiness may rely on complete SPEC-011
physical/VM evidence performed by another identified tester or service. Missing or
incomplete required platform evidence produces `NO-GO`; it must not be represented
as owner acceptance or waived because hardware is unavailable locally.

---

# 16. Owner macOS Apple Silicon Acceptance

The application owner must manually evaluate the exact candidate DMG on an Apple
Silicon Mac using the expected unsigned per-application installation path and an
isolated synthetic profile.

The owner checklist must include:

1. verify the downloaded filename and SHA-256;
2. install and launch without a development checkout or Node.js;
3. verify application, Dock, and menu-bar/tray presentation;
4. perform Start, Pause, Resume, switch, Stop, close/hide, tray restore, explicit
   Quit, and relaunch recovery;
5. inspect History and Analytics for the created synthetic data;
6. add, edit, and delete one manual interval and rename/delete one inactive Task;
7. change week-start and appearance settings and confirm restart persistence;
8. use keyboard navigation for the primary timer workflow, top-level navigation,
   one menu, and one dialog;
9. resize to the supported minimum and inspect Light and Dark appearance;
10. repeat representative launch/tracking while offline;
11. confirm no unexpected renderer error, main-process error, or runtime network
    dependency;
12. confirm acceptance used no personal Daymark data in the compatibility-preserved
    `Time Tracker` profile directory;
13. record result, observations, owner name, date, OS version, architecture,
    artifact name, and checksum result.

The owner may record a failed step without attempting a fix. A failed required step
is release-blocking until resolved and rerun.

---

# 17. Defect Classification

Every observed failure or deviation receives one of these classifications:

## Release Blocker

A release blocker includes:

- failure of any acceptance criterion in SPEC-000 through SPEC-012;
- data loss, corruption, orphaning, duplication, or invariant violation;
- installation, launch, native-module, migration, or required platform failure;
- failure of Start, Pause, Resume, Stop, switching, recovery, or manual correction;
- renderer security-boundary or offline-operation regression;
- unexpected write to a real or out-of-scope profile;
- inaccessible primary workflow with no equivalent supported operation;
- uncaught renderer/main-process error in a required scenario;
- missing, contradictory, unattributable, or stale required evidence;
- flaky required validation whose cause is unresolved.

Any open release blocker requires `NO-GO`.

## Non-Blocking Observation

A non-blocking observation must be outside every existing acceptance criterion and
must not threaten data integrity, security, privacy, accessibility of primary
workflows, installation, offline use, or documented product behavior. Examples may
include a minor cosmetic issue with no loss of information or operation.

Each non-blocking observation records impact, reproduction, owner, and intended
follow-up. Classification cannot be used to waive a requirement.

---

# 18. Defect Remediation and Candidate Invalidation

SPEC-012 may include a narrowly scoped fix when all of these are true:

1. the defect blocks release;
2. expected behavior is already unambiguously defined by an existing
   specification or decision;
3. the fix does not introduce new product behavior or an architectural reversal;
4. the change can be reviewed and verified as a bounded repair.

The defect record must identify the authoritative specification and acceptance
criterion. Add focused regression coverage before or with the fix, run the
affected specification checks, and update documentation only where it was
incorrect.

If expected behavior is materially ambiguous, update the originating specification
before implementing the fix. If the work is a feature, broad refactor,
architectural change, or independently valuable enhancement, stop and create a
separate task or specification. SPEC-012 remains `NO-GO` until that work is
completed and the invalidated evidence is rerun.

After any fix:

- run focused tests first;
- rerun the complete automated baseline;
- rebuild every artifact affected under §7;
- regenerate checksums when artifacts change;
- repeat the affected platform and integrated scenarios;
- review which earlier ledger entries became stale;
- retain the original failed result and link the passing rerun.

Evidence history must not be rewritten to hide a defect.

---

# 19. Release Decision

The final decision is exactly one of:

```text
GO — Ready for owner-controlled unsigned personal-testing prerelease publication
NO-GO — Not ready for publication
```

A `GO` decision requires:

- SPEC-000 through SPEC-011 remain `Verified`;
- every SPEC-012 acceptance criterion passes;
- the complete evidence ledger has no gap;
- all required validation passes for the final candidate;
- all required SPEC-011 platform evidence is current and reviewed;
- the owner macOS Apple Silicon acceptance passes;
- no release blocker remains open;
- residual non-blocking observations, if any, are recorded;
- unsigned personal-testing limitations remain prominent;
- the candidate and evidence identities are exact;
- the owner explicitly records the decision.

A `NO-GO` record identifies every blocker and the next action without publishing or
altering the draft release to appear approved.

The decision record includes:

```text
decision
candidate version and tag
artifact and evidence commit SHAs
decision timestamp
owner/reviewer
open blocker count
non-blocking observation count
links to ledger, platform evidence, owner checklist, and defect register
```

Only the owner may make the final `GO` decision. Automated checks, CI, Codex, or
another tester may recommend a result but cannot substitute for owner approval.

---

# 20. Publication Boundary

SPEC-012 ends after the decision is recorded and documentation is reconciled.

A `GO` decision authorizes no automatic side effect. The draft GitHub prerelease
must remain draft until the owner separately and deliberately publishes it through
the repository's release controls. Publication is not an implementation task and
must not occur merely because this specification becomes `Verified`.

The released description, if the owner later publishes it, must continue to say
that artifacts are unsigned, intended for personal testing, may trigger operating
system warnings, have no automatic updater, and are not general-public production
binaries.

Signing and notarization require planned SPEC-013 and owner-provided
credentials before the product can claim trusted general-public distribution.

---

# 21. Error and Interruption Behavior

- A failed required command stops the readiness run until investigated.
- A missing artifact, checksum mismatch, tag/version mismatch, or source-commit
  mismatch produces `NO-GO`.
- A missing SPEC-011 platform record produces `NO-GO` rather than an inferred pass.
- An interrupted manual scenario is incomplete, not failed, and must restart from
  a documented clean checkpoint.
- A corrupted disposable profile may be retained for diagnosis without being used
  for subsequent passing evidence.
- An unavailable external platform environment does not authorize a waiver; the
  decision remains `NO-GO` until required evidence exists.
- A GitHub or CI outage may delay evaluation but does not change product scope or
  permit local evidence to impersonate a native target result.
- A release blocker found after an initial `GO` but before publication invalidates
  that decision and requires a new final review.
- A release blocker found after publication is handled as a new release/hotfix
  decision; do not move or silently replace the published tag.

---

# 22. Acceptance Criteria

## AC-012-001 — Dependencies Are Verified Before QA Begins

Given SPEC-012 is queued,

when release-readiness execution begins,

then SPEC-000 through SPEC-011 are all `Verified`, and any missing prerequisite
prevents execution rather than being waived.

## AC-012-002 — One Candidate Is Identified Exactly

Given a draft release candidate,

when the readiness record is created,

then version, tag, artifact commit, evidence commit, artifact filenames, and
checksums are complete and mutually consistent.

## AC-012-003 — Every Earlier Acceptance Criterion Has Current Evidence

Given the complete SPEC-000 through SPEC-011 acceptance set,

when the coverage ledger is audited,

then every criterion maps to attributable current evidence or a documented rerun,
and no passing suite count or unsupported waiver substitutes for traceability.

## AC-012-004 — Complete Automated Validation Passes

Given the exact candidate source and clean dependency state,

when all baseline and SPEC-011 release validation commands run,

then every command passes without hidden, ignored, or unresolved flaky failures.

## AC-012-005 — Integrated Timer and Switching Workflow Is Correct

Given a fresh isolated profile,

when Task A is started, paused, resumed, switched to Task B, stopped, and later
reused,

then presentation and persistence match the authoritative state, reuse creates no
duplicate Task, and no more than one interval is open.

## AC-012-006 — Window, Tray, Quit, and Relaunch Recovery Is Correct

Given a running timer,

when the window is hidden/restored, tray commands are used, and the application is
explicitly quit and relaunched,

then the timer remains authoritative, exactly one window is restored, elapsed time
is reconstructed without mutation, and renderer/tray state reconciles.

## AC-012-007 — Calendar and Projection Boundaries Remain Correct

Given deterministic intervals spanning local midnight and relevant DST, week, and
month boundaries,

when History and Analytics projections are evaluated under both week-start
preferences,

then stored intervals remain unsplit and every day, range, average, week, month,
and top-Task value matches the specified overlap rules.

## AC-012-008 — Manual Repair Preserves Invariants

Given existing closed and running time,

when valid and invalid add, edit, overlap, and delete scenarios are exercised,

then only valid closed intervals mutate, failures preserve entered and persisted
state, and Timer, History, and Analytics reconcile authoritatively.

## AC-012-009 — Task Management Preserves Related Data Correctly

Given active and inactive Tasks with intervals,

when rename, collision, active-delete rejection, and confirmed inactive deletion
are exercised,

then identity and projections update correctly, collisions do not mutate, active
deletion is prevented, cascades remove no unrelated data, and no orphan remains.

## AC-012-010 — Settings, Navigation, and Presentation Remain Coherent

Given Timer, Analytics, and Settings with representative data,

when the user navigates, changes week-start and appearance settings, reloads, and
restarts,

then timer state remains intact, settings persist, projections refresh, all
surfaces support the selected appearance, and long duration/content presentation
remains usable.

## AC-012-011 — Primary Workflows Are Accessible

Given the packaged candidate,

when primary Timer, navigation, History, menu, dialog, Analytics, and Settings
workflows are exercised by keyboard and inspected semantically,

then focus, labels, state communication, dialog behavior, chart alternatives,
contrast, and minimum-window usability meet §12.

## AC-012-012 — Installed Operation Remains Offline and Secure

Given networking is unavailable and runtime boundaries are inspected,

when the installed integrated workflow runs,

then it requires no runtime network resource, introduces no remote service or
collection, preserves renderer isolation, exposes no broad privileged API, and
writes only to the isolated test profile.

## AC-012-013 — Persistence and Recovery Remain Internally Consistent

Given checkpoints after mutation, restart, and recovery scenarios,

when disposable persisted state and migration evidence are inspected,

then all database and AppState invariants hold, totals remain derived, and no time
or user data is lost, duplicated, or orphaned.

## AC-012-014 — Required Cross-Platform Evidence Is Reviewed Honestly

Given the owner has direct access only to macOS Apple Silicon,

when SPEC-011 evidence is reviewed for every other required target,

then each claim identifies its actual tester/environment and exact candidate,
missing evidence blocks release, and no unavailable environment is represented as
owner-tested.

## AC-012-015 — Owner macOS Apple Silicon Acceptance Passes

Given the exact checksummed macOS arm64 DMG and an isolated synthetic profile,

when the owner completes the §16 checklist,

then every required step passes and the signed-off record identifies the owner,
date, OS, architecture, artifact, and checksum.

## AC-012-016 — Defects Are Classified and Repaired Without Scope Expansion

Given a failure or deviation is discovered,

when it is triaged,

then it is recorded as a release blocker or valid non-blocking observation, no
acceptance criterion is waived, and any bounded fix follows §18 with invalidated
evidence rebuilt or rerun.

## AC-012-017 — NO-GO Is Safe and Explicit

Given any release blocker or evidence gap remains,

when the final review occurs,

then the decision is `NO-GO`, blockers and next actions are recorded, and no
publication occurs or is implied.

## AC-012-018 — GO Is Explicit and Does Not Publish

Given every requirement in §19 passes and no release blocker remains,

when the owner approves the candidate,

then a dated `GO` decision is recorded for unsigned personal-testing prerelease
publication, the GitHub Release remains draft, and publication requires a later
separate owner action.

## AC-012-019 — Scope and Personal Data Remain Protected

Given the complete readiness effort,

when source, dependencies, evidence, profiles, and release state are audited,

then no new feature, signing, updater, telemetry, runtime networking, schema
change, personal Task data, secret, real-profile mutation, or automatic publication
has been introduced.

---

# 23. Required Automated Tests

Add or extend deterministic automated coverage only where the final ledger exposes
a meaningful gap. Required coverage includes:

- release-candidate identity and evidence-manifest validation;
- detection of missing, duplicate, malformed, stale, or contradictory ledger
  entries;
- clean full repository regression;
- complete Timer state and switching integration over disposable SQLite;
- restart/reconstruction invariants;
- local midnight, DST, week-start, and month-boundary projections;
- manual interval overlap and atomic failure behavior;
- Task rename/delete isolation and cascade integrity;
- History and Analytics consistency after every relevant mutation;
- Settings persistence and isolation from timer/product state;
- renderer architecture-boundary enforcement;
- accessibility semantics and keyboard behavior already suitable for component
  automation;
- release metadata, artifact, checksum, and workflow contracts from SPEC-011.

Do not duplicate identical business assertions at every layer merely to increase a
test count. Prefer the narrowest layer that proves the behavior and use integrated
coverage for cross-feature coordination.

---

# 24. Required Repository and Integration Tests

Disposable-SQLite integration must prove the connected mutation sequence used by
the integrated regression leaves:

- one valid singleton AppState;
- zero or one open interval according to timer state;
- valid Task references;
- no forbidden overlap;
- no orphan intervals;
- correct derived History and Analytics values;
- one valid Settings row;
- correct reconstruction after service/application restart.

Migration coverage must start from every supported released schema baseline. For
the first release, applying the complete migration set to an empty database and
reopening a representative populated current-schema database is required. Starting
with the second release, use the immediately preceding published schema/profile as
required by SPEC-011.

No persistence test may use the owner's real database.

---

# 25. Required Packaged and Manual Tests

Required packaged evidence consists of:

- the complete SPEC-011 native artifact and installation matrix;
- one connected isolated-profile packaged regression on macOS arm64;
- owner completion of §16 on macOS Apple Silicon;
- offline operation;
- renderer console and main-process log inspection;
- runtime network observation;
- persisted-state inspection at critical checkpoints;
- Light and Dark appearance and supported minimum-window inspection;
- application, installer, launcher, and tray asset review where applicable;
- reinstall/data preservation and applicable upgrade evidence inherited from
  SPEC-011.

Automation may drive repeatable packaged steps, but it does not replace the owner's
required hands-on macOS acceptance or SPEC-011's identified native-environment
testers.

---

# 26. Data Model, API, and Dependency Impact

No product database changes are planned.

No renderer-facing API, preload capability, IPC channel, application service, or
product UI is planned.

No runtime dependency is planned. A focused development-only test dependency may
be proposed only if existing Electron/Node testing mechanisms cannot reliably
exercise a required release workflow. Before adding it, document the gap,
maintenance status, security impact, and why existing tooling is insufficient.

QA scripts, fixtures, validators, and test support remain outside production
runtime behavior and follow the repository's existing test/source organization.

---

# 27. Performance and Reliability Acceptance

The readiness audit confirms that:

- visual duration updates do not cause per-second SQLite writes;
- History and Analytics do not introduce per-row or per-day query loops contrary
  to their specifications;
- tray and renderer presentation tick locally from authoritative snapshots;
- repeated navigation, window restore, and reconciliation do not leak listeners,
  create duplicate windows, or duplicate commands;
- long-running and greater-than-99-hour durations remain numerically and visually
  correct;
- startup, state recovery, and ordinary interactions show no obvious release-
  blocking delay on the owner's macOS Apple Silicon system.

No arbitrary benchmark or optimization feature is introduced. A demonstrated
correctness or usability failure is triaged under §17.

---

# 28. Documentation and Evidence

The repository must contain or update:

- the acceptance-evidence ledger;
- the candidate identity manifest or equivalent record;
- the defect/deviation register;
- the owner macOS Apple Silicon checklist;
- the final release decision record;
- release documentation inherited from SPEC-011;
- `docs/progress.md`;
- `docs/plan.md` during implementation;
- specification and task statuses after verification;
- decisions or architecture documentation only if actual accepted behavior changed.

Evidence files must be versioned, reviewable, and free of secrets and personal Task
data. Large binary artifacts, machine-specific profiles, and raw logs containing
sensitive system information must not be committed merely to prove a checklist.
Record concise results and safe references instead.

---

# 29. Definition of Done

This specification is complete when:

- AC-012-001 through AC-012-019 pass;
- SPEC-000 through SPEC-011 remain `Verified`;
- the exact candidate and evidence commits are recorded;
- every earlier acceptance criterion has current traceable evidence;
- `npm ci` succeeds from the committed lockfile;
- `npm run format:check` passes;
- `npm run typecheck` passes;
- `npm run lint` passes;
- `npm test` passes;
- `npm run package` passes on the primary platform;
- all SPEC-011 release validation and native build requirements remain green;
- the integrated isolated-profile regression passes;
- the complete SPEC-011 platform evidence has been reviewed;
- owner macOS Apple Silicon acceptance passes and is signed off;
- persistence, recovery, security, offline, accessibility, and privacy audits pass;
- no release blocker remains open;
- residual non-blocking observations are recorded;
- the owner records exactly one final `GO` or `NO-GO` decision;
- a `GO` is limited to unsigned personal-testing prerelease readiness;
- the GitHub Release remains draft and unpublished by SPEC-012;
- documentation and progress are reconciled;
- no signing, public-production claim, auto-update, telemetry, networking, schema
  change, unrelated feature, personal-data exposure, or real-profile mutation was
  added.

---

# 30. Implementation Notes for Codex

Treat this as a release gate, not permission to redesign or expand the product.
Start with traceability and existing evidence before adding tests. Add automation
only for a demonstrated gap or a repeatable integrated workflow.

Use synthetic fixtures and explicitly resolved disposable profiles. Never infer
that a command targeted a temporary profile merely from an environment variable or
unverified default.

If QA finds a blocker, preserve the failure evidence, identify the authoritative
earlier specification, and apply §18. Do not silently reinterpret behavior to make
the test pass.

The owner must personally complete and approve the macOS Apple Silicon checklist.
Codex may prepare the candidate, automate safe checks, collect non-personal
evidence, and recommend `GO` or `NO-GO`; it must not impersonate owner sign-off or
publish the release.

Implement only one unblocked task from `tasks.md` at a time and update
`docs/plan.md` before changing tests, scripts, product code, or release evidence.
