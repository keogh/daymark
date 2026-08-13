import type { BrowserWindowConstructorOptions } from 'electron';

export const createMainWindowOptions = (
  preloadPath: string,
): BrowserWindowConstructorOptions => ({
  height: 720,
  minHeight: 480,
  minWidth: 640,
  show: false,
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    preload: preloadPath,
    sandbox: true,
  },
  width: 1040,
});
