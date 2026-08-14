import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { AppStateRepository } from '@/main/database/repositories/app-state-repository';
import { TaskRepository } from '@/main/database/repositories/task-repository';
import { TimeIntervalRepository } from '@/main/database/repositories/time-interval-repository';
import { DurationProjector } from '@/main/services/duration-projections';
import {
  InvalidPersistedTimerStateError,
  TimerStateReader,
} from '@/main/services/timer-state-reader';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../database/support/disposable-database';
import { FakeClock } from '../domain/support/fake-clock';

describe('TimerStateReader', () => {
  let fixture: DisposableDatabase;
  let context: DatabaseContext;
  let clock: FakeClock;
  let reader: TimerStateReader;

  beforeEach(async () => {
    fixture = await createDisposableDatabase();
    context = fixture.lifecycle.initialize();
    clock = new FakeClock(localTime(2026, 8, 14, 12));
    const intervals = new TimeIntervalRepository(context.db);
    reader = new TimerStateReader({
      appState: new AppStateRepository(context.db),
      tasks: new TaskRepository(context.db),
      intervals,
      durations: new DurationProjector(intervals),
      clock,
    });
  });

  afterEach(async () => {
    await fixture.dispose();
  });

  it('returns the specified zeroed idle state without mutating the database', () => {
    const changesBefore = getTotalChanges(context);

    expect(reader.getState()).toEqual({
      status: 'idle',
      currentTask: null,
      sessionStartedAt: null,
      sessionDurationMs: 0,
      taskTodayDurationMs: 0,
      taskLifetimeDurationMs: 0,
      activeIntervalStartedAt: null,
      now: clock.now(),
    });
    expect(getTotalChanges(context)).toBe(changesBefore);
  });

  it('reconstructs a running timer after restart from persisted timestamps', () => {
    const startedAt = localTime(2026, 8, 14, 10);
    clock.set(localTime(2026, 8, 14, 10, 50));
    seedTask(context);
    seedInterval(context, { startedAt, endedAt: null });
    setAppState(context, 'running', startedAt);

    const changesBefore = getTotalChanges(context);
    expect(reader.getState()).toEqual({
      status: 'running',
      currentTask: { id: 'task-1', description: 'Task One' },
      sessionStartedAt: startedAt,
      sessionDurationMs: minutes(50),
      taskTodayDurationMs: minutes(50),
      taskLifetimeDurationMs: minutes(50),
      activeIntervalStartedAt: startedAt,
      now: clock.now(),
    });
    expect(getTotalChanges(context)).toBe(changesBefore);
  });

  it('reconstructs a paused timer after restart without counting paused time', () => {
    const startedAt = localTime(2026, 8, 14, 10);
    clock.set(localTime(2026, 8, 14, 11, 30));
    seedTask(context);
    seedInterval(context, {
      startedAt,
      endedAt: startedAt + minutes(30),
    });
    setAppState(context, 'paused', startedAt);

    expect(reader.getState()).toEqual({
      status: 'paused',
      currentTask: { id: 'task-1', description: 'Task One' },
      sessionStartedAt: startedAt,
      sessionDurationMs: minutes(30),
      taskTodayDurationMs: minutes(30),
      taskLifetimeDurationMs: minutes(30),
      activeIntervalStartedAt: null,
      now: clock.now(),
    });
  });

  it.each([
    {
      name: 'idle state retaining a task and session',
      arrange: () => {
        seedTask(context);
        setAppState(context, 'idle', 1_000);
      },
    },
    {
      name: 'idle state with an open interval',
      arrange: () => {
        seedTask(context);
        seedInterval(context, { startedAt: 1_000, endedAt: null });
      },
    },
    {
      name: 'running state without an open interval',
      arrange: () => {
        seedTask(context);
        setAppState(context, 'running', 1_000);
      },
    },
    {
      name: 'paused state with an open interval',
      arrange: () => {
        seedTask(context);
        seedInterval(context, { startedAt: 1_000, endedAt: null });
        setAppState(context, 'paused', 1_000);
      },
    },
    {
      name: 'active state without a current task',
      arrange: () => {
        context.sqlite
          .prepare(
            "update app_state set timer_status = 'paused', current_task_id = null, session_started_at = 1000",
          )
          .run();
      },
    },
    {
      name: 'active state without a session start',
      arrange: () => {
        seedTask(context);
        context.sqlite
          .prepare(
            "update app_state set timer_status = 'paused', current_task_id = 'task-1', session_started_at = null",
          )
          .run();
      },
    },
    {
      name: 'running interval for a different task',
      arrange: () => {
        seedTask(context);
        seedTask(context, 'task-2', 'Task Two');
        seedInterval(context, {
          taskId: 'task-2',
          startedAt: 1_000,
          endedAt: null,
        });
        setAppState(context, 'running', 1_000);
      },
    },
    {
      name: 'session start in the future',
      arrange: () => {
        seedTask(context);
        setAppState(context, 'paused', clock.now() + 1);
      },
    },
    {
      name: 'open interval before the session start',
      arrange: () => {
        seedTask(context);
        seedInterval(context, { startedAt: 1_000, endedAt: null });
        setAppState(context, 'running', 2_000);
      },
    },
    {
      name: 'open interval in the future',
      arrange: () => {
        seedTask(context);
        seedInterval(context, {
          startedAt: clock.now() + 1,
          endedAt: null,
        });
        setAppState(context, 'running', clock.now());
      },
    },
  ])('rejects invalid persisted state: $name', ({ arrange }) => {
    arrange();
    expect(() => reader.getState()).toThrow(InvalidPersistedTimerStateError);
  });
});

const minutes = (value: number): number => value * 60_000;

const getTotalChanges = (context: DatabaseContext): number => {
  const value: unknown = context.sqlite
    .prepare('select total_changes()')
    .pluck()
    .get();

  if (typeof value !== 'number') {
    throw new Error('Expected SQLite total_changes() to return a number.');
  }
  return value;
};

const localTime = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): number => new Date(year, month - 1, day, hour, minute).getTime();

const seedTask = (
  context: DatabaseContext,
  id = 'task-1',
  description = 'Task One',
): void => {
  context.sqlite
    .prepare(
      'insert into tasks (id, description, normalized_description, created_at, updated_at) values (?, ?, ?, ?, ?)',
    )
    .run(id, description, description.toLocaleLowerCase(), 100, 100);
};

const seedInterval = (
  context: DatabaseContext,
  interval: {
    readonly taskId?: string;
    readonly startedAt: number;
    readonly endedAt: number | null;
  },
): void => {
  context.sqlite
    .prepare(
      'insert into time_intervals (id, task_id, started_at, ended_at, created_at, updated_at) values (?, ?, ?, ?, ?, ?)',
    )
    .run(
      'interval-1',
      interval.taskId ?? 'task-1',
      interval.startedAt,
      interval.endedAt,
      100,
      100,
    );
};

const setAppState = (
  context: DatabaseContext,
  status: 'idle' | 'running' | 'paused',
  sessionStartedAt: number,
): void => {
  context.sqlite
    .prepare(
      'update app_state set timer_status = ?, current_task_id = ?, session_started_at = ?',
    )
    .run(status, 'task-1', sessionStartedAt);
};
