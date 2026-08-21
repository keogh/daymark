import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { AppStateRepository } from '@/main/database/repositories/app-state-repository';
import { TaskRepository } from '@/main/database/repositories/task-repository';
import { TaskSuggestionQueryRepository } from '@/main/database/repositories/task-suggestion-query-repository';
import { TimeIntervalRepository } from '@/main/database/repositories/time-interval-repository';
import { TransactionRunner } from '@/main/database/transaction-runner';
import { DurationProjector } from '@/main/services/duration-projections';
import { TaskService } from '@/main/services/task-service';
import { TimerService } from '@/main/services/timer-service';
import { TimerStateReader } from '@/main/services/timer-state-reader';
import type { AppResult } from '@/shared/contracts/app-result';
import type { TimerState } from '@/shared/contracts/timer';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../database/support/disposable-database';
import { FakeClock } from '../domain/support/fake-clock';

describe('TimerService SQLite integration', () => {
  let fixture: DisposableDatabase;
  let clock: FakeClock;
  let nextId: number;
  let application: TestApplication;

  beforeEach(async () => {
    fixture = await createDisposableDatabase();
    clock = new FakeClock(localTime(2026, 8, 14, 9));
    nextId = 1;
    application = createApplication();
  });

  afterEach(async () => {
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
    const service = new TimerService({
      appState,
      tasks,
      intervals,
      transactions: new TransactionRunner(context.sqlite),
      stateReader: reader,
      clock,
      generateId: () => `integration-${nextId++}`,
    });
    const taskService = new TaskService({
      appState,
      clock,
      suggestionQueries: new TaskSuggestionQueryRepository(context.db),
      tasks,
      transactions: new TransactionRunner(context.sqlite),
    });

    return {
      context,
      tasks,
      intervals,
      appState,
      durations,
      reader,
      service,
      taskService,
    };
  };

  const restartApplication = (): TestApplication => {
    fixture.lifecycle.close();
    return createApplication();
  };

  it('persists the complete 09:00 to 10:20 workflow with 65 active minutes', () => {
    const startedAt = clock.now();
    const started = valueOf(
      application.service.start({
        source: 'description',
        description: 'Task A',
      }),
    );
    const taskId = started.currentTask?.id;
    expect(taskId).toBeDefined();

    clock.advance(minutes(45));
    expect(valueOf(application.service.pause())).toMatchObject({
      status: 'paused',
      sessionDurationMs: minutes(45),
    });

    clock.advance(minutes(15));
    expect(valueOf(application.service.resume())).toMatchObject({
      status: 'running',
      sessionStartedAt: startedAt,
      sessionDurationMs: minutes(45),
    });

    clock.advance(minutes(20));
    const stoppedAt = clock.now();
    expect(valueOf(application.service.stop())).toMatchObject({
      status: 'idle',
      currentTask: null,
    });

    const persistedTaskId = required(taskId);
    expect(application.tasks.findById(persistedTaskId)?.description).toBe(
      'Task A',
    );
    expect(application.intervals.findByTask(persistedTaskId)).toEqual([
      expect.objectContaining({
        taskId: persistedTaskId,
        startedAt,
        endedAt: startedAt + minutes(45),
      }),
      expect.objectContaining({
        taskId: persistedTaskId,
        startedAt: startedAt + minutes(60),
        endedAt: stoppedAt,
      }),
    ]);
    expect(application.intervals.findOpen()).toBeUndefined();
    expect(application.appState.get()).toMatchObject({
      timerStatus: 'idle',
      currentTaskId: null,
      sessionStartedAt: null,
    });
    expect(
      application.durations.project({
        taskId: persistedTaskId,
        sessionStartedAt: startedAt,
        now: stoppedAt,
      }),
    ).toMatchObject({
      sessionDurationMs: minutes(65),
      taskTodayDurationMs: minutes(65),
      taskLifetimeDurationMs: minutes(65),
    });
  });

  it('reconstructs running state after a complete application restart', () => {
    clock.set(localTime(2026, 8, 14, 10));
    valueOf(
      application.service.start({
        source: 'description',
        description: 'Running Recovery',
      }),
    );

    clock.advance(minutes(50));
    application = restartApplication();

    expect(application.reader.getState()).toMatchObject({
      status: 'running',
      currentTask: { description: 'Running Recovery' },
      sessionDurationMs: minutes(50),
      taskLifetimeDurationMs: minutes(50),
      activeIntervalStartedAt: localTime(2026, 8, 14, 10),
    });
  });

  it('reconstructs paused state without counting closed time', () => {
    clock.set(localTime(2026, 8, 14, 10));
    valueOf(
      application.service.start({
        source: 'description',
        description: 'Paused Recovery',
      }),
    );
    clock.advance(minutes(30));
    valueOf(application.service.pause());

    clock.advance(minutes(60));
    application = restartApplication();

    expect(application.reader.getState()).toMatchObject({
      status: 'paused',
      currentTask: { description: 'Paused Recovery' },
      sessionDurationMs: minutes(30),
      taskTodayDurationMs: minutes(30),
      taskLifetimeDurationMs: minutes(30),
      activeIntervalStartedAt: null,
    });
  });

  it('rejects invalid transitions without creating extra intervals', () => {
    expect(application.service.pause()).toMatchObject({
      ok: false,
      error: { code: 'NO_ACTIVE_TIMER' },
    });
    expect(application.service.resume()).toMatchObject({
      ok: false,
      error: { code: 'NO_CURRENT_TASK' },
    });

    valueOf(
      application.service.start({
        source: 'description',
        description: 'Transition Defense',
      }),
    );
    expect(
      application.service.start({
        source: 'description',
        description: 'Another Task',
      }),
    ).toMatchObject({ ok: false, error: { code: 'TIMER_NOT_IDLE' } });
    expect(application.service.resume()).toMatchObject({
      ok: false,
      error: { code: 'TIMER_ALREADY_RUNNING' },
    });

    clock.advance(minutes(5));
    valueOf(application.service.pause());
    expect(application.service.pause()).toMatchObject({
      ok: false,
      error: { code: 'TIMER_ALREADY_PAUSED' },
    });
    expect(countRows(application.context, 'tasks')).toBe(1);
    expect(countRows(application.context, 'time_intervals')).toBe(1);
    expect(application.intervals.findOpen()).toBeUndefined();
  });

  it('suggests persisted totals and atomically starts that exact task by ID', () => {
    const now = clock.now();
    application.tasks.insert({
      id: 'reusable-task',
      description: 'Reusable Task',
      normalizedDescription: 'reusable task',
      createdAt: now - minutes(60),
      updatedAt: now - minutes(60),
    });
    application.intervals.insert({
      id: 'closed-interval',
      taskId: 'reusable-task',
      startedAt: now - minutes(45),
      endedAt: now - minutes(15),
      createdAt: now - minutes(45),
      updatedAt: now - minutes(15),
    });

    expect(application.taskService.getSuggestions({ query: 'usable' })).toEqual(
      {
        ok: true,
        value: {
          suggestions: [
            {
              task: { id: 'reusable-task', description: 'Reusable Task' },
              todayDurationMs: minutes(30),
              lifetimeDurationMs: minutes(30),
              mostRecentActivityAt: now - minutes(45),
            },
          ],
          now,
        },
      },
    );

    const started = valueOf(
      application.service.start({
        source: 'existing-task',
        taskId: 'reusable-task',
      }),
    );
    expect(started).toMatchObject({
      status: 'running',
      currentTask: { id: 'reusable-task', description: 'Reusable Task' },
      taskTodayDurationMs: minutes(30),
      taskLifetimeDurationMs: minutes(30),
    });
    expect(countRows(application.context, 'tasks')).toBe(1);
    expect(application.intervals.findByTask('reusable-task')).toHaveLength(2);
    expect(application.intervals.findOpen()?.taskId).toBe('reusable-task');
  });

  it('atomically switches from a running task to a different history task', () => {
    const startedAt = clock.now();
    application.tasks.insert({
      id: 'task-b',
      description: 'Task B',
      normalizedDescription: 'task b',
      createdAt: startedAt - minutes(60),
      updatedAt: startedAt - minutes(60),
    });
    valueOf(
      application.service.start({
        source: 'description',
        description: 'Task A',
      }),
    );
    clock.advance(minutes(20));
    const switchedAt = clock.now();

    const switched = valueOf(
      application.service.switchToTask({ taskId: 'task-b' }),
    );

    expect(switched).toMatchObject({
      status: 'running',
      currentTask: { id: 'task-b', description: 'Task B' },
      sessionStartedAt: startedAt,
      activeIntervalStartedAt: switchedAt,
      sessionDurationMs: 0,
    });
    expect(application.intervals.findByTask('integration-1')).toEqual([
      expect.objectContaining({
        startedAt,
        endedAt: switchedAt,
      }),
    ]);
    expect(application.intervals.findByTask('task-b')).toEqual([
      expect.objectContaining({
        startedAt: switchedAt,
        endedAt: null,
      }),
    ]);
    expect(application.appState.get()).toMatchObject({
      timerStatus: 'running',
      currentTaskId: 'task-b',
      sessionStartedAt: startedAt,
      updatedAt: switchedAt,
    });
  });

  it('switches from a paused task to a different history task with a new session', () => {
    const startedAt = clock.now();
    application.tasks.insert({
      id: 'task-b',
      description: 'Task B',
      normalizedDescription: 'task b',
      createdAt: startedAt - minutes(60),
      updatedAt: startedAt - minutes(60),
    });
    valueOf(
      application.service.start({
        source: 'description',
        description: 'Task A',
      }),
    );
    clock.advance(minutes(20));
    valueOf(application.service.pause());
    clock.advance(minutes(10));
    const switchedAt = clock.now();

    const switched = valueOf(
      application.service.switchToTask({ taskId: 'task-b' }),
    );

    expect(switched).toMatchObject({
      status: 'running',
      currentTask: { id: 'task-b', description: 'Task B' },
      sessionStartedAt: switchedAt,
      activeIntervalStartedAt: switchedAt,
      sessionDurationMs: 0,
    });
    expect(application.intervals.findByTask('integration-1')).toEqual([
      expect.objectContaining({
        startedAt,
        endedAt: startedAt + minutes(20),
      }),
    ]);
    expect(application.intervals.findByTask('task-b')).toEqual([
      expect.objectContaining({
        startedAt: switchedAt,
        endedAt: null,
      }),
    ]);
    expect(application.appState.get()).toMatchObject({
      timerStatus: 'running',
      currentTaskId: 'task-b',
      sessionStartedAt: switchedAt,
      updatedAt: switchedAt,
    });
  });

  it('treats same-task running history play as a persistence no-op', () => {
    const startedAt = clock.now();
    valueOf(
      application.service.start({
        source: 'description',
        description: 'Task A',
      }),
    );
    clock.advance(minutes(20));
    const changesBefore = totalChanges(application.context);

    const switched = valueOf(
      application.service.switchToTask({ taskId: 'integration-1' }),
    );

    expect(switched).toMatchObject({
      status: 'running',
      currentTask: { id: 'integration-1', description: 'Task A' },
      sessionStartedAt: startedAt,
      activeIntervalStartedAt: startedAt,
      sessionDurationMs: minutes(20),
    });
    expect(totalChanges(application.context)).toBe(changesBefore);
    expect(application.intervals.findByTask('integration-1')).toHaveLength(1);
    expect(application.intervals.findOpen()?.taskId).toBe('integration-1');
  });

  it('resumes the same paused task from history without resetting its session', () => {
    const startedAt = clock.now();
    valueOf(
      application.service.start({
        source: 'description',
        description: 'Task A',
      }),
    );
    clock.advance(minutes(20));
    valueOf(application.service.pause());
    clock.advance(minutes(10));
    const resumedAt = clock.now();

    const resumed = valueOf(
      application.service.switchToTask({ taskId: 'integration-1' }),
    );

    expect(resumed).toMatchObject({
      status: 'running',
      currentTask: { id: 'integration-1', description: 'Task A' },
      sessionStartedAt: startedAt,
      activeIntervalStartedAt: resumedAt,
      sessionDurationMs: minutes(20),
    });
    expect(application.intervals.findByTask('integration-1')).toEqual([
      expect.objectContaining({
        startedAt,
        endedAt: startedAt + minutes(20),
      }),
      expect.objectContaining({
        startedAt: resumedAt,
        endedAt: null,
      }),
    ]);
  });

  it('returns TASK_NOT_FOUND for a stale history task without changing the active timer', () => {
    const startedAt = clock.now();
    valueOf(
      application.service.start({
        source: 'description',
        description: 'Task A',
      }),
    );
    clock.advance(minutes(20));
    const changesBefore = totalChanges(application.context);

    expect(
      application.service.switchToTask({ taskId: 'missing-task' }),
    ).toEqual({
      ok: false,
      error: {
        code: 'TASK_NOT_FOUND',
        message: 'The selected task no longer exists.',
      },
    });
    expect(totalChanges(application.context)).toBe(changesBefore);
    expect(application.appState.get()).toMatchObject({
      timerStatus: 'running',
      currentTaskId: 'integration-1',
      sessionStartedAt: startedAt,
    });
    expect(application.intervals.findOpen()?.taskId).toBe('integration-1');
  });

  it('independently prevents a second open interval in SQLite', () => {
    const state = valueOf(
      application.service.start({
        source: 'description',
        description: 'Constraint Defense',
      }),
    );
    const taskId = required(state.currentTask?.id);
    const now = clock.now();

    expect(() =>
      application.intervals.insert({
        id: 'forbidden-second-open-interval',
        taskId,
        startedAt: now,
        endedAt: null,
        createdAt: now,
        updatedAt: now,
      }),
    ).toThrow();
    expect(countRows(application.context, 'time_intervals')).toBe(1);
    expect(application.intervals.findOpen()?.taskId).toBe(taskId);
  });

  it('projects both local-day halves of a cross-midnight interval', () => {
    const aug13Start = localTime(2026, 8, 13, 23, 45);
    clock.set(aug13Start);
    const started = valueOf(
      application.service.start({
        source: 'description',
        description: 'Midnight Task',
      }),
    );
    const taskId = required(started.currentTask?.id);

    clock.advance(minutes(15));
    expect(application.reader.getState()).toMatchObject({
      sessionDurationMs: minutes(15),
      taskTodayDurationMs: 0,
      taskLifetimeDurationMs: minutes(15),
    });

    clock.advance(minutes(15));
    expect(valueOf(application.service.pause())).toMatchObject({
      sessionDurationMs: minutes(30),
      taskTodayDurationMs: minutes(15),
      taskLifetimeDurationMs: minutes(30),
    });
    expect(application.intervals.findByTask(taskId)).toEqual([
      expect.objectContaining({
        startedAt: aug13Start,
        endedAt: aug13Start + minutes(30),
      }),
    ]);
  });
});

interface TestApplication {
  readonly context: DatabaseContext;
  readonly tasks: TaskRepository;
  readonly intervals: TimeIntervalRepository;
  readonly appState: AppStateRepository;
  readonly durations: DurationProjector;
  readonly reader: TimerStateReader;
  readonly service: TimerService;
  readonly taskService: TaskService;
}

const valueOf = (result: AppResult<TimerState>): TimerState => {
  if (!result.ok) {
    throw new Error(`Expected success, received ${result.error.code}.`);
  }
  return result.value;
};

const required = <T>(value: T | null | undefined): T => {
  if (value === null || value === undefined) {
    throw new Error('Expected a value.');
  }
  return value;
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
