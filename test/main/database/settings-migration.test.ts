import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DatabaseLifecycle } from '@/main/database/lifecycle';

const migrationsFolder = path.join(
  process.cwd(),
  'src',
  'main',
  'database',
  'migrations',
);

describe('settings migration', () => {
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(
      path.join(tmpdir(), 'daymark-settings-migration-'),
    );
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it('preserves the latest prior schema data and seeds one safe settings row', async () => {
    const priorMigrationsFolder = await copyPriorMigrations(temporaryDirectory);
    const databasePath = path.join(temporaryDirectory, 'test.sqlite');
    const priorLifecycle = new DatabaseLifecycle({
      databasePath,
      migrationsFolder: priorMigrationsFolder,
      now: () => 1_000,
    });
    const prior = priorLifecycle.initialize();

    prior.sqlite
      .prepare(
        'insert into tasks (id, description, normalized_description, created_at, updated_at) values (?, ?, ?, ?, ?)',
      )
      .run('task-1', 'Existing task', 'existing task', 100, 101);
    prior.sqlite
      .prepare(
        'insert into time_intervals (id, task_id, started_at, ended_at, created_at, updated_at) values (?, ?, ?, ?, ?, ?)',
      )
      .run('interval-1', 'task-1', 200, 300, 201, 301);
    prior.sqlite
      .prepare(
        "update app_state set timer_status = 'paused', current_task_id = ?, session_started_at = ?, updated_at = ? where id = 1",
      )
      .run('task-1', 200, 400);

    const before = snapshotProductData(prior);
    priorLifecycle.close();

    const migratedLifecycle = new DatabaseLifecycle({
      databasePath,
      migrationsFolder,
      now: () => 9_000,
    });
    const migrated = migratedLifecycle.initialize();

    expect(snapshotProductData(migrated)).toEqual(before);
    expect(
      migrated.sqlite
        .prepare(
          'select id, week_starts_on, theme, updated_at from application_settings',
        )
        .all(),
    ).toEqual([
      { id: 1, week_starts_on: 'monday', theme: 'system', updated_at: 0 },
    ]);

    migratedLifecycle.close();
  });
});

const copyPriorMigrations = async (directory: string): Promise<string> => {
  const destination = path.join(directory, 'prior-migrations');
  const metadataDestination = path.join(destination, 'meta');
  await mkdir(metadataDestination, { recursive: true });

  await Promise.all([
    cp(
      path.join(migrationsFolder, '0000_peaceful_echo.sql'),
      path.join(destination, '0000_peaceful_echo.sql'),
    ),
    cp(
      path.join(migrationsFolder, '0001_colossal_eddie_brock.sql'),
      path.join(destination, '0001_colossal_eddie_brock.sql'),
    ),
  ]);

  const journal = JSON.parse(
    await readFile(
      path.join(migrationsFolder, 'meta', '_journal.json'),
      'utf8',
    ),
  ) as { entries: unknown[] };
  journal.entries = journal.entries.slice(0, 2);
  await writeFile(
    path.join(metadataDestination, '_journal.json'),
    `${JSON.stringify(journal, null, 2)}\n`,
  );

  return destination;
};

const snapshotProductData = (context: {
  sqlite: {
    prepare(sql: string): { all(): unknown[] };
  };
}): Record<string, unknown[]> => ({
  tasks: context.sqlite.prepare('select * from tasks order by id').all(),
  timeIntervals: context.sqlite
    .prepare('select * from time_intervals order by id')
    .all(),
  appState: context.sqlite.prepare('select * from app_state order by id').all(),
});
