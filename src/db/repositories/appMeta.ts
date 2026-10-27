import type { RepoDeps } from './deps';

export type AppMetaKey = 'schema_version' | 'seed_exercises_version' | 'seed_foods_version';

export function createAppMetaRepository({ db }: Pick<RepoDeps, 'db'>) {
  return {
    async get(key: AppMetaKey): Promise<string | null> {
      const row = await db.first<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', [
        key,
      ]);
      return row?.value ?? null;
    },
    async set(key: AppMetaKey, value: string): Promise<void> {
      await db.run(
        'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [key, value],
      );
    },
  };
}

export type AppMetaRepository = ReturnType<typeof createAppMetaRepository>;
