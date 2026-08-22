import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';

import { AppStateRepository } from '@/main/database/repositories/app-state-repository';
import { AnalyticsQueryRepository } from '@/main/database/repositories/analytics-query-repository';
import { HistoryQueryRepository } from '@/main/database/repositories/history-query-repository';
import { SettingsRepository } from '@/main/database/repositories/settings-repository';
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
import { registerAnalyticsHandler } from '@/main/ipc/analytics';
import { registerHistoryHandler } from '@/main/ipc/history';
import { registerIntervalsHandlers } from '@/main/ipc/intervals';
import { registerManualTimeHandler } from '@/main/ipc/manual-time';
import { registerSettingsHandlers } from '@/main/ipc/settings';
import { registerTimerHandlers } from '@/main/ipc/timer';
import { registerTasksHandler } from '@/main/ipc/tasks';
import { DurationProjector } from '@/main/services/duration-projections';
import { AnalyticsService } from '@/main/services/analytics-service';
import { SystemHealthService } from '@/main/services/system-health';
import { HistoryService } from '@/main/services/history-service';
import { IntervalService } from '@/main/services/interval-service';
import { ManualTimeService } from '@/main/services/manual-time-service';
import { SettingsService } from '@/main/services/settings-service';
import { TimerService } from '@/main/services/timer-service';
import { TimerStateReader } from '@/main/services/timer-state-reader';
import { TaskService } from '@/main/services/task-service';
import { createMainWindow } from './create-window';
import { ApplicationShutdown } from './shutdown';
import { startApplication } from './startup';
import { MainWindowOwner } from './window-owner';
import { publishTimerState } from '@/main/timer/state-publisher';
import { TimerPresentationSynchronization } from '@/main/timer/state-synchronization';
import { selectTrayAsset, type TrayPlatform } from '@/main/tray/assets';
import { ElectronTrayAdapter } from '@/main/tray/native';
import { IntervalTrayScheduler, SystemTrayService } from '@/main/tray/service';

export const registerApplicationLifecycle = (): void => {
  const shutdown = new ApplicationShutdown({
    quitApplication: () => app.quit(),
    logCleanupFailure: (error) => {
      console.error('Failed to clean up an application resource.', error);
    },
  });
  const windowOwner = new MainWindowOwner({
    createWindow: createMainWindow,
    isQuitting: () => shutdown.isQuitting(),
    requestForegroundAttention: () => app.focus(),
  });

  void app.whenReady().then(() => {
    const lifecycle = new DatabaseLifecycle({
      databasePath: resolveDatabasePath(app.getPath('userData')),
      migrationsFolder: resolveMigrationsPath(app.getAppPath()),
    });
    shutdown.addCleanupHook(() => lifecycle.close());
    shutdown.addCleanupHook(() => windowOwner.dispose());

    let stateReader: TimerStateReader | undefined;
    let trayService: SystemTrayService | undefined;

    const started = startApplication({
      initializeDatabase: () => lifecycle.initialize(),
      initializeApplicationServices: () => {
        const context = lifecycle.getContext();
        const appState = new AppStateRepository(context.db);
        const tasks = new TaskRepository(context.db);
        const intervals = new TimeIntervalRepository(context.db);
        const settings = new SettingsRepository(context.db);
        const analyticsQueries = new AnalyticsQueryRepository(context.db);
        const historyQueries = new HistoryQueryRepository(context.db);
        const taskSuggestionQueries = new TaskSuggestionQueryRepository(
          context.db,
        );
        const clock = new SystemClock();
        stateReader = new TimerStateReader({
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
        const analyticsService = new AnalyticsService({
          clock,
          analyticsQueries,
        });
        const settingsService = new SettingsService({
          clock,
          settings,
          logger: console,
        });
        const intervalService = new IntervalService({
          appState,
          intervals,
          transactions: new TransactionRunner(context.sqlite),
          stateReader,
          clock,
        });
        const manualTimeService = new ManualTimeService({
          appState,
          tasks,
          intervals,
          transactions: new TransactionRunner(context.sqlite),
          stateReader,
          clock,
          generateId: randomUUID,
        });
        const taskService = new TaskService({
          appState,
          clock,
          suggestionQueries: taskSuggestionQueries,
          tasks,
          transactions: new TransactionRunner(context.sqlite),
        });

        const asset = selectTrayAsset({
          platform: process.platform as TrayPlatform,
          isPackaged: app.isPackaged,
          appPath: app.getAppPath(),
          resourcesPath: process.resourcesPath,
        });
        trayService = new SystemTrayService({
          native: new ElectronTrayAdapter(asset.iconPath),
          scheduler: new IntervalTrayScheduler(),
          clock,
          commands: timerService,
          readState: () => stateReader!.getState(),
          publishState: (state) =>
            publishTimerState(BrowserWindow.getAllWindows(), state),
          openWindow: () => windowOwner.open(),
          handleDoubleClick:
            process.platform === 'darwin'
              ? undefined
              : () => windowOwner.handleTrayDoubleClick(),
          quitApplication: () => shutdown.requestQuit(),
          showError: (message) =>
            dialog.showErrorBox('Time Tracker timer error', message),
          logUnexpectedError: (message, error) => console.error(message, error),
        });
        shutdown.addCleanupHook(() => trayService?.dispose());

        const synchronization = new TimerPresentationSynchronization({
          synchronizeTray: (state) => trayService?.synchronize(state),
          publishState: (state) =>
            publishTimerState(BrowserWindow.getAllWindows(), state),
          readState: () => stateReader!.getState(),
        });

        registerSystemHealthHandler(
          ipcMain,
          new SystemHealthService(lifecycle),
        );
        registerTimerHandlers(
          ipcMain,
          {
            getState: stateReader,
            commands: timerService,
            synchronize: synchronization,
          },
          console,
        );
        registerHistoryHandler(ipcMain, { clock, historyService }, console);
        shutdown.addCleanupHook(
          registerAnalyticsHandler(ipcMain, analyticsService, console),
        );
        shutdown.addCleanupHook(
          registerSettingsHandlers(ipcMain, settingsService, console),
        );
        registerIntervalsHandlers(
          ipcMain,
          { commands: intervalService, synchronize: synchronization },
          console,
        );
        registerManualTimeHandler(
          ipcMain,
          { createInterval: manualTimeService },
          console,
        );
        registerTasksHandler(
          ipcMain,
          { tasks: taskService, synchronize: synchronization },
          console,
        );
      },
      readInitialTimerState: () => stateReader!.getState(),
      initializeTray: (initialState) => trayService!.initialize(initialState),
      createNormalWindow: () => {
        windowOwner.open();
      },
      logInitializationFailure: (error) => {
        console.error('Failed to initialize Time Tracker.', error);
      },
      showInitializationFailure: () => {
        dialog.showErrorBox(
          'Time Tracker could not start',
          'Required local resources could not be initialized. Please restart the application.',
        );
      },
      cleanupAfterFailure: () => shutdown.handleApplicationShutdown(),
      quitApplication: () => app.quit(),
    });

    if (started) {
      app.on('activate', () => {
        windowOwner.handleApplicationActivation();
      });
    }
  });

  app.on('will-quit', () => {
    shutdown.handleApplicationShutdown();
  });

  // The ready application remains reachable through its tray even when an
  // exceptional window destruction leaves no normal windows open.
  app.on('window-all-closed', () => undefined);
};
