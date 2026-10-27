/**
 * Gera assets/data/exercises.pt.json a partir do free-exercise-db (Unlicense).
 *
 *   npm run data:exercises                 # baixa do GitHub
 *   npm run data:exercises -- --input x.json  # usa arquivo local
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';

import { exercisesFileSchema, type ExercisesFile } from '../src/data/schemas';
import { glossarySchema, rawExerciseSchema, transformExercises } from './lib/exercises';
import { contentVersion } from './lib/hash';

const REPO = 'yuhonas/free-exercise-db';
const DATA_URL = `https://raw.githubusercontent.com/${REPO}/main/dist/exercises.json`;
const IMAGE_BASE_URL = `https://raw.githubusercontent.com/${REPO}/main/exercises/`;
const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'assets/data/exercises.pt.json');

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { 'User-Agent': 'garrafinha-data-scripts' } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.json();
}

async function latestCommit(): Promise<string | null> {
  try {
    const data = await fetchJson(`https://api.github.com/repos/${REPO}/commits/main`);
    return z.object({ sha: z.string() }).parse(data).sha;
  } catch {
    return null;
  }
}

async function main() {
  const { values } = parseArgs({ options: { input: { type: 'string' } } });

  const rawData = values.input
    ? JSON.parse(await readFile(resolve(values.input), 'utf8'))
    : await fetchJson(DATA_URL);
  const raw = z.array(rawExerciseSchema).parse(rawData);
  const glossary = glossarySchema.parse(
    JSON.parse(await readFile(resolve(import.meta.dirname, 'exercises-glossary.pt.json'), 'utf8')),
  );

  const exercises = transformExercises(raw, glossary);
  const translated = exercises.filter((e) => e.translationStatus === 'translated').length;

  const file: ExercisesFile = exercisesFileSchema.parse({
    version: contentVersion(exercises),
    source: {
      name: 'free-exercise-db',
      url: `https://github.com/${REPO}`,
      commit: values.input ? null : await latestCommit(),
      license: 'Unlicense (domínio público)',
      imageBaseUrl: IMAGE_BASE_URL,
    },
    generatedAt: new Date().toISOString(),
    stats: { total: exercises.length, translated, pending: exercises.length - translated },
    exercises,
  });

  await writeFile(OUT, JSON.stringify(file, null, 1) + '\n');
  console.log(
    `✔ ${file.stats.total} exercícios (${translated} traduzidos, ${file.stats.pending} pendentes) → ${OUT}`,
  );
}

main().catch((e: unknown) => {
  console.error('✖', e instanceof Error ? e.message : e);
  process.exit(1);
});
