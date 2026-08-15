import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { AppStateRepository } from '@/main/database/repositories/app-state-repository';
import { TaskRepository } from '@/main/database/repositories/task-repository';
import { TimeIntervalRepository } from '@/main/database/repositories/time-interval-repository';
import { TransactionRunner } from '@/main/database/transaction-runner';
import { DurationProjector } from '@/main/services/duration-projections';
import { ManualTimeService } from '@/main/services/manual-time-service';
import { TimerStateReader } from '@/main/services/timer-state-reader';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../database/support/disposable-database';
import { FakeClock } from '../domain/support/fake-clock';

const originalTimezone = process.env.TZ;

describe('ManualTimeService', () => {
  let fixture: DisposableDatabase;
  let context: DatabaseContext;
  let clock: FakeClock;
  let tasks: TaskRepository;
  let intervals: TimeIntervalRepository;
  let appState: AppStateRepository;
  let reader: TimerStateReader;
  let service: ManualTimeService;
  let nextId: number;

  beforeEach(async () => {
    process.env.TZ = 'America/New_York';
    fixture = await createDisposableDatabase();
    context = fixture.lifecycle.initialize();
    clock = new FakeClock(localTime(2026, 8, 14, 10, 0));
    tasks = new TaskRepository(context.db);
    intervals = new TimeIntervalRepository(context.db);
    appState = new AppStateRepository(context.db);
    reader = new TimerStateReader({
      appState,
      tasks,
      intervals,
      durations: new DurationProjector(intervals),
      clock,
    });
    nextId = 1;
    service = new ManualTimeService({
      appState,
      tasks,
      intervals,
      transactions: new TransactionRunner(context.sqlite),
      stateReader: reader,
      clock,
      generateId: () => `manual-${nextId++}`,
    });
  });

  afterEach(async () => {
    process.env.TZ = originalTimezone;
    await fixture.dispose();
  });

  it('creates one closed interval for an explicitly selected existing task', () => {
    const now = clock.now();
    tasks.insert({
      id: 'existing-task',
      description: 'Existing Task',
      normalizedDescription: 'existing task',
      createdAt: now - minutes(30),
      updatedAt: now - minutes(30),
    });
    const stateBefore = appState.get();

    const result = service.createInterval({
      taskId: 'existing-task',
      date: '2026-08-13',
      startTime: '09:15',
      endTime: '10:45',
    });

    expect(result).toEqual({
      ok: true,
      value: { intervalId: 'manual-1' },
    });
    expect(intervals.findById('manual-1')).toEqual({
      id: 'manual-1',
      taskId: 'existing-task',
      startedAt: localTime(2026, 8, 13, 9, 15),
      endedAt: localTime(2026, 8, 13, 10, 45),
      createdAt: now,
      updatedAt: now,
    });
    expect(countRows(context, 'tasks')).toBe(1);
    expect(appState.get()).toEqual(stateBefore);
  });

  it('reuses a normalized typed description without creating a duplicate task', () => {
    tasks.insert({
      id: 'existing-task',
      description: 'Existing Task',
      normalizedDescription: 'existing task',
      createdAt: 100,
      updatedAt: 100,
    });

    const result = service.createInterval({
      taskDescription: '  EXISTING TASK  ',
      date: '2026-08-13',
      startTime: '11:00',
      endTime: '12:00',
    });

    expect(result).toEqual({
      ok: true,
      value: { intervalId: 'manual-1' },
    });
    expect(intervals.findById('manual-1')).toMatchObject({
      taskId: 'existing-task',
    });
    expect(countRows(context, 'tasks')).toBe(1);
  });

  it('creates a new task atomically for a new typed description', () => {
    const now = clock.now();

    const result = service.createInterval({
      taskDescription: '  Write release notes  ',
      date: '2026-08-13',
      startTime: '13:00',
      endTime: '14:30',
    });

    expect(result).toEqual({
      ok: true,
      value: { intervalId: 'manual-2' },
    });
    expect(tasks.findById('manual-1')).toEqual({
      id: 'manual-1',
      description: 'Write release notes',
      normalizedDescription: 'write release notes',
      createdAt: now,
      updatedAt: now,
    });
    expect(intervals.findById('manual-2')).toEqual({
      id: 'manual-2',
      taskId: 'manual-1',
      startedAt: localTime(2026, 8, 13, 13, 0),
      endedAt: localTime(2026, 8, 13, 14, 30),
      createdAt: now,
      updatedAt: now,
    });
  });

  it('returns TASK_NOT_FOUND for a missing selected task without persistence', () => {
    const changesBefore = totalChanges(context);

    expect(
      service.createInterval({
        taskId: 'missing-task',
        date: '2026-08-13',
        startTime: '09:00',
        endTime: '10:00',
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'TASK_NOT_FOUND',
        message: 'The selected task no longer exists.',
      },
    });
    expect(totalChanges(context)).toBe(changesBefore);
    expect(countRows(context, 'tasks')).toBe(0);
    expect(countRows(context, 'time_intervals')).toBe(0);
  });

  it('rejects invalid manual input without persistence', () => {
    const changesBefore = totalChanges(context);

    expect(
      service.createInterval({
        taskDescription: 'Write docs',
        date: '2026-08-13',
        startTime: '10:00',
        endTime: '10:00',
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'INVALID_MANUAL_INTERVAL' },
    });
    expect(totalChanges(context)).toBe(changesBefore);
    expect(countRows(context, 'tasks')).toBe(0);
    expect(countRows(context, 'time_intervals')).toBe(0);
  });

  it('rejects overlap with a persisted closed interval without mutation', () => {
    seedTask(context, 'task-1', 'Task 1', clock.now() - minutes(60));
    intervals.insert({
      id: 'closed-interval',
      taskId: 'task-1',
      startedAt: localTime(2026, 8, 13, 9, 0),
      endedAt: localTime(2026, 8, 13, 10, 0),
      createdAt: 100,
      updatedAt: 100,
    });
    const intervalBefore = intervals.findById('closed-interval');

    expect(
      service.createInterval({
        taskDescription: 'Other task',
        date: '2026-08-13',
        startTime: '09:30',
        endTime: '10:30',
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'TIME_INTERVAL_OVERLAP',
        message: 'The proposed interval overlaps an existing interval.',
      },
    });
    expect(countRows(context, 'tasks')).toBe(1);
    expect(countRows(context, 'time_intervals')).toBe(1);
    expect(intervals.findById('closed-interval')).toEqual(intervalBefore);
  });

  it('rejects overlap with the elapsed portion of the running open interval', () => {
    seedRunningState(context, clock.now() - minutes(30));
    const stateBefore = appState.get();
    const openBefore = intervals.findOpen();

    expect(
      service.createInterval({
        taskDescription: 'Manual overlap',
        date: '2026-08-14',
        startTime: '09:45',
        endTime: '10:15',
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'TIME_INTERVAL_OVERLAP',
        message: 'The proposed interval overlaps an existing interval.',
      },
    });
    expect(appState.get()).toEqual(stateBefore);
    expect(intervals.findOpen()).toEqual(openBefore);
    expect(countRows(context, 'tasks')).toBe(1);
    expect(countRows(context, 'time_intervals')).toBe(1);
  });

  it('allows a future manual interval while a timer is running if it does not overlap elapsed time', () => {
    seedRunningState(context, clock.now() - minutes(30));
    const stateBefore = appState.get();

    const result = service.createInterval({
      taskDescription: 'Future block',
      date: '2026-08-14',
      startTime: '11:00',
      endTime: '12:00',
    });

    expect(result).toEqual({
      ok: true,
      value: { intervalId: 'manual-2' },
    });
    expect(intervals.findById('manual-2')).toMatchObject({
      startedAt: localTime(2026, 8, 14, 11, 0),
      endedAt: localTime(2026, 8, 14, 12, 0),
    });
    expect(appState.get()).toEqual(stateBefore);
  });

  it('rolls back a newly created task when interval persistence fails', () => {
    context.sqlite
      .prepare(
        "create trigger reject_manual_interval before insert on time_intervals when new.ended_at is not null begin select raise(abort, 'rejected'); end",
      )
      .run();

    expect(() =>
      service.createInterval({
        taskDescription: 'Rollback task',
        date: '2026-08-13',
        startTime: '15:00',
        endTime: '16:00',
      }),
    ).toThrow('rejected');
    expect(countRows(context, 'tasks')).toBe(0);
    expect(countRows(context, 'time_intervals')).toBe(0);
  });

  it('maps invalid persisted timer state to INTERNAL_ERROR and logs locally', () => {
    const now = clock.now();
    seedTask(context, 'missing-current', 'Missing Current', now - minutes(60));
    context.sqlite
      .prepare(
        'update app_state set timer_status = ?, current_task_id = ?, session_started_at = ?, updated_at = ? where id = 1',
      )
      .run('running', 'missing-current', now - minutes(30), now);
    context.sqlite.prepare('delete from tasks where id = ?').run('missing-current');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = service.createInterval({
      taskDescription: 'Safe failure',
      date: '2026-08-13',
      startTime: '08:00',
      endTime: '09:00',
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
    expect(consoleError).toHaveBeenCalledOnce();
    expect(countRows(context, 'tasks')).toBe(0);
    expect(countRows(context, 'time_intervals')).toBe(0);
  });
});

const minutes = (value: number): number => value * 60_000;

const localTime = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): number => new Date(year, month - 1, day, hour, minute).getTime();

const countRows = (context: DatabaseContext, table: string): number => {
  const value: unknown = context.sqlite
    .prepare(`select count(*) from ${table}`)
    .pluck()
    .get();
  if (typeof value !== 'number') {
    throw new Error('Expected a numeric row count.');
  }
  return value;
};

const totalChanges = (context: DatabaseContext): number => {
  const value: unknown = context.sqlite
    .prepare('select total_changes()')
    .pluck()
    .get();
  if (typeof value !== 'number') {
    throw new Error('Expected SQLite total_changes() to return a number.');
  }
  return value;
};

const seedTask = (
  context: DatabaseContext,
  id: string,
  description: string,
  createdAt: number,
): void => {
  context.sqlite
    .prepare(
      'insert into tasks (id, description, normalized_description, created_at, updated_at) values (?, ?, ?, ?, ?)',
    )
    .run(id, description, description.toLowerCase(), createdAt, createdAt);
};

const seedRunningState = (context: DatabaseContext, startedAt: number): void => {
  seedTask(context, 'running-task', 'Running Task', startedAt - minutes(30));
  context.sqlite
    .prepare(
      'insert into time_intervals (id, task_id, started_at, ended_at, created_at, updated_at) values (?, ?, ?, ?, ?, ?)',
    )
    .run('open-interval', 'running-task', startedAt, null, startedAt, startedAt);
  context.sqlite
    .prepare(
      'update app_state set timer_status = ?, current_task_id = ?, session_started_at = ?, updated_at = ? where id = 1',
    )
    .run('running', 'running-task', startedAt, startedAt);
};
