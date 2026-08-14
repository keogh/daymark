import type { AppStateRepository } from '@/main/database/repositories/app-state-repository';
import type { TaskRepository } from '@/main/database/repositories/task-repository';
import type { TimeIntervalRepository } from '@/main/database/repositories/time-interval-repository';
import type { Clock } from '@/main/domain/clock';
import type { AppState } from '@/main/domain/app-state';
import type { Task } from '@/main/domain/task';
import type { TimeInterval } from '@/main/domain/time-interval';
import type { DurationProjector } from '@/main/services/duration-projections';
import type { TimerState } from '@/shared/contracts/timer';

export class InvalidPersistedTimerStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPersistedTimerStateError';
  }
}

export interface TimerStateReaderDependencies {
  readonly appState: AppStateRepository;
  readonly tasks: TaskRepository;
  readonly intervals: TimeIntervalRepository;
  readonly durations: DurationProjector;
  readonly clock: Clock;
}

export class TimerStateReader {
  readonly #appState: AppStateRepository;
  readonly #tasks: TaskRepository;
  readonly #intervals: TimeIntervalRepository;
  readonly #durations: DurationProjector;
  readonly #clock: Clock;

  constructor(dependencies: TimerStateReaderDependencies) {
    this.#appState = dependencies.appState;
    this.#tasks = dependencies.tasks;
    this.#intervals = dependencies.intervals;
    this.#durations = dependencies.durations;
    this.#clock = dependencies.clock;
  }

  getState(): TimerState {
    return this.getStateAt(this.#clock.now());
  }

  getStateAt(now: number): TimerState {
    const state = this.#appState.get();
    const openInterval = this.#intervals.findOpen();

    if (state.timerStatus === 'idle') {
      this.#validateIdle(state, openInterval);
      return idleTimerState(now);
    }

    const currentTask = this.#getCurrentTask(state);
    const sessionStartedAt = this.#getSessionStartedAt(state, now);

    if (state.timerStatus === 'paused') {
      if (openInterval !== undefined) {
        throw invalidState('Paused timer has an open interval.');
      }

      return this.#activeTimerState(
        state.timerStatus,
        currentTask,
        sessionStartedAt,
        null,
        now,
      );
    }

    if (openInterval === undefined) {
      throw invalidState('Running timer has no open interval.');
    }
    if (openInterval.taskId !== currentTask.id) {
      throw invalidState('Open interval does not belong to the current task.');
    }
    if (openInterval.startedAt < sessionStartedAt) {
      throw invalidState('Open interval starts before the current session.');
    }
    if (openInterval.startedAt > now) {
      throw invalidState('Open interval starts after the authoritative time.');
    }

    return this.#activeTimerState(
      state.timerStatus,
      currentTask,
      sessionStartedAt,
      openInterval.startedAt,
      now,
    );
  }

  #validateIdle(state: AppState, openInterval: TimeInterval | undefined): void {
    if (state.currentTaskId !== null || state.sessionStartedAt !== null) {
      throw invalidState('Idle timer retains current session state.');
    }
    if (openInterval !== undefined) {
      throw invalidState('Idle timer has an open interval.');
    }
  }

  #getCurrentTask(state: AppState): Task {
    if (state.currentTaskId === null) {
      throw invalidState('Active timer has no current task.');
    }

    const task = this.#tasks.findById(state.currentTaskId);
    if (task === undefined) {
      throw invalidState('Current timer task does not exist.');
    }
    return task;
  }

  #getSessionStartedAt(state: AppState, now: number): number {
    if (state.sessionStartedAt === null) {
      throw invalidState('Active timer has no session start.');
    }
    if (state.sessionStartedAt > now) {
      throw invalidState('Timer session starts after the authoritative time.');
    }
    return state.sessionStartedAt;
  }

  #activeTimerState(
    status: 'running' | 'paused',
    task: Task,
    sessionStartedAt: number,
    activeIntervalStartedAt: number | null,
    now: number,
  ): TimerState {
    const projections = this.#durations.project({
      taskId: task.id,
      sessionStartedAt,
      now,
    });

    return {
      status,
      currentTask: { id: task.id, description: task.description },
      sessionStartedAt,
      ...projections,
      activeIntervalStartedAt,
      now,
    };
  }
}

const idleTimerState = (now: number): TimerState => ({
  status: 'idle',
  currentTask: null,
  sessionStartedAt: null,
  sessionDurationMs: 0,
  taskTodayDurationMs: 0,
  taskLifetimeDurationMs: 0,
  activeIntervalStartedAt: null,
  now,
});

const invalidState = (message: string): InvalidPersistedTimerStateError =>
  new InvalidPersistedTimerStateError(message);
