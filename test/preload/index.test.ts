import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SYSTEM_HEALTH_CHECK_CHANNEL } from '@/shared/contracts/system-health';
import type { TimeTrackerAPI } from '@/shared/contracts/system-health';
import {
  TIMER_GET_STATE_CHANNEL,
  TIMER_PAUSE_CHANNEL,
  TIMER_RESUME_CHANNEL,
  TIMER_START_CHANNEL,
  TIMER_STOP_CHANNEL,
} from '@/shared/contracts/timer';

const electronMocks = vi.hoisted(() => ({
  exposedApi: undefined as TimeTrackerAPI | undefined,
  exposeInMainWorld: vi.fn((key: string, api: TimeTrackerAPI): void => {
    if (key === 'timeTracker') {
      electronMocks.exposedApi = api;
    }
  }),
  invoke: vi.fn<() => Promise<unknown>>(),
}));

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: electronMocks.exposeInMainWorld },
  ipcRenderer: { invoke: electronMocks.invoke },
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
    expect(Object.keys(api)).toEqual(['system', 'timer']);
    expect(Object.keys(api.timer)).toEqual([
      'getState',
      'start',
      'pause',
      'resume',
      'stop',
    ]);
    await expect(api.system.healthCheck()).resolves.toEqual(response);
    await api.timer.getState();
    await api.timer.start({ description: 'Focus' });
    await api.timer.pause();
    await api.timer.resume();
    await api.timer.stop();
    expect(electronMocks.invoke.mock.calls).toEqual([
      [SYSTEM_HEALTH_CHECK_CHANNEL],
      [TIMER_GET_STATE_CHANNEL],
      [TIMER_START_CHANNEL, { description: 'Focus' }],
      [TIMER_PAUSE_CHANNEL],
      [TIMER_RESUME_CHANNEL],
      [TIMER_STOP_CHANNEL],
    ]);
  });
});
