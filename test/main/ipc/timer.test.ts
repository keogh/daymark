import { describe, expect, it, vi } from 'vitest';

import {
  registerTimerHandlers,
  type TimerIpcOperations,
} from '@/main/ipc/timer';
import {
  TIMER_GET_STATE_CHANNEL,
  TIMER_PAUSE_CHANNEL,
  TIMER_RESUME_CHANNEL,
  TIMER_START_CHANNEL,
  TIMER_STOP_CHANNEL,
  TIMER_SWITCH_TO_TASK_CHANNEL,
  type TimerState,
} from '@/shared/contracts/timer';

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

describe('timer IPC handlers', () => {
  it('registers six explicit channels and delegates successful operations', () => {
    const handlers = new Map<
      string,
      (event: unknown, input?: unknown) => unknown
    >();
    const handle = vi.fn(
      (
        channel: string,
        listener: (event: unknown, input?: unknown) => unknown,
      ) => {
        handlers.set(channel, listener);
      },
    );
    const operations = createOperations();

    registerTimerHandlers({ handle }, operations, { error: vi.fn() });

    expect([...handlers.keys()]).toEqual([
      TIMER_GET_STATE_CHANNEL,
      TIMER_START_CHANNEL,
      TIMER_SWITCH_TO_TASK_CHANNEL,
      TIMER_PAUSE_CHANNEL,
      TIMER_RESUME_CHANNEL,
      TIMER_STOP_CHANNEL,
    ]);
    expect(handlers.get(TIMER_GET_STATE_CHANNEL)?.({})).toEqual({
      ok: true,
      value: idleState,
    });
    expect(
      handlers.get(TIMER_START_CHANNEL)?.(
        {},
        { source: 'description', description: '  Focus  ' },
      ),
    ).toEqual({
      ok: true,
      value: idleState,
    });
    expect(operations.commands.start).toHaveBeenCalledWith({
      source: 'description',
      description: 'Focus',
    });
    expect(
      handlers.get(TIMER_START_CHANNEL)?.(
        {},
        { source: 'existing-task', taskId: 'task-1' },
      ),
    ).toEqual({
      ok: true,
      value: idleState,
    });
    expect(operations.commands.start).toHaveBeenLastCalledWith({
      source: 'existing-task',
      taskId: 'task-1',
    });
    expect(
      handlers.get(TIMER_SWITCH_TO_TASK_CHANNEL)?.({}, { taskId: 'task-2' }),
    ).toEqual({
      ok: true,
      value: idleState,
    });
    expect(operations.commands.switchToTask).toHaveBeenCalledWith({
      taskId: 'task-2',
    });
    expect(handlers.get(TIMER_PAUSE_CHANNEL)?.({})).toEqual({
      ok: true,
      value: idleState,
    });
    expect(handlers.get(TIMER_RESUME_CHANNEL)?.({})).toEqual({
      ok: true,
      value: idleState,
    });
    expect(handlers.get(TIMER_STOP_CHANNEL)?.({})).toEqual({
      ok: true,
      value: idleState,
    });
  });

  it('rejects invalid Start input at the boundary without calling the service', () => {
    const handlers = new Map<
      string,
      (event: unknown, input?: unknown) => unknown
    >();
    const operations = createOperations();
    registerTimerHandlers(
      { handle: (channel, listener) => handlers.set(channel, listener) },
      operations,
      { error: vi.fn() },
    );

    expect(
      handlers.get(TIMER_START_CHANNEL)?.(
        {},
        { source: 'description', description: '   ' },
      ),
    ).toEqual({
      ok: false,
      error: {
        code: 'INVALID_TASK_DESCRIPTION',
        message: 'Task description must contain between 1 and 500 characters.',
      },
    });
    expect(operations.commands.start).not.toHaveBeenCalled();
  });

  it('rejects invalid switch input at the boundary without calling the service', () => {
    const handlers = new Map<
      string,
      (event: unknown, input?: unknown) => unknown
    >();
    const operations = createOperations();
    registerTimerHandlers(
      { handle: (channel, listener) => handlers.set(channel, listener) },
      operations,
      { error: vi.fn() },
    );

    expect(
      handlers.get(TIMER_SWITCH_TO_TASK_CHANNEL)?.({}, { taskId: '   ' }),
    ).toEqual({
      ok: false,
      error: {
        code: 'INVALID_SWITCH_TASK',
        message: 'Switch task input is invalid.',
      },
    });
    expect(operations.commands.switchToTask).not.toHaveBeenCalled();
  });

  it('returns expected failures as sanitized values', () => {
    const handlers = new Map<
      string,
      (event: unknown, input?: unknown) => unknown
    >();
    const operations = createOperations();
    vi.mocked(operations.commands.pause).mockReturnValue({
      ok: false,
      error: {
        code: 'NO_ACTIVE_TIMER',
        message: 'There is no active timer to pause.',
      },
    });
    registerTimerHandlers(
      { handle: (channel, listener) => handlers.set(channel, listener) },
      operations,
      { error: vi.fn() },
    );

    expect(handlers.get(TIMER_PAUSE_CHANNEL)?.({})).toEqual({
      ok: false,
      error: {
        code: 'NO_ACTIVE_TIMER',
        message: 'There is no active timer to pause.',
      },
    });
  });

  it('logs and sanitizes unexpected failures without exposing details', () => {
    const handlers = new Map<
      string,
      (event: unknown, input?: unknown) => unknown
    >();
    const technicalError = Object.assign(new Error('/private/data.sqlite'), {
      code: 'NO_ACTIVE_TIMER',
    });
    const operations = createOperations();
    vi.mocked(operations.commands.stop).mockImplementation(() => {
      throw technicalError;
    });
    const logger = { error: vi.fn() };
    registerTimerHandlers(
      { handle: (channel, listener) => handlers.set(channel, listener) },
      operations,
      logger,
    );

    expect(handlers.get(TIMER_STOP_CHANNEL)?.({})).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Unexpected timer IPC failure.',
      technicalError,
    );
  });
});

const createOperations = (): TimerIpcOperations => ({
  getState: { getState: vi.fn(() => idleState) },
  commands: {
    start: vi.fn(() => ({ ok: true as const, value: idleState })),
    switchToTask: vi.fn(() => ({ ok: true as const, value: idleState })),
    pause: vi.fn(() => ({ ok: true as const, value: idleState })),
    resume: vi.fn(() => ({ ok: true as const, value: idleState })),
    stop: vi.fn(() => ({ ok: true as const, value: idleState })),
  },
});
