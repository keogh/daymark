import type { AppResult } from '@/shared/contracts/app-result';
import type { TimerState } from '@/shared/contracts/timer';

export interface TimerPresentationSynchronizationDependencies {
  readonly synchronizeTray: (state: TimerState) => void;
  readonly publishState: (state: TimerState) => void;
  readonly readState: () => TimerState;
}

export class TimerPresentationSynchronization {
  constructor(
    private readonly dependencies: TimerPresentationSynchronizationDependencies,
  ) {}

  synchronizeTimerResult(result: AppResult<TimerState>): AppResult<TimerState> {
    if (result.ok) {
      this.synchronize(result.value);
    }
    return result;
  }

  refreshAfter<T>(result: AppResult<T>): AppResult<T> {
    if (result.ok) {
      this.synchronize(this.dependencies.readState());
    }
    return result;
  }

  synchronize(state: TimerState): void {
    this.dependencies.synchronizeTray(state);
    this.dependencies.publishState(state);
  }
}
