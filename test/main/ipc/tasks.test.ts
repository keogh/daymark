import { describe, expect, it, vi } from 'vitest';

import {
  registerTasksHandler,
  type TasksIpcOperations,
} from '@/main/ipc/tasks';
import type { AppResult } from '@/shared/contracts/app-result';
import {
  TASKS_GET_SUGGESTIONS_CHANNEL,
  type TaskSuggestionPage,
} from '@/shared/contracts/tasks';

const page: TaskSuggestionPage = {
  suggestions: [],
  now: 1_000,
};

describe('tasks IPC handler', () => {
  it('registers one explicit channel and delegates validated input', () => {
    const { handler, operations } = setup();

    expect(handler.channel).toBe(TASKS_GET_SUGGESTIONS_CHANNEL);
    expect(handler.listener({}, { query: '  Auth  ' })).toEqual({
      ok: true,
      value: page,
    });
    expect(operations.getSuggestions.getSuggestions).toHaveBeenCalledWith({
      query: '  Auth  ',
    });
  });

  it.each([
    ['missing input', undefined],
    ['null input', null],
    ['unknown properties', { query: '', extra: true }],
    ['non-string query', { query: 42 }],
    ['oversized query', { query: 'x'.repeat(501) }],
  ])('rejects %s before invoking the service', (_label, input) => {
    const { handler, operations } = setup();

    expect(handler.listener({}, input)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_TASK_SEARCH' },
    });
    expect(operations.getSuggestions.getSuggestions).not.toHaveBeenCalled();
  });

  it('passes controlled suggestion failures through safely', () => {
    const operations = createOperations();
    vi.mocked(operations.getSuggestions.getSuggestions).mockReturnValue({
      ok: false,
      error: {
        code: 'TASK_SUGGESTIONS_UNAVAILABLE',
        message: 'Task suggestions are temporarily unavailable.',
      },
    });
    const { handler } = setup({ error: vi.fn() }, operations);

    expect(handler.listener({}, { query: '' })).toEqual({
      ok: false,
      error: {
        code: 'TASK_SUGGESTIONS_UNAVAILABLE',
        message: 'Task suggestions are temporarily unavailable.',
      },
    });
  });

  it('logs and maps unexpected failures without exposing details or input', () => {
    const technicalError = new Error('SQLite query failed');
    const operations = createOperations();
    vi.mocked(operations.getSuggestions.getSuggestions).mockImplementation(
      () => {
        throw technicalError;
      },
    );
    const logger = { error: vi.fn() };
    const { handler } = setup(logger, operations);

    expect(handler.listener({}, { query: 'private work' })).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Unexpected task suggestion IPC failure.',
      technicalError,
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(
      'private work',
    );
  });
});

const createOperations = (): TasksIpcOperations => ({
  getSuggestions: {
    getSuggestions: vi.fn(() => ({ ok: true as const, value: page })),
  },
});

const setup = (
  logger = { error: vi.fn() },
  operations = createOperations(),
) => {
  let channel = '';
  let listener: (
    event: unknown,
    input?: unknown,
  ) => AppResult<TaskSuggestionPage> = () => ({ ok: true, value: page });

  registerTasksHandler(
    {
      handle: (registeredChannel, registeredListener) => {
        channel = registeredChannel;
        listener = registeredListener;
      },
    },
    operations,
    logger,
  );

  return { handler: { channel, listener }, operations };
};
