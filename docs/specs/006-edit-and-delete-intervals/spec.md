# SPEC-006 — Edit and Delete Intervals

> Historical acceptance record: SPEC-020 and DEC-039 supersede this
> specification's edit-specific and global non-overlap requirements. Manual
> interval creation and the single-open-interval invariant remain unchanged.

## Status

Verified

## Milestone

M4 — Interval Management

## Priority

P0

---

# 1. Objective

Let the user correct or remove existing recorded work from Daily History without
direct database access, while preserving timestamp-based source of truth,
cross-day projections, timer state, and global non-overlap invariants.

---

# 2. User Story

As an individual user,

I want to edit or delete an incorrectly recorded time interval,

so that my history and derived totals accurately represent the work I performed.

---

# 3. Background

SPEC-001 established timestamp-based intervals and authoritative timer state.
SPEC-002 established Daily History as a local-calendar projection and included
intervals in expanded task rows. SPEC-005 added creation of closed manual
intervals with global overlap detection.

This specification completes the M4 correction workflow by adding editing and
deletion for existing closed intervals. It does not introduce task management.

---

# 4. Scope

This specification includes:

- expanding a Daily History task row to inspect intervals contributing to that
  task's selected-day duration;
- Edit and Delete actions for each closed interval;
- editing an interval's start and end local dates and times;
- support for editing valid cross-midnight and multi-day closed intervals;
- preserving the interval's Task association during edit;
- validation that an edited interval has a valid range;
- validation that an edited interval does not overlap any other persisted
  interval, including the currently running open interval;
- deletion confirmation showing the Task, interval range, and duration removed;
- deleting exactly one closed interval without deleting its Task;
- authoritative refresh of history and timer projections after successful edit
  or deletion;
- typed contracts across renderer, preload, IPC, and main process;
- runtime validation of edit and delete commands;
- repository, service, integration, boundary, and renderer tests.

---

# 5. Out of Scope

This specification does not implement:

- changing an interval's Task association;
- editing or deleting an open interval;
- creating intervals, which remains covered by SPEC-005;
- task rename or deletion;
- assisted overlap resolution such as trim, split, merge, or replace;
- bulk interval editing or deletion;
- undo or trash recovery;
- interval notes, labels, tags, projects, or clients;
- automatic pause, stop, or timer correction during an edit;
- tray-based interval management;
- analytics-specific correction flows.

---

# 6. Dependencies

Required earlier specifications:

- SPEC-001 — Core Time Tracking, status Verified;
- SPEC-002 — Daily History, status Verified;
- SPEC-003 — Task Search and Reuse, status Verified;
- SPEC-004 — One-Click Task Switching, status Verified;
- SPEC-005 — Manual Time Entry, status Verified.

The existing Task and TimeInterval schemas, local-day projection rules, typed
preload boundary, AppResult contract, transactional database access, and global
overlap semantics are reused.

---

# 7. Domain Behavior

Only a persisted closed `TimeInterval` may be edited or deleted by this feature.
An open interval is authoritative running-timer state and must not be mutated
through correction commands.

Edit behavior:

- changes only `startedAt`, `endedAt`, and the interval's normal update metadata;
- preserves the interval ID and Task association;
- requires `startedAt < endedAt`;
- may move the interval to another local day;
- may create or preserve a cross-midnight or multi-day interval;
- must not overlap any other closed interval;
- must not overlap the elapsed range of a currently running open interval;
- excludes the target interval itself from overlap detection;
- treats touching boundaries as valid non-overlap;
- must be atomic and leave all persistence unchanged on failure.

Delete behavior:

- deletes exactly the selected closed interval;
- does not delete or otherwise mutate its Task, even when it was the Task's last
  interval;
- may remove the Task from history projections if it has no remaining duration
  in the visible range;
- must be atomic and leave all persistence unchanged on failure.

Editing or deleting a closed interval must not change timer status, current Task,
session start metadata, or the current open interval. Because timer summaries are
projections over persisted intervals, an edit or deletion involving a closed
interval from the current session may change its displayed elapsed totals after
the authoritative refresh.

When one cross-day interval contributes to multiple displayed days, every
projection refers to the same persisted interval ID. Editing or deleting it from
any displayed day affects that single interval and refreshes every affected day.

---

# 8. Data Model Changes

No database schema changes are required.

Do not add mutable duration totals, soft-delete columns, interval revisions, or
draft persistence.

Existing invariants remain mandatory:

- only one interval may be open globally;
- an interval end must be later than its start;
- interval Task references must be valid;
- persisted intervals must not overlap globally;
- timer state transitions must remain atomic.

---

# 9. Application Service Behavior

Add interval correction operations conceptually equivalent to:

```ts
interface UpdateIntervalInput {
  readonly intervalId: string;
  readonly startDate: string;
  readonly startTime: string;
  readonly endDate: string;
  readonly endTime: string;
}

interface DeleteIntervalInput {
  readonly intervalId: string;
}

interface IntervalMutationResult {
  readonly intervalId: string;
}

IntervalService.update(
  input: UpdateIntervalInput,
): Promise<AppResult<IntervalMutationResult>>;

IntervalService.delete(
  input: DeleteIntervalInput,
): Promise<AppResult<IntervalMutationResult>>;
```

Exact naming may follow established repository conventions, but the renderer
boundary must remain explicit and narrowly typed.

The update operation must:

1. validate the full input before persistence work;
2. convert both local date/time pairs to UTC epoch milliseconds using the user's
   local timezone;
3. reject an end timestamp that is not later than the start timestamp;
4. load the target interval within the mutation transaction;
5. reject a missing target with a controlled error;
6. reject an open target without mutating timer or interval state;
7. detect overlap against all other closed intervals while excluding the target;
8. detect overlap against the current open interval's elapsed range;
9. update exactly one interval and commit once;
10. leave Task association and AppState unchanged;
11. return a controlled error without mutation on validation, missing-target,
    open-target, or overlap failure.

The delete operation must:

1. validate the full input before persistence work;
2. load the target interval within the mutation transaction;
3. reject a missing target with a controlled error;
4. reject an open target without mutating timer or interval state;
5. delete exactly one interval and commit once;
6. leave its Task and AppState unchanged;
7. return a controlled error without mutation on validation, missing-target, or
   open-target failure.

If persisted state is invalid or a transactional invariant fails unexpectedly,
the operation must roll back, return a controlled generic failure, and log the
technical issue locally without logging user-created Task descriptions.

---

# 10. IPC Contract

Expose one narrow interval-management API through preload:

```ts
interface IntervalsAPI {
  update(
    input: UpdateIntervalInput,
  ): Promise<AppResult<IntervalMutationResult>>;
  delete(
    input: DeleteIntervalInput,
  ): Promise<AppResult<IntervalMutationResult>>;
}
```

Conceptual IPC channels:

```text
intervals:update
intervals:delete
```

Do not expose raw `ipcRenderer`, generic invoke/send helpers, database objects,
or unrestricted interval mutation access.

The main-process boundary must runtime-validate both command shapes before
application or persistence logic executes.

---

# 11. Renderer Behavior

Daily History task rows remain expandable by activating the row body. The Play or
Resume action remains a separate control and must not toggle expansion.

An expanded task row shows the intervals contributing to that task's duration on
the selected day:

```text
▼ Implement authentication
  1h 45m today · 8h 30m total

    09:10 – 10:15       1h 05m       ⋯
    11:30 – 12:10          40m       ⋯

    + Add time
```

Each closed interval exposes Edit and Delete actions. A running open interval may
remain visible for inspection but must not expose enabled correction actions.

The displayed row is a selected-day projection. For a cross-day interval, its
row may show clipped day-boundary times and duration, while Edit and Delete act
on the complete underlying interval.

## Edit Surface

Edit opens a compact modal or dialog with read-only Task context and editable
start and end date/time fields:

```text
Edit Time

Task
Implement authentication

Start date       Start time
[ Aug 13, 2026 ] [ 23:30 ]

End date         End time
[ Aug 14, 2026 ] [ 01:15 ]

                         Cancel   Save
```

The form is initialized from the complete persisted interval timestamps, not the
clipped selected-day projection. Therefore the history query or a narrow interval
read contract must provide enough information to recover the complete start and
end values safely.

Edit behavior:

- Cancel closes without mutation;
- Save is disabled until all fields have a syntactically valid shape;
- duplicate submissions are prevented while pending;
- a controlled failure keeps the dialog open, preserves entered values, and
  presents an understandable inline error;
- success closes the dialog and authoritatively refreshes history and timer
  projections;
- if the interval moves out of the currently visible day or range, it may
  disappear from that projection after refresh.

## Delete Confirmation

Delete opens a confirmation dialog before making a mutation:

```text
Delete this time entry?

Aug 13, 11:30 PM → Aug 14, 1:15 AM
Implement authentication

This removes 1h 45m from your tracked time.

Cancel       Delete
```

The confirmation must identify the Task, show the complete interval range, and
state the complete duration removed. Same-day ranges may use a compact format;
cross-day ranges must communicate both dates unambiguously.

Delete behavior:

- Cancel closes without mutation;
- confirmation invokes Delete once and prevents duplicate submissions while
  pending;
- a controlled failure keeps or restores actionable UI and communicates the
  failure without falsely showing success;
- success closes the confirmation and authoritatively refreshes history and timer
  projections.

---

# 12. Validation

`UpdateIntervalInput` must be an exact plain object containing:

```text
intervalId: string
startDate: string
startTime: string
endDate: string
endTime: string
```

Validation rules:

- unknown properties are rejected;
- every field must be a non-empty string with no leading or trailing whitespace;
- `intervalId` must satisfy the established entity-ID format;
- dates must be valid local calendar date strings in the chosen renderer format;
- times must be valid local time strings in the chosen renderer format;
- the converted end timestamp must be later than the converted start timestamp;
- nonexistent or normalized-invalid local date/time combinations are rejected;
- the edited range must not overlap another interval;
- no maximum duration or prohibition on future timestamps is introduced by this
  specification.

`DeleteIntervalInput` must be an exact plain object containing only a valid,
trimmed `intervalId` string.

The service must repeat all material invariant checks inside its transaction even
when renderer and IPC validation have already passed.

---

# 13. Error Behavior

Expected controlled error codes:

- `INVALID_INTERVAL_UPDATE` — malformed edit input or an end not later than its
  start;
- `INVALID_INTERVAL_DELETE` — malformed delete input;
- `TIME_INTERVAL_NOT_FOUND` — the target no longer exists;
- `OPEN_INTERVAL_NOT_EDITABLE` — the target is open and cannot be edited or
  deleted through this feature;
- `TIME_INTERVAL_OVERLAP` — the edited range overlaps another closed interval or
  the current open interval;
- `INTERNAL_ERROR` — unexpected failure or invalid persisted state safely mapped
  at the boundary.

Equivalent names may be consolidated if an existing controlled code precisely
represents the behavior, but validation, missing-target, open-target, overlap, and
unexpected failures must remain distinguishable where the UI response differs.

No internal stack trace, SQL detail, or user-created Task description may be
included in boundary error details or technical logs beyond what is necessary for
the visible confirmation UI.

---

# 14. Edge Cases

- Editing an interval to its existing timestamps is a valid idempotent success;
  it must not be rejected as overlapping itself.
- An edited interval may touch another interval's start or end boundary.
- A closed interval belonging to the Task currently loaded in a paused or running
  session may be edited or deleted; AppState and any open interval remain
  unchanged, while derived timer totals refresh.
- A cross-day interval may appear under multiple days. Actions from any projection
  mutate the same interval once.
- If another action edits or deletes the target before submission, the stale
  command returns `TIME_INTERVAL_NOT_FOUND` and does not recreate data.
- If another action starts a conflicting open interval before edit submission,
  the edit is rejected as overlap without altering the running timer.
- Deleting a Task's last interval leaves the Task intact.
- Editing an interval may add or remove history days and may change ordering within
  a day after authoritative refresh.
- Daylight-saving transitions use the platform's local-time conversion behavior;
  nonexistent local values are rejected and persisted timestamps remain
  authoritative.
- Restart recovery requires no special handling because completed mutations are
  persisted atomically.

---

# 15. Acceptance Criteria

## AC-006-001 — Expanded History Shows Interval Actions

Given a Daily History task row contains at least one closed interval,

when the user expands the row,

then each closed interval contributing to that day shows its projected range,
duration, and accessible Edit and Delete actions.

## AC-006-002 — Edit Opens With Complete Persisted Values

Given a closed interval is visible in an expanded history row,

when the user activates Edit,

then a compact edit dialog opens with read-only Task context and start/end date
and time fields initialized from the complete interval rather than its clipped
day projection.

## AC-006-003 — Valid Edit Updates One Interval

Given a closed interval and a valid non-overlapping edited range,

when the user saves,

then exactly that interval retains its ID and Task association, receives the new
timestamps, and no Task or AppState mutation occurs.

## AC-006-004 — Cross-Day Edit Is Supported

Given the user enters valid start and end date/time pairs spanning more than one
local calendar day,

when the range does not overlap another interval and Save succeeds,

then one unsplit closed interval is persisted and every affected local-day
projection reflects its appropriate overlap.

## AC-006-005 — Invalid Range Is Rejected Without Mutation

Given edit input whose derived end is earlier than or equal to its start,

when the user attempts to save,

then the edit is rejected as `INVALID_INTERVAL_UPDATE`, the entered values remain
available for correction, and no persistence mutation occurs.

## AC-006-006 — Edit Overlap Is Rejected

Given another closed interval or a currently running open interval conflicts with
the proposed edited range,

when the user saves,

then the edit is rejected as `TIME_INTERVAL_OVERLAP`, no interval or AppState is
mutated, and a running timer remains running.

## AC-006-007 — Edit Excludes Its Own Interval

Given the edited interval is the only interval intersecting its proposed range,

when the user saves unchanged or otherwise valid timestamps,

then the edit is not rejected as overlap with itself.

## AC-006-008 — Delete Requires Informative Confirmation

Given a closed interval is visible in history,

when the user activates Delete,

then no mutation occurs until a confirmation identifies the Task, complete
interval range, complete duration removed, and the user confirms Delete.

## AC-006-009 — Confirmed Delete Removes Only the Interval

Given the user confirms deletion of an existing closed interval,

when deletion succeeds,

then exactly that interval is removed while its Task, all other intervals, and
AppState remain unchanged.

## AC-006-010 — Open Intervals Cannot Be Corrected

Given a history projection contains a currently open interval,

when correction controls are rendered or a forged update/delete command targets
that interval,

then enabled correction actions are unavailable and the boundary command returns
`OPEN_INTERVAL_NOT_EDITABLE` without mutation.

## AC-006-011 — Missing Targets Fail Safely

Given an interval was deleted after its correction UI opened,

when the stale edit or delete command is submitted,

then the operation returns `TIME_INTERVAL_NOT_FOUND`, communicates the failure,
and does not create or mutate another interval.

## AC-006-012 — Successful Mutations Refresh Authoritative Projections

Given an edit or deletion succeeds,

when the renderer handles the result,

then visible history and timer totals refresh from authoritative APIs so affected
days, Task totals, ordering, and current-session totals are accurate.

## AC-006-013 — Boundary Inputs Are Runtime Validated

Given malformed, incomplete, or extra-property update or delete input crosses the
renderer boundary,

when the corresponding API is invoked,

then the command is rejected with its controlled validation error before service
mutation logic executes.

## AC-006-014 — Correction UI Is Keyboard Accessible

Given interval actions or a correction dialog is visible,

when the user navigates by keyboard or assistive technology,

then all controls are labeled, reachable, visibly focusable, and operable without
a pointer, dialog focus is managed, and status is not communicated only by color.

---

# 16. Required Unit Tests

- exact-shape runtime validation for update and delete inputs, including malformed
  IDs, unknown properties, invalid dates/times, and invalid ranges;
- service update behavior for valid, unchanged, cross-day, missing, open-target,
  closed-overlap, and running-overlap cases;
- service delete behavior for valid, missing, and open-target cases;
- no-mutation behavior for every controlled failure;
- controlled mapping of invalid persisted state and unexpected failures;
- complete-versus-projected interval formatting helpers where introduced.

---

# 17. Required Repository Tests

- update exactly one closed interval while preserving ID and Task ID;
- exclude the target interval from overlap detection;
- reject or safely fail updates targeting an open or missing interval;
- delete exactly one closed interval without deleting its Task or other intervals;
- reject or safely fail deletion targeting an open or missing interval;
- transaction rollback when update or delete persistence fails.

---

# 18. Required Integration Tests

- disposable-SQLite edit flow through service and repository, including a
  cross-day interval and updated day/lifetime projections;
- global overlap rejection against another closed interval and a running open
  interval without AppState mutation;
- deletion of a Task's last interval while preserving the Task;
- mutation of a closed interval belonging to the current session with accurate
  authoritative timer refresh and unchanged timer status;
- preload and IPC tests proving both explicit APIs are exposed, routed, runtime
  validated, and safely error-mapped.

---

# 19. Required UI Tests

- row expansion and separate Play/Resume versus expansion behavior;
- closed interval Edit/Delete actions and absence of enabled actions for a running
  open interval;
- edit form initialization from complete timestamps, including cross-day data;
- edit cancel, pending state, duplicate-submission prevention, controlled failure
  value preservation, and successful close-and-refresh behavior;
- informative delete confirmation, cancel behavior, pending state, controlled
  failure behavior, and successful close-and-refresh behavior;
- disappearance or movement of an edited/deleted row after authoritative refresh;
- keyboard operation, labels, focus management, visible focus, and non-color-only
  status communication.

---

# 20. Migration Tests

Not applicable. No schema migration is required.

---

# 21. Security Considerations

- Renderer code uses only the explicit preload interval APIs.
- Main-process handlers runtime-validate exact command shapes.
- Interval existence, closed status, overlap, and mutation invariants are checked
  authoritatively inside the transaction.
- Expected failures return controlled errors without stack traces or SQL details.
- Technical logs avoid user-created Task descriptions.

---

# 22. Performance Considerations

- History expansion must reuse bounded history-page data or a narrow interval
  read; it must not load the complete database into the renderer.
- Overlap checks should use indexed timestamp predicates and exclude the target by
  ID in the query or transaction logic.
- Edit and delete each perform one bounded transaction and one authoritative UI
  refresh, not repeated writes or per-second work.
- No cached totals are introduced; projections remain query-derived.

---

# 23. Accessibility Requirements

- Expansion controls expose `aria-expanded` and `aria-controls`.
- Interval action controls have names that identify both action and interval.
- Menus and dialogs support keyboard opening, traversal, activation, and escape or
  Cancel behavior.
- Modal focus moves into the dialog, remains contained while open, and returns to
  the invoking action when practical.
- Validation and mutation errors are programmatically associated with the relevant
  surface.
- Pending and error states are communicated through text or semantics, not color
  alone.

---

# 24. Definition of Done

This specification is complete when:

- all acceptance criteria pass;
- required unit, repository, integration, boundary, and UI tests pass;
- `npm run typecheck` passes;
- `npm run lint` passes;
- `npm test` passes;
- `npm run package` passes;
- packaged-app smoke verification covers expanding intervals, editing a valid
  interval, rejected overlap, delete cancellation, and confirmed deletion;
- architecture boundaries are respected;
- documentation and `docs/progress.md` match implementation;
- no unrelated features are added.

---

# 25. Implementation Notes for Codex

Prefer extending the existing manual-time date conversion, AppResult, history
refresh, dialog, and transaction patterns where their semantics match.

Do not infer complete editable timestamps from clipped history values. Extend the
history interval contract or add one narrow read operation so the edit dialog uses
authoritative persisted bounds.

Keep Task management deferred to SPEC-007. Editing an interval must not expose a
Task selector.

Prefer the smallest implementation satisfying this specification. If an
architectural conflict is discovered, document it before changing architecture.
