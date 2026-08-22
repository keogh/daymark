import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { SettingsRepository } from '@/main/database/repositories/settings-repository';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../support/disposable-database';

describe('SettingsRepository', () => {
  let fixture: DisposableDatabase;
  let context: DatabaseContext;
  let repository: SettingsRepository;

  beforeEach(async () => {
    fixture = await createDisposableDatabase();
    context = fixture.lifecycle.initialize();
    repository = new SettingsRepository(context.db);
  });

  afterEach(async () => {
    await fixture.dispose();
  });

  it('reads the seeded singleton settings', () => {
    expect(repository.get()).toEqual({
      weekStartsOn: 'monday',
      theme: 'system',
      updatedAt: 0,
    });
  });

  it('updates only week start and timestamp', () => {
    expect(repository.setWeekStartsOn('sunday', 2_000)).toEqual({
      weekStartsOn: 'sunday',
      theme: 'system',
      updatedAt: 2_000,
    });
  });

  it('updates only theme and timestamp', () => {
    repository.setWeekStartsOn('sunday', 2_000);

    expect(repository.setTheme('dark', 3_000)).toEqual({
      weekStartsOn: 'sunday',
      theme: 'dark',
      updatedAt: 3_000,
    });
  });

  it('preserves the other preference across repeated sequential updates', () => {
    repository.setTheme('light', 2_000);
    repository.setWeekStartsOn('sunday', 3_000);
    repository.setTheme('dark', 4_000);

    expect(repository.get()).toEqual({
      weekStartsOn: 'sunday',
      theme: 'dark',
      updatedAt: 4_000,
    });
  });

  it('fails explicitly if the required singleton row is missing', () => {
    context.sqlite.prepare('delete from application_settings').run();

    expect(() => repository.get()).toThrow(/settings row is missing/i);
    expect(() => repository.setWeekStartsOn('sunday', 2_000)).toThrow(
      /settings row is missing/i,
    );
    expect(() => repository.setTheme('dark', 2_000)).toThrow(
      /settings row is missing/i,
    );
  });

  it('fails explicitly if the singleton row is invalid', () => {
    context.sqlite.pragma('ignore_check_constraints = ON');
    context.sqlite
      .prepare("update application_settings set theme = 'sepia' where id = 1")
      .run();
    context.sqlite.pragma('ignore_check_constraints = OFF');

    expect(() => repository.get()).toThrow(/settings row is invalid/i);
  });
});
