import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SYSTEM_HEALTH_CHECK_CHANNEL } from '@/shared/contracts/system-health';
import type { TimeTrackerAPI } from '@/shared/contracts/system-health';

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

  it('exposes only the typed health-check API over the explicit channel', async () => {
    const response = { status: 'ok', database: 'ready' } as const;
    electronMocks.invoke.mockResolvedValue(response);

    await import('@/preload/index');

    expect(electronMocks.exposeInMainWorld).toHaveBeenCalledOnce();
    const api = electronMocks.exposedApi;
    expect(api).toBeDefined();
    if (api === undefined) {
      throw new Error('Preload API was not exposed.');
    }
    expect(Object.keys(api)).toEqual(['system']);
    await expect(api.system.healthCheck()).resolves.toEqual(response);
    expect(electronMocks.invoke).toHaveBeenCalledWith(
      SYSTEM_HEALTH_CHECK_CHANNEL,
    );
  });
});
