import type { SqlDb } from '../types';
import { migration001 } from './001_initial';
import type { Migration } from './types';

export type { Migration };

/** Lista ordenada. Nunca edite uma migração publicada; crie uma nova versão. */
export const migrations: readonly Migration[] = [migration001];

export const LATEST_SCHEMA_VERSION = migrations[migrations.length - 1]?.version ?? 0;

const APP_META_DDL = `CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);`;

export async function getSchemaVersion(db: SqlDb): Promise<number> {
  await db.exec(APP_META_DDL);
  const row = await db.first<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'schema_version'",
  );
  return row ? Number(row.value) : 0;
}

/** Aplica as migrações pendentes, cada uma em sua transação. Retorna a versão final. */
export async function runMigrations(
  db: SqlDb,
  list: readonly Migration[] = migrations,
): Promise<number> {
  await db.exec('PRAGMA foreign_keys = ON;');
  let current = await getSchemaVersion(db);
  const latest = list[list.length - 1]?.version ?? 0;
  if (current > latest) {
    throw new Error(
      `Banco na versão ${current}, mais nova que o app (${latest}). Atualize o aplicativo.`,
    );
  }
  for (const m of list) {
    if (m.version <= current) continue;
    await db.transaction(async (tx) => {
      await tx.exec(m.sql);
      await tx.run(
        "INSERT INTO app_meta (key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [String(m.version)],
      );
    });
    current = m.version;
  }
  return current;
}
