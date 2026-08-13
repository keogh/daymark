import path from 'node:path';

export const DATABASE_FILENAME = 'time-tracker.sqlite';

export const resolveDatabasePath = (userDataPath: string): string =>
  path.join(userDataPath, DATABASE_FILENAME);

export const resolveMigrationsPath = (applicationPath: string): string =>
  path.join(applicationPath, 'src', 'main', 'database', 'migrations');
