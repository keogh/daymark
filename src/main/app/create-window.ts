import { BrowserWindow } from 'electron';
import path from 'node:path';

import { createMainWindowOptions } from './window-options';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

export const createMainWindow = (): BrowserWindow => {
  const preloadPath = path.join(__dirname, 'preload.js');
  const window = new BrowserWindow(createMainWindowOptions(preloadPath));

  window.once('ready-to-show', () => {
    window.show();
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  return window;
};
