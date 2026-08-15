import { describe, expect, it, vi } from 'vitest';

import {
  registerManualTimeHandler,
  type ManualTimeIpcOperations,
} from '@/main/ipc/manual-time';
import type { AppResult } from '@/shared/contracts/app-result';
import {
  MANUAL_TIME_CREATE_INTERVAL_CHANNEL,
  type ManualIntervalCreateResult,
} from '@/shared/contracts/manual-time';

const successResult: ManualIntervalCreateResult = {
  intervalId: 'interval-1',
};

describe('manual time IPC handler', () => {
  it('registers one explicit channel and delegates validated input', () => {
    const { handler, operations } = setup();

    expect(handler.channel).toBe(MANUAL_TIME_CREATE_INTERVAL_CHANNEL);
    expect(
      handler.listener(
        {},
        {
          taskDescription: '  Focus  ',
          date: ' 2026-08-14 ',
          startTime: ' 09:00 ',
          endTime: ' 10:00 ',
        },
      ),
    ).toEqual({
      ok: true,
      value: successResult,
    });
    expect(operations.createInterval.createInterval).toHaveBeenCalledWith({
      taskDescription: 'Focus',
      date: '2026-08-14',
      startTime: '09:00',
      endTime: '10:00',
    });
  });

  it.each([
    ['missing input', undefined],
    [
      'unknown properties',
      {
        taskDescription: 'Focus',
        date: '2026-08-14',
        startTime: '09:00',
        endTime: '10:00',
        extra: true,
      },
    ],
    [
      'missing task source',
      { date: '2026-08-14', startTime: '09:00', endTime: '10:00' },
    ],
    [
      'same-time range',
      {
        taskDescription: 'Focus',
        date: '2026-08-14',
        startTime: '09:00',
        endTime: '09:00',
      },
    ],
  ])('rejects %s before invoking the service', (_label, input) => {
    const { handler, operations } = setup();

    expect(handler.listener({}, input)).toEqual({
      ok: false,
      error: {
        code: 'INVALID_MANUAL_INTERVAL',
        message: 'Manual interval input is invalid.',
      },
    });
    expect(operations.createInterval.createInterval).not.toHaveBeenCalled();
  });

  it('passes controlled manual-entry failures through safely', () => {
    const operations = createOperations();
    vi.mocked(operations.createInterval.createInterval).mockReturnValue({
      ok: false,
      error: {
        code: 'TIME_INTERVAL_OVERLAP',
        message: 'The proposed interval overlaps an existing interval.',
      },
    });
    const { handler } = setup({ error: vi.fn() }, operations);

    expect(
      handler.listener(
        {},
        {
          taskId: 'task-1',
          date: '2026-08-14',
          startTime: '09:00',
          endTime: '10:00',
        },
      ),
    ).toEqual({
      ok: false,
      error: {
        code: 'TIME_INTERVAL_OVERLAP',
        message: 'The proposed interval overlaps an existing interval.',
      },
    });
  });

  it('logs and sanitizes unexpected failures without exposing details', () => {
    const technicalError = new Error('INSERT failed at /private/data.sqlite');
    const operations = createOperations();
    vi.mocked(operations.createInterval.createInterval).mockImplementation(
      () => {
        throw technicalError;
      },
    );
    const logger = { error: vi.fn() };
    const { handler } = setup(logger, operations);

    expect(
      handler.listener(
        {},
        {
          taskDescription: 'private work',
          date: '2026-08-14',
          startTime: '09:00',
          endTime: '10:00',
        },
      ),
    ).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Unexpected manual time IPC failure.',
      technicalError,
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(
      'private work',
    );
  });
});

const createOperations = (): ManualTimeIpcOperations => ({
  createInterval: {
    createInterval: vi.fn(() => ({ ok: true as const, value: successResult })),
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
  ) => AppResult<ManualIntervalCreateResult> = () => ({
    ok: true,
    value: successResult,
  });

  registerManualTimeHandler(
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
