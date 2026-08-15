import { describe, expect, it } from 'vitest';

import {
  validateDeleteIntervalInput,
  validateUpdateIntervalInput,
} from '@/shared/validation/interval-correction-input';

const validUpdate = {
  intervalId: 'interval-1',
  startDate: '2026-08-13',
  startTime: '23:30',
  endDate: '2026-08-14',
  endTime: '01:15',
};

describe('validateUpdateIntervalInput', () => {
  it('accepts an exact cross-day update and derives local epoch timestamps', () => {
    expect(validateUpdateIntervalInput(validUpdate)).toEqual({
      ok: true,
      value: {
        ...validUpdate,
        startedAt: new Date(2026, 7, 13, 23, 30).getTime(),
        endedAt: new Date(2026, 7, 14, 1, 15).getTime(),
      },
    });
  });

  it.each([
    undefined,
    null,
    [],
    new Date(),
    {},
    { ...validUpdate, intervalId: 1 },
    { ...validUpdate, intervalId: '' },
    { ...validUpdate, intervalId: ' interval-1' },
    { ...validUpdate, startDate: '2026-02-30' },
    { ...validUpdate, startDate: '2026-8-13' },
    { ...validUpdate, startDate: ' 2026-08-13' },
    { ...validUpdate, startTime: '24:00' },
    { ...validUpdate, startTime: '9:00' },
    { ...validUpdate, endTime: '01:15 ' },
    { ...validUpdate, extra: true },
    {
      intervalId: validUpdate.intervalId,
      startDate: validUpdate.startDate,
      startTime: validUpdate.startTime,
      endDate: validUpdate.endDate,
    },
  ])('rejects malformed, incomplete, or non-exact input %#', (input) => {
    expect(validateUpdateIntervalInput(input)).toEqual({
      ok: false,
      error: {
        code: 'INVALID_INTERVAL_UPDATE',
        message: 'Interval update input is invalid.',
      },
    });
  });

  it.each([
    {
      ...validUpdate,
      startDate: '2026-08-14',
      startTime: '01:15',
    },
    {
      ...validUpdate,
      startDate: '2026-08-14',
      startTime: '01:16',
    },
  ])('rejects an end that is not later than the start %#', (input) => {
    expect(validateUpdateIntervalInput(input)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_INTERVAL_UPDATE' },
    });
  });

  it('rejects normalized-invalid local date-times', () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = 'America/New_York';

    try {
      expect(
        validateUpdateIntervalInput({
          ...validUpdate,
          startDate: '2026-03-08',
          startTime: '02:30',
          endDate: '2026-03-08',
          endTime: '04:00',
        }),
      ).toMatchObject({
        ok: false,
        error: { code: 'INVALID_INTERVAL_UPDATE' },
      });
    } finally {
      process.env.TZ = originalTimezone;
    }
  });
});

describe('validateDeleteIntervalInput', () => {
  it('accepts an exact trimmed entity ID', () => {
    expect(validateDeleteIntervalInput({ intervalId: 'interval-1' })).toEqual({
      ok: true,
      value: { intervalId: 'interval-1' },
    });
  });

  it.each([
    undefined,
    null,
    [],
    {},
    { intervalId: 1 },
    { intervalId: '' },
    { intervalId: '   ' },
    { intervalId: ' interval-1' },
    { intervalId: 'interval-1 ' },
    { intervalId: 'interval-1', extra: true },
  ])('rejects malformed or non-exact delete input %#', (input) => {
    expect(validateDeleteIntervalInput(input)).toEqual({
      ok: false,
      error: {
        code: 'INVALID_INTERVAL_DELETE',
        message: 'Interval delete input is invalid.',
      },
    });
  });
});
