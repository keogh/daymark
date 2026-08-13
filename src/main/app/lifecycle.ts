import { app, BrowserWindow, ipcMain } from 'electron';

import { DatabaseLifecycle } from '@/main/database/lifecycle';
import {
  resolveDatabasePath,
  resolveMigrationsPath,
} from '@/main/database/path';
import { registerSystemHealthHandler } from '@/main/ipc/system-health';
import { SystemHealthService } from '@/main/services/system-health';
import { createMainWindow } from './create-window';

export const registerApplicationLifecycle = (): void => {
  let databaseLifecycle: DatabaseLifecycle | undefined;

  void app.whenReady().then(() => {
    databaseLifecycle = new DatabaseLifecycle({
      databasePath: resolveDatabasePath(app.getPath('userData')),
      migrationsFolder: resolveMigrationsPath(app.getAppPath()),
    });

    try {
      databaseLifecycle.initialize();
      registerSystemHealthHandler(
        ipcMain,
        new SystemHealthService(databaseLifecycle),
      );
      createMainWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createMainWindow();
        }
      });
    } catch (error: unknown) {
      console.error('Failed to initialize the local database.', error);
      app.quit();
    }
  });

  app.on('will-quit', () => {
    databaseLifecycle?.close();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
};
