import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { startApplication } from '@/main/app/startup';
import { DatabaseLifecycle } from '@/main/database/lifecycle';

describe('application startup', () => {
  it('initializes the database before exposing services and the normal window', () => {
    const calls: string[] = [];

    const started = startApplication({
      initializeDatabase: () => calls.push('database'),
      registerApplicationServices: () => calls.push('services'),
      createNormalWindow: () => calls.push('window'),
      logInitializationFailure: vi.fn(),
      showInitializationFailure: vi.fn(),
      quitApplication: vi.fn(),
    });

    expect(started).toBe(true);
    expect(calls).toEqual(['database', 'services', 'window']);
  });

  it('logs a database failure, shows a safe message, and exits before readiness', () => {
    const technicalError = new Error(
      '/private/user/path: migration 0001 failed',
    );
    const logInitializationFailure = vi.fn();
    const showInitializationFailure = vi.fn();
    const quitApplication = vi.fn();
    const registerApplicationServices = vi.fn();
    const createNormalWindow = vi.fn();

    const started = startApplication({
      initializeDatabase: () => {
        throw technicalError;
      },
      registerApplicationServices,
      createNormalWindow,
      logInitializationFailure,
      showInitializationFailure,
      quitApplication,
    });

    expect(started).toBe(false);
    expect(logInitializationFailure).toHaveBeenCalledWith(technicalError);
    expect(showInitializationFailure).toHaveBeenCalledOnce();
    expect(showInitializationFailure).toHaveBeenCalledWith();
    expect(quitApplication).toHaveBeenCalledOnce();
    expect(registerApplicationServices).not.toHaveBeenCalled();
    expect(createNormalWindow).not.toHaveBeenCalled();
  });

  it('does not expose readiness when a controlled migration fails', async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(tmpdir(), 'time-tracker-startup-'),
    );
    const databaseLifecycle = new DatabaseLifecycle({
      databasePath: path.join(temporaryDirectory, 'time-tracker.sqlite'),
      migrationsFolder: path.join(temporaryDirectory, 'missing-migrations'),
    });
    const logInitializationFailure = vi.fn();
    const registerApplicationServices = vi.fn();
    const createNormalWindow = vi.fn();

    try {
      const started = startApplication({
        initializeDatabase: () => databaseLifecycle.initialize(),
        registerApplicationServices,
        createNormalWindow,
        logInitializationFailure,
        showInitializationFailure: vi.fn(),
        quitApplication: vi.fn(),
      });

      expect(started).toBe(false);
      expect(databaseLifecycle.isReady()).toBe(false);
      expect(logInitializationFailure).toHaveBeenCalledWith(expect.any(Error));
      expect(registerApplicationServices).not.toHaveBeenCalled();
      expect(createNormalWindow).not.toHaveBeenCalled();
    } finally {
      databaseLifecycle.close();
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
