import { describe, expect, it, vi } from 'vitest';

import {
  registerIntervalsHandlers,
  type IntervalsIpcOperations,
} from '@/main/ipc/intervals';
import type { AppResult } from '@/shared/contracts/app-result';
import {
  INTERVALS_DELETE_CHANNEL,
  INTERVALS_UPDATE_CHANNEL,
  type DeleteIntervalInput,
  type IntervalMutationResult,
  type UpdateIntervalInput,
} from '@/shared/contracts/intervals';

const updateInput = {
  intervalId: 'interval-1',
  startDate: '2026-08-14',
  startTime: '09:00',
  endDate: '2026-08-15',
  endTime: '10:00',
} as const;

describe('interval mutation IPC handlers', () => {
  it('registers explicit channels and delegates validated commands', () => {
    const { handlers, operations } = setup();

    expect([...handlers.keys()]).toEqual([
      INTERVALS_UPDATE_CHANNEL,
      INTERVALS_DELETE_CHANNEL,
    ]);
    expect(
      getHandler(handlers, INTERVALS_UPDATE_CHANNEL)({}, updateInput),
    ).toEqual({ ok: true, value: { intervalId: 'interval-1' } });
    expect(operations.commands.update).toHaveBeenCalledWith(updateInput);

    expect(
      getHandler(handlers, INTERVALS_DELETE_CHANNEL)(
        {},
        { intervalId: 'interval-2' },
      ),
    ).toEqual({ ok: true, value: { intervalId: 'interval-2' } });
    expect(operations.commands.delete).toHaveBeenCalledWith({
      intervalId: 'interval-2',
    });
  });

  it.each([
    [INTERVALS_UPDATE_CHANNEL, undefined, 'INVALID_INTERVAL_UPDATE'],
    [
      INTERVALS_UPDATE_CHANNEL,
      { ...updateInput, extra: true },
      'INVALID_INTERVAL_UPDATE',
    ],
    [
      INTERVALS_UPDATE_CHANNEL,
      { ...updateInput, endDate: '2026-08-14', endTime: '08:59' },
      'INVALID_INTERVAL_UPDATE',
    ],
    [INTERVALS_DELETE_CHANNEL, {}, 'INVALID_INTERVAL_DELETE'],
    [
      INTERVALS_DELETE_CHANNEL,
      { intervalId: 'interval-1', extra: true },
      'INVALID_INTERVAL_DELETE',
    ],
  ])(
    'rejects malformed %s input before service execution',
    (channel, input, code) => {
      const { handlers, operations } = setup();

      expect(getHandler(handlers, channel)({}, input)).toMatchObject({
        ok: false,
        error: { code },
      });
      expect(operations.commands.update).not.toHaveBeenCalled();
      expect(operations.commands.delete).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      INTERVALS_UPDATE_CHANNEL,
      updateInput,
      'update' as const,
      'OPEN_INTERVAL_NOT_EDITABLE' as const,
    ],
    [
      INTERVALS_DELETE_CHANNEL,
      { intervalId: 'missing' },
      'delete' as const,
      'TIME_INTERVAL_NOT_FOUND' as const,
    ],
  ])(
    'passes controlled failures through %s safely',
    (channel, input, operation, code) => {
      const operations = createOperations();
      vi.mocked(operations.commands[operation]).mockReturnValue({
        ok: false,
        error: { code, message: 'Controlled failure.' },
      });
      const { handlers } = setup({ error: vi.fn() }, operations);

      expect(getHandler(handlers, channel)({}, input)).toEqual({
        ok: false,
        error: { code, message: 'Controlled failure.' },
      });
    },
  );

  it.each([
    [INTERVALS_UPDATE_CHANNEL, updateInput, 'update' as const, 'update'],
    [
      INTERVALS_DELETE_CHANNEL,
      { intervalId: 'private-interval' },
      'delete' as const,
      'delete',
    ],
  ])(
    'logs and sanitizes unexpected %s failures',
    (channel, input, operation, label) => {
      const technicalError = new Error(
        'database failed at /private/data.sqlite',
      );
      const operations = createOperations();
      vi.mocked(operations.commands[operation]).mockImplementation(() => {
        throw technicalError;
      });
      const logger = { error: vi.fn() };
      const { handlers } = setup(logger, operations);

      expect(getHandler(handlers, channel)({}, input)).toEqual({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred.',
        },
      });
      expect(logger.error).toHaveBeenCalledWith(
        `Unexpected interval ${label} IPC failure.`,
        technicalError,
      );
      expect(JSON.stringify(logger.error.mock.calls)).not.toContain(
        'private-interval',
      );
    },
  );
});

const createOperations = (): IntervalsIpcOperations => ({
  commands: {
    update: vi.fn((input: UpdateIntervalInput) => ({
      ok: true as const,
      value: { intervalId: input.intervalId },
    })),
    delete: vi.fn((input: DeleteIntervalInput) => ({
      ok: true as const,
      value: { intervalId: input.intervalId },
    })),
  },
});

type Handler = (
  event: unknown,
  input?: unknown,
) => AppResult<IntervalMutationResult>;

const setup = (
  logger = { error: vi.fn() },
  operations = createOperations(),
) => {
  const handlers = new Map<string, Handler>();
  registerIntervalsHandlers(
    { handle: (channel, listener) => handlers.set(channel, listener) },
    operations,
    logger,
  );
  return { handlers, operations };
};

const getHandler = (
  handlers: Map<string, Handler>,
  channel: string,
): Handler => {
  const handler = handlers.get(channel);
  if (handler === undefined) {
    throw new Error(`No handler registered for ${channel}.`);
  }
  return handler;
};
