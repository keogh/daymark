import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
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

const olderDay = new Date(2026, 7, 12).getTime();
const olderPage: HistoryPage = {
  days: [
    loadedPage.days[1]!,
    {
      dayStartedAt: olderDay,
      dayEndedAt: yesterday,
      totalDurationMs: 3_600_000,
      tasks: [
        {
          task: { id: 'task-3', description: 'Older work' },
          dayDurationMs: 3_600_000,
          lifetimeDurationMs: 3_600_000,
          mostRecentActivityAt: new Date(2026, 7, 12, 10).getTime(),
          intervals: [
            {
              id: 'interval-older',
              projectedStartedAt: new Date(2026, 7, 12, 9).getTime(),
              projectedEndedAt: new Date(2026, 7, 12, 10).getTime(),
              durationMs: 3_600_000,
              isRunning: false,
            },
          ],
        },
      ],
    },
  ],
  nextBeforeDayStartedAt: null,
  now: snapshotNow,
};

const runningPage: HistoryPage = {
  days: [
    {
      dayStartedAt: today,
      dayEndedAt: tomorrow,
      totalDurationMs: 60_000,
      tasks: [
        {
          task: { id: 'task-live', description: 'Live task' },
          dayDurationMs: 60_000,
          lifetimeDurationMs: 3_660_000,
          mostRecentActivityAt: snapshotNow,
          intervals: [
            {
              id: 'interval-live',
              projectedStartedAt: snapshotNow - 60_000,
              projectedEndedAt: snapshotNow,
              durationMs: 60_000,
              isRunning: true,
            },
          ],
        },
      ],
    },
  ],
  nextBeforeDayStartedAt: null,
  now: snapshotNow,
};

describe('DailyHistory', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
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

  it('advances only running history values locally without additional IPC', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(snapshotNow);
    const getPage = setHistoryApi(
      vi.fn().mockResolvedValue({ ok: true, value: runningPage }),
    );
    render(<DailyHistory />);
    await act(async () => Promise.resolve());

    fireEvent.click(screen.getByRole('button', { name: 'Live task' }));
    expect(screen.getByText('1m today · 1h 1m total')).toBeVisible();
    expect(screen.getByRole('listitem')).toHaveAccessibleName(/1m/);

    await act(() => vi.advanceTimersByTime(60_000));

    expect(screen.getByText('2m today · 1h 2m total')).toBeVisible();
    expect(screen.getByRole('listitem')).toHaveAccessibleName(/2m/);
    expect(getPage).toHaveBeenCalledOnce();
  });

  it('keeps closed history fixed as renderer time advances', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(snapshotNow);
    const getPage = setHistoryApi(
      vi.fn().mockResolvedValue({ ok: true, value: loadedPage }),
    );
    render(<DailyHistory />);
    await act(async () => Promise.resolve());

    await act(() => vi.advanceTimersByTime(120_000));

    expect(screen.getByText('1h 30m today · 8h 30m total')).toBeVisible();
    expect(getPage).toHaveBeenCalledOnce();
  });

  it('reconciles on a timer revision and retains data with retry after failure', async () => {
    const refreshedPage = {
      ...loadedPage,
      days: [
        {
          ...loadedPage.days[0]!,
          totalDurationMs: 7_200_000,
        },
      ],
    };
    const getPage = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, value: loadedPage })
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'Hidden' },
      })
      .mockResolvedValueOnce({ ok: true, value: refreshedPage });
    setHistoryApi(getPage);
    const view = render(<DailyHistory refreshRevision={0} />);
    expect(await screen.findByText('1h 30m')).toBeVisible();

    view.rerender(<DailyHistory refreshRevision={1} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'History could not be refreshed. Showing the last update.',
    );
    expect(screen.getByText('1h 30m')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Retry refresh' }));

    expect(await screen.findByText('2h')).toBeVisible();
    expect(getPage).toHaveBeenCalledTimes(3);
  });

  it('reconciles on focus and at each local midnight', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 14, 23, 59, 59));
    const getPage = setHistoryApi(
      vi.fn().mockResolvedValue({ ok: true, value: emptyPage }),
    );
    render(<DailyHistory />);
    await act(async () => Promise.resolve());

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await act(async () => Promise.resolve());
    expect(getPage).toHaveBeenCalledTimes(2);

    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    expect(getPage).toHaveBeenCalledTimes(3);
    await act(async () => vi.advanceTimersByTimeAsync(86_400_000));
    expect(getPage).toHaveBeenCalledTimes(4);
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

  it('loads one older page at a time and preserves expanded rows', async () => {
    const deferred = createDeferred<AppResult<HistoryPage>>();
    const getPage = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, value: loadedPage })
      .mockImplementationOnce(() => deferred.promise);
    setHistoryApi(getPage);
    render(<DailyHistory />);

    const task = await screen.findAllByRole('button', {
      name: 'Implement authentication',
    });
    fireEvent.click(task[0]!);
    const loadOlder = screen.getByRole('button', { name: 'Load older' });
    loadOlder.focus();
    fireEvent.click(loadOlder);
    fireEvent.click(loadOlder);

    expect(loadOlder).toBeDisabled();
    expect(loadOlder).toHaveTextContent('Loading older…');
    expect(getPage).toHaveBeenCalledTimes(2);
    expect(getPage).toHaveBeenLastCalledWith({ beforeDayStartedAt: 123 });
    expect(task[0]).toHaveAttribute('aria-expanded', 'true');

    deferred.resolve({
      ok: true,
      value: { ...olderPage, nextBeforeDayStartedAt: 1 },
    });

    expect(
      await screen.findByRole('heading', { name: 'Wednesday, Aug 12' }),
    ).toBeVisible();
    expect(screen.getAllByRole('heading', { name: 'Yesterday' })).toHaveLength(
      1,
    );
    expect(task[0]).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Load older' })).toHaveFocus();
  });

  it.each([
    { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Hidden' } },
    new Error('IPC disconnected'),
  ])(
    'preserves loaded data and retries a failed older page',
    async (failure) => {
      const getPage = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, value: loadedPage })
        .mockImplementationOnce(() =>
          failure instanceof Error
            ? Promise.reject(failure)
            : Promise.resolve(failure),
        )
        .mockResolvedValueOnce({ ok: true, value: olderPage });
      setHistoryApi(getPage);
      render(<DailyHistory />);

      const task = (
        await screen.findAllByRole('button', {
          name: 'Implement authentication',
        })
      )[0]!;
      fireEvent.click(task);
      fireEvent.click(screen.getByRole('button', { name: 'Load older' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Older history could not be loaded.',
      );
      expect(screen.getByRole('heading', { name: 'Today' })).toBeVisible();
      expect(task).toHaveAttribute('aria-expanded', 'true');
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

      expect(
        await screen.findByRole('heading', { name: 'Wednesday, Aug 12' }),
      ).toBeVisible();
      expect(getPage).toHaveBeenLastCalledWith({ beforeDayStartedAt: 123 });
      expect(task).toHaveAttribute('aria-expanded', 'true');
      expect(
        screen.queryByRole('button', { name: 'Load older' }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('status', { name: '' })).toHaveTextContent(
        'All history loaded.',
      );
      await waitFor(() =>
        expect(document.activeElement).toHaveTextContent('All history loaded.'),
      );
    },
  );
});

const setHistoryApi = (getPage: ReturnType<typeof vi.fn>) => {
  Object.defineProperty(window, 'timeTracker', {
    configurable: true,
    value: { history: { getPage } },
  });
  return getPage;
};

const createDeferred = <Value,>() => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};
