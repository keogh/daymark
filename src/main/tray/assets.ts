import path from 'node:path';

import { productIdentity } from '@/shared/product-identity';

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
  readonly title: typeof productIdentity.displayName;
  readonly tooltip: typeof productIdentity.displayName;
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
      isMacOs ? 'daymarkTemplate.png' : 'daymark.png',
    ),
    isTemplateImage: isMacOs,
    title: productIdentity.displayName,
    tooltip: productIdentity.displayName,
  };
};
