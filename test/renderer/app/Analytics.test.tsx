import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Analytics } from '@/renderer/app/Analytics';
import type { AppResult } from '@/shared/contracts/app-result';
import type {
  AnalyticsRange,
  AnalyticsSummary,
} from '@/shared/contracts/analytics';
import type { TimeTrackerAPI } from '@/shared/contracts/system-health';

const DAY = 86_400_000;
const CAPTURED_AT = new Date(2026, 7, 21, 12).getTime();
const TODAY_STARTED_AT = new Date(2026, 7, 21).getTime();

const summary = (
  range: AnalyticsRange = 'last-7-days',
  durations?: readonly number[],
): AnalyticsSummary => {
  const dayCount = range === 'last-7-days' ? 7 : 30;
  const values =
    durations ?? Array.from({ length: dayCount }, (_, index) => index * 60_000);
  const totalDurationMs = values.reduce(
    (total, duration) => total + duration,
    0,
  );
  return {
    range,
    rangeStartedAt: TODAY_STARTED_AT - (dayCount - 1) * DAY,
    rangeEndedAt: TODAY_STARTED_AT + DAY,
    capturedAt: CAPTURED_AT,
    days: values.map((durationMs, index) => ({
      dayStartedAt: TODAY_STARTED_AT - (dayCount - 1 - index) * DAY,
      dayEndedAt: TODAY_STARTED_AT - (dayCount - 2 - index) * DAY,
      durationMs,
    })),
    totalDurationMs,
    dailyAverageDurationMs: Math.floor(totalDurationMs / dayCount),
    currentWeek: {
      periodStartedAt: TODAY_STARTED_AT - 4 * DAY,
      periodEndedAt: TODAY_STARTED_AT + 3 * DAY,
      durationMs: 102 * 3_600_000 + 15 * 60_000,
    },
    currentMonth: {
      periodStartedAt: new Date(2026, 7, 1).getTime(),
      periodEndedAt: new Date(2026, 8, 1).getTime(),
      durationMs: 5_400_000,
    },
    topTasks:
      totalDurationMs === 0
        ? []
        : [
            {
              task: {
                id: 'task-1',
                description:
                  'A very long task description that must remain readable at narrow widths',
              },
              durationMs: 3_600_000,
              mostRecentActivityAt: CAPTURED_AT,
            },
          ],
    runningTask: null,
  };
};

const installAnalyticsApi = (
  getSummary: TimeTrackerAPI['analytics']['getSummary'],
) => {
  Object.defineProperty(window, 'timeTracker', {
    configurable: true,
    value: { analytics: { getSummary } },
  });
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

describe('Analytics', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('loads seven days without fabricating values and renders ordered accessible chart data', async () => {
    const pending = deferred<AppResult<AnalyticsSummary>>();
    const getSummary = vi.fn(() => pending.promise);
    installAnalyticsApi(getSummary);
    const { container } = render(<Analytics />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading analytics');
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Last 7 days/ })).toBeChecked();

    pending.resolve({ ok: true, value: summary() });

    expect(await screen.findByText('Showing Last 7 days')).toBeVisible();
    expect(screen.getByText('Daily average · 7 days')).toBeVisible();
    expect(screen.getByText('Current week (Monday to today)')).toBeVisible();
    expect(screen.getByText('Current month (to today)')).toBeVisible();
    expect(screen.getByText('102h 15m')).toBeVisible();
    const values = screen.getByRole('list', { name: 'Daily tracked time' });
    expect(values.children).toHaveLength(7);
    expect(values.lastElementChild).toHaveTextContent('Today');
    expect(values.firstElementChild).toHaveTextContent('0m');
    expect(container.querySelectorAll('.analytics-chart__datum')).toHaveLength(
      7,
    );
    expect(container.querySelectorAll('.analytics-chart__bar')[1]).toHaveStyle({
      height: '16.666666666666664%',
    });
  });

  it('renders informative zero data without fabricated top tasks or invalid bars', async () => {
    installAnalyticsApi(
      vi.fn().mockResolvedValue({
        ok: true,
        value: summary('last-7-days', Array(7).fill(0)),
      }),
    );
    const { container } = render(<Analytics />);

    expect(
      await screen.findByText('No time tracked in this period.'),
    ).toBeVisible();
    expect(screen.getAllByText('0m').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('No tasks in this period.')).toBeVisible();
    expect(
      screen.getByRole('list', { name: 'Daily tracked time' }).children,
    ).toHaveLength(7);
    for (const bar of container.querySelectorAll('.analytics-chart__bar')) {
      expect(bar).toHaveStyle({ height: '0%' });
    }
  });

  it('supports arrow-key selection and roving focus in the range radio group', async () => {
    installAnalyticsApi(
      vi
        .fn()
        .mockImplementation(({ range }: { range: AnalyticsRange }) =>
          Promise.resolve({ ok: true, value: summary(range) }),
        ),
    );
    render(<Analytics />);

    const sevenDays = await screen.findByRole('radio', {
      name: 'Last 7 days',
    });
    const thirtyDays = screen.getByRole('radio', { name: 'Last 30 days' });
    expect(
      screen.getByRole('radiogroup', { name: 'Analytics range' }),
    ).toBeVisible();
    expect(sevenDays).toHaveAttribute('tabindex', '0');
    expect(thirtyDays).toHaveAttribute('tabindex', '-1');

    sevenDays.focus();
    fireEvent.keyDown(sevenDays, { key: 'ArrowRight' });

    expect(thirtyDays).toHaveFocus();
    await waitFor(() => expect(thirtyDays).toBeChecked());
    expect(thirtyDays).toHaveFocus();
    expect(thirtyDays).toHaveAttribute('tabindex', '0');
    expect(sevenDays).toHaveAttribute('tabindex', '-1');
  });

  it('offers Retry after an initial safe error', async () => {
    const getSummary = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'sensitive detail' },
      })
      .mockResolvedValueOnce({ ok: true, value: summary() });
    installAnalyticsApi(getSummary);
    render(<Analytics />);

    expect(await screen.findByText('Analytics unavailable')).toBeVisible();
    expect(screen.queryByText('sensitive detail')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Showing Last 7 days')).toBeVisible();
    expect(getSummary).toHaveBeenCalledTimes(2);
  });

  it('switches atomically and ignores a stale response from an older selection', async () => {
    const thirty = deferred<AppResult<AnalyticsSummary>>();
    const sevenAgain = deferred<AppResult<AnalyticsSummary>>();
    const getSummary = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, value: summary() })
      .mockImplementationOnce(() => thirty.promise)
      .mockImplementationOnce(() => sevenAgain.promise);
    installAnalyticsApi(getSummary);
    render(<Analytics />);
    await screen.findByText('Showing Last 7 days');

    fireEvent.click(screen.getByRole('radio', { name: 'Last 30 days' }));
    expect(
      screen.getByText(/Loading Last 30 days.*Showing Last 7 days/),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('radio', { name: 'Last 7 days' }));
    sevenAgain.resolve({ ok: true, value: summary() });
    await waitFor(() =>
      expect(screen.queryByText(/^Loading /)).not.toBeInTheDocument(),
    );
    thirty.resolve({ ok: true, value: summary('last-30-days') });

    await waitFor(() =>
      expect(screen.getByText('Showing Last 7 days')).toBeVisible(),
    );
    expect(screen.queryByText('Showing Last 30 days')).not.toBeInTheDocument();
  });

  it('retains and labels stale data when a range switch fails', async () => {
    installAnalyticsApi(
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, value: summary() })
        .mockResolvedValueOnce({
          ok: false,
          error: { code: 'INTERNAL_ERROR', message: 'hidden' },
        }),
    );
    render(<Analytics />);
    await screen.findByText('Showing Last 7 days');

    fireEvent.click(screen.getByRole('radio', { name: 'Last 30 days' }));

    expect(
      await screen.findByText('Analytics could not be refreshed'),
    ).toBeVisible();
    expect(screen.getByText('Showing Last 7 days')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Retry Last 30 days' }),
    ).toBeVisible();
    expect(screen.queryByText('hidden')).not.toBeInTheDocument();
  });

  it('advances a running summary locally without per-second Analytics requests', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(CAPTURED_AT);
    const runningSummary = {
      ...summary('last-7-days', [0, 0, 0, 0, 0, 0, 59_000]),
      runningTask: {
        task: { id: 'running', description: 'Running task' },
        durationMs: 59_000,
        mostRecentActivityAt: CAPTURED_AT,
        intervalStartedAt: CAPTURED_AT - 59_000,
      },
      topTasks: [
        {
          task: { id: 'running', description: 'Running task' },
          durationMs: 59_000,
          mostRecentActivityAt: CAPTURED_AT,
        },
      ],
    } satisfies AnalyticsSummary;
    const getSummary = vi.fn().mockResolvedValue({
      ok: true,
      value: runningSummary,
    });
    installAnalyticsApi(getSummary);
    render(<Analytics />);
    await act(() => Promise.resolve());

    expect(screen.getAllByText('<1m').length).toBeGreaterThan(0);
    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });
    expect(screen.getAllByText('1m').length).toBeGreaterThan(0);
    expect(getSummary).toHaveBeenCalledOnce();
  });

  it('reconciles on authoritative revision, focus, and the periodic interval', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(CAPTURED_AT);
    const getSummary = vi.fn().mockResolvedValue({
      ok: true,
      value: summary(),
    });
    installAnalyticsApi(getSummary);
    const view = render(<Analytics refreshRevision={0} />);
    await act(() => Promise.resolve());
    expect(getSummary).toHaveBeenCalledTimes(1);

    view.rerender(<Analytics refreshRevision={1} />);
    await act(() => Promise.resolve());
    expect(getSummary).toHaveBeenCalledTimes(2);

    window.dispatchEvent(new Event('focus'));
    await act(() => Promise.resolve());
    expect(getSummary).toHaveBeenCalledTimes(3);

    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });
    expect(getSummary).toHaveBeenCalledTimes(4);
  });

  it('clears stale presentation while an invalidated summary is replaced', async () => {
    const replacement = deferred<AppResult<AnalyticsSummary>>();
    const getSummary = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, value: summary() })
      .mockReturnValueOnce(replacement.promise);
    installAnalyticsApi(getSummary);
    const view = render(<Analytics invalidationRevision={0} />);
    expect(await screen.findByText(/Current week/)).toBeVisible();

    view.rerender(<Analytics invalidationRevision={1} />);

    expect(screen.getByText('Loading analytics…')).toBeVisible();
    expect(screen.queryByText(/Current week/)).not.toBeInTheDocument();
    replacement.resolve({ ok: true, value: summary() });
    expect(await screen.findByText(/Current week/)).toBeVisible();
  });

  it('refreshes authoritatively at local midnight', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 21, 23, 59, 59, 500));
    const getSummary = vi.fn().mockResolvedValue({
      ok: true,
      value: summary(),
    });
    installAnalyticsApi(getSummary);
    render(<Analytics />);
    await act(() => Promise.resolve());

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });
    expect(getSummary).toHaveBeenCalledTimes(2);
  });
});
