import { openDatabase, type DatabaseContext } from './database';
import { runMigrations } from './migrate';
import { appState } from './schema';

export interface DatabaseLifecycleOptions {
  readonly databasePath: string;
  readonly migrationsFolder: string;
  readonly now?: () => number;
}

export class DatabaseLifecycle {
  readonly #options: DatabaseLifecycleOptions;
  #context: DatabaseContext | undefined;

  constructor(options: DatabaseLifecycleOptions) {
    this.#options = options;
  }

  initialize(): DatabaseContext {
    if (this.#context !== undefined) {
      return this.#context;
    }

    const context = openDatabase(this.#options.databasePath);

    try {
      runMigrations(context.db, this.#options.migrationsFolder);
      context.db
        .insert(appState)
        .values({
          id: 1,
          timerStatus: 'idle',
          currentTaskId: null,
          sessionStartedAt: null,
          updatedAt: (this.#options.now ?? Date.now)(),
        })
        .onConflictDoNothing({ target: appState.id })
        .run();
      this.#context = context;
      return context;
    } catch (error: unknown) {
      context.sqlite.close();
      throw error;
    }
  }

  isReady(): boolean {
    return this.#context?.sqlite.open === true;
  }

  getContext(): DatabaseContext {
    if (!this.isReady() || this.#context === undefined) {
      throw new Error('Database is not ready.');
    }

    return this.#context;
  }

  close(): void {
    if (this.#context?.sqlite.open === true) {
      this.#context.sqlite.close();
    }
    this.#context = undefined;
  }
}
