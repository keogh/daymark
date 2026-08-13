import { app, BrowserWindow } from 'electron';

import { createMainWindow } from './create-window';

export const registerApplicationLifecycle = (): void => {
  void app.whenReady().then(() => {
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
};
