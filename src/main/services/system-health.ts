import type { DatabaseLifecycle } from '@/main/database/lifecycle';
import type { SystemHealth } from '@/shared/contracts/system-health';

export class SystemHealthService {
  readonly #databaseLifecycle: Pick<DatabaseLifecycle, 'isReady'>;

  constructor(databaseLifecycle: Pick<DatabaseLifecycle, 'isReady'>) {
    this.#databaseLifecycle = databaseLifecycle;
  }

  healthCheck(): SystemHealth {
    if (!this.#databaseLifecycle.isReady()) {
      return { status: 'error', database: 'unavailable' };
    }

    return { status: 'ok', database: 'ready' };
  }
}
