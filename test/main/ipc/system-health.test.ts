import { describe, expect, it, vi } from 'vitest';

import { registerSystemHealthHandler } from '@/main/ipc/system-health';
import { SYSTEM_HEALTH_CHECK_CHANNEL } from '@/shared/contracts/system-health';

describe('system health IPC handler', () => {
  it('registers the explicit channel and returns the service result', async () => {
    let handler: ((event: unknown) => unknown) | undefined;
    const handle = vi.fn(
      (_channel: string, listener: (event: unknown) => unknown): void => {
        handler = listener;
      },
    );
    const response = { status: 'ok', database: 'ready' } as const;

    registerSystemHealthHandler(
      { handle },
      { healthCheck: vi.fn(() => response) },
    );

    expect(handle).toHaveBeenCalledOnce();
    expect(handle).toHaveBeenCalledWith(
      SYSTEM_HEALTH_CHECK_CHANNEL,
      expect.any(Function),
    );

    expect(await handler?.({})).toEqual(response);
  });

  it('converts unexpected failures into a renderer-safe response', async () => {
    let handler: ((event: unknown) => unknown) | undefined;
    const handle = vi.fn(
      (_channel: string, listener: (event: unknown) => unknown): void => {
        handler = listener;
      },
    );

    registerSystemHealthHandler(
      { handle },
      {
        healthCheck: () => {
          throw new Error('/private/user/path: database details');
        },
      },
    );

    expect(await handler?.({})).toEqual({
      status: 'error',
      database: 'unavailable',
    });
  });
});
