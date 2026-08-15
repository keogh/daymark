import type { AppResult } from '@/shared/contracts/app-result';
import type { SwitchToTaskInput } from '@/shared/contracts/timer';

export type ValidatedSwitchToTaskInput = SwitchToTaskInput;

export const validateSwitchToTaskInput = (
  input: unknown,
): AppResult<ValidatedSwitchToTaskInput> => {
  if (!isRecord(input) || !hasExactKeys(input, ['taskId'])) {
    return invalidSwitchTask();
  }

  if (typeof input.taskId !== 'string' || input.taskId.trim().length === 0) {
    return invalidSwitchTask();
  }

  return {
    ok: true,
    value: { taskId: input.taskId },
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasExactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean => {
  const keys = Object.keys(value);
  return (
    keys.length === expected.length &&
    expected.every((key) => keys.includes(key))
  );
};

const invalidSwitchTask = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'INVALID_SWITCH_TASK',
    message: 'Switch task input is invalid.',
  },
});
