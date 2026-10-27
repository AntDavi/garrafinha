import { z } from 'zod';

/** Formato de assets/data/exercises.pt.json (gerado por scripts/build-exercises.ts). */
export const exerciseSchema = z.object({
  id: z.string().min(1),
  namePt: z.string().min(1),
  nameEn: z.string().min(1),
  category: z.string().nullable(),
  level: z.string().nullable(),
  equipment: z.string().nullable(),
  primaryMuscles: z.array(z.string()),
  secondaryMuscles: z.array(z.string()),
  instructionsPt: z.array(z.string()),
  instructionsEn: z.array(z.string()),
  images: z.array(z.string()),
  translationStatus: z.enum(['translated', 'pending']),
});

export const exercisesFileSchema = z.object({
  version: z.string().min(1),
  source: z.object({
    name: z.string(),
    url: z.string(),
    commit: z.string().nullable(),
    license: z.string(),
    imageBaseUrl: z.string(),
  }),
  generatedAt: z.string(),
  stats: z.object({ total: z.number(), translated: z.number(), pending: z.number() }),
  exercises: z.array(exerciseSchema),
});

export type ExercisesFile = z.infer<typeof exercisesFileSchema>;

export const portionSchema = z.object({ label: z.string().min(1), grams: z.number().positive() });

/** Alimento da TACO; valores por 100 g da parte comestível. */
export const foodSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  per100g: z.object({
    kcal: z.number().nonnegative(),
    protein: z.number().nonnegative(),
    carbs: z.number().nonnegative(),
    fat: z.number().nonnegative(),
  }),
  /** Porções caseiras. Vazio até existir uma fonte oficial de medidas (nada inventado). */
  portions: z.array(portionSchema),
});

export const foodsFileSchema = z.object({
  version: z.string().min(1),
  source: z.object({
    name: z.string(),
    url: z.string(),
    sheet: z.string(),
    license: z.string(),
  }),
  generatedAt: z.string(),
  excluded: z.array(z.object({ id: z.string(), name: z.string(), reason: z.string() })),
  foods: z.array(foodSchema),
});

export type Food = z.infer<typeof foodSchema>;
export type FoodsFile = z.infer<typeof foodsFileSchema>;
