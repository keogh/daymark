# UX Design Specification

## Status

Draft

---

# 1. Design Objective

Time tracking should feel immediate.

The application should minimize:

- navigation;
- forms;
- dialogs;
- configuration;
- clicks.

The user should always be able to answer:

1. What am I tracking now?
2. How long have I worked on it?
3. What did I work on today?
4. How much time have I spent today?

---

# 2. Information Architecture

The MVP contains two primary views:

    Timer
    Analytics

Settings is secondary.

Suggested application navigation:

```text
┌─────────────────────────────────────────┐
│  Daymark                                │
│                                         │
│  Timer       Analytics       Settings   │
└─────────────────────────────────────────┘
```

The application opens to Timer.

---

# 3. Timer View — Idle

```text
┌──────────────────────────────────────────────────────────┐
│ Daymark                         Analytics     Settings    │
│                                                          │
│                                                          │
│                 What are you working on?                 │
│                                                          │
│        ┌──────────────────────────────────────┐          │
│        │ Task description...                  │ [Start]  │
│        └──────────────────────────────────────┘          │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ Today                                          5h 20m    │
│                                                          │
│ ▶ Implement authentication                              │
│   1h 45m today                         8h 30m total      │
│                                                          │
│ ▶ Code review                                           │
│   2h 10m today                         4h 15m total      │
│                                                          │
│ ▶ Planning                                              │
│   1h 25m today                         3h 05m total      │
│                                                          │
│ Yesterday                                      4h 10m    │
│ ...                                                      │
└──────────────────────────────────────────────────────────┘
```

---

# 4. Starting a New Task

The primary input:

```text
[ Task description...                         ] [▶ Start]
```

Rules:

- pressing Enter starts;
- Start is disabled for empty input;
- whitespace-only values are invalid;
- recent matching tasks appear while typing.

---

# 5. Task Suggestions

Example:

```text
[ Implement auth...                              ]

Recent tasks

Implement authentication
Today 1h 45m · Total 8h 30m

Implement authorization
Today 0m · Total 2h 40m
```

Keyboard behavior:

```text
Arrow Up/Down    Navigate suggestions
Enter            Select/start
Escape           Close suggestions
```

---

# 6. Timer View — Running

```text
┌──────────────────────────────────────────────────────────┐
│ Daymark                         Analytics     Settings    │
│                                                          │
│                 Implement authentication                 │
│                                                          │
│                         01:23:42                         │
│                      Current session                     │
│                                                          │
│                Today 2h 12m · Total 8h 55m              │
│                                                          │
│                    [ Pause ] [ Stop ]                    │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ Today                                          5h 47m    │
│ ...                                                      │
└──────────────────────────────────────────────────────────┘
```

The timer should be visually dominant without consuming most of the window.

---

# 7. Timer View — Paused

```text
                 Implement authentication

                         01:23:42
                           Paused

                Today 2h 12m · Total 8h 55m

                    [ Resume ] [ Stop ]
```

The paused state must be visually obvious.

Do not rely only on color.

Use text:

    Paused

---

# 8. Task Switching

Every history task row has a Play action.

Example:

```text
▶ Database schema
  45m today · 6h 20m total
```

If another task is running:

```text
Task A RUNNING
```

and the user clicks:

```text
▶ Task B
```

the application immediately performs:

```text
Stop Task A
Start Task B
```

The current timer changes to Task B.

No modal or confirmation is shown.

---

# 9. Daily History

The history is grouped chronologically by date.

Suggested ordering:

```text
Today
Yesterday
Wednesday, Aug 11
Tuesday, Aug 10
...
```

Within a day, tasks should initially be ordered by most recently active.

Each day header displays:

```text
date                         total duration
```

Example:

```text
Today                               5h 20m
```

---

# 10. Task History Row

Recommended row:

```text
▶ Implement authentication
  1h 45m today · 8h 30m total
```

Visual hierarchy:

1. description;
2. daily duration;
3. lifetime duration.

Lifetime duration should use lower emphasis.

---

# 11. Expanded Task

Selecting the row body expands intervals.

The Play button remains a separate action.

```text
▼ Implement authentication
  1h 45m today · 8h 30m total

    09:10 → 10:15         1h 05m       ⋯
    11:30 → 12:10            40m       ⋯

    + Add time
```

The user should not need to navigate to another page to inspect today's intervals.

---

# 12. Interval Actions

The interval menu:

```text
Edit
Delete
```

Edit opens a compact modal or popover:

```text
Edit Time

Task
Implement authentication

Date
Aug 13, 2026

Start
09:10

End
10:15

                         Cancel   Save
```

Validation must be inline.

---

# 13. Manual Entry

A visible secondary action should exist near the history:

```text
+ Add time
```

Possible placement:

```text
Today                               5h 20m
                                      + Add time
```

Manual entry form:

```text
Add Time

Task
[ Select or enter task              ]

Date
[ Aug 13, 2026 ]

Start
[ 09:00 ]

End
[ 10:00 ]

                         Cancel   Add
```

---

# 14. Delete Interval

Use confirmation for deletion because the action changes historical totals.

Suggested copy:

```text
Delete this time entry?

09:10 → 10:15
Implement authentication

This removes 1h 05m from your tracked time.

Cancel       Delete
```

---

# 15. Rename Task

Task context menu:

```text
Rename
Delete task
```

Rename can use a small modal:

```text
Rename Task

[ Implement authentication ]

Cancel       Save
```

---

# 16. Delete Task

Deletion is destructive and requires confirmation.

```text
Delete "Implement authentication"?

This will permanently delete the task and
its 17 recorded time intervals (8h 30m).

Cancel       Delete
```

The active task cannot be deleted.

---

# 17. Analytics View

Recommended layout:

```text
┌──────────────────────────────────────────────────────────┐
│ Analytics                                                │
│                                                          │
│ [ Last 7 days ] [ Last 30 days ]                        │
│                                                          │
│ Total        Daily average                              │
│ 32h 45m      4h 41m                                     │
│                                                          │
│ Hours                                                    │
│                                                          │
│ 8h ┤        █                                            │
│ 6h ┤   █    █    █                                      │
│ 4h ┤   █ █  █    █                                      │
│ 2h ┤ █ █ █  █ █  █                                      │
│    └────────────────────────                             │
│      M T W T F S S                                       │
│                                                          │
│ Top tasks                                                │
│                                                          │
│ Implement authentication                 8h 30m          │
│ Code review                               6h 15m          │
│ Planning                                  4h 50m          │
│ Database schema                           4h 20m          │
└──────────────────────────────────────────────────────────┘
```

---

# 18. Analytics Scope

MVP analytics contains only:

- seven-day daily duration;
- thirty-day daily duration;
- total duration;
- daily average;
- weekly total;
- monthly total;
- top tasks.

No productivity scores or recommendations are required.

---

# 19. Empty States

## No History

```text
No tracked time yet.

Start your first task above.
```

## Analytics Without Data

```text
No time tracked in this period.
```

---

# 20. Tray UX

The tray should expose lightweight timer management.

Example:

```text
Daymark

Implement authentication
01:23:42

Pause
Stop

Open Daymark
-----------------
Quit
```

Paused:

```text
Daymark

Implement authentication
Paused · 01:23:42

Resume
Stop

Open Daymark
-----------------
Quit
```

Idle:

```text
Daymark

No active timer

Open Daymark
-----------------
Quit
```

---

# 21. Window Close Behavior

Clicking the normal window close control:

```text
hide window
```

It does not mean:

```text
quit application
```

The tray remains available.

The application continues tracking.

---

# 22. Explicit Quit

The tray menu contains:

```text
Quit
```

Explicitly quitting does not mutate tracking timestamps.

If a timer is running when the process exits, its open interval remains open.

When the application launches again, elapsed time is reconstructed from its start timestamp.

---

# 23. Loading Behavior

The timer should not temporarily display:

```text
00:00:00
```

when recovering an existing timer.

The initial application boot sequence should retrieve persisted timer state before rendering the primary timer UI.

A short neutral loading state is preferable to incorrect time.

---

# 24. Keyboard Interaction

Minimum keyboard support:

```text
Enter       Start task from idle input
Space       Do not globally hijack by default
Escape      Close menus/modals
Tab         Normal focus navigation
```

Global system shortcuts are deferred.

---

# 25. Formatting

Durations in normal UI:

```text
15m
1h 05m
8h 30m
102h 15m
```

Large timer:

```text
HH:MM:SS
```

For durations greater than 99 hours, the layout must continue to work.

---

# 26. Responsive Desktop Layout

Although this is a desktop product, the window may be resized.

Recommended minimum width:

    approximately 600 px

The interface should gracefully support narrower windows.

A full mobile-responsive design is not an MVP requirement.

---

# 27. Visual Direction

The desired visual character is:

- clean;
- calm;
- functional;
- modern;
- low-noise;
- compact without feeling crowded.

Avoid:

- excessive cards;
- multiple bright accent colors;
- gamification;
- unnecessary dashboards;
- large navigation sidebars for only two or three destinations.

The timer is the product's visual center.
