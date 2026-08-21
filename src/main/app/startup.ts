import type { TimerState } from '@/shared/contracts/timer';

export interface ApplicationStartupDependencies {
  readonly initializeDatabase: () => void;
  readonly initializeApplicationServices: () => void;
  readonly readInitialTimerState: () => TimerState;
  readonly initializeTray: (initialState: TimerState) => void;
  readonly createNormalWindow: () => void;
  readonly cleanupAfterFailure: () => void;
  readonly logInitializationFailure: (error: unknown) => void;
  readonly showInitializationFailure: () => void;
  readonly quitApplication: () => void;
}

export const startApplication = (
  dependencies: ApplicationStartupDependencies,
): boolean => {
  try {
    dependencies.initializeDatabase();
    dependencies.initializeApplicationServices();
    const initialState = dependencies.readInitialTimerState();
    dependencies.initializeTray(initialState);
    dependencies.createNormalWindow();
    return true;
  } catch (error: unknown) {
    dependencies.logInitializationFailure(error);
    dependencies.showInitializationFailure();
    dependencies.cleanupAfterFailure();
    dependencies.quitApplication();
    return false;
  }
};
