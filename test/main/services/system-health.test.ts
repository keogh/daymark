import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DatabaseLifecycle } from '@/main/database/lifecycle';
import { SystemHealthService } from '@/main/services/system-health';

describe('SystemHealthService', () => {
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'daymark-health-'));
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it('reports ready after the disposable database is initialized', () => {
    const lifecycle = new DatabaseLifecycle({
      databasePath: path.join(temporaryDirectory, 'daymark.sqlite'),
      migrationsFolder: path.join(
        process.cwd(),
        'src',
        'main',
        'database',
        'migrations',
      ),
    });
    const healthService = new SystemHealthService(lifecycle);

    expect(healthService.healthCheck()).toEqual({
      status: 'error',
      database: 'unavailable',
    });

    lifecycle.initialize();

    expect(healthService.healthCheck()).toEqual({
      status: 'ok',
      database: 'ready',
    });
    lifecycle.close();
  });
});
