import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SYSTEM_HEALTH_CHECK_CHANNEL } from '@/shared/contracts/system-health';
import type { TimeTrackerAPI } from '@/shared/contracts/system-health';
import { HISTORY_GET_PAGE_CHANNEL } from '@/shared/contracts/history';
import {
  INTERVALS_DELETE_CHANNEL,
  INTERVALS_UPDATE_CHANNEL,
} from '@/shared/contracts/intervals';
import { MANUAL_TIME_CREATE_INTERVAL_CHANNEL } from '@/shared/contracts/manual-time';
import {
  TASKS_DELETE_CHANNEL,
  TASKS_GET_DELETION_SUMMARY_CHANNEL,
  TASKS_GET_SUGGESTIONS_CHANNEL,
  TASKS_RENAME_CHANNEL,
} from '@/shared/contracts/tasks';
import {
  TIMER_GET_STATE_CHANNEL,
  TIMER_PAUSE_CHANNEL,
  TIMER_RESUME_CHANNEL,
  TIMER_START_CHANNEL,
  TIMER_STOP_CHANNEL,
  TIMER_STATE_CHANGED_CHANNEL,
  TIMER_SWITCH_TO_TASK_CHANNEL,
} from '@/shared/contracts/timer';

const electronMocks = vi.hoisted(() => ({
  exposedApi: undefined as TimeTrackerAPI | undefined,
  exposeInMainWorld: vi.fn((key: string, api: TimeTrackerAPI): void => {
    if (key === 'timeTracker') {
      electronMocks.exposedApi = api;
    }
  }),
  invoke: vi.fn<() => Promise<unknown>>(),
  on: vi.fn(),
  removeListener: vi.fn(),
}));

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: electronMocks.exposeInMainWorld },
  ipcRenderer: {
    invoke: electronMocks.invoke,
    on: electronMocks.on,
    removeListener: electronMocks.removeListener,
  },
}));

describe('preload API', () => {
  beforeEach(() => {
    vi.resetModules();
    electronMocks.exposeInMainWorld.mockReset();
    electronMocks.exposeInMainWorld.mockImplementation(
      (key: string, api: TimeTrackerAPI): void => {
        if (key === 'timeTracker') {
          electronMocks.exposedApi = api;
        }
      },
    );
    electronMocks.invoke.mockReset();
    electronMocks.on.mockReset();
    electronMocks.removeListener.mockReset();
    electronMocks.exposedApi = undefined;
  });

  it('exposes only typed APIs over explicit channels', async () => {
    const response = { status: 'ok', database: 'ready' } as const;
    electronMocks.invoke.mockResolvedValue(response);

    await import('@/preload/index');

    expect(electronMocks.exposeInMainWorld).toHaveBeenCalledOnce();
    const api = electronMocks.exposedApi;
    expect(api).toBeDefined();
    if (api === undefined) {
      throw new Error('Preload API was not exposed.');
    }
    expect(Object.keys(api)).toEqual([
      'system',
      'timer',
      'history',
      'intervals',
      'manualTime',
      'tasks',
    ]);
    expect(Object.keys(api.timer)).toEqual([
      'getState',
      'start',
      'switchToTask',
      'pause',
      'resume',
      'stop',
      'onStateChanged',
    ]);
    expect(Object.keys(api.history)).toEqual(['getPage']);
    expect(Object.keys(api.intervals)).toEqual(['update', 'delete']);
    expect(Object.keys(api.manualTime)).toEqual(['createInterval']);
    expect(Object.keys(api.tasks)).toEqual([
      'getSuggestions',
      'rename',
      'delete',
      'getDeletionSummary',
    ]);
    await expect(api.system.healthCheck()).resolves.toEqual(response);
    await api.timer.getState();
    await api.timer.start({ source: 'description', description: 'Focus' });
    await api.timer.start({ source: 'existing-task', taskId: 'task-1' });
    await api.timer.switchToTask({ taskId: 'task-2' });
    await api.timer.pause();
    await api.timer.resume();
    await api.timer.stop();
    const stateListener = vi.fn();
    const unsubscribe = api.timer.onStateChanged(stateListener);
    expect(electronMocks.on).toHaveBeenCalledOnce();
    expect(electronMocks.on.mock.calls[0]?.[0]).toBe(
      TIMER_STATE_CHANGED_CHANNEL,
    );
    const registeredListener = electronMocks.on.mock.calls[0]?.[1] as (
      event: unknown,
      state: unknown,
    ) => void;
    const state = { status: 'idle' };
    registeredListener({ sender: 'must not escape preload' }, state);
    expect(stateListener).toHaveBeenCalledWith(state);
    unsubscribe();
    expect(electronMocks.removeListener).toHaveBeenCalledWith(
      TIMER_STATE_CHANGED_CHANNEL,
      registeredListener,
    );
    await api.history.getPage({ beforeDayStartedAt: 0 });
    await api.intervals.update({
      intervalId: 'interval-1',
      startDate: '2026-08-14',
      startTime: '09:00',
      endDate: '2026-08-14',
      endTime: '10:00',
    });
    await api.intervals.delete({ intervalId: 'interval-2' });
    await api.manualTime.createInterval({
      taskDescription: 'Focus',
      date: '2026-08-14',
      startTime: '09:00',
      endTime: '10:00',
    });
    await api.tasks.getSuggestions({ query: 'focus' });
    await api.tasks.rename({ taskId: 'task-1', description: 'Deep focus' });
    await api.tasks.delete({ taskId: 'task-2' });
    await api.tasks.getDeletionSummary({ taskId: 'task-3' });
    expect(electronMocks.invoke.mock.calls).toEqual([
      [SYSTEM_HEALTH_CHECK_CHANNEL],
      [TIMER_GET_STATE_CHANNEL],
      [TIMER_START_CHANNEL, { source: 'description', description: 'Focus' }],
      [TIMER_START_CHANNEL, { source: 'existing-task', taskId: 'task-1' }],
      [TIMER_SWITCH_TO_TASK_CHANNEL, { taskId: 'task-2' }],
      [TIMER_PAUSE_CHANNEL],
      [TIMER_RESUME_CHANNEL],
      [TIMER_STOP_CHANNEL],
      [HISTORY_GET_PAGE_CHANNEL, { beforeDayStartedAt: 0 }],
      [
        INTERVALS_UPDATE_CHANNEL,
        {
          intervalId: 'interval-1',
          startDate: '2026-08-14',
          startTime: '09:00',
          endDate: '2026-08-14',
          endTime: '10:00',
        },
      ],
      [INTERVALS_DELETE_CHANNEL, { intervalId: 'interval-2' }],
      [
        MANUAL_TIME_CREATE_INTERVAL_CHANNEL,
        {
          taskDescription: 'Focus',
          date: '2026-08-14',
          startTime: '09:00',
          endTime: '10:00',
        },
      ],
      [TASKS_GET_SUGGESTIONS_CHANNEL, { query: 'focus' }],
      [TASKS_RENAME_CHANNEL, { taskId: 'task-1', description: 'Deep focus' }],
      [TASKS_DELETE_CHANNEL, { taskId: 'task-2' }],
      [TASKS_GET_DELETION_SUMMARY_CHANNEL, { taskId: 'task-3' }],
    ]);
  });
});
