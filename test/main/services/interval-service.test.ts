import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { AppStateRepository } from '@/main/database/repositories/app-state-repository';
import { TaskRepository } from '@/main/database/repositories/task-repository';
import { TimeIntervalRepository } from '@/main/database/repositories/time-interval-repository';
import { TransactionRunner } from '@/main/database/transaction-runner';
import type { TimeInterval } from '@/main/domain/time-interval';
import { DurationProjector } from '@/main/services/duration-projections';
import { IntervalService } from '@/main/services/interval-service';
import { TimerStateReader } from '@/main/services/timer-state-reader';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../database/support/disposable-database';
import { FakeClock } from '../domain/support/fake-clock';

const originalTimezone = process.env.TZ;

describe('IntervalService', () => {
  let fixture: DisposableDatabase;
  let context: DatabaseContext;
  let clock: FakeClock;
  let appState: AppStateRepository;
  let tasks: TaskRepository;
  let intervals: TimeIntervalRepository;
  let service: IntervalService;

  beforeEach(async () => {
    process.env.TZ = 'America/New_York';
    fixture = await createDisposableDatabase();
    context = fixture.lifecycle.initialize();
    clock = new FakeClock(localTime(2026, 8, 14, 12));
    appState = new AppStateRepository(context.db);
    tasks = new TaskRepository(context.db);
    intervals = new TimeIntervalRepository(context.db);
    service = new IntervalService({
      appState,
      intervals,
      transactions: new TransactionRunner(context.sqlite),
      stateReader: new TimerStateReader({
        appState,
        tasks,
        intervals,
        durations: new DurationProjector(intervals),
        clock,
      }),
      clock,
    });
    seedTask('task-1');
    seedTask('task-2');
  });

  afterEach(async () => {
    process.env.TZ = originalTimezone;
    vi.restoreAllMocks();
    await fixture.dispose();
  });

  it('updates one interval across multiple local days and preserves identity, task, and creation metadata', () => {
    const target = seedInterval();
    const stateBefore = appState.get();

    expect(
      service.update({
        intervalId: target.id,
        startDate: '2026-08-12',
        startTime: '23:30',
        endDate: '2026-08-14',
        endTime: '01:15',
      }),
    ).toEqual({ ok: true, value: { intervalId: target.id } });
    expect(intervals.findById(target.id)).toEqual({
      ...target,
      startedAt: localTime(2026, 8, 12, 23, 30),
      endedAt: localTime(2026, 8, 14, 1, 15),
      updatedAt: clock.now(),
    });
    expect(appState.get()).toEqual(stateBefore);
  });

  it('accepts an unchanged idempotent update without overlapping itself', () => {
    const target = seedInterval();

    expect(
      service.update({
        intervalId: target.id,
        startDate: '2026-08-13',
        startTime: '09:00',
        endDate: '2026-08-13',
        endTime: '10:00',
      }),
    ).toEqual({ ok: true, value: { intervalId: target.id } });
    expect(intervals.findById(target.id)).toMatchObject({
      startedAt: target.startedAt,
      endedAt: target.endedAt,
      updatedAt: clock.now(),
    });
  });

  it('allows touching closed interval boundaries', () => {
    seedInterval();
    seedInterval({
      id: 'neighbor',
      taskId: 'task-2',
      startedAt: localTime(2026, 8, 13, 11),
      endedAt: localTime(2026, 8, 13, 12),
    });

    expect(
      service.update({
        intervalId: 'interval-1',
        startDate: '2026-08-13',
        startTime: '10:00',
        endDate: '2026-08-13',
        endTime: '11:00',
      }),
    ).toEqual({ ok: true, value: { intervalId: 'interval-1' } });
  });

  it('returns controlled invalid, missing, and open-target failures without mutation', () => {
    const target = seedInterval();
    const invalidResult = service.update({
      intervalId: target.id,
      startDate: '2026-08-13',
      startTime: '10:00',
      endDate: '2026-08-13',
      endTime: '10:00',
    });
    expect(invalidResult).toMatchObject({
      ok: false,
      error: { code: 'INVALID_INTERVAL_UPDATE' },
    });
    expect(intervals.findById(target.id)).toEqual(target);

    expect(
      service.update({
        intervalId: 'missing',
        startDate: '2026-08-13',
        startTime: '11:00',
        endDate: '2026-08-13',
        endTime: '12:00',
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'TIME_INTERVAL_NOT_FOUND' },
    });

    seedRunningState(localTime(2026, 8, 14, 11, 30));
    const openBefore = intervals.findOpen();
    expect(
      service.update({
        intervalId: 'open-interval',
        startDate: '2026-08-14',
        startTime: '10:00',
        endDate: '2026-08-14',
        endTime: '11:00',
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'OPEN_INTERVAL_NOT_EDITABLE' },
    });
    expect(intervals.findOpen()).toEqual(openBefore);
  });

  it.each([
    ['partial overlap', '10:30', '11:30'],
    ['complete containment', '10:30', '12:30'],
    ['identical range', '11:00', '12:00'],
  ])('allows %s with a closed interval across tasks', (_case, startTime, endTime) => {
    const target = seedInterval();
    const neighbor = seedInterval({
      id: 'neighbor',
      taskId: 'task-2',
      startedAt: localTime(2026, 8, 13, 11),
      endedAt: localTime(2026, 8, 13, 12),
    });

    expect(
      service.update({
        intervalId: target.id,
        startDate: '2026-08-13',
        startTime,
        endDate: '2026-08-13',
        endTime,
      }),
    ).toEqual({ ok: true, value: { intervalId: target.id } });
    expect(intervals.findById(target.id)).toMatchObject({
      id: target.id,
      taskId: target.taskId,
      startedAt: localTime(2026, 8, 13, ...clockParts(startTime)),
      endedAt: localTime(2026, 8, 13, ...clockParts(endTime)),
      createdAt: target.createdAt,
    });
    expect(intervals.findById(neighbor.id)).toEqual(neighbor);
  });

  it('allows an identical range on the same task and overlap across multiple closed intervals', () => {
    const target = seedInterval();
    const first = seedInterval({
      id: 'first',
      startedAt: localTime(2026, 8, 13, 10),
      endedAt: localTime(2026, 8, 13, 12),
    });
    const second = seedInterval({
      id: 'second',
      taskId: 'task-2',
      startedAt: localTime(2026, 8, 13, 11),
      endedAt: localTime(2026, 8, 13, 12),
    });

    expect(
      service.update({
        intervalId: target.id,
        startDate: '2026-08-13',
        startTime: '10:00',
        endDate: '2026-08-13',
        endTime: '12:00',
      }),
    ).toEqual({ ok: true, value: { intervalId: target.id } });
    expect(intervals.findById(first.id)).toEqual(first);
    expect(intervals.findById(second.id)).toEqual(second);
  });

  it('allows overlap with elapsed running time and leaves timer state unchanged', () => {
    const target = seedInterval();
    seedRunningState(localTime(2026, 8, 14, 11, 30));
    const stateBefore = appState.get();
    const openBefore = intervals.findOpen();

    expect(
      service.update({
        intervalId: target.id,
        startDate: '2026-08-14',
        startTime: '11:45',
        endDate: '2026-08-14',
        endTime: '12:30',
      }),
    ).toEqual({ ok: true, value: { intervalId: target.id } });
    expect(intervals.findById(target.id)).toMatchObject({
      id: target.id,
      taskId: target.taskId,
      startedAt: localTime(2026, 8, 14, 11, 45),
      endedAt: localTime(2026, 8, 14, 12, 30),
    });
    expect(intervals.findOpen()).toEqual(openBefore);
    expect(appState.get()).toEqual(stateBefore);
  });

  it('rolls back and maps persistence failure to a logged INTERNAL_ERROR', () => {
    const target = seedInterval();
    context.sqlite
      .prepare(
        "create trigger reject_interval_update before update on time_intervals begin select raise(abort, 'rejected'); end",
      )
      .run();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(
      service.update({
        intervalId: target.id,
        startDate: '2026-08-13',
        startTime: '10:00',
        endDate: '2026-08-13',
        endTime: '11:00',
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
    expect(intervals.findById(target.id)).toEqual(target);
    expect(consoleError).toHaveBeenCalledOnce();
  });

  it('maps invalid persisted timer state without changing the target', () => {
    const target = seedInterval();
    context.sqlite
      .prepare(
        'update app_state set timer_status = ?, current_task_id = ?, session_started_at = ?, updated_at = ? where id = 1',
      )
      .run('running', 'task-2', clock.now() - minutes(30), clock.now());
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(
      service.update({
        intervalId: target.id,
        startDate: '2026-08-13',
        startTime: '10:00',
        endDate: '2026-08-13',
        endTime: '11:00',
      }),
    ).toMatchObject({ ok: false, error: { code: 'INTERNAL_ERROR' } });
    expect(intervals.findById(target.id)).toEqual(target);
    expect(consoleError).toHaveBeenCalledOnce();
  });

  it('deletes exactly one closed interval while preserving its task, other intervals, and AppState', () => {
    const target = seedInterval();
    const other = seedInterval({
      id: 'other-interval',
      taskId: 'task-2',
      startedAt: localTime(2026, 8, 13, 11),
      endedAt: localTime(2026, 8, 13, 12),
    });
    const stateBefore = appState.get();

    expect(service.delete({ intervalId: target.id })).toEqual({
      ok: true,
      value: { intervalId: target.id },
    });
    expect(intervals.findById(target.id)).toBeUndefined();
    expect(intervals.findById(other.id)).toEqual(other);
    expect(tasks.findById(target.taskId)).toBeDefined();
    expect(appState.get()).toEqual(stateBefore);
  });

  it('returns controlled invalid, missing, and open-target delete failures without mutation', () => {
    const invalidResult = service.delete({ intervalId: ' invalid' });
    expect(invalidResult).toMatchObject({
      ok: false,
      error: { code: 'INVALID_INTERVAL_DELETE' },
    });

    expect(service.delete({ intervalId: 'missing' })).toMatchObject({
      ok: false,
      error: { code: 'TIME_INTERVAL_NOT_FOUND' },
    });

    seedRunningState(localTime(2026, 8, 14, 11, 30));
    const stateBefore = appState.get();
    const openBefore = intervals.findOpen();
    expect(service.delete({ intervalId: 'open-interval' })).toMatchObject({
      ok: false,
      error: { code: 'OPEN_INTERVAL_NOT_EDITABLE' },
    });
    expect(intervals.findOpen()).toEqual(openBefore);
    expect(appState.get()).toEqual(stateBefore);
  });

  it('rolls back deletion and maps persistence failure to a logged INTERNAL_ERROR', () => {
    const target = seedInterval();
    context.sqlite
      .prepare(
        "create trigger reject_interval_delete before delete on time_intervals begin select raise(abort, 'rejected'); end",
      )
      .run();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(service.delete({ intervalId: target.id })).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
    expect(intervals.findById(target.id)).toEqual(target);
    expect(consoleError).toHaveBeenCalledOnce();
  });

  const seedTask = (id: string): void => {
    tasks.insert({
      id,
      description: id,
      normalizedDescription: id,
      createdAt: 100,
      updatedAt: 100,
    });
  };

  const seedInterval = (
    overrides: Partial<TimeInterval> = {},
  ): TimeInterval => {
    const interval: TimeInterval = {
      id: 'interval-1',
      taskId: 'task-1',
      startedAt: localTime(2026, 8, 13, 9),
      endedAt: localTime(2026, 8, 13, 10),
      createdAt: 100,
      updatedAt: 100,
      ...overrides,
    };
    intervals.insert(interval);
    return interval;
  };

  const seedRunningState = (startedAt: number): void => {
    intervals.insert({
      id: 'open-interval',
      taskId: 'task-2',
      startedAt,
      endedAt: null,
      createdAt: startedAt,
      updatedAt: startedAt,
    });
    context.sqlite
      .prepare(
        'update app_state set timer_status = ?, current_task_id = ?, session_started_at = ?, updated_at = ? where id = 1',
      )
      .run('running', 'task-2', startedAt, startedAt);
  };
});

const minutes = (value: number): number => value * 60_000;

const clockParts = (value: string): [number, number] => {
  const [hour, minute] = value.split(':').map(Number);
  return [hour ?? 0, minute ?? 0];
};

const localTime = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): number => new Date(year, month - 1, day, hour, minute).getTime();
