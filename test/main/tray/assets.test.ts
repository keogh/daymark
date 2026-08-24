import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { selectTrayAsset } from '@/main/tray/assets';

describe('tray asset selection', () => {
  it('selects the macOS template asset in development', () => {
    expect(
      selectTrayAsset({
        platform: 'darwin',
        isPackaged: false,
        appPath: '/workspace/daymark',
        resourcesPath: '/Applications/Daymark.app/Contents/Resources',
      }),
    ).toEqual({
      iconPath: path.join(
        '/workspace/daymark',
        'assets/tray/daymarkTemplate.png',
      ),
      isTemplateImage: true,
      title: 'Daymark',
      tooltip: 'Daymark',
    });
  });

  it.each(['win32', 'linux'] as const)(
    'selects the packaged fallback asset on %s',
    (platform) => {
      expect(
        selectTrayAsset({
          platform,
          isPackaged: true,
          appPath: '/workspace/daymark',
          resourcesPath: '/opt/daymark/resources',
        }).iconPath,
      ).toBe(path.join('/opt/daymark/resources', 'assets/tray/daymark.png'));
    },
  );

  it('selects development assets independently of packaged resources', () => {
    expect(
      selectTrayAsset({
        platform: 'linux',
        isPackaged: false,
        appPath: '/workspace/daymark',
        resourcesPath: '/unused/resources',
      }).iconPath,
    ).toBe(path.join('/workspace/daymark', 'assets/tray/daymark.png'));
  });
});
