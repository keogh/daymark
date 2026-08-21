import { describe, expect, it, vi } from 'vitest';

import {
  registerTasksHandler,
  type TasksIpcOperations,
} from '@/main/ipc/tasks';
import type { AppResult } from '@/shared/contracts/app-result';
import {
  TASKS_DELETE_CHANNEL,
  TASKS_GET_DELETION_SUMMARY_CHANNEL,
  TASKS_GET_SUGGESTIONS_CHANNEL,
  TASKS_RENAME_CHANNEL,
  type TaskDeletionResult,
  type TaskDeletionSummary,
  type TaskMutationResult,
  type TaskSuggestionPage,
} from '@/shared/contracts/tasks';

type TasksResult =
  | TaskSuggestionPage
  | TaskMutationResult
  | TaskDeletionResult
  | TaskDeletionSummary;
const page: TaskSuggestionPage = { suggestions: [], now: 1_000 };
const renamed: TaskMutationResult = {
  task: { id: 'task-1', description: 'Renamed task' },
};
const deleted: TaskDeletionResult = { taskId: 'task-1' };
const deletionSummary: TaskDeletionSummary = {
  task: { id: 'task-1', description: 'Private task' },
  intervalCount: 2,
  lifetimeDurationMs: 3_000,
};

describe('tasks IPC handlers', () => {
  it('registers explicit channels and delegates validated inputs', () => {
    const { handlers, operations } = setup();

    expect([...handlers.keys()]).toEqual([
      TASKS_GET_SUGGESTIONS_CHANNEL,
      TASKS_RENAME_CHANNEL,
      TASKS_DELETE_CHANNEL,
      TASKS_GET_DELETION_SUMMARY_CHANNEL,
    ]);
    expect(
      call(handlers, TASKS_GET_SUGGESTIONS_CHANNEL, { query: ' Auth ' }),
    ).toEqual({ ok: true, value: page });
    expect(
      call(handlers, TASKS_RENAME_CHANNEL, {
        taskId: 'task-1',
        description: '  Renamed task  ',
      }),
    ).toEqual({ ok: true, value: renamed });
    expect(call(handlers, TASKS_DELETE_CHANNEL, { taskId: 'task-1' })).toEqual({
      ok: true,
      value: deleted,
    });
    expect(
      call(handlers, TASKS_GET_DELETION_SUMMARY_CHANNEL, { taskId: 'task-1' }),
    ).toEqual({ ok: true, value: deletionSummary });

    expect(operations.tasks.getSuggestions).toHaveBeenCalledWith({
      query: ' Auth ',
    });
    expect(operations.tasks.rename).toHaveBeenCalledWith({
      taskId: 'task-1',
      description: 'Renamed task',
    });
    expect(operations.tasks.delete).toHaveBeenCalledWith({ taskId: 'task-1' });
    expect(operations.tasks.getDeletionSummary).toHaveBeenCalledWith({
      taskId: 'task-1',
    });
    expect(operations.synchronize?.refreshAfter).toHaveBeenCalledOnce();
  });

  it.each([
    [
      TASKS_GET_SUGGESTIONS_CHANNEL,
      { query: '', extra: true },
      'INVALID_TASK_SEARCH',
      'getSuggestions',
    ],
    [TASKS_RENAME_CHANNEL, undefined, 'INVALID_TASK_RENAME', 'rename'],
    [
      TASKS_RENAME_CHANNEL,
      { taskId: 'task-1', description: 'x', extra: true },
      'INVALID_TASK_RENAME',
      'rename',
    ],
    [
      TASKS_DELETE_CHANNEL,
      { taskId: ' task-1 ' },
      'INVALID_TASK_DELETE',
      'delete',
    ],
    [
      TASKS_DELETE_CHANNEL,
      { taskId: 'task-1', extra: true },
      'INVALID_TASK_DELETE',
      'delete',
    ],
    [
      TASKS_GET_DELETION_SUMMARY_CHANNEL,
      null,
      'INVALID_TASK_DELETE',
      'getDeletionSummary',
    ],
    [
      TASKS_GET_DELETION_SUMMARY_CHANNEL,
      { taskId: 42 },
      'INVALID_TASK_DELETE',
      'getDeletionSummary',
    ],
  ] as const)(
    'rejects malformed input on %s before service execution',
    (channel, input, code, operation) => {
      const { handlers, operations } = setup();

      expect(call(handlers, channel, input)).toMatchObject({
        ok: false,
        error: { code },
      });
      expect(operations.tasks[operation]).not.toHaveBeenCalled();
    },
  );

  it('passes controlled task-management failures through safely', () => {
    const operations = createOperations();
    vi.mocked(operations.tasks.rename).mockReturnValue({
      ok: false,
      error: {
        code: 'TASK_DESCRIPTION_CONFLICT',
        message: 'Another task already uses that description.',
      },
    });
    const { handlers } = setup({ error: vi.fn() }, operations);

    expect(
      call(handlers, TASKS_RENAME_CHANNEL, {
        taskId: 'task-1',
        description: 'Renamed task',
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'TASK_DESCRIPTION_CONFLICT',
        message: 'Another task already uses that description.',
      },
    });
  });

  it.each([
    [
      TASKS_GET_SUGGESTIONS_CHANNEL,
      { query: 'Private task' },
      'getSuggestions',
      'Unexpected task suggestion IPC failure.',
    ],
    [
      TASKS_RENAME_CHANNEL,
      { taskId: 'task-1', description: 'Private task' },
      'rename',
      'Unexpected task rename IPC failure.',
    ],
    [
      TASKS_DELETE_CHANNEL,
      { taskId: 'task-1' },
      'delete',
      'Unexpected task delete IPC failure.',
    ],
    [
      TASKS_GET_DELETION_SUMMARY_CHANNEL,
      { taskId: 'task-1' },
      'getDeletionSummary',
      'Unexpected task deletion summary IPC failure.',
    ],
  ] as const)(
    'logs and sanitizes unexpected failures on %s without logging input',
    (channel, input, operation, message) => {
      const technicalError = new Error('SQLite detail');
      const operations = createOperations();
      vi.mocked(operations.tasks[operation]).mockImplementation(() => {
        throw technicalError;
      });
      const logger = { error: vi.fn() };
      const { handlers } = setup(logger, operations);

      expect(call(handlers, channel, input)).toEqual({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred.',
        },
      });
      expect(logger.error).toHaveBeenCalledWith(message, technicalError);
      expect(JSON.stringify(logger.error.mock.calls)).not.toContain(
        'Private task',
      );
    },
  );
});

const createOperations = (): TasksIpcOperations => ({
  tasks: {
    getSuggestions: vi.fn(() => ({ ok: true as const, value: page })),
    rename: vi.fn(() => ({ ok: true as const, value: renamed })),
    delete: vi.fn(() => ({ ok: true as const, value: deleted })),
    getDeletionSummary: vi.fn(() => ({
      ok: true as const,
      value: deletionSummary,
    })),
  },
  synchronize: {
    refreshAfter: vi.fn((result: AppResult<TaskMutationResult>) => result),
  },
});

const setup = (
  logger = { error: vi.fn() },
  operations = createOperations(),
) => {
  const handlers = new Map<
    string,
    (event: unknown, input?: unknown) => AppResult<TasksResult>
  >();
  registerTasksHandler(
    {
      handle: (channel, listener) => {
        handlers.set(channel, listener);
      },
    },
    operations,
    logger,
  );
  return { handlers, operations };
};

const call = (
  handlers: Map<
    string,
    (event: unknown, input?: unknown) => AppResult<TasksResult>
  >,
  channel: string,
  input: unknown,
): AppResult<TasksResult> => {
  const handler = handlers.get(channel);
  if (handler === undefined)
    throw new Error(`No handler registered for ${channel}.`);
  return handler({}, input);
};
