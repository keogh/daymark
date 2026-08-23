import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DATABASE_FILENAME,
  DEVELOPMENT_USER_DATA_SUFFIX,
  resolveDatabasePath,
  resolveMigrationsPath,
  resolveUserDataPath,
} from '@/main/database/path';

describe('database paths', () => {
  it('isolates development application data from the packaged profile', () => {
    expect(resolveUserDataPath('/application-data/Time Tracker', false)).toBe(
      `/application-data/Time Tracker${DEVELOPMENT_USER_DATA_SUFFIX}`,
    );
  });

  it('retains the default packaged application data path', () => {
    expect(resolveUserDataPath('/application-data/Time Tracker', true)).toBe(
      '/application-data/Time Tracker',
    );
  });

  it('places the database in the supplied per-user application directory', () => {
    expect(resolveDatabasePath('/application-data')).toBe(
      path.join('/application-data', DATABASE_FILENAME),
    );
  });

  it('locates migration artifacts relative to the application root', () => {
    expect(resolveMigrationsPath('/application')).toBe(
      path.join('/application', 'src', 'main', 'database', 'migrations'),
    );
  });
});
