import { app, BrowserWindow, dialog, ipcMain } from 'electron';

import { DatabaseLifecycle } from '@/main/database/lifecycle';
import {
  resolveDatabasePath,
  resolveMigrationsPath,
} from '@/main/database/path';
import { registerSystemHealthHandler } from '@/main/ipc/system-health';
import { SystemHealthService } from '@/main/services/system-health';
import { createMainWindow } from './create-window';
import { startApplication } from './startup';

export const registerApplicationLifecycle = (): void => {
  let databaseLifecycle: DatabaseLifecycle | undefined;

  void app.whenReady().then(() => {
    const lifecycle = new DatabaseLifecycle({
      databasePath: resolveDatabasePath(app.getPath('userData')),
      migrationsFolder: resolveMigrationsPath(app.getAppPath()),
    });
    databaseLifecycle = lifecycle;

    const started = startApplication({
      initializeDatabase: () => lifecycle.initialize(),
      registerApplicationServices: () => {
        registerSystemHealthHandler(
          ipcMain,
          new SystemHealthService(lifecycle),
        );
      },
      createNormalWindow: createMainWindow,
      logInitializationFailure: (error) => {
        console.error('Failed to initialize the local database.', error);
      },
      showInitializationFailure: () => {
        dialog.showErrorBox(
          'Time Tracker could not start',
          'The local database could not be initialized. Please restart the application.',
        );
      },
      quitApplication: () => app.quit(),
    });

    if (started) {
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createMainWindow();
        }
      });
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
