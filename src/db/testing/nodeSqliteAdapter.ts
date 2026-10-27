import { DatabaseSync } from 'node:sqlite';

import type { SqlDb, SqlParams } from '../types';

/** Adaptador para testes: SQLite em memória do próprio Node (node:sqlite). */
export function createNodeSqlDb(path = ':memory:'): SqlDb & { close(): void } {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  let depth = 0;

  const self: SqlDb & { close(): void } = {
    exec: async (sql) => {
      db.exec(sql);
    },
    run: async (sql, params: SqlParams = []) => {
      const r = db.prepare(sql).run(...params);
      return { changes: Number(r.changes) };
    },
    all: async <T>(sql: string, params: SqlParams = []) =>
      db.prepare(sql).all(...params) as unknown as T[],
    first: async <T>(sql: string, params: SqlParams = []) =>
      (db.prepare(sql).get(...params) as T | undefined) ?? null,
    transaction: async (fn) => {
      if (depth > 0) return fn(self);
      depth++;
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = await fn(self);
        db.exec('COMMIT');
        return result;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      } finally {
        depth--;
      }
    },
    close: () => db.close(),
  };
  return self;
}
