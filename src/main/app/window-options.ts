import type { BrowserWindowConstructorOptions } from 'electron';

import { productIdentity } from '@/shared/product-identity';

export const createMainWindowOptions = (
  preloadPath: string,
): BrowserWindowConstructorOptions => ({
  height: 720,
  minHeight: 480,
  minWidth: 640,
  show: false,
  title: productIdentity.displayName,
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    preload: preloadPath,
    sandbox: true,
  },
  width: 1040,
});
