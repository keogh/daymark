import type { AppResult } from '@/shared/contracts/app-result';
import type { SwitchToTaskInput } from '@/shared/contracts/timer';
import { hasExactKeys, isRecord } from '@/shared/validation/object-shape';

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

const invalidSwitchTask = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'INVALID_SWITCH_TASK',
    message: 'Switch task input is invalid.',
  },
});
