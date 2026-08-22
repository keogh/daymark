import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseContext } from '@/main/database/database';
import { SettingsRepository } from '@/main/database/repositories/settings-repository';
import { SettingsService } from '@/main/services/settings-service';

import {
  createDisposableDatabase,
  type DisposableDatabase,
} from '../database/support/disposable-database';
import { FakeClock } from '../domain/support/fake-clock';

describe('SettingsService with SQLite', () => {
  let fixture: DisposableDatabase;
  let context: DatabaseContext;
  let clock: FakeClock;
  let service: SettingsService;

  beforeEach(async () => {
    fixture = await createDisposableDatabase();
    context = fixture.lifecycle.initialize();
    clock = new FakeClock(2_000);
    service = createService(context, clock);
  });

  afterEach(async () => {
    await fixture.dispose();
  });

  it('persists field-isolated settings across service and database reconstruction', () => {
    expect(service.setWeekStartsOn({ weekStartsOn: 'sunday' })).toMatchObject({
      ok: true,
      value: { weekStartsOn: 'sunday', theme: 'system', updatedAt: 2_000 },
    });
    clock.set(3_000);
    expect(service.setTheme({ theme: 'dark' })).toMatchObject({
      ok: true,
      value: { weekStartsOn: 'sunday', theme: 'dark', updatedAt: 3_000 },
    });

    fixture.lifecycle.close();
    context = fixture.lifecycle.initialize();
    service = createService(context, clock);

    expect(service.get()).toEqual({
      ok: true,
      value: { weekStartsOn: 'sunday', theme: 'dark', updatedAt: 3_000 },
    });
  });

  it('performs no database write for repeated selections', () => {
    const before = context.sqlite.serialize();
    clock.set(9_000);

    expect(service.setWeekStartsOn({ weekStartsOn: 'monday' })).toMatchObject({
      ok: true,
      value: { updatedAt: 0 },
    });
    expect(service.setTheme({ theme: 'system' })).toMatchObject({
      ok: true,
      value: { updatedAt: 0 },
    });
    expect(context.sqlite.serialize()).toEqual(before);
  });

  it('rolls back a failed update and leaves the other preference unchanged', () => {
    context.sqlite.exec(`
      create trigger reject_dark_theme
      before update of theme on application_settings
      when new.theme = 'dark'
      begin
        select raise(abort, 'injected settings failure');
      end;
    `);

    expect(service.setTheme({ theme: 'dark' })).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR' },
    });
    expect(service.get()).toEqual({
      ok: true,
      value: { weekStartsOn: 'monday', theme: 'system', updatedAt: 0 },
    });
  });

  it('surfaces a missing singleton safely without manufacturing a replacement', () => {
    context.sqlite.prepare('delete from application_settings').run();

    expect(service.get()).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR' },
    });
    expect(
      context.sqlite
        .prepare('select count(*) as count from application_settings')
        .get(),
    ).toEqual({ count: 0 });
  });
});

const createService = (
  context: DatabaseContext,
  clock: FakeClock,
): SettingsService =>
  new SettingsService({
    clock,
    settings: new SettingsRepository(context.db),
    logger: { error: () => undefined },
  });
