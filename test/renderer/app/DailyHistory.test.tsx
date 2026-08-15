import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DailyHistory } from '@/renderer/app/DailyHistory';
import type { AppResult } from '@/shared/contracts/app-result';
import type { HistoryPage } from '@/shared/contracts/history';

const today = new Date(2026, 7, 14).getTime();
const tomorrow = new Date(2026, 7, 15).getTime();
const yesterday = new Date(2026, 7, 13).getTime();
const snapshotNow = new Date(2026, 7, 14, 12).getTime();

const emptyPage: HistoryPage = {
  days: [
    {
      dayStartedAt: today,
      dayEndedAt: tomorrow,
      totalDurationMs: 0,
      tasks: [],
    },
  ],
  nextBeforeDayStartedAt: null,
  now: snapshotNow,
};

const loadedPage: HistoryPage = {
  days: [
    {
      dayStartedAt: today,
      dayEndedAt: tomorrow,
      totalDurationMs: 5_400_000,
      tasks: [
        {
          task: { id: 'task-1', description: 'Implement authentication' },
          dayDurationMs: 5_400_000,
          lifetimeDurationMs: 30_600_000,
          mostRecentActivityAt: new Date(2026, 7, 14, 11).getTime(),
          intervals: [
            {
              id: 'interval-1',
              projectedStartedAt: new Date(2026, 7, 14, 9, 15).getTime(),
              projectedEndedAt: new Date(2026, 7, 14, 10, 45).getTime(),
              durationMs: 5_400_000,
              isRunning: false,
            },
          ],
        },
        {
          task: { id: 'task-2', description: 'Quick review' },
          dayDurationMs: 30_000,
          lifetimeDurationMs: 30_000,
          mostRecentActivityAt: new Date(2026, 7, 14, 8).getTime(),
          intervals: [
            {
              id: 'interval-short',
              projectedStartedAt: new Date(2026, 7, 14, 8).getTime(),
              projectedEndedAt: new Date(2026, 7, 14, 8, 0, 30).getTime(),
              durationMs: 30_000,
              isRunning: false,
            },
          ],
        },
      ],
    },
    {
      dayStartedAt: yesterday,
      dayEndedAt: today,
      totalDurationMs: 1_800_000,
      tasks: [
        {
          task: { id: 'task-1', description: 'Implement authentication' },
          dayDurationMs: 1_800_000,
          lifetimeDurationMs: 30_600_000,
          mostRecentActivityAt: today,
          intervals: [
            {
              id: 'cross-midnight',
              projectedStartedAt: new Date(2026, 7, 13, 23, 30).getTime(),
              projectedEndedAt: today,
              durationMs: 1_800_000,
              isRunning: false,
            },
          ],
        },
      ],
    },
  ],
  nextBeforeDayStartedAt: 123,
  now: snapshotNow,
};

describe('DailyHistory', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows an accessible initial loading state and requests the initial page', () => {
    const pending = new Promise<AppResult<HistoryPage>>(() => undefined);
    const getPage = setHistoryApi(vi.fn(() => pending));

    render(<DailyHistory />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading history…');
    expect(getPage).toHaveBeenCalledWith({});
  });

  it('renders empty Today with the required guidance', async () => {
    setHistoryApi(vi.fn().mockResolvedValue({ ok: true, value: emptyPage }));

    render(<DailyHistory />);

    const todayHeading = await screen.findByRole('heading', { name: 'Today' });
    expect(todayHeading.parentElement).toHaveTextContent('0m');
    expect(screen.getByText('No tracked time yet.')).toBeInTheDocument();
    expect(
      screen.getByText('Start your first task above.'),
    ).toBeInTheDocument();
  });

  it('renders day and task totals and expands rows independently', async () => {
    setHistoryApi(vi.fn().mockResolvedValue({ ok: true, value: loadedPage }));

    render(<DailyHistory />);

    expect(await screen.findByRole('heading', { name: 'Today' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Yesterday' })).toBeVisible();
    expect(screen.getByText('1h 30m')).toBeVisible();
    expect(screen.getByText('1h 30m today · 8h 30m total')).toBeVisible();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();

    const taskButtons = screen.getAllByRole('button', {
      name: 'Implement authentication',
    });
    expect(taskButtons).toHaveLength(2);
    expect(taskButtons[0]!).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(taskButtons[0]!);
    expect(taskButtons[0]!).toHaveAttribute('aria-expanded', 'true');
    expect(taskButtons[1]!).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('listitem')).toHaveAccessibleName(/to .*1h 30m/);

    fireEvent.click(taskButtons[1]!);
    expect(taskButtons[0]!).toHaveAttribute('aria-expanded', 'true');
    expect(taskButtons[1]!).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('list')).toHaveLength(2);
    expect(screen.getByLabelText(/to midnight, 30m/)).toBeVisible();
  });

  it('formats a positive sub-minute interval as less than one minute', async () => {
    setHistoryApi(vi.fn().mockResolvedValue({ ok: true, value: loadedPage }));
    render(<DailyHistory />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Quick review' }),
    );

    expect(screen.getByRole('listitem')).toHaveAccessibleName(/<1m/);
  });

  it.each([
    { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Hidden' } },
    new Error('IPC disconnected'),
  ])('keeps the error retryable after an initial failure', async (failure) => {
    const getPage = vi
      .fn()
      .mockImplementationOnce(() =>
        failure instanceof Error
          ? Promise.reject(failure)
          : Promise.resolve(failure),
      )
      .mockResolvedValueOnce({ ok: true, value: emptyPage });
    setHistoryApi(getPage);
    render(<DailyHistory />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'History unavailableYour timer is still available.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('heading', { name: 'Today' })).toBeVisible();
    expect(getPage).toHaveBeenCalledTimes(2);
    expect(getPage).toHaveBeenLastCalledWith({});
  });
});

const setHistoryApi = (getPage: ReturnType<typeof vi.fn>) => {
  Object.defineProperty(window, 'timeTracker', {
    configurable: true,
    value: { history: { getPage } },
  });
  return getPage;
};
