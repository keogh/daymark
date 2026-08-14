import type { AppStateRepository } from '@/main/database/repositories/app-state-repository';
import type { TaskRepository } from '@/main/database/repositories/task-repository';
import type { TimeIntervalRepository } from '@/main/database/repositories/time-interval-repository';
import type { TransactionRunner } from '@/main/database/transaction-runner';
import type { Clock } from '@/main/domain/clock';
import {
  InvalidPersistedTimerStateError,
  type TimerStateReader,
} from '@/main/services/timer-state-reader';
import type { AppResult } from '@/shared/contracts/app-result';
import type { TimerState } from '@/shared/contracts/timer';
import { validateStartTaskInput } from '@/shared/validation/task-description';

export interface TimerServiceDependencies {
  readonly appState: AppStateRepository;
  readonly tasks: TaskRepository;
  readonly intervals: TimeIntervalRepository;
  readonly transactions: TransactionRunner;
  readonly stateReader: TimerStateReader;
  readonly clock: Clock;
  readonly generateId: () => string;
}

export class TimerService {
  readonly #appState: AppStateRepository;
  readonly #tasks: TaskRepository;
  readonly #intervals: TimeIntervalRepository;
  readonly #transactions: TransactionRunner;
  readonly #stateReader: TimerStateReader;
  readonly #clock: Clock;
  readonly #generateId: () => string;

  constructor(dependencies: TimerServiceDependencies) {
    this.#appState = dependencies.appState;
    this.#tasks = dependencies.tasks;
    this.#intervals = dependencies.intervals;
    this.#transactions = dependencies.transactions;
    this.#stateReader = dependencies.stateReader;
    this.#clock = dependencies.clock;
    this.#generateId = dependencies.generateId;
  }

  start(input: unknown): AppResult<TimerState> {
    const validation = validateStartTaskInput(input);
    if (!validation.ok) {
      return validation;
    }

    const now = this.#clock.now();
    const transition = this.#transactions.run<AppResult<true>>(() => {
      const state = this.#appState.get();
      if (state.timerStatus !== 'idle') {
        return timerNotIdle();
      }

      const description = validation.value;
      const task =
        this.#tasks.findByNormalizedDescription(
          description.normalizedDescription,
        ) ??
        this.#tasks.insert({
          id: this.#generateId(),
          description: description.description,
          normalizedDescription: description.normalizedDescription,
          createdAt: now,
          updatedAt: now,
        });

      this.#intervals.insert({
        id: this.#generateId(),
        taskId: task.id,
        startedAt: now,
        endedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      this.#appState.update({
        id: 1,
        timerStatus: 'running',
        currentTaskId: task.id,
        sessionStartedAt: now,
        updatedAt: now,
      });

      return { ok: true, value: true };
    });

    if (!transition.ok) {
      return transition;
    }

    return { ok: true, value: this.#stateReader.getStateAt(now) };
  }

  pause(): AppResult<TimerState> {
    const now = this.#clock.now();
    const transition = this.#transactions.run<AppResult<true>>(() => {
      const state = this.#appState.get();
      if (state.timerStatus === 'idle') {
        return noActiveTimer();
      }
      if (state.timerStatus === 'paused') {
        return timerAlreadyPaused();
      }

      this.#stateReader.getStateAt(now);
      const openInterval = this.#intervals.findOpen();
      if (openInterval === undefined) {
        throw new InvalidPersistedTimerStateError(
          'Running timer has no open interval.',
        );
      }

      const closedInterval = this.#intervals.close(openInterval.id, now, now);
      if (closedInterval === undefined) {
        throw new InvalidPersistedTimerStateError(
          'Running timer interval could not be closed.',
        );
      }

      this.#appState.update({
        ...state,
        timerStatus: 'paused',
        updatedAt: now,
      });

      return { ok: true, value: true };
    });

    if (!transition.ok) {
      return transition;
    }

    return { ok: true, value: this.#stateReader.getStateAt(now) };
  }

  resume(): AppResult<TimerState> {
    const now = this.#clock.now();
    const transition = this.#transactions.run<AppResult<true>>(() => {
      const state = this.#appState.get();
      if (state.timerStatus === 'idle') {
        return noCurrentTask();
      }
      if (state.timerStatus === 'running') {
        return timerAlreadyRunning();
      }

      this.#stateReader.getStateAt(now);
      if (state.currentTaskId === null) {
        throw new InvalidPersistedTimerStateError(
          'Paused timer has no current task.',
        );
      }

      this.#intervals.insert({
        id: this.#generateId(),
        taskId: state.currentTaskId,
        startedAt: now,
        endedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      this.#appState.update({
        ...state,
        timerStatus: 'running',
        updatedAt: now,
      });

      return { ok: true, value: true };
    });

    if (!transition.ok) {
      return transition;
    }

    return { ok: true, value: this.#stateReader.getStateAt(now) };
  }
}

const timerNotIdle = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'TIMER_NOT_IDLE',
    message: 'The timer must be idle before starting a task.',
  },
});

const noActiveTimer = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'NO_ACTIVE_TIMER',
    message: 'There is no active timer to pause.',
  },
});

const timerAlreadyPaused = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'TIMER_ALREADY_PAUSED',
    message: 'The timer is already paused.',
  },
});

const noCurrentTask = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'NO_CURRENT_TASK',
    message: 'There is no current task to resume.',
  },
});

const timerAlreadyRunning = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'TIMER_ALREADY_RUNNING',
    message: 'The timer is already running.',
  },
});
