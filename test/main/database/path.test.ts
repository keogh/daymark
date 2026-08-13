import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DATABASE_FILENAME,
  resolveDatabasePath,
  resolveMigrationsPath,
} from '@/main/database/path';

describe('database paths', () => {
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
