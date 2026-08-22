import { describe, expect, it, vi } from 'vitest';

import { SettingsService } from '@/main/services/settings-service';
import type { ApplicationSettings } from '@/shared/contracts/settings';

import { FakeClock } from '../domain/support/fake-clock';

const defaults: ApplicationSettings = {
  weekStartsOn: 'monday',
  theme: 'system',
  updatedAt: 0,
};

describe('SettingsService', () => {
  it('gets the authoritative singleton without reading the Clock or writing', () => {
    const { service, settings, clock } = setup();
    const now = vi.spyOn(clock, 'now');

    expect(service.get()).toEqual({ ok: true, value: defaults });
    expect(settings.get).toHaveBeenCalledOnce();
    expect(settings.setWeekStartsOn).not.toHaveBeenCalled();
    expect(settings.setTheme).not.toHaveBeenCalled();
    expect(now).not.toHaveBeenCalled();
  });

  it('updates only week start with one Clock timestamp', () => {
    const updated = {
      ...defaults,
      weekStartsOn: 'sunday' as const,
      updatedAt: 2_000,
    };
    const { service, settings, clock } = setup({ now: 2_000 });
    settings.setWeekStartsOn.mockReturnValue(updated);
    const now = vi.spyOn(clock, 'now');

    expect(service.setWeekStartsOn({ weekStartsOn: 'sunday' })).toEqual({
      ok: true,
      value: updated,
    });
    expect(settings.setWeekStartsOn).toHaveBeenCalledOnce();
    expect(settings.setWeekStartsOn).toHaveBeenCalledWith('sunday', 2_000);
    expect(settings.setTheme).not.toHaveBeenCalled();
    expect(now).toHaveBeenCalledOnce();
  });

  it('updates only theme with one Clock timestamp', () => {
    const updated = { ...defaults, theme: 'dark' as const, updatedAt: 3_000 };
    const { service, settings, clock } = setup({ now: 3_000 });
    settings.setTheme.mockReturnValue(updated);
    const now = vi.spyOn(clock, 'now');

    expect(service.setTheme({ theme: 'dark' })).toEqual({
      ok: true,
      value: updated,
    });
    expect(settings.setTheme).toHaveBeenCalledWith('dark', 3_000);
    expect(settings.setWeekStartsOn).not.toHaveBeenCalled();
    expect(now).toHaveBeenCalledOnce();
  });

  it('returns the current row for same-value selections without writes or timestamp advancement', () => {
    const { service, settings, clock } = setup();
    const now = vi.spyOn(clock, 'now');

    expect(service.setWeekStartsOn({ weekStartsOn: 'monday' })).toEqual({
      ok: true,
      value: defaults,
    });
    expect(service.setTheme({ theme: 'system' })).toEqual({
      ok: true,
      value: defaults,
    });
    expect(settings.setWeekStartsOn).not.toHaveBeenCalled();
    expect(settings.setTheme).not.toHaveBeenCalled();
    expect(now).not.toHaveBeenCalled();
  });

  it.each([
    ['read', (service: SettingsService) => service.get()],
    [
      'week-start update',
      (service: SettingsService) =>
        service.setWeekStartsOn({ weekStartsOn: 'sunday' }),
    ],
    [
      'theme update',
      (service: SettingsService) => service.setTheme({ theme: 'dark' }),
    ],
  ] as const)('maps a failed %s to a safe controlled result', (_label, act) => {
    const technicalError = new Error('SQL at /private/profile.sqlite');
    const logger = { error: vi.fn() };
    const { service, settings } = setup({ logger });
    settings.get.mockImplementation(() => {
      throw technicalError;
    });

    const result = act(service);

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
    expect(JSON.stringify(result)).not.toContain('private');
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      technicalError,
    );
  });

  it('maps an update failure safely and never calls the other field update', () => {
    const logger = { error: vi.fn() };
    const { service, settings } = setup({ logger });
    settings.setTheme.mockImplementation(() => {
      throw new Error('write failed');
    });

    expect(service.setTheme({ theme: 'dark' })).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR' },
    });
    expect(settings.setTheme).toHaveBeenCalledOnce();
    expect(settings.setWeekStartsOn).not.toHaveBeenCalled();
  });
});

const setup = (
  options: {
    now?: number;
    logger?: { error(message: string, error: unknown): void };
  } = {},
) => {
  const clock = new FakeClock(options.now ?? 1_000);
  const settings = {
    get: vi.fn(() => defaults),
    setWeekStartsOn: vi.fn(() => defaults),
    setTheme: vi.fn(() => defaults),
  };
  const service = new SettingsService({
    clock,
    settings,
    logger: options.logger,
  });
  return { service, settings, clock };
};
