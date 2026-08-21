import { describe, expect, it, vi } from 'vitest';

import type { NativeTrayHandle, NativeTrayMenuItem } from '@/main/tray/native';
import {
  SystemTrayService,
  type TrayScheduler,
  type TrayServiceDependencies,
} from '@/main/tray/service';
import type { AppResult } from '@/shared/contracts/app-result';
import type { TimerState } from '@/shared/contracts/timer';

import { FakeClock } from '../domain/support/fake-clock';

describe('SystemTrayService', () => {
  it('initializes one authoritative tray and rejects duplicate initialization', () => {
    const fixture = createFixture();

    fixture.service.initialize(runningState());

    expect(fixture.native.createCount).toBe(1);
    expect(labels(fixture.native.currentMenu)).toEqual([
      'Time Tracker',
      'Focused work',
      '00:00:10',
      'Pause',
      'Stop',
      'Open Time Tracker',
      'Quit',
    ]);
    expect(fixture.scheduler.activeCount).toBe(1);
    expect(() => fixture.service.initialize(idleState())).toThrow(
      'already initialized',
    );
  });

  it('keeps one ticker across running snapshots and updates duration locally', () => {
    const fixture = createFixture();
    fixture.service.initialize(runningState());

    fixture.clock.advance(2_000);
    fixture.scheduler.tick();
    expect(labels(fixture.native.currentMenu)).toContain('00:00:12');
    expect(fixture.dependencies.readState).not.toHaveBeenCalled();
    expect(fixture.dependencies.publishState).not.toHaveBeenCalled();

    fixture.service.synchronize(runningState({ now: 2_000 }));
    expect(fixture.scheduler.createdCount).toBe(1);
    expect(fixture.scheduler.activeCount).toBe(1);

    fixture.service.synchronize(pausedState());
    expect(fixture.scheduler.activeCount).toBe(0);
  });

  it('executes one pending command, disables timer actions, and publishes success', async () => {
    const fixture = createFixture();
    const pending = deferred<AppResult<TimerState>>();
    const pause = vi.fn(() => pending.promise);
    fixture.dependencies.commands.pause = pause;
    fixture.service.initialize(runningState());

    click(fixture.native.currentMenu, 'Pause');
    expect(item(fixture.native.currentMenu, 'Pause').enabled).toBe(false);
    expect(item(fixture.native.currentMenu, 'Stop').enabled).toBe(false);
    click(fixture.native.currentMenu, 'Stop');
    expect(fixture.stopCommand.mock.calls).toHaveLength(0);

    pending.resolve({ ok: true, value: pausedState() });
    await settle();

    expect(pause.mock.calls).toHaveLength(1);
    expect(fixture.dependencies.publishState).toHaveBeenCalledWith(
      pausedState(),
    );
    expect(labels(fixture.native.currentMenu)).toContain('Resume');
    expect(item(fixture.native.currentMenu, 'Resume').enabled).toBe(true);
    expect(fixture.scheduler.activeCount).toBe(0);
  });

  it('reconciles a controlled failure without technical logging', async () => {
    const fixture = createFixture();
    fixture.dependencies.commands.pause = vi.fn((): AppResult<TimerState> => ({
      ok: false,
      error: { code: 'NO_ACTIVE_TIMER', message: 'controlled' },
    }));
    fixture.readState.mockImplementation(() => idleState());
    fixture.service.initialize(runningState());

    click(fixture.native.currentMenu, 'Pause');
    await settle();

    expect(fixture.dependencies.readState).toHaveBeenCalledTimes(1);
    expect(fixture.dependencies.publishState).toHaveBeenCalledWith(idleState());
    expect(fixture.dependencies.showError).toHaveBeenCalledWith(
      'Time Tracker could not pause the timer. Open Time Tracker to review its current state.',
    );
    expect(fixture.dependencies.logUnexpectedError).not.toHaveBeenCalled();
    expect(labels(fixture.native.currentMenu)).toContain('No active timer');
  });

  it('logs only sanitized context and remains actionable when command and reread throw', async () => {
    const fixture = createFixture();
    fixture.dependencies.commands.stop = vi.fn(() => {
      throw new Error('private task and /database/path');
    });
    fixture.readState.mockImplementation(() => {
      throw new Error('SQL details');
    });
    fixture.service.initialize(runningState());

    click(fixture.native.currentMenu, 'Stop');
    await settle();

    expect(fixture.dependencies.logUnexpectedError).toHaveBeenNthCalledWith(
      1,
      'Unexpected tray stop command failure.',
      expect.any(Error),
    );
    expect(fixture.dependencies.logUnexpectedError).toHaveBeenNthCalledWith(
      2,
      'Unexpected tray timer-state reconciliation failure.',
      expect.any(Error),
    );
    expect(fixture.dependencies.showError).toHaveBeenCalledWith(
      'Time Tracker could not stop the timer. Open Time Tracker to review its current state.',
    );
    expect(item(fixture.native.currentMenu, 'Stop').enabled).toBe(true);
  });

  it('disposes the tray and ticker once and ignores later synchronization', () => {
    const fixture = createFixture();
    fixture.service.initialize(runningState());

    fixture.service.dispose();
    fixture.service.dispose();
    fixture.service.synchronize(pausedState());

    expect(fixture.native.destroy.mock.calls).toHaveLength(1);
    expect(fixture.scheduler.activeCount).toBe(0);
    expect(fixture.scheduler.cancelCount).toBe(1);
  });

  it('destroys a partially initialized tray when native menu creation fails', () => {
    const fixture = createFixture();
    fixture.native.buildMenu = vi.fn(() => {
      throw new Error('menu failed');
    });

    expect(() => fixture.service.initialize(idleState())).toThrow(
      'menu failed',
    );
    expect(fixture.native.destroy.mock.calls).toHaveLength(1);
  });
});

class FakeNativeAdapter {
  createCount = 0;
  currentMenu: readonly NativeTrayMenuItem[] = [];
  readonly destroy = vi.fn();
  readonly tray: NativeTrayHandle = {
    setContextMenu: (menu) => {
      this.currentMenu = menu as readonly NativeTrayMenuItem[];
    },
    setTitle: vi.fn(),
    setToolTip: vi.fn(),
    destroy: this.destroy,
  };

  createTray(): NativeTrayHandle {
    this.createCount += 1;
    return this.tray;
  }

  buildMenu(items: readonly NativeTrayMenuItem[]): unknown {
    return items;
  }
}

class FakeScheduler implements TrayScheduler {
  createdCount = 0;
  cancelCount = 0;
  #callbacks = new Map<object, () => void>();

  get activeCount(): number {
    return this.#callbacks.size;
  }

  everySecond(callback: () => void): unknown {
    const handle = {};
    this.createdCount += 1;
    this.#callbacks.set(handle, callback);
    return handle;
  }

  cancel(handle: unknown): void {
    this.cancelCount += 1;
    this.#callbacks.delete(handle as object);
  }

  tick(): void {
    for (const callback of this.#callbacks.values()) {
      callback();
    }
  }
}

const createFixture = () => {
  const native = new FakeNativeAdapter();
  const scheduler = new FakeScheduler();
  const clock = new FakeClock(2_000);
  const readState = vi.fn((): TimerState => runningState());
  const stopCommand = vi.fn((): AppResult<TimerState> => ({
    ok: true,
    value: idleState(),
  }));
  const dependencies: TrayServiceDependencies = {
    native,
    scheduler,
    clock,
    commands: {
      pause: vi.fn((): AppResult<TimerState> => ({
        ok: true,
        value: pausedState(),
      })),
      resume: vi.fn((): AppResult<TimerState> => ({
        ok: true,
        value: runningState(),
      })),
      stop: stopCommand,
    },
    readState,
    publishState: vi.fn(),
    openWindow: vi.fn(),
    quitApplication: vi.fn(),
    showError: vi.fn(),
    logUnexpectedError: vi.fn(),
  };

  return {
    native,
    scheduler,
    clock,
    readState,
    stopCommand,
    dependencies,
    service: new SystemTrayService(dependencies),
  };
};

const runningState = (changes: Partial<TimerState> = {}): TimerState => ({
  status: 'running',
  currentTask: { id: 'task-1', description: 'Focused work' },
  sessionStartedAt: 0,
  sessionDurationMs: 10_000,
  taskTodayDurationMs: 10_000,
  taskLifetimeDurationMs: 10_000,
  activeIntervalStartedAt: 0,
  now: 2_000,
  ...changes,
});

const pausedState = (): TimerState => ({
  ...runningState(),
  status: 'paused',
  activeIntervalStartedAt: null,
});

const idleState = (): TimerState => ({
  status: 'idle',
  currentTask: null,
  sessionStartedAt: null,
  sessionDurationMs: 0,
  taskTodayDurationMs: 0,
  taskLifetimeDurationMs: 0,
  activeIntervalStartedAt: null,
  now: 2_000,
});

const labels = (items: readonly NativeTrayMenuItem[]): string[] =>
  items.flatMap((entry) => (entry.label === undefined ? [] : [entry.label]));

const item = (
  items: readonly NativeTrayMenuItem[],
  label: string,
): NativeTrayMenuItem => {
  const found = items.find((entry) => entry.label === label);
  if (found === undefined) {
    throw new Error(`Missing menu item: ${label}`);
  }
  return found;
};

const click = (items: readonly NativeTrayMenuItem[], label: string): void => {
  item(items, label).click?.();
};

const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};
