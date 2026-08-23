import type { Clock } from '@/main/domain/clock';
import type { AppResult } from '@/shared/contracts/app-result';
import type { TimerState } from '@/shared/contracts/timer';
import { productIdentity } from '@/shared/product-identity';

import {
  applyTrayIdentity,
  type NativeTrayAdapter,
  type NativeTrayHandle,
  type NativeTrayMenuItem,
} from './native';
import {
  createTrayPresentation,
  type TrayCommand,
  type TrayMenuItem,
} from './presentation';

type TimerCommand = 'pause' | 'resume' | 'stop';

export interface TrayScheduler {
  everySecond(callback: () => void): unknown;
  cancel(handle: unknown): void;
}

export interface TrayTimerCommands {
  pause(): AppResult<TimerState> | Promise<AppResult<TimerState>>;
  resume(): AppResult<TimerState> | Promise<AppResult<TimerState>>;
  stop(): AppResult<TimerState> | Promise<AppResult<TimerState>>;
}

export interface TrayServiceDependencies {
  readonly native: NativeTrayAdapter;
  readonly scheduler: TrayScheduler;
  readonly clock: Clock;
  readonly commands: TrayTimerCommands;
  readonly readState: () => TimerState | Promise<TimerState>;
  readonly publishState: (state: TimerState) => void | Promise<void>;
  readonly openWindow: () => void;
  readonly handleDoubleClick?: () => void;
  readonly quitApplication: () => void;
  readonly showError: (message: string) => void;
  readonly logUnexpectedError: (message: string, error: unknown) => void;
}

export class SystemTrayService {
  readonly #dependencies: TrayServiceDependencies;
  #tray: NativeTrayHandle | undefined;
  #state: TimerState | undefined;
  #ticker: unknown;
  #pending = false;
  #disposed = false;

  constructor(dependencies: TrayServiceDependencies) {
    this.#dependencies = dependencies;
  }

  initialize(initialState: TimerState): void {
    if (this.#disposed) {
      throw new Error('Cannot initialize a disposed tray service.');
    }
    if (this.#tray !== undefined) {
      throw new Error('Tray service is already initialized.');
    }

    const tray = this.#dependencies.native.createTray();
    this.#tray = tray;
    this.#state = initialState;

    try {
      if (this.#dependencies.handleDoubleClick) {
        tray.onDoubleClick?.(this.#dependencies.handleDoubleClick);
      }
      this.#render();
      this.#reconcileTicker();
    } catch (error: unknown) {
      this.#stopTicker();
      tray.destroy();
      this.#tray = undefined;
      this.#state = undefined;
      throw error;
    }
  }

  synchronize(state: TimerState): void {
    if (this.#disposed || this.#tray === undefined) {
      return;
    }

    this.#state = state;
    this.#render();
    this.#reconcileTicker();
  }

  dispose(): void {
    if (this.#disposed) {
      return;
    }

    this.#disposed = true;
    this.#stopTicker();
    this.#tray?.destroy();
    this.#tray = undefined;
    this.#state = undefined;
  }

  #render(): void {
    if (this.#tray === undefined || this.#state === undefined) {
      return;
    }

    const presentation = createTrayPresentation(
      this.#state,
      this.#dependencies.clock,
    );
    const items = presentation.items.map((item) => this.#nativeItem(item));
    applyTrayIdentity(this.#tray, presentation);
    this.#tray.setContextMenu(this.#dependencies.native.buildMenu(items));
  }

  #nativeItem(item: TrayMenuItem): NativeTrayMenuItem {
    if (item.kind === 'separator') {
      return { type: 'separator' };
    }
    if (item.kind === 'information') {
      return { type: 'normal', label: item.label, enabled: false };
    }

    const timerCommand = isTimerCommand(item.command);
    return {
      type: 'normal',
      label: item.label,
      enabled: timerCommand ? !this.#pending : true,
      click: () => this.#handleCommand(item.command),
    };
  }

  #handleCommand(command: TrayCommand): void {
    if (command === 'open') {
      this.#dependencies.openWindow();
      return;
    }
    if (command === 'quit') {
      this.#dependencies.quitApplication();
      return;
    }
    if (this.#pending || this.#disposed || this.#tray === undefined) {
      return;
    }

    void this.#executeTimerCommand(command);
  }

  async #executeTimerCommand(command: TimerCommand): Promise<void> {
    this.#pending = true;
    this.#render();

    try {
      const result = await this.#dependencies.commands[command]();
      if (result.ok) {
        this.synchronize(result.value);
        if (!this.#disposed) {
          await this.#dependencies.publishState(result.value);
        }
        return;
      }

      await this.#reconcileFailure(command);
    } catch (error: unknown) {
      this.#dependencies.logUnexpectedError(
        `Unexpected tray ${command} command failure.`,
        error,
      );
      await this.#reconcileFailure(command);
    } finally {
      this.#pending = false;
      this.#render();
    }
  }

  async #reconcileFailure(command: TimerCommand): Promise<void> {
    try {
      const state = await this.#dependencies.readState();
      this.synchronize(state);
      if (!this.#disposed) {
        await this.#dependencies.publishState(state);
      }
    } catch (error: unknown) {
      this.#dependencies.logUnexpectedError(
        'Unexpected tray timer-state reconciliation failure.',
        error,
      );
    }

    if (!this.#disposed) {
      this.#dependencies.showError(errorMessage(command));
    }
  }

  #reconcileTicker(): void {
    if (this.#state?.status === 'running') {
      if (this.#ticker === undefined) {
        this.#ticker = this.#dependencies.scheduler.everySecond(() => {
          if (!this.#disposed && this.#state?.status === 'running') {
            this.#render();
          }
        });
      }
      return;
    }

    this.#stopTicker();
  }

  #stopTicker(): void {
    if (this.#ticker !== undefined) {
      this.#dependencies.scheduler.cancel(this.#ticker);
      this.#ticker = undefined;
    }
  }
}

export class IntervalTrayScheduler implements TrayScheduler {
  everySecond(callback: () => void): unknown {
    return setInterval(callback, 1_000);
  }

  cancel(handle: unknown): void {
    clearInterval(handle as ReturnType<typeof setInterval>);
  }
}

const isTimerCommand = (command: TrayCommand): command is TimerCommand =>
  command === 'pause' || command === 'resume' || command === 'stop';

const errorMessage = (command: TimerCommand): string =>
  `${productIdentity.displayName} could not ${command} the timer. Open ${productIdentity.displayName} to review its current state.`;
