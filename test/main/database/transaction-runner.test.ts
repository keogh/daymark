import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { AppStateRepository } from '@/main/database/repositories/app-state-repository';
import { TimeIntervalRepository } from '@/main/database/repositories/time-interval-repository';
import { TransactionRunner } from '@/main/database/transaction-runner';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from './support/disposable-database';

describe('TransactionRunner', () => {
  let fixture: DisposableDatabase;
  let context: DatabaseContext;

  beforeEach(async () => {
    fixture = await createDisposableDatabase();
    context = fixture.lifecycle.initialize();
    context.sqlite
      .prepare(
        'insert into tasks (id, description, normalized_description, created_at, updated_at) values (?, ?, ?, ?, ?)',
      )
      .run('task-1', 'Task 1', 'task 1', 100, 100);
  });

  afterEach(async () => {
    await fixture.dispose();
  });

  it('commits a complete persistence operation', () => {
    const intervals = new TimeIntervalRepository(context.db);
    const state = new AppStateRepository(context.db);
    const transaction = new TransactionRunner(context.sqlite);

    transaction.run(() => {
      intervals.insert({
        id: 'interval-1',
        taskId: 'task-1',
        startedAt: 2_000,
        endedAt: null,
        createdAt: 2_000,
        updatedAt: 2_000,
      });
      state.update({
        id: 1,
        timerStatus: 'running',
        currentTaskId: 'task-1',
        sessionStartedAt: 2_000,
        updatedAt: 2_000,
      });
    });

    expect(intervals.findOpen()?.id).toBe('interval-1');
    expect(state.get().timerStatus).toBe('running');
  });

  it('rolls back all repository writes when an operation fails', () => {
    const intervals = new TimeIntervalRepository(context.db);
    const state = new AppStateRepository(context.db);
    const transaction = new TransactionRunner(context.sqlite);

    expect(() =>
      transaction.run(() => {
        intervals.insert({
          id: 'interval-1',
          taskId: 'task-1',
          startedAt: 2_000,
          endedAt: null,
          createdAt: 2_000,
          updatedAt: 2_000,
        });
        state.update({
          id: 1,
          timerStatus: 'running',
          currentTaskId: 'missing-task',
          sessionStartedAt: 2_000,
          updatedAt: 2_000,
        });
      }),
    ).toThrow(/foreign key constraint failed/i);

    expect(intervals.findOpen()).toBeUndefined();
    expect(state.get().timerStatus).toBe('idle');
  });
});
