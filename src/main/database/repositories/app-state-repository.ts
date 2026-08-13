import { eq } from 'drizzle-orm';

import type { ApplicationDatabase } from '@/main/database/database';
import { appState } from '@/main/database/schema';
import type { AppState } from '@/main/domain/app-state';

const APP_STATE_ID = 1;

export class AppStateRepository {
  readonly #db: ApplicationDatabase;

  constructor(db: ApplicationDatabase) {
    this.#db = db;
  }

  get(): AppState {
    const state = this.#db
      .select()
      .from(appState)
      .where(eq(appState.id, APP_STATE_ID))
      .get();

    if (state === undefined) {
      throw new Error('Singleton AppState row is missing.');
    }

    return { ...state, id: APP_STATE_ID };
  }

  update(state: AppState): AppState {
    const updated = this.#db
      .update(appState)
      .set({
        timerStatus: state.timerStatus,
        currentTaskId: state.currentTaskId,
        sessionStartedAt: state.sessionStartedAt,
        updatedAt: state.updatedAt,
      })
      .where(eq(appState.id, APP_STATE_ID))
      .returning()
      .get();

    if (updated === undefined) {
      throw new Error('Singleton AppState row is missing.');
    }

    return { ...updated, id: APP_STATE_ID };
  }
}
