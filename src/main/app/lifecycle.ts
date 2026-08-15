import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';

import { AppStateRepository } from '@/main/database/repositories/app-state-repository';
import { HistoryQueryRepository } from '@/main/database/repositories/history-query-repository';
import { TaskRepository } from '@/main/database/repositories/task-repository';
import { TaskSuggestionQueryRepository } from '@/main/database/repositories/task-suggestion-query-repository';
import { TimeIntervalRepository } from '@/main/database/repositories/time-interval-repository';
import { TransactionRunner } from '@/main/database/transaction-runner';
import { SystemClock } from '@/main/domain/clock';
import { DatabaseLifecycle } from '@/main/database/lifecycle';
import {
  resolveDatabasePath,
  resolveMigrationsPath,
} from '@/main/database/path';
import { registerSystemHealthHandler } from '@/main/ipc/system-health';
import { registerHistoryHandler } from '@/main/ipc/history';
import { registerTimerHandlers } from '@/main/ipc/timer';
import { registerTasksHandler } from '@/main/ipc/tasks';
import { DurationProjector } from '@/main/services/duration-projections';
import { SystemHealthService } from '@/main/services/system-health';
import { HistoryService } from '@/main/services/history-service';
import { TimerService } from '@/main/services/timer-service';
import { TimerStateReader } from '@/main/services/timer-state-reader';
import { TaskService } from '@/main/services/task-service';
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
        const context = lifecycle.getContext();
        const appState = new AppStateRepository(context.db);
        const tasks = new TaskRepository(context.db);
        const intervals = new TimeIntervalRepository(context.db);
        const historyQueries = new HistoryQueryRepository(context.db);
        const taskSuggestionQueries = new TaskSuggestionQueryRepository(
          context.db,
        );
        const clock = new SystemClock();
        const stateReader = new TimerStateReader({
          appState,
          tasks,
          intervals,
          durations: new DurationProjector(intervals),
          clock,
        });
        const timerService = new TimerService({
          appState,
          tasks,
          intervals,
          transactions: new TransactionRunner(context.sqlite),
          stateReader,
          clock,
          generateId: randomUUID,
        });
        const historyService = new HistoryService({ clock, historyQueries });
        const taskService = new TaskService({
          clock,
          suggestionQueries: taskSuggestionQueries,
        });

        registerSystemHealthHandler(
          ipcMain,
          new SystemHealthService(lifecycle),
        );
        registerTimerHandlers(
          ipcMain,
          { getState: stateReader, commands: timerService },
          console,
        );
        registerHistoryHandler(ipcMain, { clock, historyService }, console);
        registerTasksHandler(ipcMain, { getSuggestions: taskService }, console);
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
