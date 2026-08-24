import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { DatabaseLifecycle } from '@/main/database/lifecycle';

const migrationsFolder = path.join(
  process.cwd(),
  'src',
  'main',
  'database',
  'migrations',
);

export interface DisposableDatabase {
  readonly directory: string;
  readonly databasePath: string;
  readonly lifecycle: DatabaseLifecycle;
  dispose(): Promise<void>;
}

export const createDisposableDatabase = async (
  timestamp = 1_000,
): Promise<DisposableDatabase> => {
  const directory = await mkdtemp(
    path.join(tmpdir(), 'daymark-database-test-'),
  );
  const databasePath = path.join(directory, 'test.sqlite');
  const lifecycle = new DatabaseLifecycle({
    databasePath,
    migrationsFolder,
    now: () => timestamp,
  });

  return {
    directory,
    databasePath,
    lifecycle,
    async dispose(): Promise<void> {
      lifecycle.close();
      await rm(directory, { recursive: true, force: true });
    },
  };
};
