import { LATEST_SCHEMA_VERSION } from '@/db/migrations';
import type { SqlDb, SqlValue } from '@/db/types';

import { ServiceError } from '../errors';
import {
  BACKUP_APP_ID,
  BACKUP_TABLES,
  backupFileSchema,
  PRIMARY_KEYS,
  tableSchemas,
  type BackupData,
  type BackupFile,
  type BackupTable,
} from './schema';

export type ImportMode = 'merge' | 'replace';
export type ImportSummary = { mode: ImportMode; counts: Record<BackupTable, number> };

const columnsOf = (table: BackupTable) => Object.keys(tableSchemas[table].shape);

/** Lê todas as tabelas de dados do usuário (exercícios e TACO ficam de fora: vêm do seed). */
export async function exportBackup(
  db: SqlDb,
  now: () => string = () => new Date().toISOString(),
): Promise<BackupFile> {
  const data = {} as Record<BackupTable, unknown[]>;
  for (const table of BACKUP_TABLES) {
    const cols = columnsOf(table);
    const order = PRIMARY_KEYS[table].join(', ');
    data[table] = await db.all(`SELECT ${cols.join(', ')} FROM ${table} ORDER BY ${order}`);
  }
  return {
    app: BACKUP_APP_ID,
    schemaVersion: LATEST_SCHEMA_VERSION,
    exportedAt: now(),
    data: data as BackupData,
  };
}

export function serializeBackup(file: BackupFile): string {
  return JSON.stringify(file, null, 2);
}

/** Valida JSON de backup (texto ou objeto) e devolve o arquivo tipado. */
export function parseBackup(input: unknown): BackupFile {
  let value = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input);
    } catch (e) {
      throw new ServiceError(
        'invalid_input',
        'Backup não é JSON',
        'O arquivo escolhido não é um backup válido.',
        { cause: e },
      );
    }
  }
  const header = value as { app?: unknown; schemaVersion?: unknown } | null;
  if (header?.app !== BACKUP_APP_ID) {
    throw new ServiceError(
      'invalid_input',
      'Arquivo não é do Garrafinha',
      'O arquivo escolhido não é um backup do Garrafinha.',
    );
  }
  if (typeof header.schemaVersion === 'number' && header.schemaVersion > LATEST_SCHEMA_VERSION) {
    throw new ServiceError(
      'invalid_input',
      `Backup na versão ${header.schemaVersion}, app na ${LATEST_SCHEMA_VERSION}`,
      'Este backup foi criado por uma versão mais nova do app. Atualize o Garrafinha antes de importar.',
    );
  }
  const parsed = backupFileSchema.safeParse(value);
  if (!parsed.success) {
    throw new ServiceError(
      'invalid_input',
      `Backup inválido: ${parsed.error.issues[0]?.message ?? ''}`,
      'O backup está incompleto ou corrompido.',
      { cause: parsed.error },
    );
  }
  // Futuras versões: converter parsed.data.schemaVersion < LATEST aqui antes de importar.
  return parsed.data;
}

async function insertRows(
  db: SqlDb,
  table: BackupTable,
  rows: readonly Record<string, unknown>[],
  upsert: boolean,
) {
  if (rows.length === 0) return;
  const cols = columnsOf(table);
  const pk = PRIMARY_KEYS[table];
  const updates = cols.filter((c) => !pk.includes(c));
  const conflict = upsert
    ? updates.length
      ? ` ON CONFLICT(${pk.join(', ')}) DO UPDATE SET ${updates.map((c) => `${c} = excluded.${c}`).join(', ')}`
      : ` ON CONFLICT(${pk.join(', ')}) DO NOTHING`
    : '';
  const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})${conflict}`;
  for (const row of rows) {
    await db.run(
      sql,
      cols.map((c) => (row[c] ?? null) as SqlValue),
    );
  }
}

/**
 * Importa um backup em uma única transação (tudo ou nada).
 * - replace: apaga os dados do usuário e grava o conteúdo do arquivo.
 * - merge: faz upsert por ID; filhos de refeições/treinos importados são substituídos pelos do arquivo.
 */
export async function importBackup(
  db: SqlDb,
  input: unknown,
  mode: ImportMode,
): Promise<ImportSummary> {
  const file = parseBackup(input);
  const { data } = file;

  await db.transaction(async (tx) => {
    if (mode === 'replace') {
      for (const table of [...BACKUP_TABLES].reverse()) await tx.run(`DELETE FROM ${table}`);
    } else {
      for (const m of data.meals) await tx.run('DELETE FROM meal_items WHERE meal_id = ?', [m.id]);
      for (const w of data.workouts) {
        await tx.run('DELETE FROM workout_exercises WHERE workout_id = ?', [w.id]);
        await tx.run('DELETE FROM workout_days WHERE workout_id = ?', [w.id]);
      }
    }
    for (const table of BACKUP_TABLES) {
      await insertRows(tx, table, data[table] as Record<string, unknown>[], mode === 'merge');
    }
  });

  const counts = Object.fromEntries(BACKUP_TABLES.map((t) => [t, data[t].length])) as Record<
    BackupTable,
    number
  >;
  return { mode, counts };
}
