import { describe, expect, it } from 'vitest';

import {
  INTERVALS_DELETE_CHANNEL,
  INTERVALS_UPDATE_CHANNEL,
} from '@/shared/contracts/intervals';

describe('interval correction contracts', () => {
  it('owns explicit update and delete IPC channels', () => {
    expect(INTERVALS_UPDATE_CHANNEL).toBe('intervals:update');
    expect(INTERVALS_DELETE_CHANNEL).toBe('intervals:delete');
  });
});
