import path from 'node:path';

export const DATABASE_FILENAME = 'time-tracker.sqlite';
export const DEVELOPMENT_USER_DATA_SUFFIX = ' Development';

export const resolveUserDataPath = (
  defaultUserDataPath: string,
  isPackaged: boolean,
): string =>
  isPackaged
    ? defaultUserDataPath
    : `${defaultUserDataPath}${DEVELOPMENT_USER_DATA_SUFFIX}`;

export const resolveDatabasePath = (userDataPath: string): string =>
  path.join(userDataPath, DATABASE_FILENAME);

export const resolveMigrationsPath = (applicationPath: string): string =>
  path.join(applicationPath, 'src', 'main', 'database', 'migrations');
