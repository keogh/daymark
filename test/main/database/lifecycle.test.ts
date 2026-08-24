import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DatabaseLifecycle } from '@/main/database/lifecycle';
import { appState, tasks } from '@/main/database/schema';

const migrationsFolder = path.join(
  process.cwd(),
  'src',
  'main',
  'database',
  'migrations',
);

describe('DatabaseLifecycle', () => {
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(
      path.join(tmpdir(), 'daymark-database-'),
    );
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it('initializes once, enables foreign keys, and seeds one AppState row', () => {
    const lifecycle = createLifecycle(temporaryDirectory, 1_000);

    const firstContext = lifecycle.initialize();
    const secondContext = lifecycle.initialize();

    expect(secondContext).toBe(firstContext);
    expect(lifecycle.isReady()).toBe(true);
    expect(firstContext.sqlite.pragma('foreign_keys', { simple: true })).toBe(
      1,
    );
    expect(firstContext.db.select().from(appState).all()).toEqual([
      {
        id: 1,
        timerStatus: 'idle',
        currentTaskId: null,
        sessionStartedAt: null,
        updatedAt: 1_000,
      },
    ]);

    lifecycle.close();
    expect(lifecycle.isReady()).toBe(false);
    expect(() => lifecycle.getContext()).toThrow('Database is not ready.');
  });

  it('preserves existing data and does not reseed AppState when reopened', () => {
    const firstLifecycle = createLifecycle(temporaryDirectory, 1_000);
    const firstContext = firstLifecycle.initialize();
    firstContext.db
      .insert(tasks)
      .values({
        id: 'existing-task',
        description: 'Existing task',
        normalizedDescription: 'existing task',
        createdAt: 2_000,
        updatedAt: 2_000,
      })
      .run();
    firstContext.db
      .update(appState)
      .set({ updatedAt: 2_000 })
      .where(eq(appState.id, 1))
      .run();
    firstLifecycle.close();

    const secondLifecycle = createLifecycle(temporaryDirectory, 3_000);
    const secondContext = secondLifecycle.initialize();

    expect(secondContext.db.select().from(tasks).all()).toHaveLength(1);
    expect(secondContext.db.select().from(appState).all()).toEqual([
      expect.objectContaining({ id: 1, updatedAt: 2_000 }),
    ]);
    secondLifecycle.close();
  });

  it('does not report readiness when migrations fail', () => {
    const lifecycle = new DatabaseLifecycle({
      databasePath: path.join(temporaryDirectory, 'daymark.sqlite'),
      migrationsFolder: path.join(temporaryDirectory, 'missing-migrations'),
    });

    expect(() => lifecycle.initialize()).toThrow();
    expect(lifecycle.isReady()).toBe(false);
  });
});

const createLifecycle = (
  directory: string,
  timestamp: number,
): DatabaseLifecycle =>
  new DatabaseLifecycle({
    databasePath: path.join(directory, 'daymark.sqlite'),
    migrationsFolder,
    now: () => timestamp,
  });
