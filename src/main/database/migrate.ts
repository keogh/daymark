import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import type { ApplicationDatabase } from './database';

export const runMigrations = (
  db: ApplicationDatabase,
  migrationsFolder: string,
): void => {
  migrate(db, { migrationsFolder });
};
