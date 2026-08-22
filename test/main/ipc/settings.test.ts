import { describe, expect, it, vi } from 'vitest';

import { ApplicationShutdown } from '@/main/app/shutdown';
import {
  registerSettingsHandlers,
  type SettingsIpcRegistrar,
} from '@/main/ipc/settings';
import type { AppResult } from '@/shared/contracts/app-result';
import {
  SETTINGS_GET_CHANNEL,
  SETTINGS_SET_THEME_CHANNEL,
  SETTINGS_SET_WEEK_START_CHANNEL,
  type ApplicationSettings,
} from '@/shared/contracts/settings';

const settings: ApplicationSettings = {
  weekStartsOn: 'monday',
  theme: 'system',
  updatedAt: 0,
};

describe('settings IPC handlers', () => {
  it('registers exact channels and forwards valid operations once', () => {
    const { handlers, service } = setup();

    expect([...handlers.keys()]).toEqual([
      SETTINGS_GET_CHANNEL,
      SETTINGS_SET_WEEK_START_CHANNEL,
      SETTINGS_SET_THEME_CHANNEL,
    ]);
    expect(call(handlers, SETTINGS_GET_CHANNEL)).toEqual({
      ok: true,
      value: settings,
    });
    expect(
      call(handlers, SETTINGS_SET_WEEK_START_CHANNEL, {
        weekStartsOn: 'sunday',
      }),
    ).toEqual({ ok: true, value: settings });
    expect(
      call(handlers, SETTINGS_SET_THEME_CHANNEL, { theme: 'dark' }),
    ).toEqual({ ok: true, value: settings });
    expect(service.get).toHaveBeenCalledOnce();
    expect(service.setWeekStartsOn).toHaveBeenCalledWith({
      weekStartsOn: 'sunday',
    });
    expect(service.setTheme).toHaveBeenCalledWith({ theme: 'dark' });
  });

  it.each([
    ['missing', undefined],
    ['null', null],
    ['primitive', 'sunday'],
    ['array', ['sunday']],
    ['missing property', {}],
    ['unsupported', { weekStartsOn: 'saturday' }],
    ['wrong type', { weekStartsOn: 1 }],
    ['extra property', { weekStartsOn: 'sunday', extra: true }],
    ['inherited property', Object.create({ weekStartsOn: 'sunday' })],
  ])(
    'rejects %s week-start input without service execution',
    (_label, input) => {
      const { handlers, service } = setup();

      expect(call(handlers, SETTINGS_SET_WEEK_START_CHANNEL, input)).toEqual({
        ok: false,
        error: {
          code: 'INVALID_WEEK_START',
          message: 'The requested week start is invalid.',
        },
      });
      expect(service.setWeekStartsOn).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['missing', undefined],
    ['null', null],
    ['primitive', 'dark'],
    ['array', ['dark']],
    ['missing property', {}],
    ['unsupported', { theme: 'sepia' }],
    ['wrong type', { theme: false }],
    ['extra property', { theme: 'dark', extra: true }],
    ['inherited property', Object.create({ theme: 'dark' })],
  ])('rejects %s theme input without service execution', (_label, input) => {
    const { handlers, service } = setup();

    expect(call(handlers, SETTINGS_SET_THEME_CHANNEL, input)).toEqual({
      ok: false,
      error: {
        code: 'INVALID_THEME',
        message: 'The requested appearance is invalid.',
      },
    });
    expect(service.setTheme).not.toHaveBeenCalled();
  });

  it('preserves expected controlled service failures', () => {
    const { handlers, service } = setup();
    service.setTheme.mockReturnValue({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    });

    expect(
      call(handlers, SETTINGS_SET_THEME_CHANNEL, { theme: 'dark' }),
    ).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
  });

  it('logs unexpected failures and returns no technical details', () => {
    const technicalError = new Error('UPDATE at /private/profile.sqlite');
    const logger = { error: vi.fn() };
    const { handlers, service } = setup(logger);
    service.get.mockImplementation(() => {
      throw technicalError;
    });

    const result = call(handlers, SETTINGS_GET_CHANNEL);

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
    expect(JSON.stringify(result)).not.toContain('private');
    expect(logger.error).toHaveBeenCalledWith(
      'Unexpected settings read IPC failure.',
      technicalError,
    );
  });

  it('removes only its three handlers once through application cleanup', () => {
    const { dispose, removeHandler } = setup();
    const shutdown = new ApplicationShutdown({ quitApplication: vi.fn() });
    shutdown.addCleanupHook(dispose);

    shutdown.handleApplicationShutdown();
    shutdown.handleApplicationShutdown();

    expect(removeHandler.mock.calls).toEqual([
      [SETTINGS_GET_CHANNEL],
      [SETTINGS_SET_WEEK_START_CHANNEL],
      [SETTINGS_SET_THEME_CHANNEL],
    ]);
  });
});

const setup = (logger = { error: vi.fn() }) => {
  const handlers = new Map<string, SettingsHandler>();
  const removeHandler = vi.fn((channel: string) => handlers.delete(channel));
  const ipc: SettingsIpcRegistrar = {
    handle: vi.fn((channel: string, listener: SettingsHandler) => {
      handlers.set(channel, listener);
    }),
    removeHandler,
  };
  const service = {
    get: vi.fn<() => AppResult<ApplicationSettings>>(() => ({
      ok: true,
      value: settings,
    })),
    setWeekStartsOn: vi.fn((): AppResult<ApplicationSettings> => ({
      ok: true,
      value: settings,
    })),
    setTheme: vi.fn((): AppResult<ApplicationSettings> => ({
      ok: true,
      value: settings,
    })),
  };
  const dispose = registerSettingsHandlers(ipc, service, logger);
  return { handlers, service, dispose, removeHandler };
};

type SettingsHandler = (
  event: unknown,
  input?: unknown,
) => AppResult<ApplicationSettings>;

const call = (
  handlers: Map<string, SettingsHandler>,
  channel: string,
  input?: unknown,
): AppResult<ApplicationSettings> => {
  const handler = handlers.get(channel);
  if (handler === undefined) {
    throw new Error(`Missing handler for ${channel}.`);
  }
  return handler({}, input);
};
