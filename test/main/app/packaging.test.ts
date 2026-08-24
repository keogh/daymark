import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
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
    expect(ignore('/assets/tray/daymark.png')).toBe(false);
    expect(ignore('/assets/tray/daymarkTemplate.png')).toBe(false);
    expect(ignore('/assets/tray/daymarkTemplate@2x.png')).toBe(false);
    expect(ignore('/src/main/database/migrations/0000.sql')).toBe(false);
    expect(ignore('/unrelated-development-file.txt')).toBe(true);
    expect(forgeConfig.packagerConfig?.extraResource).toContain('assets');
  });

  it('configures a source-owned local application icon', () => {
    const iconBasePath = forgeConfig.packagerConfig?.icon;

    expect(iconBasePath).toBe('assets/icon/daymark');
    if (typeof iconBasePath !== 'string') {
      return;
    }

    const source = fs.readFileSync(`${iconBasePath}-source.svg`, 'utf8');
    const macOsIcon = fs.readFileSync(`${iconBasePath}.icns`);
    const reusablePng = fs.readFileSync(`${iconBasePath}.png`);
    const windowsIcon = fs.readFileSync(`${iconBasePath}.ico`);

    expect(source).toContain('viewBox="0 0 1024 1024"');
    expect(source).not.toMatch(/(?:href|src)=["']https?:\/\//);
    expect(macOsIcon.subarray(0, 4).toString('ascii')).toBe('icns');
    expect(reusablePng.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect(windowsIcon.subarray(0, 4)).toEqual(
      Buffer.from([0x00, 0x00, 0x01, 0x00]),
    );
    expect(path.isAbsolute(iconBasePath)).toBe(false);
  });

  it('retains the pre-rename icon and tray artwork byte for byte', () => {
    const expectedHashes = {
      'assets/icon/daymark-source.svg':
        'd03dac643a61359fcf5340bba8733cfcc2b67128ed342002e45f513a79ad5cfb',
      'assets/icon/daymark.icns':
        '7d5ff142d9d04743d3a011342a5f6f1cd11cb0ffa92387b6d966905a28dfa642',
      'assets/icon/daymark.ico':
        '3b19074fa62693d3ac26a3f310253bce38f049761aa7bccd6d0dabb15353c989',
      'assets/icon/daymark.png':
        '81a57cc793f4c623e8b95875c0183e9ac84eea051dc5001e008735250b71c02d',
      'assets/tray/daymark-source.svg':
        '5b6066dc0dba87a9c4e76d6bc741d40a33b895f7a48c4b25cabc2923950aa414',
      'assets/tray/daymark.png':
        'ef16bcc79dc8a05c78ab1dd39deccc9262b82710b5b0428983b4d740ae88d6e4',
      'assets/tray/daymarkTemplate.png':
        '5eb0584faccb43df7e5517be9defe4d627ebd302971d6c1c481b1146bda54577',
      'assets/tray/daymarkTemplate@2x.png':
        'ef16bcc79dc8a05c78ab1dd39deccc9262b82710b5b0428983b4d740ae88d6e4',
    };

    for (const [assetPath, expectedHash] of Object.entries(expectedHashes)) {
      const actualHash = crypto
        .createHash('sha256')
        .update(fs.readFileSync(assetPath))
        .digest('hex');
      expect(actualHash, assetPath).toBe(expectedHash);
    }
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
        icon: 'assets/icon/daymark.icns',
        name: `Daymark-0.1.0-darwin-${architecture}`,
        title: 'Daymark',
      });
    },
  );

  it('configures a Windows-only x64 Squirrel installer', async () => {
    const squirrelMakers = forgeConfig.makers?.filter(
      (maker) => maker instanceof MakerSquirrel,
    );

    expect(squirrelMakers).toHaveLength(1);
    const maker = squirrelMakers?.[0];
    expect(maker?.platforms).toEqual(['win32']);
    await maker?.prepareConfig('x64');
    expect(maker?.config).toMatchObject({
      authors: 'Isaac Zepeda',
      description: 'A local-first desktop time tracker.',
      exe: 'Daymark.exe',
      name: 'timetracker',
      noMsi: true,
      setupExe: 'Daymark-0.1.0-win32-x64 Setup.exe',
      setupIcon: 'assets/icon/daymark.ico',
      title: 'Daymark',
    });
    await expect(maker?.prepareConfig('arm64')).rejects.toThrow(
      'unsupported Windows Squirrel architecture',
    );
  });

  it('configures a Linux-only x64 Debian package', async () => {
    const debMakers = forgeConfig.makers?.filter(
      (maker) => maker instanceof MakerDeb,
    );

    expect(debMakers).toHaveLength(1);
    const maker = debMakers?.[0];
    expect(maker?.platforms).toEqual(['linux']);
    await maker?.prepareConfig('x64');
    expect(maker?.config).toEqual({
      options: {
        bin: 'Daymark',
        categories: ['Utility'],
        description: 'A local-first desktop time tracker.',
        icon: 'assets/icon/daymark.png',
        maintainer: 'Isaac Zepeda <isaaczepeda@users.noreply.github.com>',
        name: 'time-tracker',
        productName: 'Daymark',
      },
    });
    expect(maker?.config.options).not.toHaveProperty('homepage');
    await expect(maker?.prepareConfig('arm64')).rejects.toThrow(
      'unsupported Linux Debian architecture',
    );
  });
});
