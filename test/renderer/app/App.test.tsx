import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '@/renderer/app/App';
import type { AppResult } from '@/shared/contracts/app-result';
import type { TimeTrackerAPI } from '@/shared/contracts/system-health';
import type { TimerState } from '@/shared/contracts/timer';

const idleState: TimerState = {
  status: 'idle',
  currentTask: null,
  sessionStartedAt: null,
  sessionDurationMs: 0,
  taskTodayDurationMs: 0,
  taskLifetimeDurationMs: 0,
  activeIntervalStartedAt: null,
  now: 1_000,
};

const runningState: TimerState = {
  status: 'running',
  currentTask: { id: 'task-1', description: 'Implement authentication' },
  sessionStartedAt: 1_000,
  sessionDurationMs: 500,
  taskTodayDurationMs: 500,
  taskLifetimeDurationMs: 500,
  activeIntervalStartedAt: 1_000,
  now: Date.now(),
};

const pausedState: TimerState = {
  ...runningState,
  status: 'paused',
  sessionDurationMs: 3_900_000,
  taskTodayDurationMs: 7_500_000,
  taskLifetimeDurationMs: 18_900_000,
  activeIntervalStartedAt: null,
};

describe('App', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('loads authoritative timer state before showing the focused idle form', async () => {
    const state = deferred<AppResult<TimerState>>();
    const api = setTimerApi({ getState: vi.fn(() => state.promise) });

    render(<App />);

    expect(api.timer.getState).toHaveBeenCalledOnce();
    expect(screen.getByText('Loading timer…')).toBeVisible();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    state.resolve({ ok: true, value: idleState });

    const input = await screen.findByRole('textbox', {
      name: 'Task description',
    });
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('data-slot', 'input');
    const startButton = screen.getByRole('button', { name: 'Start' });
    expect(startButton).toHaveAttribute('data-slot', 'button');
    expect(startButton).toHaveAttribute('data-variant', 'default');
    expect(startButton).toBeDisabled();
  });

  it('starts a trimmed description with the Start button and shows pending state', async () => {
    const start = deferred<AppResult<TimerState>>();
    const api = setTimerApi({ start: vi.fn(() => start.promise) });
    render(<App />);
    const input = await screen.findByRole('textbox', {
      name: 'Task description',
    });

    fireEvent.change(input, {
      target: { value: '  Implement authentication  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    expect(api.timer.start).toHaveBeenCalledWith({
      description: 'Implement authentication',
    });
    expect(screen.getByRole('button', { name: 'Starting…' })).toBeDisabled();
    expect(input).toBeDisabled();

    start.resolve({ ok: true, value: runningState });

    expect(
      await screen.findByRole('region', { name: 'running timer' }),
    ).toHaveTextContent('Implement authentication');
  });

  it('starts with Enter from the task input', async () => {
    const api = setTimerApi();
    render(<App />);
    const input = await screen.findByRole('textbox', {
      name: 'Task description',
    });

    fireEvent.change(input, { target: { value: 'Code review' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(api.timer.start).toHaveBeenCalledWith({
      description: 'Code review',
    });
  });

  it('shows validation feedback and returns focus for an overlong description', async () => {
    const api = setTimerApi();
    render(<App />);
    const input = await screen.findByRole('textbox', {
      name: 'Task description',
    });

    fireEvent.change(input, { target: { value: 'a'.repeat(501) } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Task description must contain between 1 and 500 characters.',
    );
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.closest('[data-slot="field"]')).toHaveAttribute(
      'data-invalid',
      'true',
    );
    expect(input).toHaveFocus();
    expect(api.timer.start).not.toHaveBeenCalled();
  });

  it('shows application errors, preserves input, and clears feedback on edit', async () => {
    const api = setTimerApi({
      start: vi.fn().mockResolvedValue({
        ok: false,
        error: {
          code: 'TIMER_NOT_IDLE',
          message: 'The timer must be idle before starting a task.',
        },
      }),
    });
    render(<App />);
    const input = await screen.findByRole('textbox', {
      name: 'Task description',
    });

    fireEvent.change(input, { target: { value: 'Planning' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The timer must be idle before starting a task.',
    );
    expect(input).toHaveValue('Planning');
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: 'Planning notes' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(api.timer.start).toHaveBeenCalledOnce();
  });

  it.each([
    ['running', runningState],
    [
      'paused',
      {
        ...runningState,
        status: 'paused' as const,
        activeIntervalStartedAt: null,
      },
    ],
  ])(
    'restores a %s snapshot into its active presentation branch',
    async (status, state) => {
      const api = setTimerApi({
        getState: vi.fn().mockResolvedValue({ ok: true, value: state }),
      });

      render(<App />);

      const region = await screen.findByRole('region', {
        name: `${status} timer`,
      });
      expect(region).toHaveTextContent('Implement authentication');
      expect(region).toHaveTextContent(
        status === 'running' ? 'Current session' : 'Paused',
      );
      expect(api.timer.start).not.toHaveBeenCalled();
      expect(api.timer.pause).not.toHaveBeenCalled();
      expect(api.timer.resume).not.toHaveBeenCalled();
      expect(api.timer.stop).not.toHaveBeenCalled();
    },
  );

  it('shows a safe load error when state loading fails', async () => {
    setTimerApi({
      getState: vi.fn().mockRejectedValue(new Error('IPC failed')),
    });

    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The timer could not be loaded. Please restart the application.',
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('renders active durations and applies Pause, Resume, and Stop responses', async () => {
    const nextRunningState: TimerState = {
      ...pausedState,
      status: 'running',
      activeIntervalStartedAt: pausedState.now,
    };
    const pauseResult = deferred<AppResult<TimerState>>();
    const api = setTimerApi({
      getState: vi.fn().mockResolvedValue({ ok: true, value: runningState }),
      pause: vi.fn(() => pauseResult.promise),
      resume: vi.fn().mockResolvedValue({ ok: true, value: nextRunningState }),
      stop: vi.fn().mockResolvedValue({ ok: true, value: idleState }),
    });
    render(<App />);

    expect(await screen.findByRole('button', { name: 'Pause' })).toBeEnabled();
    const stopButton = screen.getByRole('button', { name: 'Stop' });
    expect(stopButton).toHaveAttribute('data-variant', 'outline');
    expect(stopButton).toBeEnabled();
    expect(screen.getByLabelText('Current session duration')).toHaveTextContent(
      '00:00:00',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('button', { name: 'Pausing…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled();
    pauseResult.resolve({ ok: true, value: pausedState });

    expect(await screen.findByRole('button', { name: 'Resume' })).toBeEnabled();
    expect(screen.getByLabelText('Current session duration')).toHaveTextContent(
      '01:05:00',
    );
    expect(screen.getByText(/Today 2h 5m/)).toHaveTextContent(
      'Today 2h 5m · Total 5h 15m',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(await screen.findByRole('button', { name: 'Pause' })).toBeEnabled();
    expect(api.timer.resume).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(
      await screen.findByRole('textbox', { name: 'Task description' }),
    ).toHaveFocus();
    expect(api.timer.pause).toHaveBeenCalledOnce();
    expect(api.timer.stop).toHaveBeenCalledOnce();
  });

  it('shows a safe command error and re-enables active controls', async () => {
    const api = setTimerApi({
      getState: vi.fn().mockResolvedValue({ ok: true, value: runningState }),
      pause: vi.fn().mockResolvedValue({
        ok: false,
        error: {
          code: 'NO_ACTIVE_TIMER',
          message: 'There is no active timer to pause.',
        },
      }),
    });
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Pause' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There is no active timer to pause.',
    );
    expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
    expect(api.timer.pause).toHaveBeenCalledOnce();
  });

  it('keeps the active view usable when a command promise rejects', async () => {
    const api = setTimerApi({
      getState: vi.fn().mockResolvedValue({ ok: true, value: runningState }),
      stop: vi.fn().mockRejectedValue(new Error('IPC disconnected')),
    });
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Stop' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The timer could not be updated. Please try again.',
    );
    expect(
      screen.getByRole('region', { name: 'running timer' }),
    ).toHaveTextContent('Implement authentication');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
    expect(api.timer.stop).toHaveBeenCalledOnce();
  });

  it('restores authoritative elapsed time after the renderer remounts', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const restoredState: TimerState = {
      ...runningState,
      sessionDurationMs: 125_000,
      now: 1_005_000,
    };
    const getState = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        value: { ...runningState, sessionDurationMs: 120_000, now: 1_000_000 },
      })
      .mockResolvedValueOnce({ ok: true, value: restoredState });
    setTimerApi({ getState });

    const firstRenderer = render(<App />);
    await act(async () => Promise.resolve());
    expect(screen.getByLabelText('Current session duration')).toHaveTextContent(
      '00:02:00',
    );

    await act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByLabelText('Current session duration')).toHaveTextContent(
      '00:02:05',
    );
    firstRenderer.unmount();

    render(<App />);
    await act(async () => Promise.resolve());
    expect(screen.getByLabelText('Current session duration')).toHaveTextContent(
      '00:02:05',
    );
    expect(getState).toHaveBeenCalledTimes(2);
  });

  it('periodically refreshes an active snapshot without issuing commands', async () => {
    vi.useFakeTimers();
    const api = setTimerApi({
      getState: vi.fn().mockResolvedValue({ ok: true, value: pausedState }),
    });
    render(<App />);
    await act(async () => Promise.resolve());
    expect(api.timer.getState).toHaveBeenCalledOnce();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(api.timer.getState).toHaveBeenCalledTimes(2);
    expect(api.timer.pause).not.toHaveBeenCalled();
    expect(api.timer.resume).not.toHaveBeenCalled();
    expect(api.timer.stop).not.toHaveBeenCalled();
  });

  it('corrects local display drift from the periodic authoritative snapshot', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const initialState: TimerState = {
      ...runningState,
      sessionDurationMs: 600_000,
      now: 1_000_000,
    };
    const correctedState: TimerState = {
      ...initialState,
      sessionDurationMs: 630_000,
      now: 1_060_000,
    };
    const api = setTimerApi({
      getState: vi
        .fn()
        .mockResolvedValueOnce({ ok: true, value: initialState })
        .mockResolvedValueOnce({ ok: true, value: correctedState }),
    });
    render(<App />);
    await act(async () => Promise.resolve());
    expect(screen.getByLabelText('Current session duration')).toHaveTextContent(
      '00:10:00',
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(api.timer.getState).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText('Current session duration')).toHaveTextContent(
      '00:10:30',
    );
  });
});

interface TimerApiOverrides {
  readonly getState?: TimeTrackerAPI['timer']['getState'];
  readonly start?: TimeTrackerAPI['timer']['start'];
  readonly pause?: TimeTrackerAPI['timer']['pause'];
  readonly resume?: TimeTrackerAPI['timer']['resume'];
  readonly stop?: TimeTrackerAPI['timer']['stop'];
}

const setTimerApi = (overrides: TimerApiOverrides = {}): TimeTrackerAPI => {
  const api: TimeTrackerAPI = {
    system: { healthCheck: vi.fn() },
    timer: {
      getState:
        overrides.getState ??
        vi.fn().mockResolvedValue({ ok: true, value: idleState }),
      start:
        overrides.start ??
        vi.fn().mockResolvedValue({ ok: true, value: runningState }),
      pause: overrides.pause ?? vi.fn(),
      resume: overrides.resume ?? vi.fn(),
      stop: overrides.stop ?? vi.fn(),
    },
    history: {
      getPage: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          days: [
            {
              dayStartedAt: new Date(1_000).setHours(0, 0, 0, 0),
              dayEndedAt: new Date(1_000).setHours(24, 0, 0, 0),
              totalDurationMs: 0,
              tasks: [],
            },
          ],
          nextBeforeDayStartedAt: null,
          now: 1_000,
        },
      }),
    },
  };

  Object.defineProperty(window, 'timeTracker', {
    configurable: true,
    value: api,
  });
  return api;
};

const deferred = <Value,>() => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};
