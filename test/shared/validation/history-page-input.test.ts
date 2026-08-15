import { describe, expect, it } from 'vitest';

import { validateHistoryPageInput } from '@/shared/validation/history-page-input';

describe('validateHistoryPageInput', () => {
  const now = localTime(2026, 8, 14, 12);
  const todayStartedAt = localTime(2026, 8, 14);
  const yesterdayStartedAt = localTime(2026, 8, 13);

  it('accepts an empty initial request and a local-midnight cursor', () => {
    expect(validateHistoryPageInput({}, now)).toEqual({ ok: true, value: {} });
    expect(
      validateHistoryPageInput({ beforeDayStartedAt: yesterdayStartedAt }, now),
    ).toEqual({
      ok: true,
      value: { beforeDayStartedAt: yesterdayStartedAt },
    });
  });

  it.each([
    undefined,
    null,
    [],
    { pageSize: 30 },
    { beforeDayStartedAt: undefined },
    { beforeDayStartedAt: Number.NaN },
    { beforeDayStartedAt: Number.POSITIVE_INFINITY },
    { beforeDayStartedAt: 1.5 },
    { beforeDayStartedAt: Number.MAX_SAFE_INTEGER + 1 },
    { beforeDayStartedAt: yesterdayStartedAt + 1 },
    { beforeDayStartedAt: todayStartedAt + 24 * 60 * 60 * 1_000 },
  ])(
    'rejects malformed, unknown, unsafe, non-midnight, or future input %#',
    (input) => {
      expect(validateHistoryPageInput(input, now)).toEqual({
        ok: false,
        error: {
          code: 'INVALID_HISTORY_RANGE',
          message: 'The requested history range is invalid.',
        },
      });
    },
  );
});

const localTime = (
  year: number,
  month: number,
  day: number,
  hour = 0,
): number => new Date(year, month - 1, day, hour).getTime();
