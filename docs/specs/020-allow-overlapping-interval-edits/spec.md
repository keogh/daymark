# SPEC-020 — Allow Overlapping Interval Edits

## Status

Verified

## Milestone

Post-MVP — Interval Correction Refinement

## Priority

P1

---

# 1. Objective

Allow a user to save an otherwise valid edit to a closed time interval even when
the edited range overlaps another closed interval or the elapsed portion of the
currently running interval.

---

# 2. User Story

As an individual user,

I want to edit a recorded time interval without being blocked by another recorded
interval in the same period,

so that Daymark can accurately represent work that I intentionally performed or
recorded concurrently.

---

# 3. Background

SPEC-005 and SPEC-006 established a global non-overlap rule for manually created
and edited intervals. SPEC-006 therefore rejects an edit with
`TIME_INTERVAL_OVERLAP` when its proposed range intersects another closed interval
or the elapsed portion of the current open interval.

That rule is too restrictive for correction. A user may need to preserve two
legitimate records whose time ranges intersect. This specification relaxes the
rule only for edits to existing closed intervals.

This behavior changes the edit-specific portion of DEC-026 and the global
non-overlap language established by SPEC-006. Before implementation begins, a new
accepted decision must supersede those parts of the earlier decision and the
affected product, domain, architecture, and Definition of Done documentation must
be reconciled without rewriting the historical specifications.

---

# 4. Scope

This specification includes:

- allowing an edited closed interval to overlap one or more other closed
  intervals, regardless of Task association;
- allowing an edited closed interval to overlap the elapsed portion of the
  currently running open interval;
- retaining validation that the target exists, is closed, and has an end later
  than its start;
- preserving the edited interval's ID and Task association;
- preserving the current timer and `AppState` during the edit;
- continuing to derive history, Task totals, and analytics from every persisted
  interval independently;
- removing edit-only overlap queries, failures, renderer messaging, and tests
  that enforce the superseded behavior;
- regression coverage for complete containment, partial overlap, identical
  ranges, cross-Task overlap, and overlap with a running interval;
- reconciling current product, domain, architecture, decision, and progress
  documentation.

---

# 5. Out of Scope

This specification does not include:

- allowing overlap when creating a manual interval under SPEC-005;
- creating more than one open timer interval;
- editing or deleting the currently open interval;
- changing an interval's Task association;
- warning, confirmation, visualization, or conflict badges for overlaps;
- automatically trimming, splitting, merging, replacing, or deduplicating
  intervals;
- calculating a union of concurrent time ranges;
- changing timer transition behavior;
- changing the database schema or migrating existing interval data;
- bulk editing, undo, notes, tags, projects, or billing semantics.

---

# 6. Dependencies

Required earlier specifications:

- SPEC-001 — Core Time Tracking, status Verified;
- SPEC-002 — Daily History, status Verified;
- SPEC-005 — Manual Time Entry, status Verified;
- SPEC-006 — Edit and Delete Intervals, status Verified;
- SPEC-009 — Analytics, status Verified.

Implementation must not begin until the active release specifications permit
post-MVP product work and this specification is promoted to `Ready for
Implementation`.

---

# 7. Domain Behavior

Only an existing closed `TimeInterval` may be changed by the interval-edit
operation.

An edited interval:

- must retain its existing ID and Task association;
- must satisfy `startedAt < endedAt`;
- may move to another local day;
- may cross midnight or span multiple local calendar days;
- may partially or completely overlap any number of other closed intervals;
- may have exactly the same range as another closed interval;
- may overlap the elapsed range of the current open interval;
- must not alter, pause, stop, close, or replace the current open interval;
- must be updated atomically and leave persistence unchanged on any remaining
  failure.

Overlapping intervals remain distinct source-of-truth records. Each interval
contributes its full clipped duration to history, Task totals, and analytics.
Daymark does not collapse overlapping ranges into their elapsed-time union.
Consequently, a day or reporting period may show more tracked duration than its
wall-clock duration, and concurrent intervals assigned to different Tasks each
contribute to their respective Task totals.

The following invariants remain mandatory:

- only one interval may be open globally;
- every closed interval end must be later than its start;
- every interval must reference a valid Task;
- timer transitions must remain atomic;
- manual interval creation must continue to reject overlap under SPEC-005.

Global non-overlap is no longer an invariant of persisted data because a valid
edit may create overlap.

---

# 8. Data Model Changes

No database schema or data migration is required.

The current schema does not enforce global non-overlap at the database level.
Existing interval IDs, timestamps, Task references, indexes, and open-interval
enforcement remain unchanged.

Existing user data must not be rewritten, split, merged, or deleted.

---

# 9. Application Service Behavior

The existing interval update operation and public input/output contracts remain
unchanged.

After validating and converting the input, the update operation must:

1. load the target within the mutation transaction;
2. reject a missing target with the existing controlled missing-target error;
3. reject an open target with `OPEN_INTERVAL_NOT_EDITABLE`;
4. reject a derived end that is not later than its start with
   `INVALID_INTERVAL_UPDATE`;
5. update exactly the target closed interval without querying for conflicting
   closed or open ranges;
6. preserve its ID and Task association;
7. leave every other interval and `AppState` unchanged;
8. commit once and return the existing successful mutation result.

The service must not return `TIME_INTERVAL_OVERLAP` solely because an interval
update intersects another interval. The error may remain in the shared result
contract while manual creation still uses it.

Delete behavior is unchanged.

---

# 10. IPC Contract

No renderer-facing API shape changes are required. The existing explicit
interval update API remains in use.

Runtime validation of the interval ID and local date/time fields remains
mandatory. No database, Node.js, or raw Electron capability may be exposed to the
renderer.

---

# 11. Renderer Behavior

The existing Edit interval dialog retains its Task context, initial values,
date/time fields, Save behavior, cancellation behavior, validation feedback, and
focus behavior.

Saving a valid range must succeed without an overlap warning or confirmation,
even when the range intersects another interval. After success, the dialog closes
and affected authoritative timer, history, and analytics projections refresh
through the existing mechanisms.

The edit dialog must no longer map `TIME_INTERVAL_OVERLAP` to edit-specific user
guidance. Manual time entry must retain its current overlap message and behavior.

No new visual treatment for concurrent intervals is required.

---

# 12. Validation

The update boundary must continue to validate:

- a non-empty, well-formed interval ID;
- valid local start and end date/time fields;
- real local timestamps according to the established local-time rules;
- a derived end strictly later than the derived start.

Overlap is not a validation error for interval updates.

Validation for manual interval creation is unchanged and must continue to reject
overlap with closed and elapsed open intervals.

---

# 13. Error Behavior

The interval update operation retains its existing controlled errors for:

- invalid input or invalid date/time range;
- missing interval;
- open interval target;
- unexpected transactional or persistence failure.

`TIME_INTERVAL_OVERLAP` is no longer an expected interval-update result. It
remains available to manual interval creation.

Failures must preserve the user's entered values where the existing dialog
already does so. Internal stack traces must not be exposed through IPC.

---

# 14. Edge Cases

- An edited interval may exactly match another interval's start and end.
- An edited interval may completely contain or be contained by another interval.
- An edited interval may overlap multiple intervals belonging to one or several
  Tasks.
- An edited interval may overlap only the elapsed portion of a running interval
  or extend beyond the current Clock time.
- An edited interval may cross midnight and overlap intervals on either local
  calendar day.
- Touching boundaries remain valid, as before, but no special overlap handling is
  necessary.
- Saving unchanged valid timestamps remains idempotent and succeeds.
- A target that becomes missing or open before the transaction executes still
  fails safely under the existing rules.
- Restart reconstructs the same timer state and preserves all overlapping closed
  intervals.

---

# 15. Acceptance Criteria

## AC-020-001 — Closed Intervals May Overlap After Edit

Given a persisted closed interval and another closed interval with a conflicting
range,

when the user edits the target to a valid partially or completely overlapping
range and saves,

then the target retains its ID and Task association, receives the requested
timestamps, and both intervals remain persisted.

## AC-020-002 — Identical Ranges Are Allowed

Given two closed intervals belonging to the same or different Tasks,

when one is edited to exactly match the other's valid start and end timestamps,

then the edit succeeds without `TIME_INTERVAL_OVERLAP`.

## AC-020-003 — Edit May Overlap the Running Timer

Given one running open interval and a separate closed interval,

when the closed interval is edited to overlap the running interval's elapsed
range,

then the edit succeeds and the timer remains running with unchanged Task, open
interval, and session metadata.

## AC-020-004 — Overlapping Duration Is Additive

Given two persisted intervals whose ranges overlap within a displayed local day
or analytics period,

when authoritative projections are loaded,

then each interval contributes its full clipped duration and no union,
deduplication, trimming, or conflict adjustment is applied.

## AC-020-005 — Invalid Ranges Remain Rejected

Given an interval edit whose derived end is earlier than or equal to its start,

when the user saves,

then the edit is rejected with the existing invalid-update behavior and no
persistence or `AppState` mutation occurs.

## AC-020-006 — Open Targets Remain Non-Editable

Given the update command targets the current open interval,

when the command is processed,

then it returns `OPEN_INTERVAL_NOT_EDITABLE` and does not mutate the timer or any
interval.

## AC-020-007 — Manual Creation Still Rejects Overlap

Given a proposed manual interval overlaps a closed interval, including one whose
range became overlapping through an edit, or overlaps the elapsed open interval,

when the user attempts to create it,

then creation returns `TIME_INTERVAL_OVERLAP` and does not mutate Tasks,
TimeIntervals, or `AppState`.

## AC-020-008 — Edit UI Has No Overlap Failure State

Given valid overlapping values in the Edit interval dialog,

when the user saves,

then no overlap error or confirmation is shown, the dialog follows its existing
success flow, and authoritative projections refresh.

## AC-020-009 — Persistence and Restart Preserve Overlaps

Given a successful edit created overlapping closed intervals,

when the application is fully restarted,

then both intervals remain unchanged and authoritative timer, history, and
analytics state reconstruct successfully.

---

# 16. Required Unit Tests

- Interval update succeeds for partial overlap with another closed interval.
- Interval update succeeds when one interval contains another.
- Interval update succeeds for an identical range across the same Task and across
  different Tasks.
- Interval update succeeds across multiple conflicting closed intervals.
- Interval update succeeds over the elapsed portion of an open interval without
  changing timer state.
- Invalid range, missing target, and open-target failures remain unchanged.
- Manual interval creation overlap tests continue to pass.
- Projection tests demonstrate additive duration for overlapping intervals where
  existing coverage is insufficient.

---

# 17. Required Repository Tests

- The conditional closed-only update persists an overlapping range without
  changing any other row.
- Existing overlap query helpers used by history and analytics range selection
  remain covered; remove only edit-conflict-specific repository behavior if it no
  longer has another caller.
- Open-interval uniqueness and interval-range constraints remain covered.

---

# 18. Required Integration Tests

- Update a closed interval across another closed interval in disposable SQLite
  and verify both rows plus unchanged `AppState`.
- Update a closed interval across the elapsed open interval and verify the open
  timer is unchanged.
- Load history and analytics after overlapping edits and verify additive
  projections.
- Restart from persisted overlapping data and verify reconstruction.
- Verify manual creation still rejects a conflicting range after overlaps have
  been introduced through editing.

---

# 19. Required UI Tests

- Saving valid overlapping edit values follows the success path and refreshes
  authoritative state.
- The Edit interval dialog no longer presents overlap-specific feedback.
- Invalid-range, missing-target, open-target, retry, cancellation, keyboard, and
  focus behavior do not regress.
- Manual time entry retains its overlap-specific message.

---

# 20. Migration Tests

Not applicable. No schema or stored-data transformation is required.

---

# 21. Security Considerations

No new privileged operation or renderer capability is introduced. Existing IPC
runtime validation and narrow preload boundaries remain mandatory.

---

# 22. Performance Considerations

Removing conflict lookup from the edit transaction should not add work. Existing
bounded history and analytics queries must continue to return every matching
interval, including concurrent records, without introducing per-interval IPC or
database queries.

---

# 23. Accessibility Requirements

- The existing Edit interval dialog remains keyboard operable and correctly
  labelled.
- Focus behavior on open, validation failure, cancellation, and success remains
  unchanged.
- No warning or status conveyed only by color is introduced.

---

# 24. Definition of Done

This specification is complete when:

- AC-020-001 through AC-020-009 pass;
- focused service, repository, integration, boundary, renderer, and projection
  tests pass;
- all existing tests pass, including manual-entry overlap protection;
- `npm run format:check`, `npm run typecheck`, `npm run lint`, and `npm test` pass;
- a packaged application smoke test confirms overlapping edit, additive history,
  running-timer preservation, and restart persistence with a disposable profile;
- DEC-026 is explicitly superseded only for edit behavior by a new accepted
  decision;
- `AGENTS.md`, `docs/context.md`, `docs/domain/data-model.md`,
  `docs/product/prd.md`, `docs/architecture/architecture.md`, and
  `docs/sdd/definition-of-done.md` no longer state global non-overlap as a
  universal invariant;
- SPEC-005 remains accurate for manual creation and historical SPEC-006 is linked
  to this superseding behavior without erasing its original acceptance record;
- `docs/progress.md` is updated and no unrelated feature is added.

---

# 25. Implementation Notes for Codex

Prefer the smallest service change that removes overlap rejection only from the
closed-interval update path. Do not remove overlap protection from manual entry,
open a second running interval, or change projection math.

The owner confirmed the additive duration rule and authorized post-MVP sequencing
on 2026-09-01. DEC-039 records the accepted decision that partially supersedes
DEC-026.
