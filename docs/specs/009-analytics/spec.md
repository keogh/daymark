# SPEC-009 — Analytics

## Status

Verified

## Milestone

M7 — Analytics

## Priority

P1

---

# 1. Objective

Provide a calm, accurate, read-only Analytics view that helps the user understand
their recent tracked time without introducing productivity scoring or mutable
summary data.

The view must provide:

- selectable Last 7 days and Last 30 days ranges;
- one duration value for every local calendar day in the selected range;
- the selected-range total and daily average;
- the current calendar-week and calendar-month totals;
- the five highest-duration Tasks in the selected range;
- a simple accessible bar chart;
- live presentation of an open interval from an authoritative snapshot.

All values remain projections over Tasks and TimeIntervals. Analytics must not
persist totals, averages, rankings, or daily summary records.

---

# 2. User Story

As an individual user,

I want to see how much time I tracked recently and which Tasks received most of
that time,

so that I can reflect on my work without exporting data or manually calculating
totals.

---

# 3. Background

SPEC-001 established timestamp-based TimeIntervals and an injected Clock.
SPEC-002 established DST-safe local-calendar-day projection, authoritative
snapshot times, and renderer-local animation of an open interval. SPEC-005 and
SPEC-006 made historical intervals mutable through controlled service operations,
and SPEC-007 made Task descriptions and existence mutable. SPEC-008 establishes
main-to-renderer timer-state notification for commands that originate outside the
renderer.

DEC-028 limits MVP analytics to 7-day and 30-day views, time per day, total, daily
average, current-week total, current-month total, and top Tasks. This specification
defines the precise range, ordering, presentation, refresh, and accessibility
semantics required to implement that decision.

The forthcoming Settings specification will allow Monday or Sunday as the start
of the week. Until that setting exists, SPEC-009 deliberately defines Monday as
the start of the current calendar week. SPEC-010 may replace that fixed boundary
with the persisted user preference without changing the underlying interval source
of truth.

---

# 4. Scope

This specification includes:

- a top-level Timer and Analytics navigation control;
- a separate Analytics renderer view;
- Last 7 days and Last 30 days range selection;
- local-calendar-day buckets including zero-duration days;
- selected-range total duration;
- selected-range daily average with an explicit 7-day or 30-day denominator;
- current Monday-based calendar-week total;
- current local calendar-month total;
- the five highest-duration Tasks in the selected range;
- deterministic ranking and tie-breaking;
- a simple noninteractive daily-duration bar chart;
- accessible textual values for every chart datum;
- loading, empty, stale-data, retryable error, and range-switch states;
- inclusion and renderer-local advancement of the current open interval;
- authoritative refresh after relevant timer, interval, and Task mutations;
- refresh on window focus, local midnight, and periodic reconciliation;
- typed analytics contracts across renderer, preload, IPC, and main process;
- runtime validation of Analytics IPC input;
- bounded, set-based Analytics queries over interval source data;
- service, projection, repository, integration, boundary, renderer, and packaged
  acceptance coverage.

---

# 5. Out of Scope

This specification does not implement:

- arbitrary or custom date ranges;
- previous-period comparison;
- week-over-week or month-over-month trends;
- productivity scores, goals, recommendations, streaks, or forecasts;
- billable time, rates, money, clients, projects, tags, or categories;
- clicking chart bars to filter or navigate;
- chart tooltips or hover-only information;
- task drill-down from Analytics;
- starting, switching, renaming, or deleting a Task from Analytics;
- editing, deleting, or creating intervals from Analytics;
- CSV, JSON, image, or report export;
- printing or sharing;
- persisted Analytics caches, totals, averages, or rankings;
- background aggregation jobs;
- a third-party charting library unless implementation demonstrates a need that
  cannot reasonably be met by existing renderer capabilities;
- Sunday week-start behavior or a week-start setting;
- Settings navigation or a Settings placeholder;
- dark-mode behavior;
- global keyboard shortcuts;
- redesign of the verified Timer and Daily History workflows.

---

# 6. Dependencies

Required earlier specifications:

- SPEC-001 — Core Time Tracking, status Verified;
- SPEC-002 — Daily History, status Verified;
- SPEC-005 — Manual Time Entry, status Verified;
- SPEC-006 — Edit and Delete Intervals, status Verified;
- SPEC-007 — Task Management, status Verified;
- SPEC-008 — System Tray and Window Lifecycle, status Verified before
  implementation of SPEC-009 begins.

SPEC-003 and SPEC-004 remain regression-sensitive because their Timer-view Task
reuse and switching behavior must remain unchanged.

SPEC-009 reuses:

- the injected Clock abstraction;
- local-calendar boundary and interval-overlap semantics;
- the Task and TimeInterval schema;
- the AppResult error contract;
- the typed contextBridge boundary;
- the timer-state notification and authoritative revision behavior completed by
  SPEC-008;
- semantic renderer theme tokens and selected source-owned UI primitives.

No incomplete future specification is required to calculate Analytics. Monday is
the complete week-start rule for SPEC-009.

---

# 7. Analytics Projection Model

Analytics is calculated at one authoritative snapshot time supplied by the
injected Clock.

Conceptual renderer-facing contracts:

```ts
type AnalyticsRange = 'last-7-days' | 'last-30-days';

interface AnalyticsSummaryInput {
  range: AnalyticsRange;
}

interface AnalyticsSummary {
  range: AnalyticsRange;
  rangeStartedAt: number;
  rangeEndedAt: number;
  capturedAt: number;
  days: AnalyticsDay[];
  totalDurationMs: number;
  dailyAverageDurationMs: number;
  currentWeek: AnalyticsPeriodTotal;
  currentMonth: AnalyticsPeriodTotal;
  topTasks: AnalyticsTaskTotal[];
  runningTask: AnalyticsRunningTask | null;
}

interface AnalyticsDay {
  dayStartedAt: number;
  dayEndedAt: number;
  durationMs: number;
}

interface AnalyticsPeriodTotal {
  periodStartedAt: number;
  periodEndedAt: number;
  durationMs: number;
}

interface AnalyticsTaskSummary {
  id: string;
  description: string;
}

interface AnalyticsTaskTotal {
  task: AnalyticsTaskSummary;
  durationMs: number;
  mostRecentActivityAt: number;
}

interface AnalyticsRunningTask extends AnalyticsTaskTotal {
  intervalStartedAt: number;
}
```

Names may be refined during implementation, but the public contract must preserve
these semantics.

All timestamps are UTC epoch milliseconds. Calendar boundary timestamps represent
local calendar boundaries converted to epoch milliseconds.

`rangeStartedAt`, day and period starts are inclusive. `rangeEndedAt`, day and
period ends are exclusive. Contribution from an open interval is capped at
`capturedAt`; no response projects tracked time into the future portion of Today.

`capturedAt` is the one authoritative time used for every value in a response.

---

# 8. Data Model Changes

No database schema changes are required.

Do not add:

- analytics summary tables;
- daily, weekly, or monthly total columns;
- mutable Task duration columns;
- cached rankings;
- chart-specific persistence;
- split records for cross-midnight intervals.

If query measurement demonstrates that an additional index is required, document
the query plan and add the index through a migration before expanding this
specification. No migration is planned for the specified implementation.

---

# 9. Selected Range Semantics

Both selected ranges include Today as a partial local calendar day:

```text
Last 7 days  = Today and the previous 6 local calendar days
Last 30 days = Today and the previous 29 local calendar days
```

For either range:

```text
rangeStartedAt = local midnight at the start of the oldest included day
rangeEndedAt   = local midnight immediately after Today
```

The day array must contain exactly 7 or 30 entries, including days with zero
tracked duration, ordered oldest first. This order is the visual chart order.

Range calculations use local calendar operations. They must not subtract a fixed
multiple of 24 hours because daylight-saving transitions and other timezone offset
changes can make a local day shorter or longer than 24 hours.

The current system timezone is applied when a summary is requested. After a
timezone change, the next authoritative refresh rebuilds all selected-range,
week, and month projections using the new local timezone.

---

# 10. Current Week and Current Month

For SPEC-009, the current week begins Monday at local midnight and ends at the
following Monday at local midnight.

The current month begins at local midnight on the first calendar day of the
current month and ends at local midnight on the first calendar day of the next
month.

Week and month totals:

- are always for the calendar periods containing `capturedAt`;
- are independent of the selected 7-day or 30-day range;
- include closed interval overlap with the period;
- include an open interval only through `capturedAt`;
- use local-calendar boundaries and do not assume fixed-duration days;
- remain visible even when the selected range contains no tracked time.

Changing the selected range must not change the current-week or current-month
period boundaries or authoritative totals, except for ordinary elapsed time
between independently captured responses.

SPEC-010 may make the current-week start configurable. It must not reinterpret
already stored intervals or persist a weekly total.

---

# 11. Interval Contribution

For a closed interval:

```text
effectiveEnd = min(interval.endedAt, capturedAt)
```

For the single open interval:

```text
effectiveEnd = capturedAt
```

For any selected day or period:

```text
projectedStartedAt = max(interval.startedAt, periodStartedAt)
projectedEndedAt   = min(effectiveEnd, periodEndedAt)
durationMs         = max(0, projectedEndedAt - projectedStartedAt)
```

An interval contributes only when its projected duration is positive. An interval
that crosses local midnight contributes independently to each affected day but
remains one stored database interval.

Intervals beginning in the future relative to `capturedAt` contribute zero. A
closed interval whose stored end is later than `capturedAt` is capped at
`capturedAt` for defensive snapshot consistency.

All selected-range, day, week, month, and Task totals in one response must use the
same `capturedAt`.

---

# 12. Selected-Range Total and Daily Average

The selected-range total is:

```text
totalDurationMs = sum(days[].durationMs)
```

The daily-average denominator is every calendar day in the selected range,
including zero-duration days and the partial current day:

```text
Last 7 days:  dailyAverageDurationMs = floor(totalDurationMs / 7)
Last 30 days: dailyAverageDurationMs = floor(totalDurationMs / 30)
```

The floor operation ensures the public duration remains an integer number of
milliseconds. Normal UI duration formatting may round or truncate sub-minute
display according to the established shared duration formatter, but tests of the
projection use the exact integer-millisecond result.

The renderer must label the denominator explicitly as:

```text
Daily average · 7 days
```

or:

```text
Daily average · 30 days
```

It must not imply that the denominator includes only active days.

---

# 13. Top Tasks

Top Tasks are calculated only from positive Task contributions within the selected
range.

At most five Tasks are returned and rendered. Ordering is deterministic:

1. selected-range duration, greatest first;
2. most recent contributing activity endpoint within the selected range, newest
   first;
3. Task description using deterministic code-point comparison, ascending;
4. Task ID, ascending.

`mostRecentActivityAt` is the latest effective endpoint of a positive Task
contribution within the selected range, capped at `capturedAt` and the selected
range end.

A Task with no positive contribution to the selected range is omitted. A deleted
Task and its cascade-deleted intervals cannot appear. A renamed Task appears under
its current description without changing interval ownership or duration.

Changing between Last 7 days and Last 30 days recalculates both the ranked Tasks
and their durations for the newly selected range.

The response also returns `runningTask` whenever one interval is open, even when
that Task is not among the authoritative top five. Its `durationMs` and
`mostRecentActivityAt` describe that Task's selected-range contribution at
`capturedAt`. This additional projection allows the renderer to advance and
correctly insert the active Task if its locally advancing duration crosses into
the displayed top five before the next reconciliation. It does not increase the
displayed list beyond five Tasks.

When there is no open interval, `runningTask` is `null`. A paused current Task has
no open interval and therefore is not returned as `runningTask` merely because it
is loaded in AppState.

---

# 14. Application Service Behavior

Introduce an Analytics application service with an operation conceptually
equivalent to:

```ts
AnalyticsService.getSummary(
  input: AnalyticsSummaryInput,
): AnalyticsSummary
```

The service must:

1. obtain exactly one authoritative `capturedAt` from the injected Clock;
2. resolve the selected local-calendar range;
3. resolve the current Monday-based week and current local month;
4. query intervals overlapping the bounded union of those periods;
5. cap every open or future-ending contribution at `capturedAt`;
6. calculate exactly 7 or 30 daily buckets, including zero days;
7. calculate selected-range total and integer daily average;
8. calculate current-week and current-month totals;
9. calculate deterministic selected-range Task totals and return at most five;
10. include the open Task's selected-range total separately when running;
11. return one internally consistent immutable summary.

Analytics reads must not mutate Tasks, TimeIntervals, or AppState.

The bounded query period begins at the earliest selected-range, current-week, or
current-month start and ends no later than the end of Today. With the ranges in
this specification, ordinary requests inspect no more than the current month or
30 recent calendar days plus any necessary boundary overlap. The implementation
must not load lifetime history to calculate these values.

The service and query design must avoid query counts that grow with the number of
days or Tasks. One or a small fixed number of set-based queries is acceptable.

---

# 15. IPC and Preload Contract

Preload exposes one explicit Analytics API:

```ts
interface AnalyticsAPI {
  getSummary(
    input: AnalyticsSummaryInput,
  ): Promise<AppResult<AnalyticsSummary>>;
}

window.daymark.analytics.getSummary({
  range: 'last-7-days',
});
```

Conceptual IPC channel:

```text
analytics:get-summary
```

The API is request/response only. Renderer-local one-second animation must not
send Analytics IPC requests.

The renderer must not receive generic IPC access, query-building capability,
database objects, or filesystem paths.

---

# 16. Input Validation

`AnalyticsSummaryInput` is untrusted IPC input and must be runtime validated.

The accepted input is an exact object with one own property:

```ts
{ range: 'last-7-days' }
```

or:

```ts
{ range: 'last-30-days' }
```

Reject:

- `null`, arrays, primitives, or omitted input;
- a missing `range` property;
- any range value other than the two exact supported strings;
- inherited-only `range` values;
- unknown own properties.

Invalid input returns:

```text
INVALID_ANALYTICS_RANGE
```

It must not execute an Analytics query or mutate application state.

Add `INVALID_ANALYTICS_RANGE` to the shared controlled application error codes.

---

# 17. Error Behavior

Expected Analytics failures cross IPC as AppResult values:

```ts
type AnalyticsErrorCode =
  | 'INVALID_ANALYTICS_RANGE'
  | 'INTERNAL_ERROR';
```

Unexpected database, projection, boundary, or IPC failures must:

- be logged in the main process with useful technical context;
- map to the existing renderer-safe `INTERNAL_ERROR` result;
- avoid exposing stack traces, SQL, database paths, or unnecessary Task
  descriptions.

Initial-load failure shows an Analytics-specific unavailable state with a Retry
action. Timer behavior remains unaffected and the Timer view remains reachable.

If a refresh or range-switch request fails after a usable summary exists:

- retain the last usable summary rather than replacing it with an empty screen;
- identify that the displayed data could not be refreshed;
- provide a Retry action for the currently selected range;
- do not relabel stale 7-day data as 30-day data or stale 30-day data as 7-day
  data;
- keep navigation and the Timer workflow usable.

A stale or slower response for a previously selected range must not overwrite a
newer selection or a newer successful response.

---

# 18. Top-Level Navigation

SPEC-009 introduces top-level navigation with exactly two destinations:

```text
Timer
Analytics
```

Settings is not shown until SPEC-010 implements it.

The navigation must:

- appear consistently at the top of both views;
- use semantic navigation markup;
- identify the current destination with `aria-current="page"` or equivalent
  navigation semantics;
- use ordinary buttons or links rather than an ARIA tab pattern unless the
  implementation actually provides full tab semantics;
- be operable by normal Tab and activation keys;
- preserve visible focus;
- not require or introduce a routing dependency for two local views;
- not start, pause, resume, stop, or otherwise mutate the timer when switching
  views.

The application opens on Timer after a fresh renderer load. Persisting the last
selected destination is out of scope.

The renderer's authoritative Timer controller remains active at the application
level while Analytics is displayed so timer-state notifications, reconciliation,
and active duration behavior continue. The full Timer and Daily History UI may be
unmounted or hidden as an implementation detail, provided returning to Timer shows
authoritative state without a false idle or `00:00:00` flash.

---

# 19. Analytics Renderer Layout

Conceptual layout:

```text
Daymark                         Timer  Analytics

Analytics
Recent tracked time

[ Last 7 days ] [ Last 30 days ]

Total                 Daily average · 7 days
32h 45m               4h 41m

Current week          Current month
18h 10m               52h 20m

Tracked time

8h ┤              █
6h ┤       █      █
4h ┤    █  █      █
2h ┤ █  █  █  █   █
   └────────────────────
     Aug 15 ... Aug 21

Top tasks
Implement authentication                         8h 30m
Code review                                       6h 15m
Planning                                          4h 50m
Database schema                                   4h 20m
Documentation                                     3h 30m
```

Layout requirements:

- Analytics is visually secondary to the Timer destination but has a clear page
  heading and hierarchy;
- selected-range total and average are the primary summary values;
- current-week and current-month totals are clearly labeled as current calendar
  periods, not values constrained to the selected range;
- the chart and Top Tasks list fit a normal desktop window without horizontal page
  scrolling;
- the 30-day chart may use compact bars, abbreviated date labels, or a horizontally
  scrollable chart region when necessary, but all textual values remain available;
- the view remains usable down to the established narrow desktop width and does
  not require a mobile-specific redesign;
- long Task descriptions wrap without obscuring their duration;
- duration values use tabular numerals where appropriate;
- normal UI durations use the shared `15m`, `1h 05m`, `102h 15m` style.

The specification does not require the exact spacing or decoration shown in the
wireframe.

---

# 20. Range Selection Behavior

Last 7 days is selected on the first visit after renderer load.

The range selector presents two mutually exclusive controls. It must:

- expose the selected state semantically and visually;
- support pointer and keyboard activation;
- preserve visible focus;
- request the selected range authoritatively;
- prevent duplicate activation of the already selected range from starting
  unnecessary concurrent requests;
- protect against stale response ordering during rapid changes;
- retain the prior selected-range summary while the new selection loads, but
  clearly indicate the pending selection and never mislabel old values as the new
  range;
- update the total, denominator label, days, chart, Top Tasks, and running Task
  projection atomically when the new summary succeeds.

Current-week and current-month values may remain visible from the last usable
summary while a range switch is pending because their semantics do not depend on
the selected range. The successful response replaces the complete summary.

---

# 21. Daily-Duration Chart

The chart is a simple, noninteractive bar chart. It must not depend on hover,
pointer precision, color alone, or animation to communicate values.

Chart semantics:

- one bar corresponds to each day in `days`, oldest first;
- bar magnitude is proportional to that day's duration relative to the maximum
  daily duration in the selected response;
- a positive sub-minute duration receives a visible minimum bar without being
  misrepresented in accessible text;
- zero-duration days remain identifiable and have zero magnitude;
- if every day is zero, no division-by-zero or invalid layout occurs;
- local date labels distinguish days sufficiently for the selected range;
- Today is identifiable in visible or adjacent textual labeling;
- no chart interaction changes application state.

Every datum must be available to assistive technology as a local date plus a
formatted duration. An accessible list, table, or equivalent semantic structure
may accompany or underlie the visual chart. SVG or CSS/HTML bars are both
acceptable. If SVG is used, it must have an accessible name while the individual
data values remain available without requiring interpretation of geometry.

The chart must respect reduced-motion preferences. Animated transitions are not
required. Adding a chart dependency is not authorized by this specification.

---

# 22. Empty, Loading, and Retry States

## Initial loading

On first entering Analytics, show a neutral Analytics loading state. Do not briefly
render fabricated zero totals or an empty chart before the authoritative response
arrives.

## Empty selected range

When the selected range total is zero:

```text
No time tracked in this period.
```

The view still shows:

- the selected range controls;
- total `0m`;
- the explicit daily-average denominator and `0m`;
- current-week and current-month totals from the response;
- an accessible zero-data chart or restrained empty chart treatment;
- an empty Top Tasks section without fabricated Tasks.

The empty state does not add a Start control or duplicate Timer behavior. Timer is
reachable through top-level navigation.

## Initial error

Show a concise Analytics unavailable message and a Retry action. Do not expose
internal details.

## Refresh error

Keep the last usable correctly labeled summary, show a non-destructive refresh
warning, and offer Retry. The warning must not trap focus or disable navigation.

Loading indicators and status messages must avoid excessive announcements.

---

# 23. Live Running Analytics

When one interval is open, the renderer may advance only values derivable from the
authoritative response:

- Today's daily value;
- selected-range total;
- selected-range daily average;
- current-week total;
- current-month total;
- the running Task's selected-range duration and most-recent activity;
- Top Tasks ordering and values when affected by the running Task;
- the corresponding visual bar magnitude.

Local advancement uses elapsed wall-clock time since `capturedAt`, capped at the
next relevant local calendar boundary. It must not write SQLite or issue
per-second IPC calls.

Only the open interval advances. Paused and closed intervals remain fixed.

The renderer must request a fresh authoritative summary for the selected range:

- on initial Analytics load;
- after the selected range changes;
- after a successful Start, Pause, Resume, Stop, or Task switch;
- after successful manual interval creation, interval edit, or interval deletion
  when Analytics is mounted or next entered;
- after successful Task rename or deletion when Analytics is mounted or next
  entered;
- after a timer-state notification originating outside the renderer;
- during periodic reconciliation while Analytics is displayed;
- after the application regains focus;
- at local midnight before continuing live projection.

A periodic reconciliation interval no greater than 60 seconds is sufficient and
may be shared with the authoritative Timer controller. Duplicate refresh triggers
must be safely coalesced or protected from stale response replacement.

At local midnight, the selected 7-day or 30-day window shifts, the oldest day may
fall out, Today changes, and week or month boundaries may change. The renderer must
refresh rather than attempting to reconstruct the shifted window solely from the
previous response.

The separate `runningTask` projection permits accurate local Top Tasks insertion:

- if the active Task is already in `topTasks`, advance that single entry;
- if it is outside `topTasks`, advance `runningTask` and insert it only when the
  deterministic ranking places it above the current fifth Task;
- render no more than five entries;
- do not advance any other Task;
- reconcile the authoritative ranking periodically and after mutations.

Live duration text must not be placed in an assertive live region or announced
every second.

---

# 24. Mutation and View Synchronization

Analytics is read-only, but existing features mutate its source data.

The renderer must use the existing authoritative revision/notification path or a
small equivalent application-level invalidation mechanism. It must not duplicate
business logic or expose a generic event bus through preload.

When Analytics is not displayed, implementation may mark its cached summary stale
instead of requesting it immediately. The next entry to Analytics must load or
refresh before presenting the cached data as current.

When Analytics is displayed:

- successful Timer mutations refresh through authoritative Timer state;
- tray Timer commands refresh through SPEC-008 state notification;
- successful interval and Task mutations invalidate Analytics;
- failed mutations do not fabricate a changed Analytics result;
- stale asynchronous responses cannot roll back a newer summary.

Navigation to Timer after an Analytics error must remain immediate and must not
wait for Analytics recovery.

---

# 25. Edge Cases

The implementation must handle:

- no Tasks and no intervals;
- Tasks with no intervals;
- exactly one positive interval;
- zero-duration days between active days;
- exactly 7 and more than 7 active calendar days;
- exactly 30 and more than 30 active calendar days;
- a selected range with no data while current-month total is nonzero;
- the first day of a week;
- the first and last day of a month;
- February in leap and non-leap years;
- a selected range crossing a month or year boundary;
- local days affected by daylight-saving offset changes;
- intervals beginning or ending exactly at local midnight;
- an interval crossing one or several local midnights;
- one open interval crossing local midnight while Analytics is displayed;
- renderer reload while running or paused;
- application restart with an open interval;
- a paused current Task, which does not advance;
- an open Task outside the authoritative top five that later crosses into it;
- more than five Tasks with positive selected-range time;
- tied Task durations and tied most-recent activity timestamps;
- a renamed Task after a summary was loaded;
- a deleted Task and cascade-deleted intervals after a summary was loaded;
- manual creation, edit, or deletion affecting one or several Analytics days;
- positive sub-minute durations;
- totals greater than 99 hours;
- long Task descriptions;
- rapid 7-day/30-day selection changes with out-of-order responses;
- initial request failure and later successful retry;
- reconciliation failure after a valid summary;
- local timezone change followed by focus or authoritative refresh;
- malformed Analytics IPC input;
- unexpected invalid persisted state.

Existing invariants prevent negative intervals and more than one open interval. If
invalid persisted state is nevertheless detected, fail safely, log technical
context without unnecessary user content, and return `INTERNAL_ERROR`.

---

# 26. Acceptance Criteria

## AC-009-001 — Default Seven-Day Analytics

Given the user enters Analytics after renderer load,

when the initial summary succeeds,

then Last 7 days is selected and exactly Today plus the previous six local calendar
days are represented oldest first.

---

## AC-009-002 — Thirty-Day Range Selection

Given a usable 7-day summary,

when the user selects Last 30 days,

then an authoritative 30-day summary atomically replaces the range-dependent
values with Today plus the previous 29 local calendar days.

---

## AC-009-003 — Daily Projection Across Local Boundaries

Given intervals on ordinary, cross-midnight, and timezone-offset-transition days,

when Analytics is projected,

then every interval contributes only its positive overlap to each included local
day without splitting stored records or assuming 24-hour days.

---

## AC-009-004 — Total and Explicit Daily Average

Given a selected range containing active and zero-duration days,

when its summary is displayed,

then total equals the exact sum of all daily values and daily average equals the
floored total divided by exactly 7 or 30 with that denominator visible.

---

## AC-009-005 — Current Week Uses Monday Boundary

Given tracked intervals around a local Monday boundary,

when the current-week total is calculated,

then it includes only positive overlap from Monday local midnight through the
snapshot and is independent of the selected Analytics range.

---

## AC-009-006 — Current Month Uses Local Calendar Boundary

Given tracked intervals around the first day of the current local month,

when the current-month total is calculated,

then it includes only positive overlap from the first local day of the month
through the snapshot and is independent of the selected Analytics range.

---

## AC-009-007 — Top Five Tasks Are Deterministic

Given more than five Tasks have positive selected-range contributions with duration
or activity ties,

when Top Tasks is calculated,

then exactly the highest five are returned in duration, recent-activity,
description, and Task-ID tie-break order with selected-range durations.

---

## AC-009-008 — Empty Analytics Is Informative

Given the selected range has no tracked duration,

when Analytics loads,

then zero total and average values, the explicit denominator, current period
totals, an accessible zero-data chart treatment, no fabricated Top Tasks, and `No
time tracked in this period.` are presented.

---

## AC-009-009 — Chart Values Are Accessible

Given a summary with zero and positive daily values,

when the chart is rendered,

then it shows one ordered visual bar per day and exposes every local date and exact
formatted duration as accessible text without requiring color, hover, or geometry
interpretation.

---

## AC-009-010 — Running Analytics Advances Locally

Given Analytics contains an open interval,

when wall-clock time advances before the next local boundary,

then affected daily, selected-range, current-period, chart, and active-Task values
advance locally from one authoritative snapshot without per-second IPC or database
access.

---

## AC-009-011 — Running Task Can Enter Top Five

Given the open Task is outside the authoritative top five at the response snapshot,

when its locally advancing selected-range duration overtakes the fifth-ranked
Task,

then it enters the displayed deterministic ranking and no more than five Tasks are
shown.

---

## AC-009-012 — Paused Analytics Remains Fixed

Given the current Timer is paused,

when wall-clock time advances without a source-data mutation,

then Analytics durations and rankings do not advance.

---

## AC-009-013 — Relevant Mutations Reconcile Authoritatively

Given Analytics is loaded,

when a Timer, interval, or Task mutation changes Analytics source data,

then Analytics refreshes immediately when displayed or is invalidated until next
entry, and the next usable summary reflects the mutation without stale response
rollback.

---

## AC-009-014 — Midnight Shifts the Projection

Given Analytics remains open across local midnight,

when the local day changes,

then it refreshes authoritatively, shifts the selected 7-day or 30-day window,
recalculates applicable week or month boundaries, and assigns further open time to
the new Today.

---

## AC-009-015 — Top-Level Navigation Preserves Timer Behavior

Given the Timer is idle, running, or paused,

when the user navigates between Timer and Analytics,

then navigation state is clear and keyboard accessible, no Timer transition occurs,
and returning to Timer shows authoritative state without a false idle or zero flash.

---

## AC-009-016 — Loading, Retry, and Stale Data Are Safe

Given an initial, refresh, or range-switch Analytics request fails,

when the failure is presented,

then initial failure offers Retry, later failure retains correctly labeled last
usable data, internal details are hidden, and Timer navigation remains usable.

---

## AC-009-017 — Analytics Boundary Is Narrow and Validated

Given valid or malformed Analytics input crosses preload and IPC,

when `analytics:get-summary` handles it,

then only the two exact ranges reach the service, malformed input returns
`INVALID_ANALYTICS_RANGE` without querying, and no raw Electron or database
capability is exposed.

---

## AC-009-018 — Analytics Is Read-Only and Bounded

Given several years of ordinary interval history,

when either Analytics range loads,

then a fixed number of set-based queries reads only the bounded recent period,
does not mutate persisted data, and does not load lifetime history.

---

## AC-009-019 — Packaged Offline Analytics Workflow Works

Given an isolated packaged application with representative tracked data,

when the user navigates to Analytics, changes ranges, observes running and paused
behavior, and retries a recoverable presentation path,

then the workflow satisfies this specification without runtime network resources,
renderer console errors, or regression of the Timer view.

---

# 27. Required Unit Tests

Unit tests must cover:

- resolving Last 7 days as Today plus six local days;
- resolving Last 30 days as Today plus 29 local days;
- exactly 7 or 30 oldest-first day buckets including zero days;
- local-day resolution across DST or representative offset changes;
- cross-midnight interval overlap;
- exact-midnight endpoints;
- selected-range total as the sum of daily buckets;
- floored daily-average division by 7 and 30;
- Monday-based current-week boundaries and overlap;
- local current-month boundaries including year transition and leap February;
- current-week and month independence from selected range;
- open interval contribution capped at one captured time;
- paused and closed intervals remaining fixed;
- future-ending defensive capping;
- Top Tasks positive-contribution filtering;
- the five-entry limit;
- duration, recent-activity, description, and ID tie-breaking;
- separate running-Task projection when inside and outside the top five;
- no mutation of input records or persisted entities;
- renderer-local advancement of affected totals and Today only;
- renderer-local insertion of an outside running Task into the top five;
- no local advancement for paused state;
- safe behavior at a local-midnight boundary.

Use FakeClock or explicit timestamps. Tests must not depend on the wall clock.

---

# 28. Required Repository Tests

Disposable-SQLite repository/query tests must cover:

- bounded overlap selection for the union of selected range, current week, and
  current month;
- exclusion of intervals ending at or before the lower exclusive overlap boundary;
- inclusion of intervals crossing the lower boundary;
- exclusion of future-starting intervals at the snapshot;
- open intervals capped by the supplied snapshot;
- Task identity and current description joined to interval data;
- deterministic raw ordering where the query contract promises ordering;
- no query or schema mutation during Analytics reads;
- query-plan or query-observation evidence that no per-day or per-Task query loop
  is introduced.

Tests must never access the user's real application database.

---

# 29. Required Integration Tests

Integration tests across disposable SQLite, Analytics queries, injected Clock,
and AnalyticsService must cover:

- empty 7-day and 30-day summaries;
- ordinary multi-day totals;
- zero days within a nonempty range;
- cross-midnight projection without stored record splitting;
- representative DST-safe projection;
- current-week and current-month totals whose boundaries differ from the selected
  range;
- more than five ranked Tasks and deterministic ties;
- a running Task inside the top five;
- a running Task outside the top five;
- paused state without advancement;
- Start, Pause, Resume, Stop, and switch followed by authoritative Analytics reads;
- manual interval creation followed by recalculation;
- cross-day interval edit followed by recalculation;
- interval deletion followed by recalculation;
- Task rename reflected under stable identity;
- Task deletion and cascaded interval removal reflected in Analytics;
- application reconstruction with an open interval;
- no database mutation from repeated Analytics reads.

---

# 30. Required Boundary Tests

Shared validation, IPC, preload, and safe-error tests must cover:

- both exact supported input objects;
- missing, malformed, primitive, array, inherited-only, and unknown-property input;
- `INVALID_ANALYTICS_RANGE` without service/query execution;
- exact `analytics:get-summary` channel wiring;
- forwarding one valid input exactly once;
- typed AppResult success propagation;
- safe conversion of unexpected service or database failures to `INTERNAL_ERROR`;
- no stack trace, SQL, database path, or unnecessary Task content exposed to the
  renderer;
- `window.daymark.analytics.getSummary` as the only new preload capability;
- absence of raw `ipcRenderer`, generic invoke/send/on, Node.js, filesystem, or
  database exposure.

---

# 31. Required Renderer Tests

React/component/controller tests must cover:

- Timer and Analytics navigation semantics and current-destination state;
- initial Timer destination after renderer load;
- navigation without Timer mutation;
- returning to authoritative running and paused Timer presentation;
- initial 7-day Analytics selection;
- loading without fabricated zero values;
- successful 7-day rendering;
- successful 30-day range switching;
- stale range-response protection;
- selected range, total, and explicit average denominator labeling;
- current-week and current-month labels and values;
- at most five deterministic Top Tasks;
- long Task-description wrapping;
- one ordered visual and accessible datum per day;
- zero and positive bar behavior;
- accessible zero-data treatment;
- running local advancement without per-second Analytics IPC;
- running Task insertion into Top Tasks;
- paused non-advancement;
- authoritative refresh/invalidation after relevant mutations and timer events;
- local-midnight refresh;
- window-focus and periodic reconciliation;
- initial error and Retry;
- refresh error preserving last usable correctly labeled data;
- range-switch error without mislabeling old values;
- keyboard operation and visible focus for navigation, range selection, and Retry;
- no per-second live-region announcement;
- narrow-window layout without page-level horizontal scrolling;
- duration layout beyond 99 hours;
- reduced-motion-safe presentation.

---

# 32. Migration Tests

Not applicable. This specification requires no schema change or migration.

---

# 33. Security Considerations

Analytics is a read-only renderer capability exposed through a narrow typed preload
API.

The renderer must not receive:

- SQLite or Drizzle objects;
- filesystem access or database paths;
- Node.js APIs;
- raw `ipcRenderer`;
- arbitrary SQL, range-boundary, or query construction;
- generic event subscription.

Renderer input is untrusted and must be runtime validated before service execution.

Analytics must remain entirely local. The chart, fonts, icons, styles, and all
supporting assets must work without runtime network requests. Do not add telemetry,
remote analytics, crash reporting, or third-party hosted assets.

Logs must avoid unnecessary Task descriptions and must not expose user interval
content in renderer-visible errors.

---

# 34. Performance Considerations

Analytics must remain responsive with thousands of intervals and several years of
ordinary single-user history.

The implementation must:

- query only the bounded recent period needed for selected range, current week,
  and current month;
- avoid loading lifetime history;
- avoid one query per day or Task;
- use one captured time for all calculations;
- avoid per-second IPC and database reads;
- perform live one-second changes only in renderer presentation;
- protect against overlapping refreshes and stale responses;
- avoid unnecessary chart rerender work unrelated to a displayed value;
- use existing indexes where they reasonably support bounded overlap queries.

The implementation may calculate projections in the service after one bounded
record query or use a small fixed number of aggregate queries. Either approach must
remain explicit and testable. Persisted caches, workers, virtualization, and
premature aggregation infrastructure are not required.

If ordinary data measurement reveals a missing index, record the evidence and add
a migration under the established migration policy before treating the
specification as complete.

---

# 35. Accessibility Requirements

Analytics must provide:

- semantic top-level navigation with current-page indication;
- a semantic page heading and logical heading order;
- keyboard-operable range selection and Retry actions;
- visible focus for all interactive controls;
- selected range communicated by text/semantics, not color alone;
- sufficient semantic-token contrast for text, bars, focus, and state indicators;
- every chart datum as accessible local-date and duration text;
- no reliance on hover or pointer interaction;
- an empty state and errors communicated in text;
- restrained status announcements without per-second duration announcements;
- DOM order matching the visual oldest-to-newest chart order and ranked Task order;
- long-description wrapping at narrow widths;
- reduced-motion-safe loading and chart presentation.

If a visual chart is hidden from assistive technology because an equivalent
semantic data structure is supplied, that structure must contain all dates and
values exactly once without duplicate noisy announcements.

---

# 36. Platform and Packaged Verification

SPEC-009 final acceptance requires an isolated packaged macOS arm64 run on the
primary development platform. It must verify:

- Timer-to-Analytics navigation while idle, running, and paused;
- default 7-day and selected 30-day results against known seeded interval data;
- current Monday-based week and current-month totals;
- accessible zero and nonzero chart presentation;
- more than five Tasks and deterministic displayed ranking;
- live running advancement without console errors or per-second IPC;
- paused non-advancement;
- reconciliation after a representative source-data mutation;
- local-only rendering with no HTTP(S) resources;
- return to an authoritative Timer view;
- usable layout at a normal and narrow supported desktop window size.

Automated tests provide DST, midnight, error injection, malformed IPC, timezone,
and exact arithmetic coverage that is impractical to reproduce manually.

Windows and Linux Analytics behavior remains required and platform-neutral, but
fresh-machine cross-platform packaged acceptance belongs to the later Packaging
and Release specifications. SPEC-009 must not introduce macOS-only renderer,
service, or query assumptions.

---

# 37. Definition of Done

This specification is complete when:

- AC-009-001 through AC-009-019 pass;
- all required unit, repository, integration, boundary, and renderer tests pass;
- isolated packaged primary-platform verification passes;
- `npm run format:check` passes if that script remains available;
- `npm run typecheck` passes;
- `npm run lint` passes;
- `npm test` passes;
- `npm run package` passes;
- Analytics derives all data from Tasks and TimeIntervals without persisted totals;
- no per-second IPC or database access is introduced;
- renderer, preload, IPC, main, service, and query boundaries remain intact;
- Timer, Daily History, interval correction, Task management, and tray behavior do
  not regress;
- the packaged renderer performs no runtime network request;
- documentation and progress accurately describe the implementation;
- no unrelated Settings, export, scoring, or future roadmap behavior is added.

---

# 38. Implementation Notes for Codex

Prefer the smallest implementation that satisfies this specification.

Reuse the established local-day boundary and interval-overlap semantics rather than
creating a second conflicting time model. Shared pure helpers may be extracted when
that reduces duplication without altering verified History behavior.

Keep query code in a dedicated Analytics query/repository module and projection or
business behavior in the service/domain layer. Keep IPC handlers thin.

Do not add a chart library, router, global state framework, cache table, or generic
renderer event bus without a demonstrated implementation need and an explicit
scope or decision update.

SPEC-008 must be Verified before implementation begins because Analytics relies on
its authoritative external Timer-state notification behavior. Designing and
reviewing this specification and task breakdown may occur while SPEC-008 awaits
implementation.

Implement only one unblocked task from `tasks.md` at a time. Update `docs/plan.md`
for that task before changing production code.
