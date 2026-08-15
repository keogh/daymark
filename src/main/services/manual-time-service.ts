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
import type { ManualIntervalCreateResult } from '@/shared/contracts/manual-time';
import { type CreateManualIntervalInput } from '@/shared/contracts/manual-time';
import {
  validateCreateManualIntervalInput,
  type ValidatedCreateManualIntervalInput,
} from '@/shared/validation/manual-time-input';

export interface ManualTimeServiceDependencies {
  readonly appState: AppStateRepository;
  readonly tasks: TaskRepository;
  readonly intervals: TimeIntervalRepository;
  readonly transactions: TransactionRunner;
  readonly stateReader: TimerStateReader;
  readonly clock: Clock;
  readonly generateId: () => string;
}

export class ManualTimeService {
  readonly #appState: AppStateRepository;
  readonly #tasks: TaskRepository;
  readonly #intervals: TimeIntervalRepository;
  readonly #transactions: TransactionRunner;
  readonly #stateReader: TimerStateReader;
  readonly #clock: Clock;
  readonly #generateId: () => string;

  constructor(dependencies: ManualTimeServiceDependencies) {
    this.#appState = dependencies.appState;
    this.#tasks = dependencies.tasks;
    this.#intervals = dependencies.intervals;
    this.#transactions = dependencies.transactions;
    this.#stateReader = dependencies.stateReader;
    this.#clock = dependencies.clock;
    this.#generateId = dependencies.generateId;
  }

  createInterval(
    input: CreateManualIntervalInput,
  ): AppResult<ManualIntervalCreateResult> {
    const validation = validateCreateManualIntervalInput(input);
    if (!validation.ok) {
      return validation;
    }

    try {
      return this.#transactions.run(() =>
        this.#createIntervalInTransaction(validation.value),
      );
    } catch (error: unknown) {
      if (error instanceof InvalidPersistedTimerStateError) {
        console.error(
          'Invalid persisted timer state during manual interval creation.',
          error,
        );
        return internalError();
      }

      throw error;
    }
  }

  #createIntervalInTransaction(
    input: ValidatedCreateManualIntervalInput,
  ): AppResult<ManualIntervalCreateResult> {
    const now = this.#clock.now();
    const stateBefore = this.#appState.get();
    this.#stateReader.getStateAt(now);

    const existingTask =
      input.taskSource === 'existing-task'
        ? this.#tasks.findById(input.taskId)
        : this.#tasks.findByNormalizedDescription(
            input.normalizedTaskDescription,
          );

    if (input.taskSource === 'existing-task' && existingTask === undefined) {
      return taskNotFound();
    }

    if (this.#hasClosedIntervalOverlap(input.startedAt, input.endedAt)) {
      return timeIntervalOverlap();
    }

    const openInterval = this.#intervals.findOpen();
    if (
      openInterval !== undefined &&
      hasOpenIntervalOverlap(openInterval.startedAt, now, input)
    ) {
      return timeIntervalOverlap();
    }

    const task = existingTask ?? this.#insertTaskFromDescription(input, now);

    const intervalId = this.#generateId();
    this.#intervals.insert({
      id: intervalId,
      taskId: task.id,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      createdAt: now,
      updatedAt: now,
    });

    const stateAfter = this.#appState.get();
    if (!sameAppState(stateBefore, stateAfter)) {
      throw new InvalidPersistedTimerStateError(
        'Manual interval creation mutated AppState.',
      );
    }

    return {
      ok: true,
      value: { intervalId },
    };
  }

  #hasClosedIntervalOverlap(startedAt: number, endedAt: number): boolean {
    return (
      this.#intervals.findOverlappingClosedRange(startedAt, endedAt).length > 0
    );
  }

  #insertTaskFromDescription(
    input: ValidatedCreateManualIntervalInput,
    now: number,
  ) {
    if (input.taskSource !== 'description') {
      throw new InvalidPersistedTimerStateError(
        'Missing manual-entry task description during task creation.',
      );
    }

    return this.#tasks.insert({
      id: this.#generateId(),
      description: input.taskDescription,
      normalizedDescription: input.normalizedTaskDescription,
      createdAt: now,
      updatedAt: now,
    });
  }
}

const sameAppState = (
  left: ReturnType<AppStateRepository['get']>,
  right: ReturnType<AppStateRepository['get']>,
): boolean =>
  left.timerStatus === right.timerStatus &&
  left.currentTaskId === right.currentTaskId &&
  left.sessionStartedAt === right.sessionStartedAt &&
  left.updatedAt === right.updatedAt;

const hasOpenIntervalOverlap = (
  openStartedAt: number,
  now: number,
  input: Pick<ValidatedCreateManualIntervalInput, 'startedAt' | 'endedAt'>,
): boolean => input.startedAt < now && input.endedAt > openStartedAt;

const taskNotFound = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'TASK_NOT_FOUND',
    message: 'The selected task no longer exists.',
  },
});

const timeIntervalOverlap = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'TIME_INTERVAL_OVERLAP',
    message: 'The proposed interval overlaps an existing interval.',
  },
});

const internalError = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
  },
});
