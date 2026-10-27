import { getDatabase } from '@/db/client';
import { loadBundledSeed } from '@/db/seed/bundled';
import { runSeed } from '@/db/seed/loader';

/** Abre o banco, aplica migrações, importa o seed (se mudou) e informa se já existe perfil. */
export async function bootstrap(): Promise<{ hasProfile: boolean }> {
  const { repos } = await getDatabase();
  await runSeed(repos, loadBundledSeed());
  return { hasProfile: await repos.profile.exists() };
}
