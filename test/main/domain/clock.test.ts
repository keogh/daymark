import { describe, expect, it, vi } from 'vitest';

import { SystemClock } from '@/main/domain/clock';
import { FakeClock } from './support/fake-clock';

describe('Clock', () => {
  it('uses system time in production', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_234);

    expect(new SystemClock().now()).toBe(1_234);
  });

  it('provides deterministic set and advance controls in tests', () => {
    const clock = new FakeClock(1_000);

    clock.advance(250);
    expect(clock.now()).toBe(1_250);

    clock.set(2_000);
    expect(clock.now()).toBe(2_000);
  });
});
