export interface ApplicationShutdownDependencies {
  readonly quitApplication: () => void;
  readonly logCleanupFailure?: (error: unknown) => void;
}

export class ApplicationShutdown {
  private quitting = false;
  private cleanedUp = false;
  private readonly cleanupHooks: Array<() => void> = [];

  constructor(private readonly dependencies: ApplicationShutdownDependencies) {}

  isQuitting(): boolean {
    return this.quitting;
  }

  addCleanupHook(hook: () => void): void {
    if (this.cleanedUp) {
      hook();
      return;
    }

    this.cleanupHooks.push(hook);
  }

  requestQuit(): void {
    if (this.quitting) {
      return;
    }

    this.quitting = true;
    this.cleanup();
    this.dependencies.quitApplication();
  }

  handleApplicationShutdown(): void {
    this.quitting = true;
    this.cleanup();
  }

  private cleanup(): void {
    if (this.cleanedUp) {
      return;
    }

    this.cleanedUp = true;

    for (const hook of this.cleanupHooks.splice(0).reverse()) {
      try {
        hook();
      } catch (error: unknown) {
        this.dependencies.logCleanupFailure?.(error);
      }
    }
  }
}
