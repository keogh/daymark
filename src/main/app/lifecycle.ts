import { app, BrowserWindow } from 'electron';

import { DatabaseLifecycle } from '../database/lifecycle';
import { resolveDatabasePath, resolveMigrationsPath } from '../database/path';
import { createMainWindow } from './create-window';

export const registerApplicationLifecycle = (): void => {
  let databaseLifecycle: DatabaseLifecycle | undefined;

  app.whenReady().then(() => {
    databaseLifecycle = new DatabaseLifecycle({
      databasePath: resolveDatabasePath(app.getPath('userData')),
      migrationsFolder: resolveMigrationsPath(app.getAppPath()),
    });

    try {
      databaseLifecycle.initialize();
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
