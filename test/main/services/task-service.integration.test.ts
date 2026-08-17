import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { AppStateRepository } from '@/main/database/repositories/app-state-repository';
import { HistoryQueryRepository } from '@/main/database/repositories/history-query-repository';
import { TaskRepository } from '@/main/database/repositories/task-repository';
import { TimeIntervalRepository } from '@/main/database/repositories/time-interval-repository';
import { TransactionRunner } from '@/main/database/transaction-runner';
import { DurationProjector } from '@/main/services/duration-projections';
import { HistoryService } from '@/main/services/history-service';
import { TaskService } from '@/main/services/task-service';
import { TimerStateReader } from '@/main/services/timer-state-reader';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../database/support/disposable-database';
import { FakeClock } from '../domain/support/fake-clock';

const originalTimezone = process.env.TZ;

describe('TaskService SQLite integration', () => {
  let fixture: DisposableDatabase;
  let context: DatabaseContext;
  let clock: FakeClock;
  let tasks: TaskRepository;
  let intervals: TimeIntervalRepository;
  let appState: AppStateRepository;
  let reader: TimerStateReader;
  let service: TaskService;
  let history: HistoryService;

  beforeEach(async () => {
    process.env.TZ = 'America/New_York';
    fixture = await createDisposableDatabase();
    context = fixture.lifecycle.initialize();
    clock = new FakeClock(localTime(2026, 8, 15, 12));
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
    service = new TaskService({
      clock,
      suggestionQueries: { findSuggestions: () => [] },
      tasks,
      transactions: new TransactionRunner(context.sqlite),
    });
    history = new HistoryService({
      clock,
      historyQueries: new HistoryQueryRepository(context.db),
    });
    tasks.insert({
      id: 'task-1',
      description: 'Implement authentication',
      normalizedDescription: 'implement authentication',
      createdAt: 100,
      updatedAt: 100,
    });
  });

  afterEach(async () => {
    process.env.TZ = originalTimezone;
    await fixture.dispose();
  });

  it('renames a task visible across multiple loaded Daily History days everywhere it appears', () => {
    intervals.insert({
      id: 'day-1-interval',
      taskId: 'task-1',
      startedAt: localTime(2026, 8, 14, 9),
      endedAt: localTime(2026, 8, 14, 10),
      createdAt: 100,
      updatedAt: 100,
    });
    intervals.insert({
      id: 'day-2-interval',
      taskId: 'task-1',
      startedAt: localTime(2026, 8, 15, 9),
      endedAt: localTime(2026, 8, 15, 10),
      createdAt: 100,
      updatedAt: 100,
    });

    expect(
      service.rename({ taskId: 'task-1', description: 'Implement OAuth' }),
    ).toEqual({
      ok: true,
      value: { task: { id: 'task-1', description: 'Implement OAuth' } },
    });

    const page = history.getPage({});
    const activityDays = page.days.filter((day) => day.totalDurationMs > 0);
    expect(activityDays).toHaveLength(2);
    for (const day of activityDays) {
      expect(day.tasks[0]?.task).toEqual({
        id: 'task-1',
        description: 'Implement OAuth',
      });
    }
  });

  it('renames the currently running active task, reflected in authoritative timer state without altering status or session timing', () => {
    const sessionStartedAt = localTime(2026, 8, 15, 9);
    intervals.insert({
      id: 'open-session',
      taskId: 'task-1',
      startedAt: sessionStartedAt,
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
      service.rename({ taskId: 'task-1', description: 'Renamed Task' }),
    ).toEqual({
      ok: true,
      value: { task: { id: 'task-1', description: 'Renamed Task' } },
    });

    expect(appState.get()).toEqual(stateBefore);
    expect(intervals.findOpen()).toEqual(openBefore);
    expect(reader.getState()).toMatchObject({
      status: 'running',
      currentTask: { id: 'task-1', description: 'Renamed Task' },
      sessionStartedAt,
    });
  });

  it('renames the currently paused active task without altering status, session timing, or intervals', () => {
    const sessionStartedAt = localTime(2026, 8, 15, 9);
    intervals.insert({
      id: 'closed-session',
      taskId: 'task-1',
      startedAt: sessionStartedAt,
      endedAt: localTime(2026, 8, 15, 10),
      createdAt: 100,
      updatedAt: 100,
    });
    context.sqlite
      .prepare(
        'update app_state set timer_status = ?, current_task_id = ?, session_started_at = ?, updated_at = ? where id = 1',
      )
      .run('paused', 'task-1', sessionStartedAt, 100);
    const stateBefore = appState.get();
    const intervalsBefore = intervals.findByTask('task-1');

    expect(
      service.rename({ taskId: 'task-1', description: 'Renamed Task' }),
    ).toEqual({
      ok: true,
      value: { task: { id: 'task-1', description: 'Renamed Task' } },
    });

    expect(appState.get()).toEqual(stateBefore);
    expect(intervals.findByTask('task-1')).toEqual(intervalsBefore);
    expect(reader.getState()).toMatchObject({
      status: 'paused',
      currentTask: { id: 'task-1', description: 'Renamed Task' },
      sessionStartedAt,
    });
  });
});

const localTime = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): number => new Date(year, month - 1, day, hour, minute).getTime();
