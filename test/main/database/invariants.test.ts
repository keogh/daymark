import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from './support/disposable-database';

interface AppStateRow {
  id: number;
  timer_status: string;
  current_task_id: string | null;
  session_started_at: number | null;
}

describe('foundation database migration and invariants', () => {
  let fixture: DisposableDatabase;
  let context: DatabaseContext;

  beforeEach(async () => {
    fixture = await createDisposableDatabase();
    context = fixture.lifecycle.initialize();
  });

  afterEach(async () => {
    await fixture.dispose();
  });

  it('migrates an empty database and creates the initial AppState', () => {
    const tables = context.sqlite
      .prepare(
        "select name from sqlite_master where type = 'table' and name in ('tasks', 'time_intervals', 'app_state') order by name",
      )
      .pluck()
      .all();
    const state = context.sqlite
      .prepare(
        'select id, timer_status, current_task_id, session_started_at from app_state',
      )
      .get() as AppStateRow;

    expect(tables).toEqual(['app_state', 'tasks', 'time_intervals']);
    expect(state).toEqual({
      id: 1,
      timer_status: 'idle',
      current_task_id: null,
      session_started_at: null,
    });
  });

  it('enables foreign keys and rejects an interval for a missing task', () => {
    expect(context.sqlite.pragma('foreign_keys', { simple: true })).toBe(1);

    expect(() => insertInterval(context, 'interval-1', 'missing-task')).toThrow(
      /foreign key constraint failed/i,
    );
  });

  it("deletes a task's intervals through the cascade constraint", () => {
    insertTask(context, 'task-1');
    insertInterval(context, 'interval-1', 'task-1', 100, 200);

    context.sqlite.prepare('delete from tasks where id = ?').run('task-1');

    expect(
      context.sqlite
        .prepare('select count(*) from time_intervals')
        .pluck()
        .get(),
    ).toBe(0);
  });

  it.each([
    { startedAt: 100, endedAt: 100 },
    { startedAt: 200, endedAt: 100 },
  ])(
    'rejects an interval ending at or before its start ($startedAt, $endedAt)',
    ({ startedAt, endedAt }) => {
      insertTask(context, 'task-1');

      expect(() =>
        insertInterval(
          context,
          `interval-${startedAt}-${endedAt}`,
          'task-1',
          startedAt,
          endedAt,
        ),
      ).toThrow(/check constraint failed/i);
    },
  );

  it('rejects a second open interval globally', () => {
    insertTask(context, 'task-1');
    insertTask(context, 'task-2');
    insertInterval(context, 'interval-1', 'task-1');

    expect(() => insertInterval(context, 'interval-2', 'task-2')).toThrow(
      /unique constraint failed/i,
    );
  });

  it('rejects a second AppState row through the singleton constraint', () => {
    expect(() =>
      context.sqlite
        .prepare(
          "insert into app_state (id, timer_status, updated_at) values (2, 'idle', 2000)",
        )
        .run(),
    ).toThrow(/check constraint failed/i);
  });
});

const insertTask = (context: DatabaseContext, id: string): void => {
  context.sqlite
    .prepare(
      'insert into tasks (id, description, normalized_description, created_at, updated_at) values (?, ?, ?, ?, ?)',
    )
    .run(id, id, id, 100, 100);
};

const insertInterval = (
  context: DatabaseContext,
  id: string,
  taskId: string,
  startedAt = 100,
  endedAt: number | null = null,
): void => {
  context.sqlite
    .prepare(
      'insert into time_intervals (id, task_id, started_at, ended_at, created_at, updated_at) values (?, ?, ?, ?, ?, ?)',
    )
    .run(id, taskId, startedAt, endedAt, 100, 100);
};
