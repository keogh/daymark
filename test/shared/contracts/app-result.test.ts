import { describe, expect, it } from 'vitest';

import { isAppError, toRendererSafeError } from '@/shared/contracts/app-result';

describe('renderer-safe application errors', () => {
  it('recognizes and copies a known application error', () => {
    const error = {
      code: 'TIMER_NOT_IDLE' as const,
      message: 'The timer must be idle.',
      stack: 'must not cross IPC',
    };

    expect(isAppError(error)).toBe(true);
    expect(toRendererSafeError(error)).toEqual({
      code: 'TIMER_NOT_IDLE',
      message: 'The timer must be idle.',
    });
  });

  it('accepts INVALID_SWITCH_TASK as a known renderer-safe application error', () => {
    const error = {
      code: 'INVALID_SWITCH_TASK' as const,
      message: 'Switch task input is invalid.',
      detail: 'must not cross IPC',
    };

    expect(isAppError(error)).toBe(true);
    expect(toRendererSafeError(error)).toEqual({
      code: 'INVALID_SWITCH_TASK',
      message: 'Switch task input is invalid.',
    });
  });

  it('accepts INVALID_MANUAL_INTERVAL as a known renderer-safe application error', () => {
    const error = {
      code: 'INVALID_MANUAL_INTERVAL' as const,
      message: 'Manual interval input is invalid.',
      detail: 'must not cross IPC',
    };

    expect(isAppError(error)).toBe(true);
    expect(toRendererSafeError(error)).toEqual({
      code: 'INVALID_MANUAL_INTERVAL',
      message: 'Manual interval input is invalid.',
    });
  });

  it('maps unknown failures to a stable internal error without leaking details', () => {
    expect(toRendererSafeError(new Error('database path is secret'))).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    });
  });
});
