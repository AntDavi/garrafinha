import { afterEach, describe, expect, it } from 'vitest';

import { createNodeSqlDb } from '../testing/nodeSqliteAdapter';
import { getSchemaVersion, LATEST_SCHEMA_VERSION, runMigrations } from './index';

let db: ReturnType<typeof createNodeSqlDb>;
afterEach(() => db?.close());

describe('migrations', () => {
  it('cria o schema e registra a versão', async () => {
    db = createNodeSqlDb();
    expect(await runMigrations(db)).toBe(LATEST_SCHEMA_VERSION);
    expect(await getSchemaVersion(db)).toBe(LATEST_SCHEMA_VERSION);

    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    expect(tables.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        'app_meta',
        'exercises',
        'foods',
        'meal_items',
        'meals',
        'profile',
        'water_logs',
        'weight_entries',
        'workout_days',
        'workout_exercises',
        'workout_sessions',
        'workouts',
      ]),
    );
  });

  it('é idempotente', async () => {
    db = createNodeSqlDb();
    await runMigrations(db);
    await expect(runMigrations(db)).resolves.toBe(LATEST_SCHEMA_VERSION);
  });

  it('cria índices por data', async () => {
    db = createNodeSqlDb();
    await runMigrations(db);
    const idx = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%_date'",
    );
    expect(idx.map((i) => i.name).sort()).toEqual([
      'idx_meals_date',
      'idx_weight_entries_date',
      'idx_workout_sessions_date',
    ]);
  });

  it('faz rollback de migração com erro e mantém a versão anterior', async () => {
    db = createNodeSqlDb();
    await runMigrations(db);
    const broken = [
      { version: LATEST_SCHEMA_VERSION, name: 'x', sql: '' },
      {
        version: LATEST_SCHEMA_VERSION + 1,
        name: 'broken',
        sql: 'CREATE TABLE ok (a); SELEC nope;',
      },
    ];
    await expect(runMigrations(db, broken)).rejects.toThrow();
    expect(await getSchemaVersion(db)).toBe(LATEST_SCHEMA_VERSION);
    const ok = await db.first("SELECT name FROM sqlite_master WHERE name = 'ok'");
    expect(ok).toBeNull();
  });

  it('recusa banco mais novo que o app', async () => {
    db = createNodeSqlDb();
    await runMigrations(db);
    await db.run("UPDATE app_meta SET value = '999' WHERE key = 'schema_version'");
    await expect(runMigrations(db)).rejects.toThrow(/mais nova/);
  });
});
