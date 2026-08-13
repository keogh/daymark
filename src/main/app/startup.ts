export interface ApplicationStartupDependencies {
  readonly initializeDatabase: () => void;
  readonly registerApplicationServices: () => void;
  readonly createNormalWindow: () => void;
  readonly logInitializationFailure: (error: unknown) => void;
  readonly showInitializationFailure: () => void;
  readonly quitApplication: () => void;
}

export const startApplication = (
  dependencies: ApplicationStartupDependencies,
): boolean => {
  try {
    dependencies.initializeDatabase();
    dependencies.registerApplicationServices();
    dependencies.createNormalWindow();
    return true;
  } catch (error: unknown) {
    dependencies.logInitializationFailure(error);
    dependencies.showInitializationFailure();
    dependencies.quitApplication();
    return false;
  }
};
