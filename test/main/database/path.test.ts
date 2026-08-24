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
  it('preserves the established database filename', () => {
    expect(DATABASE_FILENAME).toBe('daymark.sqlite');
  });

  it('isolates development application data from the packaged profile', () => {
    expect(resolveUserDataPath('/application-data/Daymark', false)).toBe(
      `/application-data/Daymark${DEVELOPMENT_USER_DATA_SUFFIX}`,
    );
  });

  it('retains the established packaged profile after the visible rename', () => {
    expect(resolveUserDataPath('/application-data/Daymark', true)).toBe(
      '/application-data/Daymark',
    );
  });

  it('normalizes an already established default to the same profile', () => {
    expect(resolveUserDataPath('/application-data/Daymark', true)).toBe(
      '/application-data/Daymark',
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
