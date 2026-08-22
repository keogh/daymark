import { describe, expect, it } from 'vitest';

import {
  formatClockDuration,
  formatDuration,
} from '@/renderer/app/duration-format';

describe('timer duration formatting', () => {
  it('formats session time as unbounded HH:MM:SS', () => {
    expect(formatClockDuration(0)).toBe('00:00:00');
    expect(formatClockDuration(3_900_999)).toBe('01:05:00');
    expect(formatClockDuration(360_000_000)).toBe('100:00:00');
  });

  it('formats normal durations consistently with unbounded hours', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(15 * 60_000)).toBe('15m');
    expect(formatDuration(7_500_999)).toBe('2h 05m');
    expect(formatDuration(102 * 3_600_000 + 15 * 60_000)).toBe('102h 15m');
  });

  it('clamps invalid negative display values to zero', () => {
    expect(formatClockDuration(-1)).toBe('00:00:00');
    expect(formatDuration(-1)).toBe('0m');
  });
});
