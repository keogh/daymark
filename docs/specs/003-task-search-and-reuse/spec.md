# SPEC-003 — Task Search and Reuse

## Status

Ready for Implementation

## Milestone

M3 — Task Reuse and Switching

## Priority

P0

---

# 1. Objective

Let the user quickly find and restart a previously tracked task from the idle timer
without creating a duplicate task.

---

# 2. User Story

As an individual user,

I want recent and matching tasks suggested while entering work,

so that I can reuse an existing task and preserve its complete history and lifetime
total.

---

# 3. Background

SPEC-001 established persistent Tasks, exact normalized-description reuse, and the
idle Start flow. SPEC-002 exposed task daily and lifetime totals in Daily History.

Task suggestions make the existing idle flow useful for recurring work. This
specification covers discovery and explicit reuse while idle. Starting or switching
from a history row while another task is active remains a separate atomic behavior
for SPEC-004.

---

# 4. Scope

This specification includes:

- showing up to five recent tasks when the empty idle input has focus;
- searching existing tasks as the user types;
- case-insensitive substring matching after the project's established task-text
  normalization;
- deterministic prefix, substring, and recency ordering;
- suggestion rows containing description, today's duration, and lifetime duration;
- mouse and keyboard suggestion selection;
- starting an explicitly selected existing task by stable task ID;
- preserving the existing typed-description Start behavior;
- accessible combobox semantics and loading, empty, and recoverable error behavior;
- typed contracts across renderer, preload, IPC, and main process;
- runtime validation of suggestion and explicit-start inputs;
- repository, service, integration, boundary, and renderer tests.

---

# 5. Out of Scope

This specification does not implement:

- Play actions on history rows;
- starting or switching tasks while the timer is running or paused;
- automatic stop of the current task;
- task rename or deletion;
- a complete task-management view;
- manual time entry or interval editing;
- fuzzy, tokenized, phonetic, or typo-tolerant search;
- highlighting matching text within a suggestion;
- pagination or a “show all tasks” interface;
- task metadata beyond the existing description;
- persisted recent-task or search state;
- changes to Daily History ordering.

These behaviors belong to later specifications, especially SPEC-004 for one-click
task switching and SPEC-007 for task management.

---

# 6. Dependencies

Required earlier specifications:

- SPEC-001 — Core Time Tracking, status Verified;
- SPEC-002 — Daily History, status Verified.

The existing Task and TimeInterval schema, Clock abstraction, timer transaction,
typed preload boundary, AppResult contract, and renderer styling foundation are
reused.

---

# 7. Suggestion Model

Conceptual renderer-facing contracts:

```ts
interface TaskSuggestionInput {
  readonly query: string;
}

interface TaskSuggestionPage {
  readonly suggestions: TaskSuggestion[];
  readonly now: number;
}

interface TaskSuggestion {
  readonly task: {
    readonly id: string;
    readonly description: string;
  };
  readonly todayDurationMs: number;
  readonly lifetimeDurationMs: number;
  readonly mostRecentActivityAt: number;
}
```

The exact names may be refined during implementation, but the public contract must
preserve these semantics. The result contains at most five suggestions.

All duration projections in one result use the same authoritative `now` obtained
from the injected Clock. Today's boundaries use the current system timezone and
the calendar-boundary rules established by SPEC-002.

---

# 8. Search and Ordering

Before matching, the query is trimmed, consecutive internal whitespace is
collapsed, and text is compared case-insensitively using the same normalization
semantics used for exact task reuse.

An empty normalized query returns the five most recently active tasks.

A non-empty normalized query includes a task when its normalized description
contains the normalized query as a contiguous substring.

Results are ordered as follows:

1. descriptions beginning with the normalized query before other substring
   matches;
2. within either match group, later `mostRecentActivityAt` before earlier activity;
3. when activity timestamps are equal, normalized description in ascending order;
4. when all earlier keys are equal, task ID in ascending order.

For an empty query, the prefix grouping is omitted and the remaining ordering
applies.

`mostRecentActivityAt` is the latest `startedAt` of any interval belonging to the
task. Every task created through the verified product flow has at least one
interval. If legacy or anomalous data contains a task without an interval, it sorts
after tasks with activity, using description and ID as deterministic tie-breakers,
and its durations are zero.

No fuzzy or token-reordered matching is performed. For example, `auth` matches
`Implement authentication`, while `impl auth` does not unless that exact contiguous
normalized substring exists.

---

# 9. Duration Projection

Suggestion totals are projections over TimeIntervals and never stored counters.

For lifetime duration, each closed interval contributes:

```text
endedAt - startedAt
```

An open interval contributes through the response's authoritative `now`.

Today's duration uses the overlap between each interval and the current local
calendar day. Cross-midnight intervals, exact-midnight boundaries, daylight-saving
transitions, and an open interval follow the projection rules from SPEC-002.

The suggestion API remains correct if called while a timer is active, even though
this specification renders suggestions only in the idle timer view.

---

# 10. Data Model Changes

No database schema changes are required.

Do not add:

- a recent-tasks table;
- cached task totals;
- a last-used column maintained only for suggestions;
- full-text search infrastructure.

Existing indexes may be used. If implementation demonstrates that a new index is
necessary, add it through a migration and document the reason before expanding the
specification.

---

# 11. Application Service Behavior

Provide a task-query operation conceptually equivalent to:

```ts
TaskService.getSuggestions(input: TaskSuggestionInput): AppResult<TaskSuggestionPage>
```

The operation:

1. validates the complete input before querying;
2. obtains exactly one Clock snapshot;
3. normalizes the query;
4. retrieves and orders at most five matching tasks;
5. calculates today's and lifetime durations with that snapshot;
6. returns no mutable aggregate state.

The existing timer Start operation must additionally support an explicitly selected
task by stable ID. Its public input should be a discriminated union conceptually
equivalent to:

```ts
type StartTaskInput =
  | { readonly source: 'description'; readonly description: string }
  | { readonly source: 'existing-task'; readonly taskId: string };
```

Starting by description preserves SPEC-001 behavior: a valid normalized exact
match is reused, otherwise a new task is created.

Starting by task ID must:

- be accepted only while the timer is idle;
- resolve the task inside the existing atomic Start transaction;
- reuse that exact task regardless of the current input text;
- create one open interval and establish the normal running state;
- return `TASK_NOT_FOUND` without changing timer state or persistence if the task
  no longer exists.

This specification does not relax `TIMER_NOT_IDLE`. Starting or switching while
active is defined by SPEC-004.

---

# 12. IPC Contract

Expose one narrow task-suggestion API through preload:

```ts
interface TasksAPI {
  getSuggestions(
    input: TaskSuggestionInput,
  ): Promise<AppResult<TaskSuggestionPage>>;
}
```

The existing timer API exposes the revised discriminated Start input. Use explicit
IPC channels; do not expose raw `ipcRenderer`, a generic invoke function, database
objects, or query primitives.

Suggestion input and both Start variants must be runtime validated in the main
process boundary before application or persistence operations execute.

---

# 13. Renderer Behavior

Suggestions exist only while the authoritative timer state is idle.

When the idle task input receives focus:

- an empty input requests and displays recent tasks;
- a non-empty input requests and displays matching tasks;
- no more than five rows are displayed;
- the first returned suggestion is initially highlighted;
- a visible list remains associated with the input as an accessible combobox.

Each suggestion displays:

```text
Task description
Today 1h 45m · Total 8h 30m
```

Zero durations use the established compact duration format.

When text changes, the selected suggestion is cleared until the latest successful
result arrives, then the first result becomes highlighted. Results from an older
request must never replace results for a newer input value. A short debounce is an
allowed implementation detail, but the UI must remain responsive and tests must not
depend on wall-clock timing.

Interaction behavior:

- `ArrowDown` moves the highlight to the next suggestion and wraps from last to
  first;
- `ArrowUp` moves the highlight to the previous suggestion and wraps from first to
  last;
- `Enter` starts the highlighted suggestion immediately by task ID;
- if no suggestion is highlighted, `Enter` submits the current description through
  the description Start variant;
- clicking a suggestion selects and starts it immediately by task ID;
- `Escape` closes the suggestion list without changing the input;
- typing after Escape permits suggestions to open again for the new value;
- the Start button submits the typed description, not a merely highlighted
  suggestion;
- blur closes the list after allowing an intentional suggestion click to complete.

Starting a suggestion has the same pending protections as the existing Start
command. On success the normal running timer replaces the idle view and history is
authoritatively refreshed through the existing mechanism.

If no task matches a non-empty query, no result row is shown; the user can still
start the typed description as a new task. An empty database does not show an empty
message beneath the input.

---

# 14. Loading and Error Behavior

The initial recent-task request and later searches must not block typing or disable
the Start button.

While a request is pending, previously returned suggestions may be hidden. Do not
show a prominent loading spinner for normal local search latency.

If suggestion loading fails:

- keep the task input and typed-description Start action usable;
- show a compact, non-destructive message associated with the suggestion area;
- retry automatically when the query changes or the input is focused again;
- do not present the failure as a timer-state failure;
- do not expose internal exception text or stack traces.

If explicit task start returns `TASK_NOT_FOUND`, remain idle, close the stale
suggestion, show a controlled inline message, and refresh suggestions on the next
focus or query change.

---

# 15. Validation and Error Codes

`TaskSuggestionInput` must be a non-null object with exactly one `query` property.
The query must be a string. Empty and whitespace-only query strings are valid and
mean “recent tasks.” Unknown properties are rejected.

Apply the existing maximum task-description input length to suggestion queries so
the boundary accepts no larger input than the task field itself. Normalization may
produce an empty query.

The explicit Start variant must be a non-null object containing exactly:

```text
source = "existing-task"
taskId = non-empty string
```

The description Start variant must be a non-null object containing exactly:

```text
source = "description"
description = string satisfying existing task-description validation
```

Expected controlled error codes:

- `INVALID_TASK_SEARCH` — malformed suggestion input;
- `INVALID_TASK_DESCRIPTION` — invalid description Start input;
- `INVALID_START_TASK` — malformed Start discriminant, shape, or task ID;
- `TASK_NOT_FOUND` — a selected task ID no longer exists;
- `TIMER_NOT_IDLE` — Start was requested while running or paused;
- `TASK_SUGGESTIONS_UNAVAILABLE` — an expected suggestion query failure safe to
  expose at the UI boundary.

Unexpected persistence failures are logged locally without task descriptions or
query text and return a controlled generic failure.

---

# 16. Concurrency and Stale Results

The renderer may have multiple suggestion requests in flight. Only the result whose
request generation corresponds to the current input value and current idle view may
be rendered. Clearing, changing, blurring, starting, or leaving the idle view
invalidates older results.

Explicit reuse is resolved again by task ID inside the Start transaction. A
suggestion response does not guarantee the task still exists when Start executes.

Duplicate Start submissions are prevented by the existing renderer pending state
and authoritative transactional timer rules.

---

# 17. Accessibility Requirements

- The task input uses an accessible combobox pattern with `aria-expanded`,
  `aria-controls`, and the highlighted option identified through
  `aria-activedescendant` or an equivalent standards-compliant pattern.
- The suggestion container and rows expose listbox and option semantics.
- Highlighted state is communicated programmatically and with a visible treatment
  that does not rely only on color.
- Keyboard focus remains in the text input while arrow keys navigate suggestions.
- Suggestion descriptions and duration summaries have an understandable reading
  order.
- Loading, recoverable errors, and Start failures are announced without causing
  disruptive repeated announcements during normal typing.
- Existing visible focus, contrast, labels, and pending-state behavior remain
  intact.

---

# 18. Performance Considerations

Suggestion loading must use a bounded query strategy and return at most five rows.
Calculating totals must not issue one database query per suggestion.

The feature should remain responsive with thousands of tasks and intervals. A
case-insensitive substring search over the small local MVP dataset is acceptable;
full-text search and speculative indexing are not required.

The renderer must not fetch complete task or interval collections and filter them
locally.

---

# 19. Acceptance Criteria

## AC-003-001 — Empty Input Shows Recent Tasks

Given tasks with different latest interval start times,

when the idle task input receives focus while empty,

then at most five tasks are shown in descending recency order with deterministic
tie-breaking.

## AC-003-002 — Search Matches Normalized Substrings

Given existing tasks with varied casing and whitespace,

when the user types a query,

then matching is case-insensitive after established whitespace normalization and
only descriptions containing the contiguous normalized query are returned.

## AC-003-003 — Prefix Matches Are Prioritized

Given both prefix and non-prefix substring matches,

when suggestions are returned,

then prefix matches appear first and recency, normalized description, and task ID
provide the specified deterministic ordering within match groups.

## AC-003-004 — Suggestions Show Accurate Totals

Given closed, open, and cross-midnight intervals,

when suggestions are requested,

then each row's today and lifetime durations are calculated from timestamps using
one authoritative snapshot and current local-day boundaries.

## AC-003-005 — Keyboard Selection Reuses Exact Task

Given a highlighted suggestion in the idle combobox,

when the user navigates with arrow keys and presses Enter,

then the selected task ID is started, no duplicate Task is created, and the timer
enters the normal running state for that task.

## AC-003-006 — Pointer Selection Reuses Exact Task

Given a visible suggestion,

when the user clicks it,

then that task starts immediately by ID without creating a duplicate.

## AC-003-007 — Typed Start Behavior Is Preserved

Given no suggestion is highlighted or the user activates the Start button,

when a valid description is submitted,

then the existing exact normalized task is reused or a new task is created according
to SPEC-001.

## AC-003-008 — Combobox Opens and Closes Predictably

Given the idle task input,

when focus, text input, Escape, blur, or a successful Start occurs,

then the suggestion list opens, updates, closes, and invalidates stale results as
specified without losing typed text unexpectedly.

## AC-003-009 — Stale Responses Cannot Replace Current Results

Given two suggestion requests complete out of order,

when the older request finishes last,

then only the response for the current input and request generation is rendered.

## AC-003-010 — Empty Results Permit New Work

Given no task matches a non-empty query,

when the result is empty,

then no option row is shown and the user can still start the typed description.

## AC-003-011 — Suggestion Failure Is Recoverable

Given a suggestion request fails,

when the idle form remains visible,

then a compact controlled error is shown, typing and typed Start remain usable, and
a later focus or query change retries loading.

## AC-003-012 — Deleted Selection Is Controlled

Given a suggested task no longer exists at Start time,

when explicit Start resolves the task ID,

then `TASK_NOT_FOUND` is returned, no interval or timer-state change occurs, and the
idle UI presents a recoverable inline message.

## AC-003-013 — Active Start Remains Rejected

Given the timer is running or paused,

when either Start input variant reaches this specification's Start operation,

then `TIMER_NOT_IDLE` is returned and no persistence is changed.

## AC-003-014 — IPC Inputs Are Runtime Validated

Given malformed, oversized, or unknown-property suggestion and Start inputs,

when they reach IPC,

then controlled validation errors are returned before any query or timer mutation.

## AC-003-015 — Search Is Bounded

Given thousands of tasks and intervals,

when suggestions are requested,

then no more than five results are returned and total calculation does not perform
one query per result.

## AC-003-016 — Combobox Is Accessible

Given a keyboard or assistive-technology user,

when suggestions are used,

then the input, listbox, active option, status, errors, and focus behavior satisfy
the accessibility requirements in section 17.

## AC-003-017 — Later Milestone Behavior Is Absent

Given Daily History or an active timer,

when SPEC-003 is complete,

then no history-row Play action, active-task switching, task management, or interval
management behavior has been introduced.

---

# 20. Required Unit Tests

- query and Start-input runtime validation, including exact shapes, unknown fields,
  length limits, invalid discriminants, and normalization;
- prefix versus substring classification and deterministic tie-breaking;
- five-result limiting and empty-query semantics;
- renderer selection movement, wrapping, Escape, and stale-request generation;
- duration formatting reuse where new presentation paths require coverage.

---

# 21. Required Repository Tests

Using disposable SQLite databases, verify:

- empty-query recency ordering and five-row limit;
- case-insensitive normalized substring matching;
- prefix prioritization and every deterministic tie-breaker;
- tasks without intervals sort last safely;
- today and lifetime aggregation for repeated, open, cross-midnight, and
  exact-boundary intervals;
- result and query counts remain bounded rather than one query per suggestion;
- suggestion reads do not mutate stored data.

---

# 22. Required Integration Tests

- TaskService returns one-snapshot suggestions with correct ordering and totals;
- suggestion calls traverse the typed preload and IPC boundary;
- invalid IPC input does not invoke repository queries;
- explicit existing-task Start reuses the selected ID atomically;
- a missing selected task returns `TASK_NOT_FOUND` without mutation;
- both Start variants retain `TIMER_NOT_IDLE` behavior;
- successful reuse causes the existing authoritative history-refresh path to run.

---

# 23. Required UI Tests

- focus with empty input loads and renders recent tasks;
- typing renders matching tasks and the first result is highlighted;
- suggestion rows display description, today duration, and lifetime duration;
- Arrow Up/Down wrap and Enter starts the highlighted ID;
- clicking an option starts its ID;
- Start button submits the typed description independently of the highlight;
- Escape and blur close the list with correct focus and click behavior;
- out-of-order responses do not render stale suggestions;
- empty results preserve typed Start;
- loading does not block input or Start;
- recoverable suggestion and missing-task errors behave as specified;
- successful Start transitions to the verified running view and refreshes history;
- combobox roles, relationships, active option, announcements, and visible states
  are accessible.

---

# 24. Migration Tests

Not applicable. No schema change is required.

---

# 25. Security Considerations

The renderer receives only bounded task summaries and derived durations through an
explicit preload API. It does not receive database handles, unrestricted IPC, or
complete interval collections.

Both suggestion and Start payloads are untrusted process-boundary input and require
runtime validation. Logs must not include task descriptions or user-entered search
queries.

---

# 26. Definition of Done

This specification is complete when:

- AC-003-001 through AC-003-017 pass;
- all required unit, repository, integration, boundary, and UI tests pass;
- existing timer and Daily History tests remain green;
- `npm run format:check` passes;
- `npm run typecheck` passes;
- `npm run lint` passes;
- `npm test` passes;
- `npm run package` succeeds on the primary development platform;
- development and packaged smoke tests cover mouse and keyboard reuse;
- architecture and renderer security boundaries are preserved;
- documentation and `docs/progress.md` match the implementation;
- no SPEC-004 or later behavior is introduced.

---

# 27. Implementation Notes for Codex

Prefer the smallest bounded query and UI implementation satisfying this
specification. Reuse the local-day projection and duration-formatting primitives
established by SPEC-002 where their semantics already match.

Do not fetch all tasks into the renderer, persist suggestion state, or add search
infrastructure without demonstrated need.

Complete one unblocked task from `tasks.md` at a time and maintain `docs/plan.md`
for only that active task.
