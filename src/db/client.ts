import { randomUUID } from 'expo-crypto';
import { openDatabaseAsync } from 'expo-sqlite';

import { createExpoSqlDb } from './expoAdapter';
import { runMigrations } from './migrations';
import { createRepositories, type Repositories } from './repositories';
import type { SqlDb } from './types';

export const DATABASE_NAME = 'garrafinha.db';

type Database = { db: SqlDb; repos: Repositories };

let instance: Promise<Database> | null = null;

/** Abre o banco (uma vez), ativa WAL/FKs e aplica migrações pendentes. */
export function getDatabase(): Promise<Database> {
  instance ??= (async () => {
    const raw = await openDatabaseAsync(DATABASE_NAME);
    await raw.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    const db = createExpoSqlDb(raw);
    await runMigrations(db);
    return { db, repos: createRepositories(db, { newId: randomUUID }) };
  })().catch((e: unknown) => {
    instance = null;
    throw e;
  });
  return instance;
}
