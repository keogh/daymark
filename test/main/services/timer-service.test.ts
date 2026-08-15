import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { AppStateRepository } from '@/main/database/repositories/app-state-repository';
import { TaskRepository } from '@/main/database/repositories/task-repository';
import { TimeIntervalRepository } from '@/main/database/repositories/time-interval-repository';
import { TransactionRunner } from '@/main/database/transaction-runner';
import { DurationProjector } from '@/main/services/duration-projections';
import { TimerService } from '@/main/services/timer-service';
import { TimerStateReader } from '@/main/services/timer-state-reader';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../database/support/disposable-database';
import { FakeClock } from '../domain/support/fake-clock';

describe('TimerService', () => {
  let fixture: DisposableDatabase;
  let context: DatabaseContext;
  let clock: FakeClock;
  let tasks: TaskRepository;
  let intervals: TimeIntervalRepository;
  let appState: AppStateRepository;
  let reader: TimerStateReader;
  let service: TimerService;
  let nextId: number;

  beforeEach(async () => {
    fixture = await createDisposableDatabase();
    context = fixture.lifecycle.initialize();
    clock = new FakeClock(localTime(2026, 8, 14, 10));
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
    service = new TimerService({
      appState,
      tasks,
      intervals,
      transactions: new TransactionRunner(context.sqlite),
      stateReader: reader,
      clock,
      generateId: () => `generated-${nextId++}`,
    });
  });

  afterEach(async () => {
    await fixture.dispose();
  });

  it('creates a task, one open interval, AppState, and authoritative running state', () => {
    const now = clock.now();
    const nowSpy = vi.spyOn(clock, 'now');

    const result = service.start({
      source: 'description',
      description: '  Implement authentication  ',
    });

    expect(result).toEqual({
      ok: true,
      value: {
        status: 'running',
        currentTask: {
          id: 'generated-1',
          description: 'Implement authentication',
        },
        sessionStartedAt: now,
        sessionDurationMs: 0,
        taskTodayDurationMs: 0,
        taskLifetimeDurationMs: 0,
        activeIntervalStartedAt: now,
        now,
      },
    });
    expect(nowSpy).toHaveBeenCalledTimes(1);

    expect(tasks.findById('generated-1')).toEqual({
      id: 'generated-1',
      description: 'Implement authentication',
      normalizedDescription: 'implement authentication',
      createdAt: now,
      updatedAt: now,
    });
    expect(intervals.findOpen()).toEqual({
      id: 'generated-2',
      taskId: 'generated-1',
      startedAt: now,
      endedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    expect(appState.get()).toEqual({
      id: 1,
      timerStatus: 'running',
      currentTaskId: 'generated-1',
      sessionStartedAt: now,
      updatedAt: now,
    });

    clock.advance(minutes(30));
    expect(reader.getState().sessionDurationMs).toBe(minutes(30));
  });

  it('reuses an exact normalized task without changing its display description', () => {
    tasks.insert({
      id: 'existing-task',
      description: 'Implement authentication',
      normalizedDescription: 'implement authentication',
      createdAt: 100,
      updatedAt: 100,
    });

    const result = service.start({
      source: 'description',
      description: ' IMPLEMENT AUTHENTICATION ',
    });

    expect(result.ok && result.value.currentTask).toEqual({
      id: 'existing-task',
      description: 'Implement authentication',
    });
    expect(intervals.findOpen()?.taskId).toBe('existing-task');
    expect(countRows(context, 'tasks')).toBe(1);
  });

  it.each([undefined, null, {}])(
    'rejects malformed input without persistence: %j',
    (input) => {
      const changesBefore = totalChanges(context);

      expect(service.start(input)).toMatchObject({
        ok: false,
        error: { code: 'INVALID_START_TASK' },
      });
      expect(totalChanges(context)).toBe(changesBefore);
    },
  );

  it.each([
    { source: 'description', description: '' },
    { source: 'description', description: ' \n ' },
    { source: 'description', description: 'x'.repeat(501) },
  ])('rejects invalid descriptions without persistence: %j', (input) => {
    const changesBefore = totalChanges(context);

    expect(service.start(input)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_TASK_DESCRIPTION' },
    });
    expect(totalChanges(context)).toBe(changesBefore);
  });

  it.each(['running', 'paused'] as const)(
    'rejects Start while the timer is %s without persistence',
    (status) => {
      seedActiveState(context, status, clock.now());
      const changesBefore = totalChanges(context);

      expect(
        service.start({ source: 'description', description: 'Another task' }),
      ).toMatchObject({
        ok: false,
        error: { code: 'TIMER_NOT_IDLE' },
      });
      expect(totalChanges(context)).toBe(changesBefore);
      expect(countRows(context, 'tasks')).toBe(1);
      expect(countRows(context, 'time_intervals')).toBe(
        status === 'running' ? 1 : 0,
      );
    },
  );

  it('rolls back task and interval creation when AppState cannot be updated', () => {
    context.sqlite
      .prepare(
        "create trigger reject_start before update on app_state begin select raise(abort, 'rejected'); end",
      )
      .run();

    expect(() =>
      service.start({ source: 'description', description: 'Rolled back task' }),
    ).toThrow('rejected');
    expect(countRows(context, 'tasks')).toBe(0);
    expect(countRows(context, 'time_intervals')).toBe(0);
    expect(appState.get().timerStatus).toBe('idle');
  });

  it('pauses a running timer atomically and returns its authoritative duration', () => {
    const startedAt = clock.now();
    expect(
      service.start({ source: 'description', description: 'Active Task' }).ok,
    ).toBe(true);
    clock.advance(minutes(30));
    const pausedAt = clock.now();
    const nowSpy = vi.spyOn(clock, 'now');

    const result = service.pause();

    expect(result).toEqual({
      ok: true,
      value: {
        status: 'paused',
        currentTask: {
          id: 'generated-1',
          description: 'Active Task',
        },
        sessionStartedAt: startedAt,
        sessionDurationMs: minutes(30),
        taskTodayDurationMs: minutes(30),
        taskLifetimeDurationMs: minutes(30),
        activeIntervalStartedAt: null,
        now: pausedAt,
      },
    });
    expect(nowSpy).toHaveBeenCalledTimes(1);
    expect(intervals.findOpen()).toBeUndefined();
    expect(intervals.findById('generated-2')).toMatchObject({
      startedAt,
      endedAt: pausedAt,
      updatedAt: pausedAt,
    });
    expect(appState.get()).toEqual({
      id: 1,
      timerStatus: 'paused',
      currentTaskId: 'generated-1',
      sessionStartedAt: startedAt,
      updatedAt: pausedAt,
    });

    clock.advance(minutes(30));
    expect(reader.getState().sessionDurationMs).toBe(minutes(30));
  });

  it.each([
    { status: 'idle' as const, code: 'NO_ACTIVE_TIMER' },
    { status: 'paused' as const, code: 'TIMER_ALREADY_PAUSED' },
  ])(
    'rejects Pause while the timer is $status without persistence',
    ({ status, code }) => {
      if (status === 'paused') {
        seedActiveState(context, status, clock.now());
      }
      const changesBefore = totalChanges(context);

      expect(service.pause()).toMatchObject({ ok: false, error: { code } });
      expect(totalChanges(context)).toBe(changesBefore);
      expect(appState.get().timerStatus).toBe(status);
      expect(intervals.findOpen()).toBeUndefined();
    },
  );

  it('rolls back the interval close when paused AppState cannot be persisted', () => {
    const startedAt = clock.now();
    expect(
      service.start({ source: 'description', description: 'Rollback Pause' })
        .ok,
    ).toBe(true);
    clock.advance(minutes(10));
    context.sqlite
      .prepare(
        "create trigger reject_pause before update on app_state when new.timer_status = 'paused' begin select raise(abort, 'rejected'); end",
      )
      .run();

    expect(() => service.pause()).toThrow('rejected');
    expect(intervals.findOpen()).toMatchObject({
      id: 'generated-2',
      startedAt,
      endedAt: null,
    });
    expect(appState.get()).toMatchObject({
      timerStatus: 'running',
      currentTaskId: 'generated-1',
      sessionStartedAt: startedAt,
    });
  });

  it('resumes a paused timer atomically with a second interval and preserved session', () => {
    const startedAt = clock.now();
    expect(
      service.start({ source: 'description', description: 'Active Task' }).ok,
    ).toBe(true);
    clock.advance(minutes(30));
    expect(service.pause().ok).toBe(true);
    clock.advance(minutes(30));
    const resumedAt = clock.now();
    const nowSpy = vi.spyOn(clock, 'now');

    const result = service.resume();

    expect(result).toEqual({
      ok: true,
      value: {
        status: 'running',
        currentTask: {
          id: 'generated-1',
          description: 'Active Task',
        },
        sessionStartedAt: startedAt,
        sessionDurationMs: minutes(30),
        taskTodayDurationMs: minutes(30),
        taskLifetimeDurationMs: minutes(30),
        activeIntervalStartedAt: resumedAt,
        now: resumedAt,
      },
    });
    expect(nowSpy).toHaveBeenCalledTimes(1);
    expect(intervals.findByTask('generated-1')).toHaveLength(2);
    expect(intervals.findOpen()).toEqual({
      id: 'generated-3',
      taskId: 'generated-1',
      startedAt: resumedAt,
      endedAt: null,
      createdAt: resumedAt,
      updatedAt: resumedAt,
    });
    expect(appState.get()).toEqual({
      id: 1,
      timerStatus: 'running',
      currentTaskId: 'generated-1',
      sessionStartedAt: startedAt,
      updatedAt: resumedAt,
    });

    clock.advance(minutes(15));
    expect(reader.getState().sessionDurationMs).toBe(minutes(45));
  });

  it.each([
    { status: 'idle' as const, code: 'NO_CURRENT_TASK' },
    { status: 'running' as const, code: 'TIMER_ALREADY_RUNNING' },
  ])(
    'rejects Resume while the timer is $status without persistence',
    ({ status, code }) => {
      if (status === 'running') {
        seedActiveState(context, status, clock.now());
      }
      const changesBefore = totalChanges(context);

      expect(service.resume()).toMatchObject({ ok: false, error: { code } });
      expect(totalChanges(context)).toBe(changesBefore);
      expect(appState.get().timerStatus).toBe(status);
      expect(countRows(context, 'time_intervals')).toBe(
        status === 'running' ? 1 : 0,
      );
    },
  );

  it('rolls back the resumed interval when running AppState cannot be persisted', () => {
    const startedAt = clock.now();
    expect(
      service.start({ source: 'description', description: 'Rollback Resume' })
        .ok,
    ).toBe(true);
    clock.advance(minutes(10));
    expect(service.pause().ok).toBe(true);
    const intervalCount = countRows(context, 'time_intervals');
    context.sqlite
      .prepare(
        "create trigger reject_resume before update on app_state when old.timer_status = 'paused' and new.timer_status = 'running' begin select raise(abort, 'rejected'); end",
      )
      .run();

    expect(() => service.resume()).toThrow('rejected');
    expect(countRows(context, 'time_intervals')).toBe(intervalCount);
    expect(intervals.findOpen()).toBeUndefined();
    expect(appState.get()).toMatchObject({
      timerStatus: 'paused',
      currentTaskId: 'generated-1',
      sessionStartedAt: startedAt,
    });
  });

  it('stops a running timer atomically and preserves its final lifetime duration', () => {
    const startedAt = clock.now();
    expect(
      service.start({ source: 'description', description: 'Completed Task' })
        .ok,
    ).toBe(true);
    clock.advance(minutes(30));
    const stoppedAt = clock.now();
    const nowSpy = vi.spyOn(clock, 'now');

    const result = service.stop();

    expect(result).toEqual({
      ok: true,
      value: {
        status: 'idle',
        currentTask: null,
        sessionStartedAt: null,
        sessionDurationMs: 0,
        taskTodayDurationMs: 0,
        taskLifetimeDurationMs: 0,
        activeIntervalStartedAt: null,
        now: stoppedAt,
      },
    });
    expect(nowSpy).toHaveBeenCalledTimes(1);
    expect(intervals.findOpen()).toBeUndefined();
    expect(intervals.findById('generated-2')).toMatchObject({
      startedAt,
      endedAt: stoppedAt,
      updatedAt: stoppedAt,
    });
    expect(appState.get()).toEqual({
      id: 1,
      timerStatus: 'idle',
      currentTaskId: null,
      sessionStartedAt: null,
      updatedAt: stoppedAt,
    });

    const persistedIntervals = intervals.findByTask('generated-1');
    expect(persistedIntervals).toHaveLength(1);
    expect(
      new DurationProjector(intervals).project({
        taskId: 'generated-1',
        sessionStartedAt: startedAt,
        now: stoppedAt,
      }).taskLifetimeDurationMs,
    ).toBe(minutes(30));
  });

  it('stops a paused timer without creating or modifying intervals', () => {
    expect(
      service.start({ source: 'description', description: 'Paused Task' }).ok,
    ).toBe(true);
    clock.advance(minutes(30));
    expect(service.pause().ok).toBe(true);
    const intervalBeforeStop = intervals.findById('generated-2');
    const intervalCount = countRows(context, 'time_intervals');
    clock.advance(minutes(15));
    const stoppedAt = clock.now();

    expect(service.stop()).toMatchObject({
      ok: true,
      value: { status: 'idle', now: stoppedAt },
    });
    expect(countRows(context, 'time_intervals')).toBe(intervalCount);
    expect(intervals.findById('generated-2')).toEqual(intervalBeforeStop);
    expect(
      new DurationProjector(intervals).project({
        taskId: 'generated-1',
        sessionStartedAt: intervalBeforeStop?.startedAt ?? stoppedAt,
        now: stoppedAt,
      }).taskLifetimeDurationMs,
    ).toBe(minutes(30));
    expect(appState.get()).toMatchObject({
      timerStatus: 'idle',
      currentTaskId: null,
      sessionStartedAt: null,
      updatedAt: stoppedAt,
    });
  });

  it('returns idle idempotently without persistence when already stopped', () => {
    const changesBefore = totalChanges(context);
    const now = clock.now();

    expect(service.stop()).toEqual({
      ok: true,
      value: {
        status: 'idle',
        currentTask: null,
        sessionStartedAt: null,
        sessionDurationMs: 0,
        taskTodayDurationMs: 0,
        taskLifetimeDurationMs: 0,
        activeIntervalStartedAt: null,
        now,
      },
    });
    expect(totalChanges(context)).toBe(changesBefore);
    expect(countRows(context, 'time_intervals')).toBe(0);
  });

  it('rolls back a running interval close when idle AppState cannot be persisted', () => {
    const startedAt = clock.now();
    expect(
      service.start({ source: 'description', description: 'Rollback Stop' }).ok,
    ).toBe(true);
    clock.advance(minutes(10));
    context.sqlite
      .prepare(
        "create trigger reject_stop before update on app_state when new.timer_status = 'idle' begin select raise(abort, 'rejected'); end",
      )
      .run();

    expect(() => service.stop()).toThrow('rejected');
    expect(intervals.findOpen()).toMatchObject({
      id: 'generated-2',
      startedAt,
      endedAt: null,
    });
    expect(appState.get()).toMatchObject({
      timerStatus: 'running',
      currentTaskId: 'generated-1',
      sessionStartedAt: startedAt,
    });
  });
});

const minutes = (value: number): number => value * 60_000;

const localTime = (
  year: number,
  month: number,
  day: number,
  hour: number,
): number => new Date(year, month - 1, day, hour).getTime();

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

const seedActiveState = (
  context: DatabaseContext,
  status: 'running' | 'paused',
  startedAt: number,
): void => {
  context.sqlite
    .prepare(
      'insert into tasks (id, description, normalized_description, created_at, updated_at) values (?, ?, ?, ?, ?)',
    )
    .run('active-task', 'Active Task', 'active task', startedAt, startedAt);
  if (status === 'running') {
    context.sqlite
      .prepare(
        'insert into time_intervals (id, task_id, started_at, ended_at, created_at, updated_at) values (?, ?, ?, null, ?, ?)',
      )
      .run('active-interval', 'active-task', startedAt, startedAt, startedAt);
  }
  context.sqlite
    .prepare(
      'update app_state set timer_status = ?, current_task_id = ?, session_started_at = ?, updated_at = ?',
    )
    .run(status, 'active-task', startedAt, startedAt);
};
