import {
  exercisesFileSchema,
  foodsFileSchema,
  type ExercisesFile,
  type FoodsFile,
} from '@/data/schemas';

import type { Repositories } from '../repositories';

export type SeedFiles = {
  exercises: ExercisesFile;
  foods: FoodsFile;
};

export type SeedResult = { exercises: 'loaded' | 'current'; foods: 'loaded' | 'current' };

/**
 * Importa os dados embarcados quando a versão do arquivo difere da registrada em app_meta.
 * Só valida (Zod) e grava quando há mudança, para não pesar a inicialização.
 */
export async function runSeed(
  repos: Pick<Repositories, 'appMeta' | 'exercises' | 'foods'>,
  files: SeedFiles,
): Promise<SeedResult> {
  const result: SeedResult = { exercises: 'current', foods: 'current' };

  if ((await repos.appMeta.get('seed_exercises_version')) !== files.exercises.version) {
    const parsed = exercisesFileSchema.parse(files.exercises);
    await repos.exercises.replaceAll(parsed.exercises);
    await repos.appMeta.set('seed_exercises_version', parsed.version);
    result.exercises = 'loaded';
  }

  if ((await repos.appMeta.get('seed_foods_version')) !== files.foods.version) {
    const parsed = foodsFileSchema.parse(files.foods);
    await repos.foods.replaceAll(parsed.foods);
    await repos.appMeta.set('seed_foods_version', parsed.version);
    result.foods = 'loaded';
  }

  return result;
}
