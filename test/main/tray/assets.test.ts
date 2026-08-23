import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { selectTrayAsset } from '@/main/tray/assets';

describe('tray asset selection', () => {
  it('selects the macOS template asset in development', () => {
    expect(
      selectTrayAsset({
        platform: 'darwin',
        isPackaged: false,
        appPath: '/workspace/time-tracker',
        resourcesPath: '/Applications/Time Tracker.app/Contents/Resources',
      }),
    ).toEqual({
      iconPath: path.join(
        '/workspace/time-tracker',
        'assets/tray/time-trackerTemplate.png',
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
          appPath: '/workspace/time-tracker',
          resourcesPath: '/opt/time-tracker/resources',
        }).iconPath,
      ).toBe(
        path.join(
          '/opt/time-tracker/resources',
          'assets/tray/time-tracker.png',
        ),
      );
    },
  );

  it('selects development assets independently of packaged resources', () => {
    expect(
      selectTrayAsset({
        platform: 'linux',
        isPackaged: false,
        appPath: '/workspace/time-tracker',
        resourcesPath: '/unused/resources',
      }).iconPath,
    ).toBe(
      path.join('/workspace/time-tracker', 'assets/tray/time-tracker.png'),
    );
  });
});
