import { describe, expect, it } from 'vitest';

import forgeConfig from '../../../forge.config';

describe('application packaged resources', () => {
  it('retains the local tray assets and database migrations', () => {
    const ignore = forgeConfig.packagerConfig?.ignore;

    expect(ignore).toBeTypeOf('function');
    if (typeof ignore !== 'function') {
      return;
    }

    expect(ignore('/assets')).toBe(false);
    expect(ignore('/assets/tray')).toBe(false);
    expect(ignore('/assets/tray/time-tracker.png')).toBe(false);
    expect(ignore('/assets/tray/time-trackerTemplate.png')).toBe(false);
    expect(ignore('/assets/tray/time-trackerTemplate@2x.png')).toBe(false);
    expect(ignore('/src/main/database/migrations/0000.sql')).toBe(false);
    expect(ignore('/unrelated-development-file.txt')).toBe(true);
    expect(forgeConfig.packagerConfig?.extraResource).toContain('assets');
  });
});
