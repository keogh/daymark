import { describe, expect, it } from 'vitest';

import { validateSwitchToTaskInput } from '@/shared/validation/switch-to-task';

describe('validateSwitchToTaskInput', () => {
  it('validates the exact task-id input without changing its ID', () => {
    expect(validateSwitchToTaskInput({ taskId: 'task-123' })).toEqual({
      ok: true,
      value: { taskId: 'task-123' },
    });
  });

  it.each([
    undefined,
    null,
    [],
    {},
    { id: 'task-1' },
    { taskId: '' },
    { taskId: '   ' },
    { taskId: 42 },
    { taskId: 'task-1', extra: true },
  ])('rejects malformed switch input %#', (input) => {
    expect(validateSwitchToTaskInput(input)).toEqual({
      ok: false,
      error: {
        code: 'INVALID_SWITCH_TASK',
        message: 'Switch task input is invalid.',
      },
    });
  });
});
