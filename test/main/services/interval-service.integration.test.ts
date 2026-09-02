import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { AnalyticsQueryRepository } from '@/main/database/repositories/analytics-query-repository';
import { AppStateRepository } from '@/main/database/repositories/app-state-repository';
import { HistoryQueryRepository } from '@/main/database/repositories/history-query-repository';
import { SettingsRepository } from '@/main/database/repositories/settings-repository';
import { TaskRepository } from '@/main/database/repositories/task-repository';
import { TimeIntervalRepository } from '@/main/database/repositories/time-interval-repository';
import { TransactionRunner } from '@/main/database/transaction-runner';
import { AnalyticsService } from '@/main/services/analytics-service';
import { DurationProjector } from '@/main/services/duration-projections';
import { HistoryService } from '@/main/services/history-service';
import { IntervalService } from '@/main/services/interval-service';
import { ManualTimeService } from '@/main/services/manual-time-service';
import { TimerStateReader } from '@/main/services/timer-state-reader';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../database/support/disposable-database';
import { FakeClock } from '../domain/support/fake-clock';

const originalTimezone = process.env.TZ;

describe('IntervalService SQLite integration', () => {
  let fixture: DisposableDatabase;
  let context: DatabaseContext;
  let clock: FakeClock;
  let tasks: TaskRepository;
  let intervals: TimeIntervalRepository;
  let appState: AppStateRepository;
  let reader: TimerStateReader;
  let service: IntervalService;
  let history: HistoryService;
  let analytics: AnalyticsService;
  let manualTime: ManualTimeService;

  beforeEach(async () => {
    process.env.TZ = 'America/New_York';
    fixture = await createDisposableDatabase();
    clock = new FakeClock(localTime(2026, 8, 15, 12));
    initializeApplication();
    tasks.insert({
      id: 'task-1',
      description: 'Correction Task',
      normalizedDescription: 'correction task',
      createdAt: 100,
      updatedAt: 100,
    });
    tasks.insert({
      id: 'task-2',
      description: 'Running Task',
      normalizedDescription: 'running task',
      createdAt: 100,
      updatedAt: 100,
    });
  });

  const initializeApplication = (): void => {
    context = fixture.lifecycle.initialize();
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
    service = new IntervalService({
      appState,
      intervals,
      transactions: new TransactionRunner(context.sqlite),
      stateReader: reader,
      clock,
    });
    history = new HistoryService({
      clock,
      historyQueries: new HistoryQueryRepository(context.db),
    });
    analytics = new AnalyticsService({
      clock,
      analyticsQueries: new AnalyticsQueryRepository(context.db),
      settings: new SettingsRepository(context.db),
    });
    manualTime = new ManualTimeService({
      appState,
      tasks,
      intervals,
      transactions: new TransactionRunner(context.sqlite),
      stateReader: reader,
      clock,
      generateId: () => 'unexpected-manual-id',
    });
  };

  afterEach(async () => {
    process.env.TZ = originalTimezone;
    await fixture.dispose();
  });

  it('persists one cross-day edit and refreshes day and lifetime projections', () => {
    intervals.insert({
      id: 'target',
      taskId: 'task-1',
      startedAt: localTime(2026, 8, 14, 9),
      endedAt: localTime(2026, 8, 14, 10),
      createdAt: 100,
      updatedAt: 100,
    });

    expect(
      service.update({
        intervalId: 'target',
        startDate: '2026-08-13',
        startTime: '23:30',
        endDate: '2026-08-14',
        endTime: '01:15',
      }),
    ).toEqual({ ok: true, value: { intervalId: 'target' } });

    const page = history.getPage({});
    const activityDays = page.days.filter((day) => day.totalDurationMs > 0);
    expect(activityDays).toHaveLength(2);
    expect(activityDays.map((day) => day.totalDurationMs)).toEqual([
      minutes(75),
      minutes(30),
    ]);
    expect(activityDays.map((day) => day.tasks[0]?.lifetimeDurationMs)).toEqual(
      [minutes(105), minutes(105)],
    );
    expect(activityDays.map((day) => day.tasks[0]?.intervals[0]?.id)).toEqual([
      'target',
      'target',
    ]);
  });

  it('persists an overlapping closed edit without changing the other row or AppState', () => {
    const target = {
      id: 'target',
      taskId: 'task-1',
      startedAt: localTime(2026, 8, 14, 9),
      endedAt: localTime(2026, 8, 14, 10),
      createdAt: 100,
      updatedAt: 100,
    } as const;
    const other = {
      id: 'other',
      taskId: 'task-2',
      startedAt: localTime(2026, 8, 14, 11),
      endedAt: localTime(2026, 8, 14, 12),
      createdAt: 100,
      updatedAt: 100,
    } as const;
    intervals.insert(target);
    intervals.insert(other);
    const stateBefore = appState.get();

    expect(
      service.update({
        intervalId: target.id,
        startDate: '2026-08-14',
        startTime: '10:30',
        endDate: '2026-08-14',
        endTime: '11:30',
      }),
    ).toEqual({ ok: true, value: { intervalId: target.id } });
    expect(intervals.findById(target.id)).toEqual({
      ...target,
      startedAt: localTime(2026, 8, 14, 10, 30),
      endedAt: localTime(2026, 8, 14, 11, 30),
      updatedAt: clock.now(),
    });
    expect(intervals.findById(other.id)).toEqual(other);
    expect(appState.get()).toEqual(stateBefore);
  });

  it('persists an edit across elapsed open time without changing the running timer', () => {
    const openStartedAt = localTime(2026, 8, 15, 11);
    intervals.insert({
      id: 'target',
      taskId: 'task-1',
      startedAt: localTime(2026, 8, 14, 9),
      endedAt: localTime(2026, 8, 14, 10),
      createdAt: 100,
      updatedAt: 100,
    });
    intervals.insert({
      id: 'open',
      taskId: 'task-2',
      startedAt: openStartedAt,
      endedAt: null,
      createdAt: 100,
      updatedAt: 100,
    });
    context.sqlite
      .prepare(
        'update app_state set timer_status = ?, current_task_id = ?, session_started_at = ?, updated_at = ? where id = 1',
      )
      .run('running', 'task-2', openStartedAt, 100);
    const stateBefore = appState.get();
    const openBefore = intervals.findOpen();

    expect(
      service.update({
        intervalId: 'target',
        startDate: '2026-08-15',
        startTime: '11:30',
        endDate: '2026-08-15',
        endTime: '12:30',
      }),
    ).toEqual({ ok: true, value: { intervalId: 'target' } });
    expect(intervals.findOpen()).toEqual(openBefore);
    expect(appState.get()).toEqual(stateBefore);
    expect(reader.getState()).toMatchObject({
      status: 'running',
      currentTask: { id: 'task-2' },
      activeIntervalStartedAt: openStartedAt,
    });
  });

  it('restarts with edit-created overlaps, additive projections, and creation guards intact', () => {
    const openStartedAt = localTime(2026, 8, 15, 11);
    intervals.insert({
      id: 'target',
      taskId: 'task-1',
      startedAt: localTime(2026, 8, 15, 8),
      endedAt: localTime(2026, 8, 15, 9),
      createdAt: 100,
      updatedAt: 100,
    });
    intervals.insert({
      id: 'other',
      taskId: 'task-2',
      startedAt: localTime(2026, 8, 15, 9, 30),
      endedAt: localTime(2026, 8, 15, 11, 30),
      createdAt: 100,
      updatedAt: 100,
    });
    intervals.insert({
      id: 'open',
      taskId: 'task-2',
      startedAt: openStartedAt,
      endedAt: null,
      createdAt: 100,
      updatedAt: 100,
    });
    context.sqlite
      .prepare(
        'update app_state set timer_status = ?, current_task_id = ?, session_started_at = ?, updated_at = ? where id = 1',
      )
      .run('running', 'task-2', openStartedAt, 100);

    expect(
      service.update({
        intervalId: 'target',
        startDate: '2026-08-15',
        startTime: '10:00',
        endDate: '2026-08-15',
        endTime: '12:00',
      }),
    ).toEqual({ ok: true, value: { intervalId: 'target' } });

    fixture.lifecycle.close();
    initializeApplication();

    expect(intervals.findByTask('task-1')).toEqual([
      expect.objectContaining({
        id: 'target',
        taskId: 'task-1',
        startedAt: localTime(2026, 8, 15, 10),
        endedAt: localTime(2026, 8, 15, 12),
      }),
    ]);
    expect(intervals.findByTask('task-2')).toEqual([
      expect.objectContaining({ id: 'other' }),
      expect.objectContaining({ id: 'open', endedAt: null }),
    ]);
    expect(reader.getState()).toMatchObject({
      status: 'running',
      currentTask: { id: 'task-2' },
      sessionStartedAt: openStartedAt,
      activeIntervalStartedAt: openStartedAt,
      sessionDurationMs: minutes(60),
      taskTodayDurationMs: minutes(180),
      taskLifetimeDurationMs: minutes(180),
    });

    const today = history.getPage({}).days[0]!;
    expect(today.totalDurationMs).toBe(minutes(300));
    expect(today.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          task: { id: 'task-1', description: 'Correction Task' },
          dayDurationMs: minutes(120),
          lifetimeDurationMs: minutes(120),
        }),
        expect.objectContaining({
          task: { id: 'task-2', description: 'Running Task' },
          dayDurationMs: minutes(180),
          lifetimeDurationMs: minutes(180),
        }),
      ]),
    );
    expect(today.tasks.flatMap((task) => task.intervals)).toHaveLength(3);

    expect(analytics.getSummary({ range: 'last-7-days' })).toMatchObject({
      totalDurationMs: minutes(300),
      topTasks: [
        { task: { id: 'task-2' }, durationMs: minutes(180) },
        { task: { id: 'task-1' }, durationMs: minutes(120) },
      ],
      runningTask: {
        task: { id: 'task-2' },
        durationMs: minutes(180),
        intervalStartedAt: openStartedAt,
      },
    });

    const stateBeforeRejectedCreates = appState.get();
    const intervalsBeforeRejectedCreates = context.sqlite
      .prepare('select * from time_intervals order by id')
      .all();
    expect(
      manualTime.createInterval({
        taskId: 'task-1',
        date: '2026-08-15',
        startTime: '10:15',
        endTime: '10:45',
      }),
    ).toMatchObject({ ok: false, error: { code: 'TIME_INTERVAL_OVERLAP' } });
    expect(
      manualTime.createInterval({
        taskId: 'task-1',
        date: '2026-08-15',
        startTime: '11:45',
        endTime: '12:15',
      }),
    ).toMatchObject({ ok: false, error: { code: 'TIME_INTERVAL_OVERLAP' } });
    expect(appState.get()).toEqual(stateBeforeRejectedCreates);
    expect(
      context.sqlite.prepare('select * from time_intervals order by id').all(),
    ).toEqual(intervalsBeforeRejectedCreates);
  });

  it('edits a closed current-session interval while preserving running state and refreshing timer totals', () => {
    const sessionStartedAt = localTime(2026, 8, 15, 9);
    intervals.insert({
      id: 'closed-session',
      taskId: 'task-1',
      startedAt: sessionStartedAt,
      endedAt: localTime(2026, 8, 15, 10),
      createdAt: 100,
      updatedAt: 100,
    });
    intervals.insert({
      id: 'open-session',
      taskId: 'task-1',
      startedAt: localTime(2026, 8, 15, 11),
      endedAt: null,
      createdAt: 100,
      updatedAt: 100,
    });
    context.sqlite
      .prepare(
        'update app_state set timer_status = ?, current_task_id = ?, session_started_at = ?, updated_at = ? where id = 1',
      )
      .run('running', 'task-1', sessionStartedAt, 100);
    const stateBefore = appState.get();
    const openBefore = intervals.findOpen();

    expect(
      service.update({
        intervalId: 'closed-session',
        startDate: '2026-08-15',
        startTime: '09:00',
        endDate: '2026-08-15',
        endTime: '10:30',
      }),
    ).toEqual({ ok: true, value: { intervalId: 'closed-session' } });
    expect(appState.get()).toEqual(stateBefore);
    expect(intervals.findOpen()).toEqual(openBefore);
    expect(reader.getState()).toMatchObject({
      status: 'running',
      sessionDurationMs: minutes(150),
      taskTodayDurationMs: minutes(150),
      taskLifetimeDurationMs: minutes(150),
      activeIntervalStartedAt: localTime(2026, 8, 15, 11),
    });
  });

  it("deletes a task's last interval while preserving the task and refreshing history", () => {
    intervals.insert({
      id: 'only-interval',
      taskId: 'task-1',
      startedAt: localTime(2026, 8, 15, 9),
      endedAt: localTime(2026, 8, 15, 10),
      createdAt: 100,
      updatedAt: 100,
    });

    expect(service.delete({ intervalId: 'only-interval' })).toEqual({
      ok: true,
      value: { intervalId: 'only-interval' },
    });
    expect(tasks.findById('task-1')).toBeDefined();
    expect(intervals.findByTask('task-1')).toEqual([]);
    expect(history.getPage({}).days.flatMap((day) => day.tasks)).toEqual([]);
  });

  it('deletes a closed current-session interval while preserving running state and refreshing timer totals', () => {
    const sessionStartedAt = localTime(2026, 8, 15, 9);
    intervals.insert({
      id: 'closed-session',
      taskId: 'task-1',
      startedAt: sessionStartedAt,
      endedAt: localTime(2026, 8, 15, 10),
      createdAt: 100,
      updatedAt: 100,
    });
    intervals.insert({
      id: 'open-session',
      taskId: 'task-1',
      startedAt: localTime(2026, 8, 15, 11),
      endedAt: null,
      createdAt: 100,
      updatedAt: 100,
    });
    context.sqlite
      .prepare(
        'update app_state set timer_status = ?, current_task_id = ?, session_started_at = ?, updated_at = ? where id = 1',
      )
      .run('running', 'task-1', sessionStartedAt, 100);
    const stateBefore = appState.get();
    const openBefore = intervals.findOpen();

    expect(service.delete({ intervalId: 'closed-session' })).toEqual({
      ok: true,
      value: { intervalId: 'closed-session' },
    });
    expect(appState.get()).toEqual(stateBefore);
    expect(intervals.findOpen()).toEqual(openBefore);
    expect(reader.getState()).toMatchObject({
      status: 'running',
      sessionDurationMs: minutes(60),
      taskTodayDurationMs: minutes(60),
      taskLifetimeDurationMs: minutes(60),
      activeIntervalStartedAt: localTime(2026, 8, 15, 11),
    });
  });
});

const minutes = (value: number): number => value * 60_000;

const localTime = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): number => new Date(year, month - 1, day, hour, minute).getTime();
