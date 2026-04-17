import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import type { D1DatabaseLike, D1PreparedStatementLike } from "../../src/types.js";

type SqlInput = string | number | bigint | Uint8Array | null;

class SqliteStatement implements D1PreparedStatementLike {
  constructor(
    private readonly database: DatabaseSync,
    private readonly sql: string,
    private readonly values: unknown[] = []
  ) {}

  bind(...values: unknown[]): D1PreparedStatementLike {
    return new SqliteStatement(this.database, this.sql, values);
  }

  async first<T>(): Promise<T | null> {
    const statement = this.database.prepare(this.sql);
    return (statement.get(...(this.values as SqlInput[])) as T | undefined) ?? null;
  }

  async all<T>(): Promise<{ results: T[] }> {
    const statement = this.database.prepare(this.sql);
    return { results: statement.all(...(this.values as SqlInput[])) as T[] };
  }

  async run(): Promise<unknown> {
    const statement = this.database.prepare(this.sql);
    return statement.run(...(this.values as SqlInput[]));
  }
}

export class SqliteD1Database implements D1DatabaseLike {
  constructor(private readonly database: DatabaseSync) {}

  static fromSqlFiles(...paths: string[]) {
    const database = new DatabaseSync(":memory:");
    for (const path of paths) {
      database.exec(readFileSync(path, "utf8"));
    }
    return new SqliteD1Database(database);
  }

  prepare(sql: string): D1PreparedStatementLike {
    return new SqliteStatement(this.database, sql);
  }

  async batch(statements: D1PreparedStatementLike[]): Promise<unknown[]> {
    const results: unknown[] = [];
    for (const statement of statements) {
      results.push(await statement.run());
    }
    return results;
  }

  raw() {
    return this.database;
  }
}
