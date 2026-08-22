import { describe, expect, it, vi } from 'vitest';

import { ApplicationShutdown } from '@/main/app/shutdown';
import {
  registerAnalyticsHandler,
  type AnalyticsIpcRegistrar,
} from '@/main/ipc/analytics';
import type { AppResult } from '@/shared/contracts/app-result';
import {
  ANALYTICS_GET_SUMMARY_CHANNEL,
  type AnalyticsSummary,
} from '@/shared/contracts/analytics';

const summary: AnalyticsSummary = {
  range: 'last-7-days',
  rangeStartedAt: 1,
  rangeEndedAt: 8,
  capturedAt: 7,
  days: [],
  totalDurationMs: 0,
  dailyAverageDurationMs: 0,
  currentWeek: { periodStartedAt: 1, periodEndedAt: 8, durationMs: 0 },
  currentMonth: { periodStartedAt: 1, periodEndedAt: 31, durationMs: 0 },
  topTasks: [],
  runningTask: null,
};

describe('analytics IPC handler', () => {
  it.each(['last-7-days', 'last-30-days'] as const)(
    'registers the exact channel and forwards %s once',
    (range) => {
      const { handler, service } = setup();

      expect(handler.channel).toBe(ANALYTICS_GET_SUMMARY_CHANNEL);
      expect(handler.listener({}, { range })).toEqual({
        ok: true,
        value: summary,
      });
      expect(service.getSummary).toHaveBeenCalledOnce();
      expect(service.getSummary).toHaveBeenCalledWith({ range });
    },
  );

  it.each([
    ['missing input', undefined],
    ['null input', null],
    ['primitive input', 'last-7-days'],
    ['array input', ['last-7-days']],
    ['missing range', {}],
    ['malformed range', { range: 'last-14-days' }],
    ['unknown property', { range: 'last-7-days', extra: true }],
    ['inherited range', Object.create({ range: 'last-7-days' })],
  ])('rejects %s without executing the service query path', (_label, input) => {
    const { handler, service } = setup();

    expect(handler.listener({}, input)).toEqual({
      ok: false,
      error: {
        code: 'INVALID_ANALYTICS_RANGE',
        message: 'The requested analytics range is invalid.',
      },
    });
    expect(service.getSummary).not.toHaveBeenCalled();
  });

  it('logs unexpected failures and exposes only the safe internal error', () => {
    const technicalError = new Error(
      'SELECT description FROM tasks at /private/user/time-tracker.sqlite',
    );
    const logger = { error: vi.fn() };
    const { handler, service } = setup(logger);
    service.getSummary.mockImplementation(() => {
      throw technicalError;
    });

    const result = handler.listener({}, { range: 'last-7-days' });

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
    expect(JSON.stringify(result)).not.toContain('SELECT');
    expect(JSON.stringify(result)).not.toContain('time-tracker.sqlite');
    expect(logger.error).toHaveBeenCalledWith(
      'Unexpected analytics IPC failure.',
      technicalError,
    );
  });

  it('removes only its explicit handler through application cleanup', () => {
    const { dispose, removeHandler } = setup();
    const shutdown = new ApplicationShutdown({ quitApplication: vi.fn() });
    shutdown.addCleanupHook(dispose);

    shutdown.handleApplicationShutdown();
    shutdown.handleApplicationShutdown();

    expect(removeHandler).toHaveBeenCalledOnce();
    expect(removeHandler).toHaveBeenCalledWith(ANALYTICS_GET_SUMMARY_CHANNEL);
  });
});

const setup = (logger = { error: vi.fn() }) => {
  let channel = '';
  let listener: (
    event: unknown,
    input?: unknown,
  ) => AppResult<AnalyticsSummary> = () => ({ ok: true, value: summary });
  const removeHandler = vi.fn<(channel: string) => void>();
  const ipc: AnalyticsIpcRegistrar = {
    handle: vi.fn(
      (registeredChannel: string, registeredListener: typeof listener) => {
        channel = registeredChannel;
        listener = registeredListener;
      },
    ),
    removeHandler,
  };
  const service = { getSummary: vi.fn(() => summary) };
  const dispose = registerAnalyticsHandler(ipc, service, logger);

  return { handler: { channel, listener }, service, dispose, removeHandler };
};
