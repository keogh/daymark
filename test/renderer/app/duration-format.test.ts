import { describe, expect, it } from 'vitest';

import {
  formatClockDuration,
  formatHoursAndMinutes,
} from '@/renderer/app/duration-format';

describe('timer duration formatting', () => {
  it('formats session time as unbounded HH:MM:SS', () => {
    expect(formatClockDuration(0)).toBe('00:00:00');
    expect(formatClockDuration(3_900_999)).toBe('01:05:00');
    expect(formatClockDuration(360_000_000)).toBe('100:00:00');
  });

  it('formats summaries as whole hours and minutes', () => {
    expect(formatHoursAndMinutes(0)).toBe('0h 0m');
    expect(formatHoursAndMinutes(7_500_999)).toBe('2h 5m');
  });

  it('clamps invalid negative display values to zero', () => {
    expect(formatClockDuration(-1)).toBe('00:00:00');
    expect(formatHoursAndMinutes(-1)).toBe('0h 0m');
  });
});
