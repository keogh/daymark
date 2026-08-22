import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { AnalyticsQueryRepository } from '@/main/database/repositories/analytics-query-repository';
import { AppStateRepository } from '@/main/database/repositories/app-state-repository';
import { TaskRepository } from '@/main/database/repositories/task-repository';
import { SettingsRepository } from '@/main/database/repositories/settings-repository';
import { TaskSuggestionQueryRepository } from '@/main/database/repositories/task-suggestion-query-repository';
import { TimeIntervalRepository } from '@/main/database/repositories/time-interval-repository';
import { TransactionRunner } from '@/main/database/transaction-runner';
import { AnalyticsService } from '@/main/services/analytics-service';
import { DurationProjector } from '@/main/services/duration-projections';
import { ManualTimeService } from '@/main/services/manual-time-service';
import { TaskService } from '@/main/services/task-service';
import { TimerService } from '@/main/services/timer-service';
import { TimerStateReader } from '@/main/services/timer-state-reader';
import type { AppResult } from '@/shared/contracts/app-result';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../database/support/disposable-database';
import { FakeClock } from '../domain/support/fake-clock';

const originalTimezone = process.env.TZ;

describe('AnalyticsService with SQLite', () => {
  let fixture: DisposableDatabase;
  let clock: FakeClock;
  let nextId: number;
  let application: TestApplication;

  beforeEach(async () => {
    process.env.TZ = 'America/New_York';
    fixture = await createDisposableDatabase();
    clock = new FakeClock(localTime(2026, 8, 19, 9));
    nextId = 1;
    application = createApplication(
      fixture,
      clock,
      () => `analytics-${nextId++}`,
    );
  });

  afterEach(async () => {
    process.env.TZ = originalTimezone;
    await fixture.dispose();
  });

  it('reprojects timer, manual, renamed, deleted, and restarted data without writes', () => {
    const started = valueOf(
      application.timer.start({
        source: 'description',
        description: 'Live task',
      }),
    );
    const liveTaskId = started.currentTask!.id;
    clock.advance(hours(1));

    const running = application.analytics.getSummary({
      range: 'last-7-days',
    });
    expect(running.totalDurationMs).toBe(hours(1));
    expect(running.runningTask).toMatchObject({
      task: { id: liveTaskId, description: 'Live task' },
      durationMs: hours(1),
      intervalStartedAt: localTime(2026, 8, 19, 9),
    });

    fixture.lifecycle.close();
    clock.advance(minutes(30));
    application = createApplication(
      fixture,
      clock,
      () => `analytics-${nextId++}`,
    );
    expect(
      application.analytics.getSummary({ range: 'last-30-days' }).runningTask,
    ).toMatchObject({ durationMs: minutes(90) });

    valueOf(application.timer.stop());
    valueOf(
      application.manual.createInterval({
        taskDescription: 'Manual task',
        date: '2026-08-18',
        startTime: '08:00',
        endTime: '09:00',
      }),
    );
    const manualTask =
      application.tasks.findByNormalizedDescription('manual task')!;
    expect(
      application.analytics.getSummary({ range: 'last-7-days' }),
    ).toMatchObject({
      totalDurationMs: minutes(150),
      runningTask: null,
      topTasks: [
        { task: { id: liveTaskId }, durationMs: minutes(90) },
        { task: { id: manualTask.id }, durationMs: hours(1) },
      ],
    });

    valueOf(
      application.taskService.rename({
        taskId: liveTaskId,
        description: 'Renamed live task',
      }),
    );
    expect(
      application.analytics.getSummary({ range: 'last-7-days' }).topTasks[0]
        ?.task.description,
    ).toBe('Renamed live task');

    valueOf(application.taskService.delete({ taskId: manualTask.id }));
    const afterDelete = application.analytics.getSummary({
      range: 'last-7-days',
    });
    expect(afterDelete.totalDurationMs).toBe(minutes(90));
    expect(afterDelete.topTasks.map((task) => task.task.id)).toEqual([
      liveTaskId,
    ]);

    const beforeReads = application.context.sqlite.serialize();
    application.analytics.getSummary({ range: 'last-7-days' });
    application.analytics.getSummary({ range: 'last-30-days' });
    expect(application.context.sqlite.serialize()).toEqual(beforeReads);
  });

  it('changes only current-week projection when the persisted week start changes', () => {
    valueOf(
      application.manual.createInterval({
        taskDescription: 'Sunday work',
        date: '2026-08-16',
        startTime: '08:00',
        endTime: '10:00',
      }),
    );
    valueOf(
      application.manual.createInterval({
        taskDescription: 'Monday work',
        date: '2026-08-17',
        startTime: '08:00',
        endTime: '09:00',
      }),
    );

    const monday = application.analytics.getSummary({ range: 'last-7-days' });
    application.settings.setWeekStartsOn('sunday', clock.now());
    const sunday = application.analytics.getSummary({ range: 'last-7-days' });

    expect(monday.currentWeek).toMatchObject({
      periodStartedAt: localTime(2026, 8, 17),
      durationMs: hours(1),
    });
    expect(sunday.currentWeek).toMatchObject({
      periodStartedAt: localTime(2026, 8, 16),
      durationMs: hours(3),
    });
    expect(sunday.days).toEqual(monday.days);
    expect(sunday.totalDurationMs).toBe(monday.totalDurationMs);
    expect(sunday.dailyAverageDurationMs).toBe(monday.dailyAverageDurationMs);
    expect(sunday.currentMonth).toEqual(monday.currentMonth);
    expect(sunday.topTasks).toEqual(monday.topTasks);
    expect(sunday.runningTask).toEqual(monday.runningTask);
  });
});

interface TestApplication {
  readonly context: DatabaseContext;
  readonly analytics: AnalyticsService;
  readonly timer: TimerService;
  readonly manual: ManualTimeService;
  readonly taskService: TaskService;
  readonly tasks: TaskRepository;
  readonly settings: SettingsRepository;
}

const createApplication = (
  fixture: DisposableDatabase,
  clock: FakeClock,
  generateId: () => string,
): TestApplication => {
  const context = fixture.lifecycle.initialize();
  const appState = new AppStateRepository(context.db);
  const tasks = new TaskRepository(context.db);
  const intervals = new TimeIntervalRepository(context.db);
  const settings = new SettingsRepository(context.db);
  const transactions = new TransactionRunner(context.sqlite);
  const stateReader = new TimerStateReader({
    appState,
    tasks,
    intervals,
    durations: new DurationProjector(intervals),
    clock,
  });

  return {
    context,
    analytics: new AnalyticsService({
      clock,
      analyticsQueries: new AnalyticsQueryRepository(context.db),
      settings,
    }),
    timer: new TimerService({
      appState,
      tasks,
      intervals,
      transactions,
      stateReader,
      clock,
      generateId,
    }),
    manual: new ManualTimeService({
      appState,
      tasks,
      intervals,
      transactions,
      stateReader,
      clock,
      generateId,
    }),
    taskService: new TaskService({
      appState,
      clock,
      suggestionQueries: new TaskSuggestionQueryRepository(context.db),
      tasks,
      transactions,
    }),
    tasks,
    settings,
  };
};

const valueOf = <T>(result: AppResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`Expected success, received ${result.error.code}.`);
  }
  return result.value;
};

const localTime = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): number => new Date(year, month - 1, day, hour, minute).getTime();

const minutes = (value: number): number => value * 60_000;
const hours = (value: number): number => minutes(value * 60);
