import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  now: 1_500,
};

describe('App', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('loads authoritative timer state before showing the focused idle form', async () => {
    const state = deferred<AppResult<TimerState>>();
    const api = setTimerApi({ getState: vi.fn(() => state.promise) });

    render(<App />);

    expect(api.timer.getState).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent('Loading timer…');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    state.resolve({ ok: true, value: idleState });

    const input = await screen.findByRole('textbox', {
      name: 'Task description',
    });
    expect(input).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
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
        status === 'running' ? 'Running' : 'Paused',
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
});

interface TimerApiOverrides {
  readonly getState?: TimeTrackerAPI['timer']['getState'];
  readonly start?: TimeTrackerAPI['timer']['start'];
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
      pause: vi.fn(),
      resume: vi.fn(),
      stop: vi.fn(),
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
