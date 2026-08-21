import type { TimerState } from '@/shared/contracts/timer';

const isFiniteNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isNullableTimestamp = (value: unknown): value is number | null =>
  value === null || isFiniteNonNegativeNumber(value);

export const isTimerState = (value: unknown): value is TimerState => {
  if (typeof value !== 'object' || value === null) return false;

  const state = value as Record<string, unknown>;
  const status = state.status;
  const currentTask = state.currentTask;
  const hasValidTask =
    currentTask === null ||
    (typeof currentTask === 'object' &&
      typeof (currentTask as Record<string, unknown>).id === 'string' &&
      typeof (currentTask as Record<string, unknown>).description === 'string');

  return (
    (status === 'idle' || status === 'running' || status === 'paused') &&
    hasValidTask &&
    isNullableTimestamp(state.sessionStartedAt) &&
    isFiniteNonNegativeNumber(state.sessionDurationMs) &&
    isFiniteNonNegativeNumber(state.taskTodayDurationMs) &&
    isFiniteNonNegativeNumber(state.taskLifetimeDurationMs) &&
    isNullableTimestamp(state.activeIntervalStartedAt) &&
    isFiniteNonNegativeNumber(state.now) &&
    (status === 'idle' ? currentTask === null : currentTask !== null)
  );
};
