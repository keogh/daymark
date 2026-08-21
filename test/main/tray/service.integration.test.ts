import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppStateRepository } from '@/main/database/repositories/app-state-repository';
import { TaskRepository } from '@/main/database/repositories/task-repository';
import { TimeIntervalRepository } from '@/main/database/repositories/time-interval-repository';
import { TransactionRunner } from '@/main/database/transaction-runner';
import { DurationProjector } from '@/main/services/duration-projections';
import { TimerService } from '@/main/services/timer-service';
import { TimerStateReader } from '@/main/services/timer-state-reader';
import type { NativeTrayHandle, NativeTrayMenuItem } from '@/main/tray/native';
import { SystemTrayService, type TrayScheduler } from '@/main/tray/service';
import type { TimerState } from '@/shared/contracts/timer';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../database/support/disposable-database';
import { FakeClock } from '../domain/support/fake-clock';

describe('SystemTrayService SQLite integration', () => {
  let fixture: DisposableDatabase;

  beforeEach(async () => {
    fixture = await createDisposableDatabase();
  });

  afterEach(async () => {
    await fixture.dispose();
  });

  it('persists authoritative pause, resume, and stop transitions from native menu actions', async () => {
    const clock = new FakeClock(1_000);
    const context = fixture.lifecycle.initialize();
    const appState = new AppStateRepository(context.db);
    const tasks = new TaskRepository(context.db);
    const intervals = new TimeIntervalRepository(context.db);
    const reader = new TimerStateReader({
      appState,
      tasks,
      intervals,
      durations: new DurationProjector(intervals),
      clock,
    });
    let nextId = 1;
    const timer = new TimerService({
      appState,
      tasks,
      intervals,
      transactions: new TransactionRunner(context.sqlite),
      stateReader: reader,
      clock,
      generateId: () => `tray-integration-${nextId++}`,
    });
    const started = timer.start({
      source: 'description',
      description: 'Tray persisted task',
    });
    if (!started.ok) {
      throw new Error('Timer start failed in integration fixture.');
    }

    const native = new IntegrationNativeAdapter();
    const published: TimerState[] = [];
    const tray = new SystemTrayService({
      native,
      scheduler: new IntegrationScheduler(),
      clock,
      commands: timer,
      readState: () => reader.getState(),
      publishState: (state) => {
        published.push(state);
      },
      openWindow: vi.fn(),
      quitApplication: vi.fn(),
      showError: vi.fn(),
      logUnexpectedError: vi.fn(),
    });
    tray.initialize(started.value);

    clock.advance(5_000);
    click(native.menu, 'Pause');
    await settle();
    expect(appState.get().timerStatus).toBe('paused');
    expect(intervals.findOpen()).toBeUndefined();
    expect(published.at(-1)).toMatchObject({
      status: 'paused',
      sessionDurationMs: 5_000,
    });

    clock.advance(2_000);
    click(native.menu, 'Resume');
    await settle();
    expect(appState.get().timerStatus).toBe('running');
    expect(intervals.findOpen()?.startedAt).toBe(8_000);

    clock.advance(3_000);
    click(native.menu, 'Stop');
    await settle();
    expect(appState.get()).toMatchObject({
      timerStatus: 'idle',
      currentTaskId: null,
      sessionStartedAt: null,
    });
    expect(intervals.findOpen()).toBeUndefined();
    expect(intervals.findByTask(started.value.currentTask?.id ?? '')).toEqual([
      expect.objectContaining({ startedAt: 1_000, endedAt: 6_000 }),
      expect.objectContaining({ startedAt: 8_000, endedAt: 11_000 }),
    ]);
    expect(published.map((state) => state.status)).toEqual([
      'paused',
      'running',
      'idle',
    ]);

    tray.dispose();
  });
});

class IntegrationNativeAdapter {
  menu: readonly NativeTrayMenuItem[] = [];
  readonly #tray: NativeTrayHandle = {
    setContextMenu: (menu) => {
      this.menu = menu as readonly NativeTrayMenuItem[];
    },
    setTitle: () => undefined,
    setToolTip: () => undefined,
    destroy: () => undefined,
  };

  createTray(): NativeTrayHandle {
    return this.#tray;
  }

  buildMenu(items: readonly NativeTrayMenuItem[]): unknown {
    return items;
  }
}

class IntegrationScheduler implements TrayScheduler {
  everySecond(): unknown {
    return {};
  }

  cancel(): void {}
}

const click = (items: readonly NativeTrayMenuItem[], label: string): void => {
  const entry = items.find((item) => item.label === label);
  if (entry?.click === undefined) {
    throw new Error(`Missing tray action: ${label}`);
  }
  entry.click();
};

const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
