import { describe, expect, it, vi } from 'vitest';

import {
  ApplicationShutdown,
  registerApplicationShutdownEvents,
} from '@/main/app/shutdown';

describe('application shutdown', () => {
  it('marks quitting before cleanup and asks Electron to quit exactly once', () => {
    const calls: string[] = [];
    const quitApplication = vi.fn(() => calls.push('quit'));
    const shutdown = new ApplicationShutdown({ quitApplication });
    shutdown.addCleanupHook(() => {
      expect(shutdown.isQuitting()).toBe(true);
      calls.push('database');
    });
    shutdown.addCleanupHook(() => calls.push('window'));

    shutdown.requestQuit();
    shutdown.requestQuit();

    expect(calls).toEqual(['window', 'database', 'quit']);
    expect(quitApplication).toHaveBeenCalledOnce();
  });

  it('uses the same idempotent cleanup path for operating-system shutdown', () => {
    const cleanup = vi.fn();
    const quitApplication = vi.fn();
    const shutdown = new ApplicationShutdown({ quitApplication });
    shutdown.addCleanupHook(cleanup);

    shutdown.handleApplicationShutdown();
    shutdown.handleApplicationShutdown();
    shutdown.requestQuit();

    expect(shutdown.isQuitting()).toBe(true);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(quitApplication).not.toHaveBeenCalled();
  });

  it('marks shutdown before Electron closes windows during a native quit', () => {
    const listeners = new Map<string, () => void>();
    const cleanup = vi.fn();
    const shutdown = new ApplicationShutdown({ quitApplication: vi.fn() });
    shutdown.addCleanupHook(cleanup);
    registerApplicationShutdownEvents(
      {
        on: (event, listener) => listeners.set(event, listener),
      },
      shutdown,
    );

    listeners.get('before-quit')?.();
    const shouldHideWindow = !shutdown.isQuitting();
    listeners.get('will-quit')?.();

    expect(shouldHideWindow).toBe(false);
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('continues cleanup after one resource fails and reports only technical failure', () => {
    const cleanupAfterFailure = vi.fn();
    const technicalError = new Error('native resource disposal failed');
    const logCleanupFailure = vi.fn();
    const shutdown = new ApplicationShutdown({
      quitApplication: vi.fn(),
      logCleanupFailure,
    });
    shutdown.addCleanupHook(cleanupAfterFailure);
    shutdown.addCleanupHook(() => {
      throw technicalError;
    });

    shutdown.handleApplicationShutdown();

    expect(logCleanupFailure).toHaveBeenCalledWith(technicalError);
    expect(cleanupAfterFailure).toHaveBeenCalledOnce();
  });

  it('runs a cleanup hook immediately when registered after shutdown', () => {
    const shutdown = new ApplicationShutdown({ quitApplication: vi.fn() });
    const lateCleanup = vi.fn();
    shutdown.handleApplicationShutdown();

    shutdown.addCleanupHook(lateCleanup);

    expect(lateCleanup).toHaveBeenCalledOnce();
  });
});
