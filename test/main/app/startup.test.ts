import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { startApplication } from '@/main/app/startup';
import { DatabaseLifecycle } from '@/main/database/lifecycle';
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

describe('application startup', () => {
  it('initializes the database before exposing services and the normal window', () => {
    const calls: string[] = [];

    const started = startApplication({
      initializeDatabase: () => calls.push('database'),
      initializeApplicationServices: () => calls.push('services'),
      readInitialTimerState: () => {
        calls.push('state');
        return idleState;
      },
      initializeTray: (state) => {
        expect(state).toBe(idleState);
        calls.push('tray');
      },
      createNormalWindow: () => calls.push('window'),
      cleanupAfterFailure: vi.fn(),
      logInitializationFailure: vi.fn(),
      showInitializationFailure: vi.fn(),
      quitApplication: vi.fn(),
    });

    expect(started).toBe(true);
    expect(calls).toEqual(['database', 'services', 'state', 'tray', 'window']);
  });

  it('logs a database failure, shows a safe message, and exits before readiness', () => {
    const technicalError = new Error(
      '/private/user/path: migration 0001 failed',
    );
    const logInitializationFailure = vi.fn();
    const showInitializationFailure = vi.fn();
    const quitApplication = vi.fn();
    const initializeApplicationServices = vi.fn();
    const createNormalWindow = vi.fn();

    const started = startApplication({
      initializeDatabase: () => {
        throw technicalError;
      },
      initializeApplicationServices,
      readInitialTimerState: vi.fn(() => idleState),
      initializeTray: vi.fn(),
      createNormalWindow,
      cleanupAfterFailure: vi.fn(),
      logInitializationFailure,
      showInitializationFailure,
      quitApplication,
    });

    expect(started).toBe(false);
    expect(logInitializationFailure).toHaveBeenCalledWith(technicalError);
    expect(showInitializationFailure).toHaveBeenCalledOnce();
    expect(showInitializationFailure).toHaveBeenCalledWith();
    expect(quitApplication).toHaveBeenCalledOnce();
    expect(initializeApplicationServices).not.toHaveBeenCalled();
    expect(createNormalWindow).not.toHaveBeenCalled();
  });

  it('does not expose readiness when a controlled migration fails', async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(tmpdir(), 'daymark-startup-'),
    );
    const databaseLifecycle = new DatabaseLifecycle({
      databasePath: path.join(temporaryDirectory, 'daymark.sqlite'),
      migrationsFolder: path.join(temporaryDirectory, 'missing-migrations'),
    });
    const logInitializationFailure = vi.fn();
    const initializeApplicationServices = vi.fn();
    const createNormalWindow = vi.fn();

    try {
      const started = startApplication({
        initializeDatabase: () => databaseLifecycle.initialize(),
        initializeApplicationServices,
        readInitialTimerState: vi.fn(() => idleState),
        initializeTray: vi.fn(),
        createNormalWindow,
        cleanupAfterFailure: vi.fn(),
        logInitializationFailure,
        showInitializationFailure: vi.fn(),
        quitApplication: vi.fn(),
      });

      expect(started).toBe(false);
      expect(databaseLifecycle.isReady()).toBe(false);
      expect(logInitializationFailure).toHaveBeenCalledWith(expect.any(Error));
      expect(initializeApplicationServices).not.toHaveBeenCalled();
      expect(createNormalWindow).not.toHaveBeenCalled();
    } finally {
      databaseLifecycle.close();
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it('cleans partial resources and exits when tray initialization fails before creating a window', () => {
    const calls: string[] = [];
    const technicalError = new Error('tray icon could not be loaded');

    const started = startApplication({
      initializeDatabase: () => calls.push('database'),
      initializeApplicationServices: () => calls.push('services'),
      readInitialTimerState: () => {
        calls.push('state');
        return idleState;
      },
      initializeTray: () => {
        calls.push('tray');
        throw technicalError;
      },
      createNormalWindow: () => calls.push('window'),
      logInitializationFailure: (error) => {
        expect(error).toBe(technicalError);
        calls.push('log');
      },
      showInitializationFailure: () => calls.push('feedback'),
      cleanupAfterFailure: () => calls.push('cleanup'),
      quitApplication: () => calls.push('quit'),
    });

    expect(started).toBe(false);
    expect(calls).toEqual([
      'database',
      'services',
      'state',
      'tray',
      'log',
      'feedback',
      'cleanup',
      'quit',
    ]);
  });
});
