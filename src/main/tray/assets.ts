import path from 'node:path';

export type TrayPlatform = 'darwin' | 'win32' | 'linux';

export interface TrayAssetEnvironment {
  readonly platform: TrayPlatform;
  readonly isPackaged: boolean;
  readonly appPath: string;
  readonly resourcesPath: string;
}

export interface TrayAssetSelection {
  readonly iconPath: string;
  readonly isTemplateImage: boolean;
  readonly title: 'Time Tracker';
  readonly tooltip: 'Time Tracker';
}

export const selectTrayAsset = (
  environment: TrayAssetEnvironment,
): TrayAssetSelection => {
  const assetsRoot = environment.isPackaged
    ? path.join(environment.resourcesPath, 'assets', 'tray')
    : path.join(environment.appPath, 'assets', 'tray');
  const isMacOs = environment.platform === 'darwin';

  return {
    iconPath: path.join(
      assetsRoot,
      isMacOs ? 'time-trackerTemplate.png' : 'time-tracker.png',
    ),
    isTemplateImage: isMacOs,
    title: 'Time Tracker',
    tooltip: 'Time Tracker',
  };
};
