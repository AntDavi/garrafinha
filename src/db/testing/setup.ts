import { runMigrations } from '../migrations';
import { createRepositories } from '../repositories';
import { createNodeSqlDb } from './nodeSqliteAdapter';

/** Banco em memória migrado + repositórios com IDs e relógio determinísticos. */
export async function createTestDb() {
  const db = createNodeSqlDb();
  await runMigrations(db);
  let seq = 0;
  let clock = Date.UTC(2026, 9, 27, 12, 0, 0);
  const newId = () => `id-${String(++seq).padStart(4, '0')}`;
  const now = () => new Date((clock += 1000)).toISOString();
  const repos = createRepositories(db, { newId, now });
  return { db, repos, newId, now };
}
