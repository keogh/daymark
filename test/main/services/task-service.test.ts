import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { AppStateRepository } from '@/main/database/repositories/app-state-repository';
import { TaskRepository } from '@/main/database/repositories/task-repository';
import type { TaskSuggestionQueries } from '@/main/database/repositories/task-suggestion-query-repository';
import { TransactionRunner } from '@/main/database/transaction-runner';
import { TaskService } from '@/main/services/task-service';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../database/support/disposable-database';
import { FakeClock } from '../domain/support/fake-clock';

describe('TaskService', () => {
  let fixture: DisposableDatabase;
  let context: DatabaseContext;
  let clock: FakeClock;
  let appState: AppStateRepository;
  let tasks: TaskRepository;
  let transactions: TransactionRunner;

  beforeEach(async () => {
    fixture = await createDisposableDatabase();
    context = fixture.lifecycle.initialize();
    clock = new FakeClock(1_765_000_000_000);
    appState = new AppStateRepository(context.db);
    tasks = new TaskRepository(context.db);
    transactions = new TransactionRunner(context.sqlite);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fixture.dispose();
  });

  it('normalizes input and returns repository results with one Clock snapshot', () => {
    const now = clock.now();
    const suggestions = [
      {
        task: { id: 'task-1', description: 'Implement Authentication' },
        todayDurationMs: 10,
        lifetimeDurationMs: 20,
        mostRecentActivityAt: now - 100,
      },
    ];
    const findSuggestions = vi.fn(() => suggestions);
    const suggestionQueries: TaskSuggestionQueries = { findSuggestions };
    const nowSpy = vi.spyOn(clock, 'now');
    const service = new TaskService({
      appState,
      clock,
      suggestionQueries,
      tasks,
      transactions,
    });

    expect(service.getSuggestions({ query: '  IMPLEMENT   AUTH  ' })).toEqual({
      ok: true,
      value: { suggestions, now },
    });
    expect(findSuggestions).toHaveBeenCalledWith('implement auth', now);
    expect(nowSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid input before reading the Clock or querying', () => {
    const findSuggestions = vi.fn();
    const suggestionQueries: TaskSuggestionQueries = { findSuggestions };
    const nowSpy = vi.spyOn(clock, 'now');
    const service = new TaskService({
      appState,
      clock,
      suggestionQueries,
      tasks,
      transactions,
    });

    expect(service.getSuggestions({ query: '', extra: true })).toMatchObject({
      ok: false,
      error: { code: 'INVALID_TASK_SEARCH' },
    });
    expect(nowSpy).not.toHaveBeenCalled();
    expect(findSuggestions).not.toHaveBeenCalled();
  });

  describe('rename', () => {
    const suggestionQueries: TaskSuggestionQueries = {
      findSuggestions: vi.fn(() => []),
    };

    const seedTask = (
      id: string,
      description: string,
      normalizedDescription: string,
    ) => {
      const task = {
        id,
        description,
        normalizedDescription,
        createdAt: 100,
        updatedAt: 100,
      };
      tasks.insert(task);
      return task;
    };

    const service = () =>
      new TaskService({
        appState,
        clock,
        suggestionQueries,
        tasks,
        transactions,
      });

    it('renames a task, preserving its ID and updating description, normalizedDescription, and updatedAt', () => {
      seedTask(
        'task-1',
        'Implement authentication',
        'implement authentication',
      );

      expect(
        service().rename({
          taskId: 'task-1',
          description: 'Implement OAuth',
        }),
      ).toEqual({
        ok: true,
        value: { task: { id: 'task-1', description: 'Implement OAuth' } },
      });
      expect(tasks.findById('task-1')).toEqual({
        id: 'task-1',
        description: 'Implement OAuth',
        normalizedDescription: 'implement oauth',
        createdAt: 100,
        updatedAt: clock.now(),
      });
    });

    it('allows a rename that normalizes to the task’s own current value without rejecting it as a collision', () => {
      seedTask(
        'task-1',
        'Implement authentication',
        'implement authentication',
      );

      expect(
        service().rename({
          taskId: 'task-1',
          description: '  Implement   Authentication ',
        }),
      ).toEqual({
        ok: true,
        value: {
          task: { id: 'task-1', description: 'Implement   Authentication' },
        },
      });
      expect(tasks.findById('task-1')).toMatchObject({
        description: 'Implement   Authentication',
        normalizedDescription: 'implement authentication',
      });
    });

    it('rejects a rename colliding with a different task’s normalized description, without mutation', () => {
      const target = seedTask(
        'task-1',
        'Implement authentication',
        'implement authentication',
      );
      seedTask('task-2', 'Fix bug', 'fix bug');

      expect(
        service().rename({ taskId: 'task-1', description: '  Fix Bug  ' }),
      ).toMatchObject({
        ok: false,
        error: { code: 'TASK_DESCRIPTION_CONFLICT' },
      });
      expect(tasks.findById('task-1')).toEqual(target);
    });

    it('returns TASK_NOT_FOUND for a missing target without mutation', () => {
      expect(
        service().rename({ taskId: 'missing-task', description: 'New' }),
      ).toMatchObject({
        ok: false,
        error: { code: 'TASK_NOT_FOUND' },
      });
    });

    it('rejects invalid rename input before reading the target', () => {
      expect(
        service().rename({
          taskId: 'task-1',
          description: '',
        }),
      ).toMatchObject({
        ok: false,
        error: { code: 'INVALID_TASK_RENAME' },
      });
    });

    it('rolls back and maps unexpected persistence failure to a logged INTERNAL_ERROR', () => {
      const target = seedTask(
        'task-1',
        'Implement authentication',
        'implement authentication',
      );
      context.sqlite
        .prepare(
          "create trigger reject_task_update before update on tasks begin select raise(abort, 'rejected'); end",
        )
        .run();
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(
        service().rename({ taskId: 'task-1', description: 'New name' }),
      ).toEqual({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred.',
        },
      });
      expect(tasks.findById('task-1')).toEqual(target);
      expect(consoleError).toHaveBeenCalledOnce();
    });
  });

  describe('delete and deletion summary', () => {
    const suggestionQueries: TaskSuggestionQueries = {
      findSuggestions: vi.fn(() => []),
    };

    const seedTask = (id: string, description = 'Implement authentication') => {
      const task = {
        id,
        description,
        normalizedDescription: description.toLocaleLowerCase(),
        createdAt: 100,
        updatedAt: 100,
      };
      tasks.insert(task);
      return task;
    };

    const seedInterval = (
      id: string,
      taskId: string,
      startedAt: number,
      endedAt: number | null,
    ) => {
      context.sqlite
        .prepare(
          'insert into time_intervals (id, task_id, started_at, ended_at, created_at, updated_at) values (?, ?, ?, ?, ?, ?)',
        )
        .run(id, taskId, startedAt, endedAt, startedAt, startedAt);
    };

    const service = () =>
      new TaskService({
        appState,
        clock,
        suggestionQueries,
        tasks,
        transactions,
      });

    it('deletes one inactive task and all its intervals while preserving other data and AppState', () => {
      seedTask('target');
      const other = seedTask('other', 'Other task');
      seedInterval('target-1', 'target', 100, 200);
      seedInterval('target-2', 'target', 300, 500);
      seedInterval('other-1', 'other', 600, 900);
      const stateBefore = appState.get();

      expect(service().delete({ taskId: 'target' })).toEqual({
        ok: true,
        value: { taskId: 'target' },
      });
      expect(tasks.findById('target')).toBeUndefined();
      expect(tasks.findById('other')).toEqual(other);
      expect(
        context.sqlite
          .prepare('select id from time_intervals order by id')
          .pluck()
          .all(),
      ).toEqual(['other-1']);
      expect(appState.get()).toEqual(stateBefore);
    });

    it('rejects a missing or invalid delete target without mutation', () => {
      const target = seedTask('target');

      expect(service().delete({ taskId: 'missing' })).toMatchObject({
        ok: false,
        error: { code: 'TASK_NOT_FOUND' },
      });
      expect(service().delete({ taskId: ' target' })).toMatchObject({
        ok: false,
        error: { code: 'INVALID_TASK_DELETE' },
      });
      expect(tasks.findById('target')).toEqual(target);
    });

    it('rejects deletion of the current task without mutating Task, intervals, or AppState', () => {
      const target = seedTask('target');
      seedInterval('open', 'target', 100, null);
      appState.update({
        id: 1,
        timerStatus: 'running',
        currentTaskId: 'target',
        sessionStartedAt: 100,
        updatedAt: 100,
      });
      const stateBefore = appState.get();

      expect(service().delete({ taskId: 'target' })).toMatchObject({
        ok: false,
        error: { code: 'ACTIVE_TASK_CANNOT_BE_DELETED' },
      });
      expect(tasks.findById('target')).toEqual(target);
      expect(
        context.sqlite
          .prepare('select count(*) from time_intervals')
          .pluck()
          .get(),
      ).toBe(1);
      expect(appState.get()).toEqual(stateBefore);
    });

    it('returns an accurate read-only deletion summary and TASK_NOT_FOUND for a missing target', () => {
      const target = seedTask('target');
      const now = clock.now();
      seedInterval('closed', 'target', now - 1_000, now - 700);
      seedInterval('open', 'target', now - 500, null);
      const stateBefore = appState.get();

      expect(service().getDeletionSummary({ taskId: 'target' })).toEqual({
        ok: true,
        value: {
          task: { id: target.id, description: target.description },
          intervalCount: 2,
          lifetimeDurationMs: 800,
        },
      });
      expect(service().getDeletionSummary({ taskId: 'missing' })).toMatchObject(
        {
          ok: false,
          error: { code: 'TASK_NOT_FOUND' },
        },
      );
      expect(tasks.findById('target')).toEqual(target);
      expect(appState.get()).toEqual(stateBefore);
      expect(
        context.sqlite
          .prepare('select count(*) from time_intervals')
          .pluck()
          .get(),
      ).toBe(2);
    });

    it('rejects invalid deletion-summary input before reading the Clock', () => {
      const nowSpy = vi.spyOn(clock, 'now');

      expect(service().getDeletionSummary({ taskId: '' })).toMatchObject({
        ok: false,
        error: { code: 'INVALID_TASK_DELETE' },
      });
      expect(nowSpy).not.toHaveBeenCalled();
    });

    it('rolls back a failed delete and maps it to a logged INTERNAL_ERROR', () => {
      const target = seedTask('target');
      seedInterval('target-1', 'target', 100, 200);
      context.sqlite
        .prepare(
          "create trigger reject_task_delete before delete on tasks begin select raise(abort, 'rejected'); end",
        )
        .run();
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(service().delete({ taskId: 'target' })).toEqual({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred.',
        },
      });
      expect(tasks.findById('target')).toEqual(target);
      expect(
        context.sqlite
          .prepare('select count(*) from time_intervals')
          .pluck()
          .get(),
      ).toBe(1);
      expect(consoleError).toHaveBeenCalledOnce();
    });

    it('maps invalid persisted AppState to INTERNAL_ERROR without deleting the task', () => {
      const target = seedTask('target');
      context.sqlite.prepare('delete from app_state where id = 1').run();
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(service().delete({ taskId: 'target' })).toEqual({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred.',
        },
      });
      expect(tasks.findById('target')).toEqual(target);
      expect(consoleError).toHaveBeenCalledOnce();
    });

    it('maps an unexpected deletion-summary read failure to a logged INTERNAL_ERROR', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      vi.spyOn(tasks, 'findDeletionSummary').mockImplementation(() => {
        throw new Error('read failed');
      });

      expect(service().getDeletionSummary({ taskId: 'target' })).toEqual({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred.',
        },
      });
      expect(consoleError).toHaveBeenCalledOnce();
    });
  });
});
