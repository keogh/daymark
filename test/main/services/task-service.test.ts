import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
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
  let tasks: TaskRepository;
  let transactions: TransactionRunner;

  beforeEach(async () => {
    fixture = await createDisposableDatabase();
    context = fixture.lifecycle.initialize();
    clock = new FakeClock(1_765_000_000_000);
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
      new TaskService({ clock, suggestionQueries, tasks, transactions });

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
});
