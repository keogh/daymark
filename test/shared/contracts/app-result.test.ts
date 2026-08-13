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

  it('maps unknown failures to a stable internal error without leaking details', () => {
    expect(toRendererSafeError(new Error('database path is secret'))).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    });
  });
});
