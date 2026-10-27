import type { SQLiteDatabase } from 'expo-sqlite';

import type { SqlDb, SqlParams } from './types';

type ExpoExecutor = Pick<
  SQLiteDatabase,
  'execAsync' | 'runAsync' | 'getAllAsync' | 'getFirstAsync'
>;

function wrap(exec: ExpoExecutor, root: SQLiteDatabase, inTransaction: boolean): SqlDb {
  const self: SqlDb = {
    exec: (sql) => exec.execAsync(sql),
    run: async (sql, params: SqlParams = []) => {
      const r = await exec.runAsync(sql, [...params]);
      return { changes: r.changes };
    },
    all: (sql, params: SqlParams = []) => exec.getAllAsync(sql, [...params]),
    first: async (sql, params: SqlParams = []) =>
      (await exec.getFirstAsync(sql, [...params])) ?? null,
    transaction: async (fn) => {
      // Transações aninhadas reaproveitam a transação externa.
      if (inTransaction) return fn(self);
      let result: Awaited<ReturnType<typeof fn>> | undefined;
      await root.withExclusiveTransactionAsync(async (txn) => {
        result = await fn(wrap(txn, root, true));
      });
      return result as Awaited<ReturnType<typeof fn>>;
    },
  };
  return self;
}

export function createExpoSqlDb(db: SQLiteDatabase): SqlDb {
  return wrap(db, db, false);
}
