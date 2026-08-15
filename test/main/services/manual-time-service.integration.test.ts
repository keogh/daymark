import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { AppStateRepository } from '@/main/database/repositories/app-state-repository';
import { TaskRepository } from '@/main/database/repositories/task-repository';
import { TaskSuggestionQueryRepository } from '@/main/database/repositories/task-suggestion-query-repository';
import { TimeIntervalRepository } from '@/main/database/repositories/time-interval-repository';
import { TransactionRunner } from '@/main/database/transaction-runner';
import { DurationProjector } from '@/main/services/duration-projections';
import { ManualTimeService } from '@/main/services/manual-time-service';
import { TaskService } from '@/main/services/task-service';
import { TimerService } from '@/main/services/timer-service';
import { TimerStateReader } from '@/main/services/timer-state-reader';
import type { AppResult } from '@/shared/contracts/app-result';
import type { ManualIntervalCreateResult } from '@/shared/contracts/manual-time';
import type { TimerState } from '@/shared/contracts/timer';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../database/support/disposable-database';
import { FakeClock } from '../domain/support/fake-clock';

const originalTimezone = process.env.TZ;

describe('ManualTimeService SQLite integration', () => {
  let fixture: DisposableDatabase;
  let clock: FakeClock;
  let nextId: number;
  let application: TestApplication;

  beforeEach(async () => {
    process.env.TZ = 'America/New_York';
    fixture = await createDisposableDatabase();
    clock = new FakeClock(localTime(2026, 8, 14, 9));
    nextId = 1;
    application = createApplication();
  });

  afterEach(async () => {
    process.env.TZ = originalTimezone;
    await fixture.dispose();
  });

  const createApplication = (): TestApplication => {
    const context = fixture.lifecycle.initialize();
    const tasks = new TaskRepository(context.db);
    const intervals = new TimeIntervalRepository(context.db);
    const appState = new AppStateRepository(context.db);
    const durations = new DurationProjector(intervals);
    const reader = new TimerStateReader({
      appState,
      tasks,
      intervals,
      durations,
      clock,
    });
    const timerService = new TimerService({
      appState,
      tasks,
      intervals,
      transactions: new TransactionRunner(context.sqlite),
      stateReader: reader,
      clock,
      generateId: () => `integration-${nextId++}`,
    });
    const manualTimeService = new ManualTimeService({
      appState,
      tasks,
      intervals,
      transactions: new TransactionRunner(context.sqlite),
      stateReader: reader,
      clock,
      generateId: () => `integration-${nextId++}`,
    });
    const taskService = new TaskService({
      clock,
      suggestionQueries: new TaskSuggestionQueryRepository(context.db),
    });

    return {
      context,
      tasks,
      intervals,
      appState,
      durations,
      reader,
      timerService,
      manualTimeService,
      taskService,
    };
  };

  it('persists a manual interval for an existing task without changing timer state', () => {
    const now = clock.now();
    application.tasks.insert({
      id: 'existing-task',
      description: 'Existing Task',
      normalizedDescription: 'existing task',
      createdAt: now - minutes(90),
      updatedAt: now - minutes(90),
    });
    const stateBefore = application.appState.get();

    expect(
      valueOfManual(
        application.manualTimeService.createInterval({
          taskId: 'existing-task',
          date: '2026-08-13',
          startTime: '08:30',
          endTime: '09:15',
        }),
      ),
    ).toEqual({ intervalId: 'integration-1' });
    expect(application.intervals.findById('integration-1')).toEqual({
      id: 'integration-1',
      taskId: 'existing-task',
      startedAt: localTime(2026, 8, 13, 8, 30),
      endedAt: localTime(2026, 8, 13, 9, 15),
      createdAt: now,
      updatedAt: now,
    });
    expect(application.appState.get()).toEqual(stateBefore);
  });

  it('creates a new task and interval from a typed description and makes it queryable', () => {
    const result = valueOfManual(
      application.manualTimeService.createInterval({
        taskDescription: '  Integration Task  ',
        date: '2026-08-13',
        startTime: '13:00',
        endTime: '14:00',
      }),
    );

    expect(result).toEqual({ intervalId: 'integration-2' });
    expect(application.tasks.findById('integration-1')).toMatchObject({
      description: 'Integration Task',
      normalizedDescription: 'integration task',
    });
    expect(application.intervals.findById('integration-2')).toMatchObject({
      taskId: 'integration-1',
      startedAt: localTime(2026, 8, 13, 13, 0),
      endedAt: localTime(2026, 8, 13, 14, 0),
    });
    expect(
      application.taskService.getSuggestions({ query: 'tegration' }),
    ).toEqual({
      ok: true,
      value: {
        suggestions: [
          {
            task: {
              id: 'integration-1',
              description: 'Integration Task',
            },
            todayDurationMs: 0,
            lifetimeDurationMs: minutes(60),
            mostRecentActivityAt: localTime(2026, 8, 13, 13, 0),
          },
        ],
        now: clock.now(),
      },
    });
  });

  it('rejects overlap with a closed interval across tasks', () => {
    application.tasks.insert({
      id: 'task-a',
      description: 'Task A',
      normalizedDescription: 'task a',
      createdAt: 100,
      updatedAt: 100,
    });
    application.tasks.insert({
      id: 'task-b',
      description: 'Task B',
      normalizedDescription: 'task b',
      createdAt: 100,
      updatedAt: 100,
    });
    application.intervals.insert({
      id: 'closed-a',
      taskId: 'task-a',
      startedAt: localTime(2026, 8, 13, 9, 0),
      endedAt: localTime(2026, 8, 13, 10, 0),
      createdAt: 100,
      updatedAt: 100,
    });
    const changesBefore = totalChanges(application.context);

    expect(
      application.manualTimeService.createInterval({
        taskId: 'task-b',
        date: '2026-08-13',
        startTime: '09:30',
        endTime: '09:45',
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'TIME_INTERVAL_OVERLAP',
        message: 'The proposed interval overlaps an existing interval.',
      },
    });
    expect(totalChanges(application.context)).toBe(changesBefore);
    expect(countRows(application.context, 'time_intervals')).toBe(1);
  });

  it('rejects overlap with a running open interval while preserving the timer', () => {
    const started = valueOfTimer(
      application.timerService.start({
        source: 'description',
        description: 'Running Task',
      }),
    );
    clock.advance(minutes(20));
    const stateBefore = application.appState.get();
    const openBefore = application.intervals.findOpen();

    expect(
      application.manualTimeService.createInterval({
        taskDescription: 'Manual overlap',
        date: '2026-08-14',
        startTime: '09:10',
        endTime: '09:25',
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'TIME_INTERVAL_OVERLAP',
        message: 'The proposed interval overlaps an existing interval.',
      },
    });
    expect(application.appState.get()).toEqual(stateBefore);
    expect(application.intervals.findOpen()).toEqual(openBefore);
    expect(valueOfTimer(application.reader.getState())).toMatchObject({
      status: 'running',
      currentTask: started.currentTask,
      sessionStartedAt: started.sessionStartedAt,
      sessionDurationMs: minutes(20),
    });
  });

  it('returns controlled TASK_NOT_FOUND and INVALID_MANUAL_INTERVAL failures', () => {
    expect(
      application.manualTimeService.createInterval({
        taskId: 'missing-task',
        date: '2026-08-13',
        startTime: '08:00',
        endTime: '09:00',
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'TASK_NOT_FOUND',
        message: 'The selected task no longer exists.',
      },
    });
    expect(
      application.manualTimeService.createInterval({
        taskDescription: 'Invalid',
        date: '2026-08-13',
        startTime: '09:00',
        endTime: '09:00',
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'INVALID_MANUAL_INTERVAL' },
    });
  });
});

interface TestApplication {
  readonly context: DatabaseContext;
  readonly tasks: TaskRepository;
  readonly intervals: TimeIntervalRepository;
  readonly appState: AppStateRepository;
  readonly durations: DurationProjector;
  readonly reader: TimerStateReader;
  readonly timerService: TimerService;
  readonly manualTimeService: ManualTimeService;
  readonly taskService: TaskService;
}

const valueOfTimer = (
  result: AppResult<TimerState> | TimerState,
): TimerState => {
  if ('status' in result) {
    return result;
  }
  if (!result.ok) {
    throw new Error(`Expected timer success, received ${result.error.code}.`);
  }
  return result.value;
};

const valueOfManual = (
  result: AppResult<ManualIntervalCreateResult>,
): ManualIntervalCreateResult => {
  if (!result.ok) {
    throw new Error(`Expected manual success, received ${result.error.code}.`);
  }
  return result.value;
};

const minutes = (value: number): number => value * 60_000;

const localTime = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
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
