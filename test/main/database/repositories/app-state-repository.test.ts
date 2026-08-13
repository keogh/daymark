import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { AppStateRepository } from '@/main/database/repositories/app-state-repository';
import type { AppState } from '@/main/domain/app-state';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../support/disposable-database';

describe('AppStateRepository', () => {
  let fixture: DisposableDatabase;
  let context: DatabaseContext;
  let repository: AppStateRepository;

  beforeEach(async () => {
    fixture = await createDisposableDatabase();
    context = fixture.lifecycle.initialize();
    repository = new AppStateRepository(context.db);
  });

  afterEach(async () => {
    await fixture.dispose();
  });

  it('reads the initialized singleton AppState', () => {
    expect(repository.get()).toEqual({
      id: 1,
      timerStatus: 'idle',
      currentTaskId: null,
      sessionStartedAt: null,
      updatedAt: 1_000,
    });
  });

  it('updates and returns the singleton without inserting another row', () => {
    insertTask(context, 'task-1');
    const running: AppState = {
      id: 1,
      timerStatus: 'running',
      currentTaskId: 'task-1',
      sessionStartedAt: 2_000,
      updatedAt: 2_000,
    };

    expect(repository.update(running)).toEqual(running);
    expect(repository.get()).toEqual(running);
    expect(
      context.sqlite.prepare('select count(*) from app_state').pluck().get(),
    ).toBe(1);
  });

  it('enforces the current-task foreign key and clears it after task deletion', () => {
    insertTask(context, 'task-1');
    repository.update({
      id: 1,
      timerStatus: 'paused',
      currentTaskId: 'task-1',
      sessionStartedAt: 2_000,
      updatedAt: 2_000,
    });

    context.sqlite.prepare('delete from tasks where id = ?').run('task-1');
    expect(repository.get().currentTaskId).toBeNull();

    expect(() =>
      repository.update({
        id: 1,
        timerStatus: 'running',
        currentTaskId: 'missing-task',
        sessionStartedAt: 3_000,
        updatedAt: 3_000,
      }),
    ).toThrow(/foreign key constraint failed/i);
  });

  it('fails explicitly if the required singleton row is missing', () => {
    context.sqlite.prepare('delete from app_state').run();

    expect(() => repository.get()).toThrow(
      /singleton appstate row is missing/i,
    );
    expect(() =>
      repository.update({
        id: 1,
        timerStatus: 'idle',
        currentTaskId: null,
        sessionStartedAt: null,
        updatedAt: 2_000,
      }),
    ).toThrow(/singleton appstate row is missing/i);
  });
});

const insertTask = (context: DatabaseContext, id: string): void => {
  context.sqlite
    .prepare(
      'insert into tasks (id, description, normalized_description, created_at, updated_at) values (?, ?, ?, ?, ?)',
    )
    .run(id, id, id, 100, 100);
};
