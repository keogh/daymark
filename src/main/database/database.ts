import BetterSqlite3 from 'better-sqlite3';
import {
  drizzle,
  type BetterSQLite3Database,
} from 'drizzle-orm/better-sqlite3';

import * as schema from './schema';

export type ApplicationDatabase = BetterSQLite3Database<typeof schema>;

export interface DatabaseContext {
  readonly db: ApplicationDatabase;
  readonly sqlite: BetterSqlite3.Database;
}

export const openDatabase = (databasePath: string): DatabaseContext => {
  const sqlite = new BetterSqlite3(databasePath);
  sqlite.pragma('foreign_keys = ON');

  return {
    db: drizzle(sqlite, { schema }),
    sqlite,
  };
};
