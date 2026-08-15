import { describe, expect, it } from 'vitest';

import { MANUAL_TIME_CREATE_INTERVAL_CHANNEL } from '@/shared/contracts/manual-time';

describe('manual time contracts', () => {
  it('owns the explicit create-interval IPC channel', () => {
    expect(MANUAL_TIME_CREATE_INTERVAL_CHANNEL).toBe(
      'manual-time:create-interval',
    );
  });
});
