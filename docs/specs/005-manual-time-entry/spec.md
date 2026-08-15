# SPEC-005 — Manual Time Entry

## Status

Verified

## Milestone

M4 — Interval Management

## Priority

P0

---

# 1. Objective

Let the user manually record missed work as explicit closed time intervals without
direct database access, while preserving timestamp-based source of truth,
cross-day projection correctness, and non-overlap invariants.

---

# 2. User Story

As an individual user,

I want to add a manual time interval for work I forgot to track,

so that my history remains accurate even when I missed using the running timer.

---

# 3. Background

SPEC-001 established the timer state model, timestamp-based intervals, and the
rule that intervals are the authoritative source of truth. SPEC-002 established
Daily History as a local-calendar projection over intervals. The PRD and product
context require recovery from mistakes by allowing manual correction of recorded
work.

This specification covers only creating manual intervals. Editing and deleting
intervals remain deferred to SPEC-006.

---

# 4. Scope

This specification includes:

- a manual time entry action available from both a global Timer-view entry point
  and the Daily History view for a specific day;
- a renderer flow for entering a task, date, start time, and end time;
- manual entry using either an existing task or a newly typed task description
  subject to existing normalization and reuse rules;
- creation of exactly one closed `TimeInterval`;
- reuse of an existing normalized-description-matching Task when applicable;
- creation of a new Task when the typed description does not match an existing
  one;
- validation that manual intervals have a valid date/time range;
- validation that manual intervals do not overlap any existing persisted interval,
  including a currently running open interval;
- authoritative refresh of timer and history projections after successful save;
- typed contracts across renderer, preload, IPC, and main process;
- runtime validation of manual-entry input;
- repository, service, integration, boundary, and renderer tests.

---

# 5. Out of Scope

This specification does not implement:

- editing or deleting existing intervals;
- assisted overlap resolution such as trim, split, merge, or replace;
- duration-only entry modes;
- bulk interval import or multi-interval creation;
- interval notes, labels, tags, projects, or clients;
- manual pausing, resuming, or stopping as part of save;
- automatic timer correction when the proposed interval overlaps a running timer;
- tray-based manual entry;
- analytics-specific entry flows.

These behaviors belong to later specifications unless explicitly added by a future
decision.

---

# 6. Dependencies

Required earlier specifications:

- SPEC-001 — Core Time Tracking, status Verified;
- SPEC-002 — Daily History, status Verified;
- SPEC-003 — Task Search and Reuse, status Verified;
- SPEC-004 — One-Click Task Switching, status Verified.

The existing Task schema, TimeInterval schema, normalization rules, typed preload
boundary, Clock abstraction, history projections, and AppResult contract are
reused.

---

# 7. Domain Behavior

Manual time entry creates one closed `TimeInterval` for one Task.

The interval must:

- reference a valid Task;
- have `startedAt < endedAt`;
- be persisted with both timestamps set at creation time.

Task selection behavior:

- the user may choose an existing task from suggestions or search results;
- the user may type a task description manually;
- typed descriptions reuse an existing Task when their normalized description
  matches an existing record exactly;
- otherwise a new Task is created using the same trimming, normalization, and
  length rules as normal Start behavior.

Day behavior:

- the form captures one local calendar date plus a local start time and local end
  time;
- the resulting UTC epoch timestamps are derived from the user's local timezone;
- if the end time is earlier than or equal to the start time on the chosen date,
  the interval is invalid for this specification and must be rejected rather than
  inferred into the next day;
- cross-midnight manual intervals are therefore out of scope for this version of
  manual entry, even though persisted intervals in general may cross midnight.

Overlap behavior:

- the proposed closed interval must not overlap any existing persisted interval
  for any task;
- overlap is rejected regardless of whether the existing conflicting interval
  belongs to the same task or a different task;
- overlap with the currently running open interval is also rejected;
- rejected overlap must not mutate Tasks, TimeIntervals, or AppState.

Manual entry must not change timer status by itself. A successful save may coexist
with the current timer state as long as no overlap occurs.

---

# 8. Data Model Changes

No database schema changes are required.

Do not add:

- mutable task-duration counters;
- a separate manual-entry table;
- cached daily totals;
- draft interval persistence.

Existing invariants remain mandatory:

- only one interval may be open globally;
- interval end must be later than start;
- interval task references must be valid;
- manual intervals must not overlap existing intervals;
- timer state transitions must remain atomic.

---

# 9. Application Service Behavior

Extend the interval or timer application layer with an operation conceptually
equivalent to:

```ts
interface CreateManualIntervalInput {
  readonly taskId?: string;
  readonly taskDescription?: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
}

ManualTimeService.createInterval(
  input: CreateManualIntervalInput,
): Promise<AppResult<ManualIntervalCreateResult>>;
```

`ManualIntervalCreateResult` must provide enough authoritative data for the
renderer to refresh affected views. Returning the newly created interval ID is
acceptable, but the timer and history views should continue to refresh from
authoritative existing queries rather than optimistic local projection logic.

The operation must:

1. validate the full input before persistence work;
2. require exactly one task source:
   - explicit existing `taskId`, or
   - typed `taskDescription`;
3. reject ambiguous or missing task selection;
4. convert the local date/time fields into UTC epoch milliseconds using the
   user's local timezone;
5. reject non-existent explicit task IDs with a controlled error;
6. resolve typed descriptions to an existing Task by normalized exact match or
   create a new Task atomically within the same transaction;
7. reject intervals whose derived end is not later than derived start;
8. reject intervals that overlap any existing closed interval or the current open
   interval;
9. create exactly one closed interval and commit once;
10. leave `AppState` unchanged on success;
11. return a controlled error without mutation on validation or overlap failure.

If persisted state is invalid or a transactional invariant fails unexpectedly, the
operation must return a controlled generic failure and log the issue locally.

---

# 10. IPC Contract

Expose one narrow manual-entry API through preload:

```ts
interface ManualTimeAPI {
  createInterval(
    input: CreateManualIntervalInput,
  ): Promise<AppResult<ManualIntervalCreateResult>>;
}
```

Conceptual IPC channel:

```text
manual-time:create-interval
```

Do not expose raw `ipcRenderer`, generic invoke/send helpers, database objects, or
generic task/interval mutation access.

The main-process boundary must runtime-validate `CreateManualIntervalInput`
before application or persistence logic executes.

---

# 11. Renderer Behavior

The Timer view gains a visible global manual-entry action. Daily History gains a
manual-entry action scoped to a visible day.

Allowed entry points:

- a global `Add time` action near the primary timer area;
- a day-level `Add time` action in Daily History.

Entry behavior:

- activating the global action opens the manual-entry UI with the user's local
  current day prefilled;
- activating the history day action opens the same UI with that local day
  preselected;
- the user can cancel without mutating data.

The manual-entry UI must include:

- task input supporting typed descriptions and existing-task selection;
- one date field;
- one start-time field;
- one end-time field;
- save and cancel actions;
- inline validation and controlled error presentation.

The UI may be a modal, sheet, or other focused surface if it:

- keeps the interaction low-friction;
- is keyboard accessible;
- provides visible focus;
- clearly labels inputs and errors;
- does not require navigation to a separate primary page.

Task behavior:

- the task field may reuse the existing suggestion pattern where practical;
- selecting an existing task binds the stable task ID;
- typing a new description remains allowed;
- the UI must make it clear whether save will use the typed description.

Date behavior:

- when opened from a history day action, that day is prefilled;
- when opened from the global action, the date defaults to the user's local
  current day unless implementation evidence shows a stronger usability reason to
  require explicit selection;
- the chosen date is editable before save.

Save behavior:

- save is disabled until required fields are present in a syntactically valid
  shape;
- submitting valid input calls the narrow manual-entry API once;
- duplicate submissions from the same surface are prevented while pending;
- on success, the surface closes, history refreshes authoritatively, and any
  visible timer totals refresh authoritatively;
- on controlled failure, the surface stays open and shows an understandable
  message without losing the entered values.

This specification does not require optimistic insertion of the new interval into
the UI.

---

# 12. Validation

`CreateManualIntervalInput` must be a non-null object with exactly these
properties:

```text
taskId?: string
taskDescription?: string
date: string
startTime: string
endTime: string
```

Validation rules:

- the input must contain exactly one task source:
  - `taskId` as a non-empty string after trimming, or
  - `taskDescription` as a non-empty string after trimming;
- providing both task sources is invalid;
- providing neither is invalid;
- `taskDescription` follows the existing trimmed non-empty and maximum-length
  rules used for Task creation;
- `date` must be a valid local calendar date string in the renderer contract's
  chosen format;
- `startTime` and `endTime` must be valid local time strings in the renderer
  contract's chosen format;
- the derived local end timestamp must be later than the derived local start
  timestamp;
- unknown properties are rejected;
- malformed input must not read or mutate persistence state.

Invalid manual-entry input returns:

```text
INVALID_MANUAL_INTERVAL
```

---

# 13. Error Behavior

Expected controlled error codes for this feature:

- `INVALID_MANUAL_INTERVAL` — malformed or incomplete manual-entry input;
- `TASK_NOT_FOUND` — explicit `taskId` no longer exists;
- `TIME_INTERVAL_OVERLAP` — the proposed interval overlaps an existing closed or
  open interval;
- `INTERNAL_ERROR` — unexpected failure or invalid persisted state safely mapped
  at the boundary.

Unexpected persistence, transaction, or invariant failures must be logged locally
without exposing stack traces or user-created task descriptions through IPC.

---

# 14. Edge Cases

- A manual interval may be added while the timer is idle, running, or paused as
  long as no overlap occurs.
- Overlap with a currently running open interval must be rejected without pausing
  or stopping the timer automatically.
- If the selected existing task is deleted before save, submission returns
  `TASK_NOT_FOUND` and leaves the form open.
- If the user types a description matching an existing normalized description with
  different case or surrounding whitespace, the existing Task is reused.
- Manual entry on a day outside the currently visible history range must still
  persist correctly; the history surface may need an authoritative reload rather
  than optimistic insertion.
- Cross-midnight entry by entering an end time earlier than or equal to the start
  time is rejected in this version rather than inferred to the next day.
- Restart recovery remains based on persisted timestamps and AppState and does not
  require special manual-entry handling.

---

# 15. Acceptance Criteria

## AC-005-001 — Global Add Time Opens Manual Entry

Given the user is on the Timer view,

when the user activates the global `Add time` action,

then the application opens the manual-entry UI with task, date, start time, end
time, save, and cancel controls available.

## AC-005-002 — History Day Add Time Prefills the Selected Day

Given a visible day section exists in Daily History,

when the user activates that day section's `Add time` action,

then the manual-entry UI opens with that local calendar day preselected for the
new interval.

## AC-005-003 — Manual Entry Can Reuse an Existing Task

Given an existing Task is selected for manual entry,

when the user saves a valid non-overlapping interval,

then the interval is created for that Task without creating a duplicate Task.

## AC-005-004 — Manual Entry Can Create or Reuse by Typed Description

Given the user types a task description instead of selecting an existing task,

when the user saves a valid non-overlapping interval,

then the application reuses an exact normalized match if one exists, otherwise it
creates a new Task and then creates the interval for that Task.

## AC-005-005 — Save Creates One Closed Interval Without Changing Timer State

Given valid manual-entry input that does not overlap existing data,

when the user saves,

then exactly one closed interval is persisted, `AppState` remains unchanged, and
the current timer state is otherwise unaffected.

## AC-005-006 — End Must Be Later Than Start

Given the user enters a date, start time, and end time,

when the derived local end timestamp is earlier than or equal to the derived
local start timestamp,

then the save is rejected as `INVALID_MANUAL_INTERVAL` and no Task, interval, or
AppState mutation occurs.

## AC-005-007 — Overlap With Existing Closed Interval Is Rejected

Given a persisted closed interval already exists for any task,

when the user attempts to save a manual interval that overlaps that interval,

then the save is rejected as `TIME_INTERVAL_OVERLAP` and no persistence mutation
occurs.

## AC-005-008 — Overlap With Running Open Interval Is Rejected

Given a task is currently running with one open interval,

when the user attempts to save a manual interval that overlaps that open
interval's elapsed range,

then the save is rejected as `TIME_INTERVAL_OVERLAP`, the running timer remains
unchanged, and the user is not forced into an automatic pause or stop.

## AC-005-009 — Manual Entry Input Is Runtime Validated

Given malformed manual-entry input across the process boundary,

when the create API is invoked,

then the request is rejected as `INVALID_MANUAL_INTERVAL` before service or
repository mutation occurs.

## AC-005-010 — Successful Save Refreshes Authoritative Projections

Given a manual interval is saved successfully,

when the save completes,

then Daily History and any visible timer totals refresh from authoritative data so
the new recorded time is reflected without a full application reload.

## AC-005-011 — Controlled Failure Preserves Entered Values

Given the user has entered manual time details,

when save fails with a controlled validation, overlap, or missing-task error,

then the manual-entry UI remains open, shows an understandable error, and keeps
the entered values available for correction.

## AC-005-012 — Manual Entry Is Keyboard Accessible

Given the manual-entry UI is open,

when the user navigates by keyboard or assistive technology,

then all controls are reachable, labeled, visibly focusable, and usable without
pointer-only interaction.

---

# 16. Required Unit Tests

- manual-entry input runtime validation for exact object shape, task-source
  exclusivity, empty values, unknown properties, and malformed date/time strings;
- task-description normalization and reuse behavior for typed manual entry;
- service behavior for existing-task reuse, new-task creation, no-mutation
  validation failures, and overlap rejection;
- service behavior proving `AppState` remains unchanged on successful manual
  creation;
- controlled error mapping for missing explicit tasks, overlap failures, and
  invalid persisted state where unit seams are available.

---

# 17. Required Repository Tests

- disposable SQLite tests proving a valid manual entry creates exactly one closed
  interval with the correct task reference and persisted timestamps;
- disposable SQLite tests proving typed normalized-description matches reuse an
  existing Task instead of inserting a duplicate;
- disposable SQLite tests proving non-overlap detection rejects conflicts against
  existing closed intervals;
- disposable SQLite tests proving overlap detection rejects conflicts against the
  current open interval without mutating `AppState` or the open interval.

---

# 18. Required Integration Tests

- main-process integration tests covering successful manual entry from explicit
  task ID and typed description flows;
- integration tests covering controlled `TASK_NOT_FOUND`,
  `TIME_INTERVAL_OVERLAP`, and `INVALID_MANUAL_INTERVAL` outcomes;
- preload and IPC tests proving the explicit manual-entry API is exposed, routed,
  and runtime validated;
- renderer tests covering both entry points, prefilled history-day behavior,
  pending state, successful close-and-refresh behavior, controlled error
  presentation, and keyboard accessibility.
