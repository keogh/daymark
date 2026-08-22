import fs from 'node:fs';
import path from 'node:path';

import { MakerDMG } from '@electron-forge/maker-dmg';
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

  it('configures a source-owned local application icon', () => {
    const iconBasePath = forgeConfig.packagerConfig?.icon;

    expect(iconBasePath).toBe('assets/icon/time-tracker');
    if (typeof iconBasePath !== 'string') {
      return;
    }

    const source = fs.readFileSync(`${iconBasePath}-source.svg`, 'utf8');
    const macOsIcon = fs.readFileSync(`${iconBasePath}.icns`);
    const reusablePng = fs.readFileSync(`${iconBasePath}.png`);

    expect(source).toContain('viewBox="0 0 1024 1024"');
    expect(source).not.toMatch(/(?:href|src)=["']https?:\/\//);
    expect(macOsIcon.subarray(0, 4).toString('ascii')).toBe('icns');
    expect(reusablePng.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect(path.isAbsolute(iconBasePath)).toBe(false);
  });

  it.each(['arm64', 'x64'] as const)(
    'configures a macOS-only %s DMG with an unambiguous name',
    async (architecture) => {
      const dmgMakers = forgeConfig.makers?.filter(
        (maker) => maker instanceof MakerDMG,
      );

      expect(dmgMakers).toHaveLength(1);
      const maker = dmgMakers?.[0];
      expect(maker?.platforms).toEqual(['darwin']);
      await maker?.prepareConfig(architecture);
      expect(maker?.config).toMatchObject({
        format: 'ULFO',
        icon: 'assets/icon/time-tracker.icns',
        name: `Time-Tracker-0.1.0-darwin-${architecture}`,
        title: 'Time Tracker',
      });
    },
  );
});
