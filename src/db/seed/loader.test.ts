import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ExercisesFile, FoodsFile } from '@/data/schemas';

import { createTestDb } from '../testing/setup';
import { runSeed } from './loader';

const readJson = <T>(p: string): T =>
  JSON.parse(readFileSync(resolve(__dirname, '../../../assets/data', p), 'utf8')) as T;

let t: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => {
  t = await createTestDb();
});
afterEach(() => t.db.close());

describe('runSeed', () => {
  it('importa os arquivos embarcados reais e registra as versões', async () => {
    const files = {
      exercises: readJson<ExercisesFile>('exercises.pt.json'),
      foods: readJson<FoodsFile>('foods.json'),
    };
    expect(await runSeed(t.repos, files)).toEqual({ exercises: 'loaded', foods: 'loaded' });
    expect(await t.repos.exercises.count()).toBe(files.exercises.exercises.length);
    expect(await t.repos.foods.count()).toBe(files.foods.foods.length);
    expect(await t.repos.appMeta.get('seed_foods_version')).toBe(files.foods.version);

    const supino = await t.repos.exercises.getById('Barbell_Bench_Press_-_Medium_Grip');
    expect(supino).toMatchObject({ namePt: 'Supino reto', translationStatus: 'translated' });

    // Segunda execução não reimporta.
    expect(await runSeed(t.repos, files)).toEqual({ exercises: 'current', foods: 'current' });
  });

  it('rejeita arquivo inválido sem alterar a versão', async () => {
    const bad = { version: 'x', foods: [{ id: '' }] } as unknown as FoodsFile;
    const exercises = {
      version: 'e',
      source: { name: '', url: '', commit: null, license: '', imageBaseUrl: '' },
      generatedAt: '',
      stats: { total: 0, translated: 0, pending: 0 },
      exercises: [],
    };
    await expect(runSeed(t.repos, { exercises, foods: bad })).rejects.toThrow();
    expect(await t.repos.appMeta.get('seed_foods_version')).toBeNull();
  });
});
