import type BetterSqlite3 from 'better-sqlite3';

export class TransactionRunner {
  readonly #sqlite: BetterSqlite3.Database;

  constructor(sqlite: BetterSqlite3.Database) {
    this.#sqlite = sqlite;
  }

  run<Result>(operation: () => Result): Result {
    return this.#sqlite.transaction(operation)();
  }
}
