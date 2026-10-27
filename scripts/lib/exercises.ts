import { z } from 'zod';

import type { ExercisesFile } from '../../src/data/schemas';

/** Formato bruto de dist/exercises.json do yuhonas/free-exercise-db. */
export const rawExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  force: z.string().nullable().optional(),
  level: z.string().nullable().optional(),
  mechanic: z.string().nullable().optional(),
  equipment: z.string().nullable().optional(),
  primaryMuscles: z.array(z.string()),
  secondaryMuscles: z.array(z.string()),
  instructions: z.array(z.string()),
  category: z.string().nullable().optional(),
  images: z.array(z.string()),
});
export type RawExercise = z.infer<typeof rawExerciseSchema>;

export const glossarySchema = z.object({
  muscles: z.record(z.string(), z.string()),
  equipment: z.record(z.string(), z.string()),
  category: z.record(z.string(), z.string()),
  level: z.record(z.string(), z.string()),
  exercises: z.record(
    z.string(),
    z.object({ name: z.string().min(1), instructions: z.array(z.string().min(1)) }),
  ),
});
export type Glossary = z.infer<typeof glossarySchema>;

type Exercise = ExercisesFile['exercises'][number];

function translateTerm(map: Record<string, string>, value: string, kind: string): string {
  const t = map[value];
  if (t === undefined) {
    throw new Error(`Termo sem tradução no glossário (${kind}): "${value}"`);
  }
  return t;
}

const optionalTerm = (
  map: Record<string, string>,
  value: string | null | undefined,
  kind: string,
) => (value ? translateTerm(map, value, kind) : null);

/**
 * Normaliza o dataset para o formato do app. Grupos musculares, equipamentos, categoria e nível
 * são traduzidos pelo glossário (falha se faltar termo). Nome e instruções só são traduzidos
 * quando existem no glossário; caso contrário ficam em inglês com translationStatus "pending".
 */
export function transformExercises(raw: readonly RawExercise[], glossary: Glossary): Exercise[] {
  const ids = new Set(raw.map((r) => r.id));
  const missing = Object.keys(glossary.exercises).filter((id) => !ids.has(id));
  if (missing.length > 0) {
    throw new Error(`Traduções para IDs inexistentes no dataset: ${missing.join(', ')}`);
  }

  return raw
    .map((r): Exercise => {
      const tr = glossary.exercises[r.id];
      return {
        id: r.id,
        namePt: tr?.name ?? r.name,
        nameEn: r.name,
        category: optionalTerm(glossary.category, r.category, 'category'),
        level: optionalTerm(glossary.level, r.level, 'level'),
        equipment: optionalTerm(glossary.equipment, r.equipment, 'equipment'),
        primaryMuscles: r.primaryMuscles.map((m) => translateTerm(glossary.muscles, m, 'muscle')),
        secondaryMuscles: r.secondaryMuscles.map((m) =>
          translateTerm(glossary.muscles, m, 'muscle'),
        ),
        instructionsPt: tr?.instructions ?? [],
        instructionsEn: r.instructions,
        images: r.images,
        translationStatus: tr ? 'translated' : 'pending',
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
