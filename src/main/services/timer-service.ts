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
import { validateSwitchToTaskInput } from '@/shared/validation/switch-to-task';
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
    const startInput = validation.value;

    const now = this.#clock.now();
    const transition = this.#transactions.run<AppResult<true>>(() => {
      const state = this.#appState.get();
      if (state.timerStatus !== 'idle') {
        return timerNotIdle();
      }

      const task =
        startInput.source === 'existing-task'
          ? this.#tasks.findById(startInput.taskId)
          : (this.#tasks.findByNormalizedDescription(
              startInput.normalizedDescription,
            ) ??
            this.#tasks.insert({
              id: this.#generateId(),
              description: startInput.description,
              normalizedDescription: startInput.normalizedDescription,
              createdAt: now,
              updatedAt: now,
            }));

      if (task === undefined) {
        return taskNotFound();
      }

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

  switchToTask(input: unknown): AppResult<TimerState> {
    const validation = validateSwitchToTaskInput(input);
    if (!validation.ok) {
      return validation;
    }

    try {
      const transition = this.#transactions.run<SwitchTransition>(() => {
        const state = this.#appState.get();
        const task = this.#tasks.findById(validation.value.taskId);
        if (task === undefined) {
          return { ok: false, result: taskNotFound() };
        }

        if (state.timerStatus === 'idle') {
          const now = this.#clock.now();
          this.#stateReader.getStateAt(now);
          this.#startTaskSession(task.id, now);

          return { ok: true, now };
        }

        if (state.timerStatus === 'running') {
          const now = this.#clock.now();
          const currentState = this.#stateReader.getStateAt(now);
          if (currentState.currentTask?.id === task.id) {
            return { ok: true, now };
          }

          const sessionStartedAt = currentState.sessionStartedAt;
          if (sessionStartedAt === null) {
            throw new InvalidPersistedTimerStateError(
              'Running timer has no session start.',
            );
          }

          this.#closeOpenInterval(now);
          this.#appState.update({
            ...state,
            timerStatus: 'running',
            currentTaskId: task.id,
            sessionStartedAt,
            updatedAt: now,
          });
          this.#insertOpenInterval(task.id, now);

          return { ok: true, now };
        }

        const now = this.#clock.now();
        const currentState = this.#stateReader.getStateAt(now);
        if (currentState.currentTask?.id === task.id) {
          this.#insertOpenInterval(task.id, now);
          this.#appState.update({
            ...state,
            timerStatus: 'running',
            updatedAt: now,
          });

          return { ok: true, now };
        }

        this.#appState.update({
          ...state,
          timerStatus: 'running',
          currentTaskId: task.id,
          sessionStartedAt: now,
          updatedAt: now,
        });
        this.#insertOpenInterval(task.id, now);

        return { ok: true, now };
      });

      if (!transition.ok) {
        return transition.result;
      }

      return { ok: true, value: this.#stateReader.getStateAt(transition.now) };
    } catch (error: unknown) {
      if (error instanceof InvalidPersistedTimerStateError) {
        console.error('Invalid persisted timer state during task switch.', error);
        return internalError();
      }

      throw error;
    }
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

  stop(): AppResult<TimerState> {
    const now = this.#clock.now();
    this.#transactions.run(() => {
      const state = this.#appState.get();
      if (state.timerStatus === 'idle') {
        return;
      }

      this.#stateReader.getStateAt(now);
      if (state.timerStatus === 'running') {
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
      }

      this.#appState.update({
        id: 1,
        timerStatus: 'idle',
        currentTaskId: null,
        sessionStartedAt: null,
        updatedAt: now,
      });
    });

    return { ok: true, value: this.#stateReader.getStateAt(now) };
  }

  #startTaskSession(taskId: string, now: number): void {
    this.#insertOpenInterval(taskId, now);
    this.#appState.update({
      id: 1,
      timerStatus: 'running',
      currentTaskId: taskId,
      sessionStartedAt: now,
      updatedAt: now,
    });
  }

  #insertOpenInterval(taskId: string, now: number): void {
    this.#intervals.insert({
      id: this.#generateId(),
      taskId,
      startedAt: now,
      endedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  #closeOpenInterval(now: number): void {
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
  }
}

type SwitchTransition =
  | { readonly ok: true; readonly now: number }
  | { readonly ok: false; readonly result: AppResult<never> };

const timerNotIdle = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'TIMER_NOT_IDLE',
    message: 'The timer must be idle before starting a task.',
  },
});

const taskNotFound = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'TASK_NOT_FOUND',
    message: 'The selected task no longer exists.',
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

const internalError = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
  },
});

const timerAlreadyRunning = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'TIMER_ALREADY_RUNNING',
    message: 'The timer is already running.',
  },
});
