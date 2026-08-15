import { describe, expect, it, vi } from 'vitest';

import {
  registerHistoryHandler,
  type HistoryIpcDependencies,
} from '@/main/ipc/history';
import type { AppResult } from '@/shared/contracts/app-result';
import {
  HISTORY_GET_PAGE_CHANNEL,
  type HistoryPage,
} from '@/shared/contracts/history';

const now = new Date(2026, 7, 14, 12).getTime();
const todayStartedAt = new Date(2026, 7, 14).getTime();
const page: HistoryPage = {
  days: [],
  nextBeforeDayStartedAt: null,
  now,
};

describe('history IPC handler', () => {
  it('registers one explicit channel and delegates validated input', () => {
    const { handler, dependencies } = setup();

    expect(handler.channel).toBe(HISTORY_GET_PAGE_CHANNEL);
    expect(
      handler.listener({}, { beforeDayStartedAt: todayStartedAt }),
    ).toEqual({
      ok: true,
      value: page,
    });
    expect(dependencies.historyService.getPage).toHaveBeenCalledWith({
      beforeDayStartedAt: todayStartedAt,
    });
  });

  it.each([
    ['missing input', undefined],
    ['unknown properties', { surprise: true }],
    ['malformed cursors', { beforeDayStartedAt: 'today' }],
    ['unsafe cursors', { beforeDayStartedAt: Number.MAX_SAFE_INTEGER + 1 }],
    ['future cursors', { beforeDayStartedAt: todayStartedAt + 86_400_000 }],
    ['non-local-midnight cursors', { beforeDayStartedAt: todayStartedAt + 1 }],
  ])('rejects %s without querying history', (_label, input) => {
    const { handler, dependencies } = setup();

    expect(handler.listener({}, input)).toEqual({
      ok: false,
      error: {
        code: 'INVALID_HISTORY_RANGE',
        message: 'The requested history range is invalid.',
      },
    });
    expect(dependencies.historyService.getPage).not.toHaveBeenCalled();
  });

  it('accepts the empty initial request', () => {
    const { handler, dependencies } = setup();

    expect(handler.listener({}, {})).toEqual({ ok: true, value: page });
    expect(dependencies.historyService.getPage).toHaveBeenCalledWith({});
  });

  it('logs and maps unexpected failures without exposing details', () => {
    const technicalError = new Error('SELECT failed at /private/data.sqlite');
    const logger = { error: vi.fn() };
    const { handler, dependencies } = setup(logger);
    vi.mocked(dependencies.historyService.getPage).mockImplementation(() => {
      throw technicalError;
    });

    expect(handler.listener({}, {})).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Unexpected history IPC failure.',
      technicalError,
    );
  });
});

const setup = (logger = { error: vi.fn() }) => {
  let channel = '';
  let listener: (
    event: unknown,
    input?: unknown,
  ) => AppResult<HistoryPage> = () => ({ ok: true, value: page });
  const dependencies: HistoryIpcDependencies = {
    clock: { now: vi.fn(() => now) },
    historyService: { getPage: vi.fn(() => page) },
  };

  registerHistoryHandler(
    {
      handle: (registeredChannel, registeredListener) => {
        channel = registeredChannel;
        listener = registeredListener;
      },
    },
    dependencies,
    logger,
  );

  return { handler: { channel, listener }, dependencies };
};
