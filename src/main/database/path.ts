import path from 'node:path';

import { productIdentity } from '@/shared/product-identity';

export const DATABASE_FILENAME = productIdentity.stable.databaseFilename;
export const DEVELOPMENT_USER_DATA_SUFFIX = ' Development';

export const resolveUserDataPath = (
  defaultUserDataPath: string,
  isPackaged: boolean,
): string => {
  const establishedProfilePath = path.join(
    path.dirname(defaultUserDataPath),
    productIdentity.stable.profileDirectoryName,
  );

  return isPackaged
    ? establishedProfilePath
    : `${establishedProfilePath}${DEVELOPMENT_USER_DATA_SUFFIX}`;
};

export const resolveDatabasePath = (userDataPath: string): string =>
  path.join(userDataPath, DATABASE_FILENAME);

export const resolveMigrationsPath = (applicationPath: string): string =>
  path.join(applicationPath, 'src', 'main', 'database', 'migrations');
