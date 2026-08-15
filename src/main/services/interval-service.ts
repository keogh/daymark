import type { AppStateRepository } from '@/main/database/repositories/app-state-repository';
import type { TimeIntervalRepository } from '@/main/database/repositories/time-interval-repository';
import type { TransactionRunner } from '@/main/database/transaction-runner';
import type { Clock } from '@/main/domain/clock';
import type { TimeInterval } from '@/main/domain/time-interval';
import {
  InvalidPersistedTimerStateError,
  type TimerStateReader,
} from '@/main/services/timer-state-reader';
import type { AppResult } from '@/shared/contracts/app-result';
import type {
  IntervalMutationResult,
  UpdateIntervalInput,
} from '@/shared/contracts/intervals';
import { validateUpdateIntervalInput } from '@/shared/validation/interval-correction-input';

export interface IntervalServiceDependencies {
  readonly appState: AppStateRepository;
  readonly intervals: TimeIntervalRepository;
  readonly transactions: TransactionRunner;
  readonly stateReader: TimerStateReader;
  readonly clock: Clock;
}

export class IntervalService {
  readonly #appState: AppStateRepository;
  readonly #intervals: TimeIntervalRepository;
  readonly #transactions: TransactionRunner;
  readonly #stateReader: TimerStateReader;
  readonly #clock: Clock;

  constructor(dependencies: IntervalServiceDependencies) {
    this.#appState = dependencies.appState;
    this.#intervals = dependencies.intervals;
    this.#transactions = dependencies.transactions;
    this.#stateReader = dependencies.stateReader;
    this.#clock = dependencies.clock;
  }

  update(input: UpdateIntervalInput): AppResult<IntervalMutationResult> {
    const validation = validateUpdateIntervalInput(input);
    if (!validation.ok) {
      return validation;
    }

    try {
      return this.#transactions.run(() => this.#updateInTransaction(input));
    } catch (error: unknown) {
      console.error('Interval update failed.', error);
      return internalError();
    }
  }

  #updateInTransaction(
    input: UpdateIntervalInput,
  ): AppResult<IntervalMutationResult> {
    const validation = validateUpdateIntervalInput(input);
    if (!validation.ok) {
      return validation;
    }
    const command = validation.value;

    const target = this.#intervals.findById(command.intervalId);
    if (target === undefined) {
      return intervalNotFound();
    }
    if (target.endedAt === null) {
      return openIntervalNotEditable();
    }

    const now = this.#clock.now();
    const stateBefore = this.#appState.get();
    const openBefore = this.#intervals.findOpen();
    this.#stateReader.getStateAt(now);

    if (
      this.#intervals.findOverlappingClosedRangeExcluding(
        target.id,
        command.startedAt,
        command.endedAt,
      ).length > 0 ||
      overlapsOpenInterval(openBefore, now, command)
    ) {
      return timeIntervalOverlap();
    }

    const updated = this.#intervals.updateClosed(
      target.id,
      command.startedAt,
      command.endedAt,
      now,
    );
    if (updated === undefined || updated.taskId !== target.taskId) {
      throw new InvalidPersistedTimerStateError(
        'Closed interval changed before its update completed.',
      );
    }

    const stateAfter = this.#appState.get();
    const openAfter = this.#intervals.findOpen();
    if (
      !sameAppState(stateBefore, stateAfter) ||
      !sameOptionalInterval(openBefore, openAfter)
    ) {
      throw new InvalidPersistedTimerStateError(
        'Interval update mutated authoritative timer state.',
      );
    }

    return { ok: true, value: { intervalId: updated.id } };
  }
}

const overlapsOpenInterval = (
  openInterval: TimeInterval | undefined,
  now: number,
  input: { readonly startedAt: number; readonly endedAt: number },
): boolean =>
  openInterval !== undefined &&
  input.startedAt < now &&
  input.endedAt > openInterval.startedAt;

const sameAppState = (
  left: ReturnType<AppStateRepository['get']>,
  right: ReturnType<AppStateRepository['get']>,
): boolean =>
  left.timerStatus === right.timerStatus &&
  left.currentTaskId === right.currentTaskId &&
  left.sessionStartedAt === right.sessionStartedAt &&
  left.updatedAt === right.updatedAt;

const sameOptionalInterval = (
  left: TimeInterval | undefined,
  right: TimeInterval | undefined,
): boolean =>
  left === undefined
    ? right === undefined
    : right !== undefined &&
      left.id === right.id &&
      left.taskId === right.taskId &&
      left.startedAt === right.startedAt &&
      left.endedAt === right.endedAt &&
      left.createdAt === right.createdAt &&
      left.updatedAt === right.updatedAt;

const intervalNotFound = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'TIME_INTERVAL_NOT_FOUND',
    message: 'The selected interval no longer exists.',
  },
});

const openIntervalNotEditable = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'OPEN_INTERVAL_NOT_EDITABLE',
    message: 'A running interval cannot be edited.',
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
