import { z } from 'zod';

import { isISODate } from '@/domain/dates';
import { ACTIVITY_LEVELS, GOALS, MEAL_SOURCES, MEAL_TYPES, SEXES } from '@/domain/types';

const id = z.string().min(1).max(64);
const isoDate = z.string().refine(isISODate, 'Data inválida (YYYY-MM-DD)');
const timestamp = z.string().min(1).max(40);
const nonNeg = z.number().finite().nonnegative();

/** Linhas exatamente como nas tabelas (snake_case), para export/import sem perdas. */
export const tableSchemas = {
  profile: z.object({
    id: z.literal('me'),
    sex: z.enum(SEXES),
    age: z.number().int().min(10).max(120),
    weight_kg: z.number().positive(),
    height_cm: z.number().positive(),
    goal: z.enum(GOALS),
    activity: z.enum(ACTIVITY_LEVELS),
    water_goal_ml: z.number().int().positive(),
    created_at: timestamp,
    updated_at: timestamp,
  }),
  weight_entries: z.object({
    id,
    date: isoDate,
    weight_kg: z.number().positive(),
    created_at: timestamp,
  }),
  meals: z.object({
    id,
    date: isoDate,
    meal_type: z.enum(MEAL_TYPES),
    time: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable(),
    source: z.enum(MEAL_SOURCES),
    created_at: timestamp,
  }),
  meal_items: z.object({
    id,
    meal_id: id,
    position: z.number().int().nonnegative(),
    name: z.string().min(1).max(200),
    grams: nonNeg.nullable(),
    quantity_label: z.string().max(100).nullable(),
    kcal: nonNeg,
    protein_g: nonNeg,
    carbs_g: nonNeg,
    fat_g: nonNeg,
    food_ref: z.string().max(100).nullable(),
  }),
  water_logs: z.object({
    date: isoDate,
    cups: z.number().int().nonnegative(),
    updated_at: timestamp,
  }),
  workouts: z.object({
    id,
    title: z.string().min(1).max(120),
    focus: z.string().max(120).nullable(),
    icon: z.string().max(60).nullable(),
    created_on: isoDate,
    created_at: timestamp,
    updated_at: timestamp,
  }),
  workout_exercises: z.object({
    id,
    workout_id: id,
    exercise_id: z.string().min(1).max(200),
    position: z.number().int().nonnegative(),
    sets: z.number().int().positive(),
    reps: z.string().min(1).max(30),
  }),
  workout_days: z.object({
    workout_id: id,
    weekday: z.number().int().min(0).max(6),
  }),
  workout_sessions: z.object({
    id,
    workout_id: id.nullable(),
    workout_title: z.string().min(1).max(120),
    date: isoDate,
    duration_min: z.number().int().nonnegative(),
    created_at: timestamp,
  }),
} as const;

export type BackupTable = keyof typeof tableSchemas;

/** Ordem de inserção (pais antes dos filhos). A exclusão usa a ordem inversa. */
export const BACKUP_TABLES: readonly BackupTable[] = [
  'profile',
  'weight_entries',
  'meals',
  'meal_items',
  'water_logs',
  'workouts',
  'workout_exercises',
  'workout_days',
  'workout_sessions',
];

/** Chave primária usada no upsert do modo "mesclar". */
export const PRIMARY_KEYS: Record<BackupTable, readonly string[]> = {
  profile: ['id'],
  weight_entries: ['id'],
  meals: ['id'],
  meal_items: ['id'],
  water_logs: ['date'],
  workouts: ['id'],
  workout_exercises: ['id'],
  workout_days: ['workout_id', 'weekday'],
  workout_sessions: ['id'],
};

export const backupDataSchema = z.object({
  profile: z.array(tableSchemas.profile).max(1),
  weight_entries: z.array(tableSchemas.weight_entries),
  meals: z.array(tableSchemas.meals),
  meal_items: z.array(tableSchemas.meal_items),
  water_logs: z.array(tableSchemas.water_logs),
  workouts: z.array(tableSchemas.workouts),
  workout_exercises: z.array(tableSchemas.workout_exercises),
  workout_days: z.array(tableSchemas.workout_days),
  workout_sessions: z.array(tableSchemas.workout_sessions),
});

export type BackupData = z.infer<typeof backupDataSchema>;

export const BACKUP_APP_ID = 'garrafinha';

export const backupFileSchema = z
  .object({
    app: z.literal(BACKUP_APP_ID),
    schemaVersion: z.number().int().positive(),
    exportedAt: timestamp,
    data: backupDataSchema,
  })
  .superRefine(({ data }, ctx) => {
    const meals = new Set(data.meals.map((m) => m.id));
    const workouts = new Set(data.workouts.map((w) => w.id));
    const check = (ok: boolean, message: string) => {
      if (!ok) ctx.addIssue({ code: 'custom', message });
    };
    for (const it of data.meal_items) check(meals.has(it.meal_id), `Item ${it.id} sem refeição`);
    for (const e of data.workout_exercises)
      check(workouts.has(e.workout_id), `Exercício ${e.id} sem treino`);
    for (const d of data.workout_days)
      check(workouts.has(d.workout_id), `Dia de treino sem treino ${d.workout_id}`);
    for (const s of data.workout_sessions)
      check(
        s.workout_id === null || workouts.has(s.workout_id),
        `Sessão ${s.id} com treino inexistente`,
      );
  });

export type BackupFile = z.infer<typeof backupFileSchema>;
